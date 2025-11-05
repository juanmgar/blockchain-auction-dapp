import detectEthereumProvider from "@metamask/detect-provider";
import { decodeError } from "@ubiquity-os/ethers-decode-error";
import { Contract, ethers } from "ethers";
import { useEffect, useRef, useState } from "react";
import auctionManifest from "../contracts/Auction.json";
import {
  Container,
  Card,
  Button,
  Form,
  Alert,
  Spinner,
} from "react-bootstrap";


export default function Home() {
  const auctionContract = useRef(null);

  // Estado
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [product, setProduct] = useState("");
  const [highestBid, setHighestBid] = useState("0");
  const [highestBidder, setHighestBidder] = useState("");
  const [auctionEndTime, setAuctionEndTime] = useState(0);
  const [newBid, setNewBid] = useState("");
  const [auctionList, setAuctionList] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState("");
  const [newProduct, setNewProduct] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newAdmin, setNewAdmin] = useState("");


  useEffect(() => {

    let init = async () => {
      await configurarBlochain();
      await loadAuctionData();
    }

    init();

  }, []);

  const configurarBlochain = async () => {
    const provider = await detectEthereumProvider();
    if (provider) {
      console.log("Ethereum provider detected:", provider);
      await provider.request({ method: "eth_requestAccounts" });
      const networkId = await provider.request({ method: "net_version" });
      console.log("Connected to network ID:", networkId);

      const accounts = await provider.request({ method: "eth_accounts" });
      setAccount(accounts[0]);

      let providerEthers = new ethers.providers.Web3Provider(provider);
      let signer = providerEthers.getSigner();
      const auctionContractAddress = "0x993b1f2379b28ef76b8b67b4485dd3816cfa4d07";
      auctionContract.current = new Contract(auctionContractAddress, auctionManifest.abi, signer);
      console.log("Connected to contract:", auctionContract.current);

      await checkAdmin(accounts[0]);

    } else {
      console.log("No Ethereum provider detected");
    }
  };

  const loadAuctionData = async () => {
    if (!auctionContract.current) return;

    const count = await auctionContract.current.getHistoricalAuctionCount();
    const list = [];
    for (let i = 0; i < count; i++) {
      const auction = await auctionContract.current.getAuction(i);
      list.push({
        id: i,
        product: auction[0],
        winner: auction[1],
        bid: ethers.utils.formatEther(auction[2]),
        end: new Date(Number(auction[3]) * 1000).toLocaleString(navigator.language),
      });
    }
    setAuctionList(list.reverse());
    const productName = await auctionContract.current.currentProduct();
    const bid = await auctionContract.current.highestBid();
    const bidder = await auctionContract.current.highestBidder();
    const end = await auctionContract.current.auctionEndTime();

    setProduct(productName);
    setHighestBid(ethers.utils.formatEther(bid));
    setHighestBidder(bidder);
    setAuctionEndTime(Number(end));
  };

  const placeBid = async () => {
    if (!newBid || isNaN(newBid) || Number(newBid) <= 0) {
      alert("Introduce una cantidad válida");
      return;
    }
    try {
      const tx = await auctionContract.current.placeBid({
        value: ethers.utils.parseEther(newBid),
      });
      await tx.wait();
      alert("Puja realizada con éxito");
      await loadAuctionData();
    } catch (err) {
      const decoded = decodeError(err);
      alert(`Error: ${decoded.error}`);
    }
  };

  const endAuction = async () => {
    try {
      const tx = await auctionContract.current.endAuction();
      await tx.wait();
      alert("Subasta finalizada");
      await loadAuctionData();
    } catch (err) {
      const decoded = decodeError(err);
      alert(`Error: ${decoded.error}`);
    }
  };

  const handleWithdraw = async () => {
    if (selectedAuction === "") {
      alert("Selecciona una subasta primero");
      return;
    }
    try {
      const tx = await auctionContract.current.withdraw(selectedAuction);
      await tx.wait();
      alert("Fondos retirados correctamente");
    } catch (err) {
      const decoded = decodeError(err);
      alert(`Error: ${decoded.error}`);
    }
  };

  const checkAdmin = async (acct) => {
    const admin = await auctionContract.current.admin();
    setIsAdmin(admin.toLowerCase() == acct.toLowerCase());
  };

  const handleChangeAdmin = async () => {
    if (!newAdmin || !ethers.utils.isAddress(newAdmin)) {
      alert("Introduce una dirección válida");
      return;
    }

    try {
      const tx = await auctionContract.current.changeAdmin(newAdmin);
      await tx.wait();
      alert("Administrador cambiado correctamente");
      setNewAdmin("");
    } catch (err) {
      const decoded = await decodeError(err);
      alert(`Error al cambiar administrador: ${decoded.reason || decoded}`);
    }
  };
  const createAuction = async () => {
    if (!newProduct || !newDuration) {
      alert("Introduce un nombre y duración válidos");
      return;
    }

    try {
      const tx = await auctionContract.current.startNewAuction(newProduct, newDuration);
      await tx.wait();
      alert("Nueva subasta creada correctamente");
      setNewProduct("");
      setNewDuration("");
      await loadAuctionData();
    } catch (err) {
      const decoded = await decodeError(err);
      alert(`Error al crear subasta: ${decoded.reason || decoded}`);
    }
  };

  return (
    <Container className="mt-4" style={{ maxWidth: "700px" }}>
      <h1>Blockchain Auction DApp</h1>
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Subasta en curso</Card.Title>
          <div>
            <strong>Cuenta conectada:</strong>{" "}
            {account ? account : <Spinner size="sm" animation="border" />}
          </div>
          <div><strong>Producto:</strong> {product}</div>
          <div><strong>Puja más alta:</strong> {highestBid} BNB</div>
          <div><strong>Postor líder:</strong> {highestBidder}</div>
          <div>
            <strong>Estado de la subasta:</strong>{" "}
            {!auctionEndTime ? (
              "Cargando..."
            ) : Date.now() / 1000 < auctionEndTime ? (
              <>
                Finaliza el{" "}
                {new Date(auctionEndTime * 1000).toLocaleString(navigator.language, {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </>
            ) : (
              "Subasta cerrada a nuevas pujas — en espera de cierre del administrador"
            )}
          </div>

          <Form className="mt-3">
            <Form.Control
              type="number"
              placeholder="Cantidad en BNB"
              value={newBid}
              onChange={(e) => setNewBid(e.target.value)}
              className="mb-2"
            />
            <Button variant="primary" onClick={placeBid} className="w-100">
              Realizar puja
            </Button>
          </Form>

          <hr />
          <Button variant="warning" className="w-100" onClick={endAuction}>
            Finalizar subasta
          </Button>
        </Card.Body>
      </Card>

      {/* Historial */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Subastas finalizadas</Card.Title>
          {auctionList.length === 0 ? (
            <p>No hay subastas finalizadas.</p>
          ) : (
            <>
              <Form.Select
                className="mb-2"
                value={selectedAuction}
                onChange={(e) => setSelectedAuction(e.target.value)}
              >
                <option value="">Selecciona una subasta</option>
                {auctionList.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} – {a.product} ({a.bid} BNB)
                  </option>
                ))}
              </Form.Select>
              <Button variant="secondary" className="w-100" onClick={handleWithdraw}>
                Retirar fondos
              </Button>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Panel de administración */}
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>Panel de administración</Card.Title>
          <div style={{ opacity: isAdmin ? 1 : 0.5 }}>
            {!isAdmin && (
              <Alert variant="warning">
                Solo los administradores pueden ejecutar estas acciones.
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Nueva subasta</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nombre del producto"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                disabled={!isAdmin}
                className="mb-2"
              />
              <Form.Control
                type="number"
                placeholder="Duración en minutos"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                disabled={!isAdmin}
                className="mb-2"
              />
              <Button
                variant="primary"
                onClick={createAuction}
                disabled={!isAdmin}
                className="w-100 mb-3"
              >
                Crear subasta
              </Button>
            </Form.Group>

            <Form.Group>
              <Form.Label>Cambiar administrador</Form.Label>
              <Form.Control
                type="text"
                placeholder="Dirección del nuevo admin"
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                disabled={!isAdmin}
                className="mb-2"
              />
              <Button
                variant="success"
                onClick={handleChangeAdmin}
                disabled={!isAdmin}
                className="w-100"
              >
                Cambiar administrador
              </Button>
            </Form.Group>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
