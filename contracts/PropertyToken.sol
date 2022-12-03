// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

error PropertyToken__TransferFailed();
error PropertyToken__NotEnoughForWithdrawal();

/// @title A contract for receiving and spliting the rent in real estate
/// @author Sorin Jitianu
/// @notice This contract is used to receive the rental payment for a property
///         and split the rental to all the token holders of the contract by
///         their token amount
/// @dev All function calls are currently implemented without side effects
/// @custom:experimental this is an experimental contract
contract PropertyToken is ERC20 {
    uint256 private s_totalEarnings;

    mapping(address => uint256) private s_leftForWithdrawal;
    mapping(address => uint256) private s_snapshotTotalEarnings;

    /// @notice Used for emiting the depositing inforamtion
    /// @param from the address that deposited the amount
    /// @param amount the amount deposited
    event Deposited(address indexed from, uint256 indexed amount);

    /// @notice Used for emiting the withdraw information
    /// @param to the address who withdrawn the amount
    /// @param amount the amount withdrawn
    event Withdrawn(address indexed to, uint256 indexed amount);

    /// @notice Constructor
    /// @param totalSupply total supply for the tokens
    /// @dev Sets the values for {totalSupply}, {name} and {symbol}.
    ///      The default value of {decimals} is 18
    constructor(uint256 totalSupply) ERC20("AP48 BL01 SCA", "AP48") {
        _mint(msg.sender, totalSupply * 10 ** decimals());
    }

    /// @notice Receive function
    receive() external payable {
        deposit();
    }

    /// @notice Fallback function
    fallback() external payable {
        deposit();
    }

    /// @notice Deposit the amount that has to be payed
    /// @dev The amount deposited is added to the total earnings all time.
    ///      Emits a {Deposited} event.
    function deposit() public payable {
        s_totalEarnings += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw the amount desired from the dividends accumulated
    /// @dev The amount required is checked if is enought for withdrawing.
    ///      Revert if transfer is not successful.
    ///      Emits a {Withdrawn} event.
    /// @param amount the amount required for withdrawing
    function withdraw(uint256 amount) public {
        updateDividend(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert PropertyToken__TransferFailed();
        }
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Update the dividend for the account
    /// @param account the account to update the dividend
    function updateDividend(address account) internal {
        updateDividend(account, 0);
    }

    /// @notice Update the dividend for the account and adjust the available amount
    ///         for withdrawal
    /// @dev Require that available amount for withdrawal to be more than
    ///      amount required for withdrawal.
    /// @param account the account to update the dividend
    /// @param amountToWithdraw the amount to withdraw
    function updateDividend(address account, uint256 amountToWithdraw) internal {
        uint256 availableForWithdrawal = getAvailableForWithdrawal(account);
        if (availableForWithdrawal < amountToWithdraw) {
            revert PropertyToken__NotEnoughForWithdrawal();
        }
        unchecked {
            s_leftForWithdrawal[account] = availableForWithdrawal - amountToWithdraw;
        }
        s_snapshotTotalEarnings[account] = s_totalEarnings;
    }

    /// @notice Used to update the dividend for sender and receiver of the tokens
    ///         everytime before the transfer is done
    /// @dev The check of the `from` address to not be zero address is done to make
    ///      sure we don't update anything when the tokens are minted in the first time.
    /// @param from the address who sends the tokens
    /// @param to the address who receive the tokens
    /// @param amount the amount of tokens to be transfered
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20) {
        super._beforeTokenTransfer(from, to, amount);
        if (address(0) != from) {
            updateDividend(from);
            updateDividend(to);
        }
    }

    /// @notice get total earnings received all time
    function getTotalEarnings() public view returns (uint256) {
        return s_totalEarnings;
    }

    /// @notice get the left amount for withdrawal for the account
    /// @param account the account
    function getLeftForWithdrawal(address account) public view returns (uint256) {
        return s_leftForWithdrawal[account];
    }

    /// @notice get the snapshot of total earings for the account
    /// @param account the account
    function getSnapshotTotalEarnings(address account) public view returns (uint256) {
        return s_snapshotTotalEarnings[account];
    }

    /// @notice get the available amount for withdrawal for the account
    /// @param account the account
    /// @return availableForWithdrawal the available amount for withdrawal
    function getAvailableForWithdrawal(
        address account
    ) public view returns (uint256 availableForWithdrawal) {
        uint256 owed = s_totalEarnings - s_snapshotTotalEarnings[account];
        availableForWithdrawal =
            s_leftForWithdrawal[account] +
            (balanceOf(account) * owed) /
            totalSupply();
    }
}
