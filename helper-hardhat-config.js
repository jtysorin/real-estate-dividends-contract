const networkConfig = {
    5: {
        name: "goerli",
    },

    80001: {
        name: "polygonMumbai",
    },

    31337: {
        name: "hardhat",
    },
};

const INITIAL_SUPPLY = "100"; // 100 tokens

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
    INITIAL_SUPPLY,
};
