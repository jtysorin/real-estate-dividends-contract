const { defender } = require("hardhat");

const PROPERTY_TOKEN_UPGRADE = process.env.PROPERTY_TOKEN_UPGRADE;
const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

async function proposeUpgrade() {
    const PropertyTokenUpgrade = await ethers.getContractFactory(PROPERTY_TOKEN_UPGRADE);
    console.log("Preparing proposal...");
    const proposal = await defender.proposeUpgrade(PROXY_ADDRESS, PropertyTokenUpgrade);
    console.log("Upgrade proposal created at:", proposal.url);
}

proposeUpgrade()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
