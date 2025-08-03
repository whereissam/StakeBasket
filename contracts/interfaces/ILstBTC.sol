// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILstBTC
 * @dev Interface for Liquid Staking Bitcoin functionality
 */
interface ILstBTC {
    function mint(uint256 coreBTCAmount) external returns (uint256);
    function redeem(uint256 lstBTCAmount) external returns (uint256);
    function getExchangeRate() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}