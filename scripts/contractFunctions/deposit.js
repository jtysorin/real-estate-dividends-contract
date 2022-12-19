const { ethers } = require("hardhat");

async function deposit() {
    let accounts = await ethers.getSigners();
    const user = accounts[0];
    const userAddress = user.address;
    const ETH_AMOUNT = ethers.utils.parseEther("10");

    propertyToken = await ethers.getContract("PropertyToken", userAddress);
    console.log(`Depositing ${ETH_AMOUNT / 1e18} ETH...`);
    const transactionResponse = await propertyToken.deposit({
        value: ETH_AMOUNT,
    });
    await transactionResponse.wait(1);
    console.log(`${userAddress} successfully deposited!`);

    let balance = await ethers.provider.getBalance(propertyToken.address);
    console.log(`Balance contract: ${(balance / 1e18).toString()} ETH`);
}

deposit()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
