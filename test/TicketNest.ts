import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("TicketNest", () => {
  async function fixture() {
    const TicketNest = await hre.ethers.getContractFactory("TicketNest");
    const ticketNest = await TicketNest.deploy();
    const [owner, buyer] = await hre.ethers.getSigners();

    const tickets = [
      {
        name: "Concert",
        price: 100,
        stock: 100
      },
      {
        name: "Festival",
        price: 200,
        stock: 200
      }
    ];

    const ticket = tickets[0];

    return { ticketNest, owner, buyer, tickets, ticket };
  }

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      const { ticketNest, owner } = await loadFixture(fixture);

      expect(await ticketNest.owner()).to.equal(owner.address);
    });
  });

  describe("Listing", () => {
    it("Should list the tickets", async () => {
      const { ticketNest, tickets } = await loadFixture(fixture);

      for (const ticket of tickets) {
        await ticketNest.list(ticket);
      }

      for (const ticket of tickets) {
        const listedTicket = await ticketNest.tickets(ticket.name);

        expect(listedTicket.name).to.equal(ticket.name);
        expect(listedTicket.price).to.equal(ticket.price);
        expect(listedTicket.stock).to.equal(ticket.stock);
      }
    });
  });

  describe("Purchase", () => {
    it("Should revert if the ticket is not listed", async () => {
      const { ticketNest, buyer, ticket } = await loadFixture(fixture);

      await expect(ticketNest.connect(buyer).buy(ticket.name, 1)).to.be.revertedWith(
        "Ticket not listed"
      );
    });

    it("Should revert if there is not enough stock", async () => {
      const { ticketNest, buyer, ticket } = await loadFixture(fixture);

      await ticketNest.list(ticket);

      await expect(
        ticketNest.connect(buyer).buy(ticket.name, ticket.stock + 1)
      ).to.be.revertedWith("Not enough stock");
    });

    it("Should revert if the value sent is not enough", async () => {
      const { ticketNest, buyer, ticket } = await loadFixture(fixture);

      await ticketNest.list(ticket);

      await expect(
        ticketNest.connect(buyer).buy(ticket.name, 1, {
          value: ticket.price - 1
        })
      ).to.be.revertedWith("Not enough funds");
    });

    it("Should purchase the ticket", async () => {
      const AMOUNT = 1;
      const { ticketNest, buyer, ticket } = await loadFixture(fixture);

      await ticketNest.list(ticket);

      await ticketNest.connect(buyer).buy(ticket.name, AMOUNT, {
        value: ticket.price
      });

      const listedTicket = await ticketNest.tickets(ticket.name);

      expect(listedTicket.stock).to.equal(ticket.stock - AMOUNT);
    });

    it("Should update the balance", async () => {
      const { ticketNest, buyer, ticket } = await loadFixture(fixture);

      await ticketNest.list(ticket);

      await ticketNest.connect(buyer).buy(ticket.name, 1, {
        value: ticket.price
      });

      const balance = await hre.ethers.provider.getBalance(await ticketNest.getAddress());

      expect(balance).to.equal(ticket.price);
    });
  });

  describe("Withdraw", () => {
    it("Should revert if the caller is not the owner", async () => {
      const { ticketNest, buyer } = await loadFixture(fixture);

      await expect(ticketNest.connect(buyer).withdraw()).to.be.revertedWith(
        "You aren't the owner"
      );
    });

    it("Should revert if there is not enough balance to withdraw", async () => {
      const { ticketNest } = await loadFixture(fixture);

      await expect(ticketNest.withdraw()).to.be.revertedWith("Nothing to withdraw");
    });

    it("Should update the balance after withdraw", async () => {
      const { ticketNest, owner, ticket } = await loadFixture(fixture);

      await ticketNest.list(ticket);

      await ticketNest.connect(owner).buy(ticket.name, 1, {
        value: ticket.price
      });

      const balanceBefore = await hre.ethers.provider.getBalance(
        await ticketNest.getAddress()
      );

      await ticketNest.connect(owner).withdraw();

      const balanceAfter = await hre.ethers.provider.getBalance(
        await ticketNest.getAddress()
      );

      expect(balanceAfter).to.equal(0);
      expect(balanceBefore).to.not.equal(balanceAfter);
    });

    it("Should update the owner balance after withdraw", async () => {
      const { ticketNest, owner, ticket } = await loadFixture(fixture);

      await ticketNest.list(ticket);

      await ticketNest.connect(owner).buy(ticket.name, 1, {
        value: ticket.price
      });

      const balanceBefore = await hre.ethers.provider.getBalance(owner.address);

      await ticketNest.connect(owner).withdraw();

      const balanceAfter = await hre.ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.not.equal(balanceBefore);
    });
  });
});
