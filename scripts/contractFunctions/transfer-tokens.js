const { ethers } = require("hardhat");

async function transfer() {
    let accounts = await ethers.getSigners();
    const deployer = accounts[0];
    const user1 = accounts[1];
    const AMOUNT = ethers.utils.parseUnits("10");

    await transferTokens(deployer.address, user1.address, AMOUNT);
}

async function transferTokens(from, to, amount) {
    console.log(`Tranfering ${amount / 1e18} AP48 from ${from} to ${to}...`);

    propertyToken = await ethers.getContract("PropertyToken", from);

    const transactionResponse = await propertyToken.transfer(to, amount);
    await transactionResponse.wait(1);
    console.log("Transfered!");

    let fromBalance = await propertyToken.balanceOf(from);
    let toBalance = await propertyToken.balanceOf(to);
    console.log(`Balance of ${from}: ${fromBalance / 1e18} AP48`);
    console.log(`Balance of ${to}: ${toBalance / 1e18} AP48`);
}

transfer()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
