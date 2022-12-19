const { network, ethers, upgrades } = require("hardhat");
const { developmentChains } = require("../../../helper-hardhat-config");
const { verify } = require("../../../utils/verify");

const PROPERTY_TOKEN_UPGRADE = process.env.PROPERTY_TOKEN_UPGRADE;
const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

async function main() {
    let proxyPropertyToken;
    if (PROPERTY_TOKEN_UPGRADE && PROXY_ADDRESS) {
        const PropertyTokenUpgrade = await ethers.getContractFactory(PROPERTY_TOKEN_UPGRADE);
        proxyPropertyToken = await upgrades.upgradeProxy(PROXY_ADDRESS, PropertyTokenUpgrade);
        console.log("Waiting a few blocks...");
        await proxyPropertyToken.deployTransaction.wait(2);
        console.log("Your upgraded proxy is done!", proxyPropertyToken.address);
    } else {
        console.log(
            "The new version of contract name or/and proxy address are not defined to perform the update\n" +
                "Please add them in the .env file"
        );
    }

    if (!developmentChains.includes(network.name) && process.env.POLYGONSCAN_API_KEY) {
        console.log("Verify...");
        await verify(proxyPropertyToken.address, []);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
