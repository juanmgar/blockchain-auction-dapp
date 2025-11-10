// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract Auction {
    // Información de subastas finalizadas
    struct AuctionInfo {
        string productName;
        address winner;
        uint winningBid;
        uint endTime;
    }

    // Dirección del administrador del contrato
    address payable public admin;

    // bids[subasta][usuario] = cantidad pujada
    mapping(uint => mapping(address => uint)) public bids;

    // Historial de subastas cerradas
    AuctionInfo[] public auctionHistory;

    // Estado de la subasta activa
    string public currentProduct;
    uint public auctionEndTime;
    address public highestBidder;
    uint public highestBid;
    bool public auctionActive;

    // Eventos para registrar acciones importantes
    event AuctionStarted(uint auctionId, string productName, uint endTime);
    event NewBid(uint auctionId, address bidder, uint amount);
    event AuctionEnded(uint auctionId, address winner, uint amount);
    event Withdraw(address user, uint amount);
    event Refund(address previousBidder, uint amount);

    // Constructor: inicia una subasta al desplegar el contrato
    constructor(string memory _productName, uint _durationMinutes) {
        admin = payable(msg.sender);
        currentProduct = _productName;
        auctionEndTime = block.timestamp + (_durationMinutes * 1 minutes);
        highestBidder = address(0);
        highestBid = 0;
        auctionActive = true;

        emit AuctionStarted(0, _productName, auctionEndTime);
    }

    // Crear nueva subasta (solo admin)
    function startNewAuction(
        string memory _productName,
        uint _durationMinutes
    ) public {
        require(msg.sender == admin, "Only admin can start");
        require(
            !auctionActive || block.timestamp >= auctionEndTime,
            "Previous auction still running"
        );
        require(!auctionActive, "Previous auction not closed yet");

        // Reinicio de variables de la subasta
        currentProduct = _productName;
        auctionEndTime = block.timestamp + (_durationMinutes * 1 minutes);
        highestBidder = address(0);
        highestBid = 0;
        auctionActive = true;

        emit AuctionStarted(
            auctionHistory.length,
            _productName,
            auctionEndTime
        );
    }

    // Realizar una puja
    function placeBid() public payable {
        require(auctionActive, "No active auction");
        require(block.timestamp < auctionEndTime, "Auction ended");
        require(msg.value > highestBid, "Bid too low");

        uint currentId = auctionHistory.length;

        // No se permite pujar más de una vez
        require(bids[currentId][msg.sender] == 0, "You have already placed a bid");

        // Registrar puja
        bids[currentId][msg.sender] = msg.value;

        // Actualizar mejor puja
        highestBid = msg.value;
        highestBidder = msg.sender;

        emit NewBid(currentId, msg.sender, msg.value);
    }

    // Finalizar subasta (solo admin)
    function endAuction() public {
        require(msg.sender == admin, "Only admin can end");
        require(auctionActive, "No active auction");
        require(block.timestamp >= auctionEndTime, "Auction not finished yet");

        auctionActive = false;

        // Guardar información en historial
        auctionHistory.push(
            AuctionInfo({
                productName: currentProduct,
                winner: highestBidder,
                winningBid: highestBid,
                endTime: auctionEndTime
            })
        );

        // Transferir fondos de la puja al admin
        if (highestBid > 0) {
            admin.transfer(highestBid);
        }

        emit AuctionEnded(auctionHistory.length - 1, highestBidder, highestBid);
    }

    // Función para recuperar fondos de usuarios no ganadores
    function withdraw(uint auctionId) public {
        require(auctionId < auctionHistory.length, "Invalid auction");

        AuctionInfo memory a = auctionHistory[auctionId];
        uint amount = bids[auctionId][msg.sender];
        require(amount > 0, "No funds to withdraw");
        require(msg.sender != a.winner, "Winner cannot withdraw");

        // Reset antes de transferir
        bids[auctionId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit Withdraw(msg.sender, amount);
    }

    // Cambiar el administrador del contrato
    function changeAdmin(address _newAdmin) public {
        require(msg.sender == admin, "Only admin can change admin");
        require(_newAdmin != address(0), "Invalid address");
        admin = payable(_newAdmin);
    }

    // Consultas
    function getHistoricalAuctionCount() public view returns (uint) {
        return auctionHistory.length;
    }

    function getAuction(
        uint index
    ) public view returns (string memory, address, uint, uint) {
        require(index < auctionHistory.length, "Invalid index");
        AuctionInfo memory a = auctionHistory[index];
        return (a.productName, a.winner, a.winningBid, a.endTime);
    }

    // Recuperar fondos residuales del contrato (solo admin)
    function withdrawContractBalance() public {
        require(msg.sender == admin, "Only admin can withdraw balance");
        uint balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = admin.call{value: balance}("");
        require(success, "Transfer failed");
    }

    // Bloquear envíos directos al contrato
    receive() external payable {
        revert("Direct deposits not allowed");
    }
}
