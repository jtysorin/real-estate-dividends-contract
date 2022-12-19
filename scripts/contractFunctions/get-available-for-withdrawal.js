const { getNamedAccounts, ethers } = require("hardhat");

async function withdraw() {
    const user = (await getNamedAccounts()).deployer;

    const propertyToken = await ethers.getContract("PropertyToken", user);
    const availableForWithdrawal = await propertyToken.getAvailableForWithdrawal(user);

    console.log(
        `Account ${user} has available for withdrawal: ${availableForWithdrawal / 1e18} ETH`
    );
}

withdraw()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
