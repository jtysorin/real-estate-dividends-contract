const { network } = require("hardhat");
const { developmentChains, INITIAL_SUPPLY } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const initialSupply = INITIAL_SUPPLY;
    const args = [initialSupply];

    const propertyToken = await deploy("PropertyToken", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    log(`PropertyToken deployed at ${propertyToken.address}`);

    if (!developmentChains.includes(network.name) && process.env.POLYGONSCAN_API_KEY) {
        log("Verify...");
        await verify(propertyToken.address, args);
    }
    log("__________________________________________");
};

module.exports.tags = ["all", "propertytoken"];
