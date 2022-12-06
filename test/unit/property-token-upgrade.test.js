const { assert, expect } = require("chai");
const { network, ethers, upgrades } = require("hardhat");
const { developmentChains, INITIAL_SUPPLY } = require("../../helper-hardhat-config");

const PROPERTY_TOKEN_UPGRADE_TEST = process.env.PROPERTY_TOKEN_UPGRADE_TEST;

!developmentChains.includes(network.name) ||
PROPERTY_TOKEN_UPGRADE_TEST == undefined ||
PROPERTY_TOKEN_UPGRADE_TEST === ""
    ? describe.skip
    : describe("Upgrading tests", function () {
          let PropertyToken, propertyToken;

          beforeEach(async () => {
              PropertyToken = await ethers.getContractFactory("PropertyToken");
              propertyToken = await upgrades.deployProxy(PropertyToken, [INITIAL_SUPPLY], {
                  initializer: "initialize",
              });
          });

          it("owner can deploy and upgrade a contract", async function () {
              const PropertyTokenUpgrade = await ethers.getContractFactory(
                  PROPERTY_TOKEN_UPGRADE_TEST
              );
              propertyToken = await upgrades.upgradeProxy(
                  propertyToken.address,
                  PropertyTokenUpgrade
              );
              const upgradedVersion = await propertyToken.getVersion();
              assert.equal(upgradedVersion.toString(), "Version 2");
          });

          it("other account then owner can not upgrade a contract", async function () {
              const user1 = (await ethers.getSigners())[1];

              const PropertyTokenUpgrade = await ethers.getContractFactory(
                  PROPERTY_TOKEN_UPGRADE_TEST,
                  user1
              );
              await expect(
                  upgrades.upgradeProxy(propertyToken.address, PropertyTokenUpgrade)
              ).to.be.revertedWith("Ownable: caller is not the owner");
          });
      });
