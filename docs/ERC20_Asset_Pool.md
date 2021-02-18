## `ERC20_Asset_Pool`

This contract is the target for all deposits to the ERC20 Bridge via ERC20_Bridge_Logic




### `constructor(address multisig_control)` (public)

Emits Multisig_Control_Set event



### `set_multisig_control(address new_address, uint256 nonce, bytes signatures)` (public)

See MultisigControl for more about signatures
Emits Multisig_Control_Set event



### `set_bridge_address(address new_address, uint256 nonce, bytes signatures)` (public)

See MultisigControl for more about signatures
Emits Bridge_Address_Set event



### `withdraw(address token_address, address target, uint256 amount) → bool` (public)

This function can only be run by the current "multisig_control_address" and, if available, will send the target tokens to the target


amount is in whatever the lowest decimal value the ERC20 token has. For instance, an 18 decimal ERC20 token, 1 "amount" == 0.000000000000000001



### `Multisig_Control_Set(address new_address)`





### `Bridge_Address_Set(address new_address)`





