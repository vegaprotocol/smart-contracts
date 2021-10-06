//SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IVesting {
  /// @notice this function allows the conroller or permitted issuer to issue tokens from this contract itself (no tranches) into the specified tranche
  function issue_into_tranche (
    address user,
    uint8 tranche,
    uint256 amount
  ) external;
}
