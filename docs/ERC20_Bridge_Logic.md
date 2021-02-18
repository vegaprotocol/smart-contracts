## `ERC20_Bridge_Logic`

This contract is used by Vega network users to deposit and withdraw ERC20 tokens to/from Vega.




### `constructor(address erc20_asset_pool, address multisig_control)` (public)





### `list_asset(address asset_source, bytes32 vega_asset_id, uint256 nonce, bytes signatures)` (public)

This function lists the given ERC20 token contract as valid for deposit to this bridge
See MultisigControl for more about signatures


Emits Asset_Listed if successful

### `remove_asset(address asset_source, uint256 nonce, bytes signatures)` (public)

This function removes from listing the given ERC20 token contract. This marks the token as invalid for deposit to this bridge
See MultisigControl for more about signatures


Emits Asset_Removed if successful

### `set_deposit_minimum(address asset_source, uint256 minimum_amount, uint256 nonce, bytes signatures)` (public)

This function sets the minimum allowable deposit for the given ERC20 token
See MultisigControl for more about signatures


Emits Asset_Deposit_Minimum_Set if successful

### `set_deposit_maximum(address asset_source, uint256 maximum_amount, uint256 nonce, bytes signatures)` (public)

This function sets the maximum allowable deposit for the given ERC20 token
See MultisigControl for more about signatures


Emits Asset_Deposit_Maximum_Set if successful

### `withdraw_asset(address asset_source, uint256 amount, uint256 expiry, address target, uint256 nonce, bytes signatures)` (public)

This function withdrawals assets to the target Ethereum address
See MultisigControl for more about signatures


Emits Asset_Withdrawn if successful

### `deposit_asset(address asset_source, uint256 amount, bytes32 vega_public_key)` (public)

This function allows a user to deposit given ERC20 tokens into Vega
ERC20 approve function should be run before running this

MUST emit Asset_Deposited if successful
ERC20 approve function should be run before running this


### `is_asset_listed(address asset_source) → bool` (public)

This view returns true if the given ERC20 token contract has been listed valid for deposit




### `get_deposit_minimum(address asset_source) → uint256` (public)

This view returns minimum valid deposit




### `get_deposit_maximum(address asset_source) → uint256` (public)

This view returns maximum valid deposit




### `get_multisig_control_address() → address` (public)





### `get_vega_asset_id(address asset_source) → bytes32` (public)





### `get_asset_source(bytes32 vega_asset_id) → address` (public)






