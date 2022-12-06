const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers, upgrades } = require("hardhat");
const { developmentChains, INITIAL_SUPPLY } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Property Token Proxy Tests", () => {
          let PropertyToken, propertyToken, deployer, user1;
          const ONE_ETHER = ethers.utils.parseEther("1");

          beforeEach(async () => {
              const accounts = await getNamedAccounts();
              deployer = accounts.deployer;
              user1 = accounts.user1;

              PropertyToken = await ethers.getContractFactory("PropertyToken");
              propertyToken = await upgrades.deployProxy(PropertyToken, [INITIAL_SUPPLY], {
                  initializer: "initialize",
              });
          });

          it("was deployed", async () => {
              assert(propertyToken.address);
          });

          describe("constructor", () => {
              it("sets the initial supply correctly", async () => {
                  const totalSupply = (await propertyToken.totalSupply()).toString();
                  assert.equal(totalSupply, ethers.utils.parseEther(INITIAL_SUPPLY));
              });

              it("initializes the token with the correct name and symbol", async () => {
                  const symbol = (await propertyToken.symbol()).toString();
                  const name = (await propertyToken.name()).toString();

                  assert.equal(name, "AP48 BL01 SCA");
                  assert.equal(symbol, "AP48");
              });
          });

          describe("minting", () => {
              it("deployer can mint", async () => {
                  try {
                      const mint = await propertyToken._mint(user1, 100);
                      assert(false);
                  } catch (e) {
                      assert(e);
                  }
              });
          });

          describe("receive and fallback", () => {
              it("should invoke the receive function", async () => {
                  const accounts = await ethers.getSigners();
                  const tx = accounts[0].sendTransaction({
                      to: propertyToken.address,
                      data: "0x",
                      value: ONE_ETHER.toString(),
                  });
                  await expect(tx)
                      .to.emit(propertyToken, "Deposited")
                      .withArgs(accounts[0].address, ONE_ETHER);
              });

              it("should invoke the fallback function", async () => {
                  const accounts = await ethers.getSigners();
                  const tx = accounts[0].sendTransaction({
                      to: propertyToken.address,
                      data: "0x0000000000000000000000000000000000000001",
                      value: ONE_ETHER.toString(),
                  });
                  await expect(tx)
                      .to.emit(propertyToken, "Deposited")
                      .withArgs(accounts[0].address, ONE_ETHER);
              });
          });

          describe("deposit", () => {
              it("should increase the total earnings when deposit", async () => {
                  const initialTotalEarnings = await propertyToken.getTotalEarnings();
                  await propertyToken.deposit({ value: ONE_ETHER });
                  const totalEarnings = await propertyToken.getTotalEarnings();
                  assert.equal(
                      totalEarnings.toString(),
                      initialTotalEarnings.add(ONE_ETHER).toString()
                  );
              });

              it("should get the correct available for withdrawal when deposit", async () => {
                  await propertyToken.deposit({ value: ONE_ETHER });
                  const availableForWithdrawal = await propertyToken.getAvailableForWithdrawal(
                      deployer
                  );
                  assert.equal(availableForWithdrawal.toString(), ONE_ETHER.toString());
              });

              it("should emit Deposited when deposit", async () => {
                  await expect(propertyToken.deposit({ value: ONE_ETHER }))
                      .to.emit(propertyToken, "Deposited")
                      .withArgs(deployer, ONE_ETHER);
              });
          });

          describe("withdraw", () => {
              it("should receive the amount when withdraw", async () => {
                  const accounts = await ethers.getSigners();
                  await propertyToken.deposit({ value: ONE_ETHER });
                  const initialBalance = await accounts[0].getBalance();

                  const transactionResponse = await propertyToken.withdraw(ONE_ETHER);
                  const transactionReceipt = await transactionResponse.wait(1);
                  const { gasUsed, effectiveGasPrice } = transactionReceipt;
                  const gasCost = gasUsed.mul(effectiveGasPrice);

                  const balance = await accounts[0].getBalance();

                  assert.equal(
                      initialBalance.add(ONE_ETHER).toString(),
                      balance.add(gasCost).toString()
                  );
              });

              it("should have left the correct amount when partial withdraw", async () => {
                  await propertyToken.deposit({ value: ONE_ETHER });
                  await propertyToken.withdraw(ethers.utils.parseEther("0.2").toString());
                  const leftForWithdrawal = await propertyToken.getLeftForWithdrawal(deployer);
                  const availableForWithdrawal = await propertyToken.getAvailableForWithdrawal(
                      deployer
                  );

                  assert.equal(leftForWithdrawal, ethers.utils.parseEther("0.8").toString());
                  assert.equal(availableForWithdrawal, ethers.utils.parseEther("0.8").toString());
              });

              it("should emit Withdrawn when withdraw", async () => {
                  await propertyToken.deposit({ value: ONE_ETHER });
                  await expect(propertyToken.withdraw(ONE_ETHER))
                      .to.emit(propertyToken, "Withdrawn")
                      .withArgs(deployer, ONE_ETHER);
              });

              it("should revert when you don't have enough", async () => {
                  await propertyToken.deposit({ value: ONE_ETHER });
                  await expect(
                      propertyToken.withdraw(ethers.utils.parseEther("2"))
                  ).to.be.revertedWith("PropertyToken__NotEnoughForWithdrawal");
              });
          });

          describe("transfers", () => {
              it("should update the dividends when transfer tokens", async () => {
                  await propertyToken.deposit({ value: ONE_ETHER });
                  const totalEarnings = await propertyToken.getTotalEarnings();
                  const tokensToSend = ethers.utils.parseUnits("10").toString();
                  await propertyToken.transfer(user1, tokensToSend);
                  const snapshotTotalEarningsDeployer =
                      await propertyToken.getSnapshotTotalEarnings(deployer);
                  const snapshotTotalEarningsUser1 = await propertyToken.getSnapshotTotalEarnings(
                      user1
                  );
                  assert.equal(totalEarnings.toString(), snapshotTotalEarningsDeployer.toString());
                  assert.equal(totalEarnings.toString(), snapshotTotalEarningsUser1.toString());
              });
          });

          describe("hard tests with deposit, withdraw, and transfers", () => {
              it("should partial withdraw then fully withdraw after one more deposit", async () => {
                  // part 1. partial withdraw 0.2 ethers from 1 ether
                  // part 2. deposit one more ether
                  // part 3. withdraw everything is left 1.8 ethers
                  let initialBalance,
                      balance,
                      totalEarnings,
                      snapshotTotalEarnings,
                      leftForWithdrawal,
                      availableForWithdrawal;
                  const accounts = await ethers.getSigners();

                  // part 1. partial withdraw 0.2 ethers from 1 ether
                  await propertyToken.deposit({ value: ONE_ETHER });
                  totalEarnings = await propertyToken.getTotalEarnings();
                  initialBalance = await accounts[0].getBalance();

                  const transactionResponse = await propertyToken.withdraw(
                      ethers.utils.parseUnits("0.2").toString()
                  );
                  const transactionReceipt = await transactionResponse.wait(1);
                  const { gasUsed, effectiveGasPrice } = transactionReceipt;
                  const gasCost = gasUsed.mul(effectiveGasPrice);

                  balance = await accounts[0].getBalance();

                  assert.equal(
                      initialBalance.add(ethers.utils.parseUnits("0.2").toString()).toString(),
                      balance.add(gasCost).toString()
                  );

                  snapshotTotalEarnings = await propertyToken.getSnapshotTotalEarnings(deployer);
                  leftForWithdrawal = await propertyToken.getLeftForWithdrawal(deployer);
                  availableForWithdrawal = await propertyToken.getAvailableForWithdrawal(deployer);
                  assert.equal(totalEarnings.toString(), ONE_ETHER.toString());
                  assert.equal(snapshotTotalEarnings.toString(), ONE_ETHER.toString());
                  assert.equal(
                      leftForWithdrawal.toString(),
                      ethers.utils.parseUnits("0.8").toString()
                  );

                  assert.equal(
                      availableForWithdrawal.toString(),
                      ethers.utils.parseUnits("0.8").toString()
                  );

                  // part 2. deposit one more ether
                  await propertyToken.deposit({ value: ONE_ETHER });

                  totalEarnings = await propertyToken.getTotalEarnings();
                  snapshotTotalEarnings = await propertyToken.getSnapshotTotalEarnings(deployer);
                  leftForWithdrawal = await propertyToken.getLeftForWithdrawal(deployer);
                  availableForWithdrawal = await propertyToken.getAvailableForWithdrawal(deployer);
                  assert.equal(totalEarnings.toString(), ethers.utils.parseEther("2").toString());
                  assert.equal(snapshotTotalEarnings.toString(), ONE_ETHER.toString());
                  assert.equal(
                      leftForWithdrawal.toString(),
                      ethers.utils.parseUnits("0.8").toString()
                  );
                  assert.equal(
                      availableForWithdrawal.toString(),
                      ethers.utils.parseUnits("1.8").toString()
                  );

                  // part 3. withdraw everything is left 1.8 ethers
                  initialBalance = await accounts[0].getBalance();

                  const transactionResponse2 = await propertyToken.withdraw(
                      ethers.utils.parseUnits("1.8").toString()
                  );
                  const transactionReceipt2 = await transactionResponse2.wait(1);
                  const { gasUsed: gasUsed2, effectiveGasPrice: effectiveGasPrice2 } =
                      transactionReceipt2;
                  const gasCost2 = gasUsed2.mul(effectiveGasPrice2);

                  balance = await accounts[0].getBalance();

                  assert.equal(
                      initialBalance.add(ethers.utils.parseUnits("1.8").toString()).toString(),
                      balance.add(gasCost2).toString()
                  );

                  snapshotTotalEarnings = await propertyToken.getSnapshotTotalEarnings(deployer);
                  leftForWithdrawal = await propertyToken.getLeftForWithdrawal(deployer);
                  availableForWithdrawal = await propertyToken.getAvailableForWithdrawal(deployer);
                  assert.equal(totalEarnings.toString(), ethers.utils.parseUnits("2").toString());
                  assert.equal(
                      snapshotTotalEarnings.toString(),
                      ethers.utils.parseUnits("2").toString()
                  );
                  assert.equal(leftForWithdrawal.toString(), "0");
                  assert.equal(availableForWithdrawal.toString(), "0");
              });

              it("should receive dividends according to their tokens", async () => {
                  const accounts = await ethers.getSigners();
                  await propertyToken.deposit({ value: ONE_ETHER });
                  const tokensToSend = ethers.utils.parseUnits("10").toString();
                  await propertyToken.transfer(user1, tokensToSend);
                  await propertyToken.deposit({ value: ONE_ETHER });

                  // account[0] should withdraw 1.9 ethers
                  const deployerInitialBalance = await accounts[0].getBalance();

                  const deployerTransactionResponse = await propertyToken.withdraw(
                      ethers.utils.parseUnits("1.9").toString()
                  );
                  const deployerTransactionReceipt = await deployerTransactionResponse.wait(1);
                  const { gasUsed: deployerGasUsed, effectiveGasPrice: deployerEffectiveGasPrice } =
                      deployerTransactionReceipt;
                  const deployerGasCost = deployerGasUsed.mul(deployerEffectiveGasPrice);

                  const deployerBalance = await accounts[0].getBalance();

                  const deployerSnapshotTotalEarnings =
                      await propertyToken.getSnapshotTotalEarnings(deployer);
                  const deployerLeftForWithdrawal = await propertyToken.getLeftForWithdrawal(
                      deployer
                  );

                  assert.equal(
                      deployerInitialBalance
                          .add(ethers.utils.parseUnits("1.9").toString())
                          .toString(),
                      deployerBalance.add(deployerGasCost).toString()
                  );
                  assert.equal(
                      deployerSnapshotTotalEarnings.toString(),
                      ethers.utils.parseUnits("2").toString()
                  );
                  assert.equal(deployerLeftForWithdrawal.toString(), "0");

                  // account[1] should withdraw 0.1 ethers
                  const user1PropertyToken = propertyToken.connect(accounts[1]);
                  const user1InitialBalance = await accounts[1].getBalance();

                  const user1TransactionResponse = await user1PropertyToken.withdraw(
                      ethers.utils.parseUnits("0.1").toString()
                  );
                  const user1TransactionReceipt = await user1TransactionResponse.wait(1);
                  const { gasUsed: user1GasUsed, effectiveGasPrice: user1EffectiveGasPrice } =
                      user1TransactionReceipt;
                  const user1GasCost = user1GasUsed.mul(user1EffectiveGasPrice);

                  const user1Balance = await accounts[1].getBalance();

                  const user1SnapshotTotalEarnings =
                      await user1PropertyToken.getSnapshotTotalEarnings(deployer);
                  const user1LeftForWithdrawal = await user1PropertyToken.getLeftForWithdrawal(
                      user1
                  );

                  assert.equal(
                      user1InitialBalance.add(ethers.utils.parseUnits("0.1").toString()).toString(),
                      user1Balance.add(user1GasCost).toString()
                  );
                  assert.equal(
                      user1SnapshotTotalEarnings.toString(),
                      ethers.utils.parseUnits("2").toString()
                  );
                  assert.equal(user1LeftForWithdrawal.toString(), "0");
              });
          });
      });
