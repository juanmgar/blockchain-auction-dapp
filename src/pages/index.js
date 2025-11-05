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
  const [auctionActive, setAuctionActive] = useState(false);
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
      const auctionContractAddress = "0xe3021edebdebb9b5f44e20e267a9f50d966e9dc0";
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
      const userBid = account
        ? await auctionContract.current.bids(i, account)
        : ethers.BigNumber.from(0);

      list.push({
        id: i,
        product: auction[0],
        winner: auction[1],
        bid: ethers.utils.formatEther(auction[2]),
        end: new Date(Number(auction[3]) * 1000).toLocaleString(navigator.language),
        hasRefund: userBid.gt(0) && account.toLowerCase() !== auction[1].toLowerCase(),
      });
    }
    setAuctionList(list.reverse());
    const productName = await auctionContract.current.currentProduct();
    const bid = await auctionContract.current.highestBid();
    const bidder = await auctionContract.current.highestBidder();
    const end = await auctionContract.current.auctionEndTime();
    const active = await auctionContract.current.auctionActive();

    setAuctionActive(active);
    setProduct(productName);
    setHighestBid(ethers.utils.formatEther(bid));
    setHighestBidder(bidder);
    setAuctionEndTime(Number(end));
  };

  const placeBid = async () => {
    if (!newBid || isNaN(newBid) || Number(newBid) <= 0) {
      await loadAuctionData();
      alert("Enter a valid amount");
      return;
    }
    try {
      const tx = await auctionContract.current.placeBid({
        value: ethers.utils.parseEther(newBid),
      });
      await tx.wait();
      alert("Bid placed successfully");
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
      alert("Auction ended");
      await loadAuctionData();
    } catch (err) {
      const decoded = decodeError(err);
      alert(`Error: ${decoded.error}`);
    }
  };

  const handleWithdraw = async () => {
    if (selectedAuction === "") {
      alert("Please select an auction first");
      return;
    }
    try {
      const tx = await auctionContract.current.withdraw(selectedAuction);
      await tx.wait();
      alert("Funds withdrawn successfully");
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
      alert("Enter a valid address");
      return;
    }

    try {
      const tx = await auctionContract.current.changeAdmin(newAdmin);
      await tx.wait();
      alert("Administrator changed successfully");
      setNewAdmin("");
    } catch (err) {
      const decoded = await decodeError(err);
      alert(`Error changing administrator: ${decoded.error}`);
    }
  };

  const createAuction = async () => {
    if (!newProduct || !newDuration) {
      alert("Enter a valid name and duration");
      return;
    }

    try {
      const tx = await auctionContract.current.startNewAuction(newProduct, newDuration);
      await tx.wait();
      alert("New auction created successfully");
      setNewProduct("");
      setNewDuration("");
      await loadAuctionData();
    } catch (err) {
      const decoded = await decodeError(err);
      alert(`Error creating auction: ${decoded.error}`);
    }
  };

  return (
    <Container className="mt-4" style={{ maxWidth: "700px" }}>
      <h1>Blockchain Auction DApp</h1>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Ongoing Auction</Card.Title>

          {!auctionActive ? (
            <Alert variant="info" className="text-center">
              No active auction at the moment.
            </Alert>
          ) : (
            <div>
              <div>
                <strong>Connected account:</strong>{" "}
                {account ? account : <Spinner size="sm" animation="border" />}
              </div>
              <div><strong>Product:</strong> {product}</div>
              <div><strong>Highest bid:</strong> {highestBid} BNB</div>
              <div><strong>Highest bidder:</strong> {highestBidder}</div>

              <div className="mt-2">
                <strong>Status:</strong>{" "}
                {Date.now() / 1000 < auctionEndTime ? (
                  <div>
                    Ends on
                    {new Date(auctionEndTime * 1000).toLocaleString(navigator.language, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </div>
                ) : (
                  <span style={{ color: "orange" }}>
                    Auction closed for new bids — awaiting admin to finalize
                  </span>
                )}
              </div>

              <Form className="mt-3">
                <Form.Control
                  type="number"
                  placeholder="Amount in BNB"
                  value={newBid}
                  onChange={(e) => setNewBid(e.target.value)}
                  disabled={Date.now() / 1000 >= auctionEndTime}
                  className="mb-2"
                />
                <Button
                  variant="primary"
                  onClick={placeBid}
                  className="w-100"
                  disabled={Date.now() / 1000 >= auctionEndTime}
                >
                  Place bid
                </Button>
              </Form>

              {isAdmin && Date.now() / 1000 >= auctionEndTime && (
                <div className="mt-3">
                  <Button
                    variant="warning"
                    className="w-100"
                    onClick={endAuction}
                    disabled={!auctionActive}
                  >
                    End auction
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>



      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Finished Auctions</Card.Title>
          {auctionList.length === 0 ? (
            <p>No finished auctions.</p>
          ) : (
            <div>
              <Form.Select
                className="mb-2"
                value={selectedAuction}
                onChange={(e) => setSelectedAuction(e.target.value)}
              >
                <option value="">Select an auction</option>
                {auctionList.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id + 1} – {a.product} ({a.bid} BNB)
                    {a.hasRefund && " 💸 Refund available"}
                    {account && a.winner.toLowerCase() === account.toLowerCase() && " 🏆 You won"}
                  </option>
                ))}
              </Form.Select>
              <Button variant="secondary" className="w-100" onClick={handleWithdraw}>
                Withdraw funds
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
      <hr style={{ margin: "40px 0", borderTop: "2px solid #ccc" }} />
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>Admin Panel</Card.Title>
          <div style={{ opacity: isAdmin ? 1 : 0.5 }}>
            {!isAdmin && (
              <Alert variant="warning">
                Only administrators can perform these actions.
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>New auction</Form.Label>
              <Form.Control
                type="text"
                placeholder="Product name"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                disabled={!isAdmin || auctionActive}
                className="mb-2"
              />
              <Form.Control
                type="number"
                placeholder="Duration in minutes"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                disabled={!isAdmin || auctionActive}
                className="mb-2"
              />
              <Button
                variant="primary"
                onClick={createAuction}
                disabled={!isAdmin || auctionActive}
                className="w-100 mb-3"
              >
                Create auction
              </Button>

              {auctionActive && (
                <Alert variant="info" className="mt-2 text-center">
                  You cannot create a new auction until the current one is finalized by the admin.
                </Alert>
              )}

            </Form.Group>

            <Form.Group>
              <Form.Label>Change administrator</Form.Label>
              <Form.Control
                type="text"
                placeholder="New admin address"
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
                Change administrator
              </Button>
            </Form.Group>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
