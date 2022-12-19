const { network, ethers, upgrades } = require("hardhat");
const { developmentChains, INITIAL_SUPPLY } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function () {
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    console.log("Deploying PropertyToken, ProxyAdmin, and then Proxy...");
    const proxyPropertyToken = await upgrades.deployProxy(PropertyToken, [INITIAL_SUPPLY], {
        initializer: "initialize",
    });
    await proxyPropertyToken.deployed();
    console.log("Proxy of PropertyToken deployed to:", proxyPropertyToken.address);

    if (!developmentChains.includes(network.name) && process.env.POLYGONSCAN_API_KEY) {
        console.log("Waiting a few blocks...");
        await proxyPropertyToken.deployTransaction.wait(3);
        console.log("Verify...");
        await verify(proxyPropertyToken.address, []);
    }
    console.log("__________________________________________");
};

module.exports.tags = ["all", "propertytoken"];
