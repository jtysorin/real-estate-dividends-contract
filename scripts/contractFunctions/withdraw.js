const { ethers } = require("hardhat");

async function withdraw() {
    let accounts = await ethers.getSigners();
    const user = accounts[0];
    const userAddress = user.address;
    const ETH_AMOUNT = ethers.utils.parseEther("3.000010000001");

    propertyToken = await ethers.getContract("PropertyToken", userAddress);
    console.log(`Withdrawing ${ETH_AMOUNT / 1e18} ETH from Contract...`);
    const transactionResponse = await propertyToken.withdraw(ETH_AMOUNT);
    await transactionResponse.wait(1);
    console.log("Withdrawed!");

    let balance = await ethers.provider.getBalance(userAddress);
    console.log(userAddress);
    console.log(`Current balance: ${(balance / 1e18).toString()}`);
}

withdraw()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
