// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TicketNest {
    address payable public owner;

    struct TicketSales {
        string name;
        uint price;
        uint stock;
    }

    mapping(string => TicketSales) public tickets;

    constructor() payable {
        owner = payable(msg.sender);
    }

    event Buy(string id, uint quantity);

    modifier isListed(string memory _id) {
        require(tickets[_id].price > 0, "Ticket not listed");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You aren't the owner");
        _;
    }

    modifier inStock(string memory _id, uint _quantity) {
        require(tickets[_id].stock >= _quantity, "Not enough stock");
        _;
    }

    modifier hasEnoughFunds(string memory _id, uint _quantity) {
        require(
            msg.value >= tickets[_id].price * _quantity,
            "Not enough funds"
        );
        _;
    }

    modifier hasEnoughBalance() {
        require(address(this).balance > 0, "Nothing to withdraw");
        _;
    }

    function list(TicketSales memory _sale) public onlyOwner {
        tickets[_sale.name] = _sale;
    }

    function buy(
        string memory _id,
        uint _quantity
    )
        public
        payable
        isListed(_id)
        inStock(_id, _quantity)
        hasEnoughFunds(_id, _quantity)
    {
        tickets[_id].stock -= _quantity;

        emit Buy(_id, _quantity);
    }

    function withdraw() public onlyOwner hasEnoughBalance {
        owner.transfer(address(this).balance);
    }
}
