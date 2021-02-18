## `MultisigControl`






### `set_threshold(uint16 new_threshold, uint256 nonce, bytes signatures)` (public)

Sets threshold of signatures that must be met before function is executed.
See MultisigControl for more about signatures
Ethereum has no decimals, threshold is % * 10 so 50% == 500 100% == 1000
signatures are OK if they are >= threshold count of total valid signers


Emits ThresholdSet event

### `add_signer(address new_signer, uint256 nonce, bytes signatures)` (public)

Adds new valid signer and adjusts signer count.
See MultisigControl for more about signatures


Emits 'SignerAdded' event

### `remove_signer(address old_signer, uint256 nonce, bytes signatures)` (public)

Removes currently valid signer and adjusts signer count.
See MultisigControl for more about signatures


Emits 'SignerRemoved' event

### `verify_signatures(bytes signatures, bytes message, uint256 nonce) → bool` (public)

Verifies a signature bundle and returns true only if the threshold of valid signers is met,
this is a function that any function controlled by Vega MUST call to be securely controlled by the Vega network
message to hash to sign follows this pattern:
abi.encode( abi.encode(param1, param2, param3, ... , nonce, function_name_string), validating_contract_or_submitter_address);
Note that validating_contract_or_submitter_address is the submitting party. If on MultisigControl contract itself, it's the submitting ETH address
if function on bridge that then calls Multisig, then it's the address of that contract
Note also the embedded encoding, this is required to verify what function/contract the function call goes to




### `get_valid_signer_count() → uint8` (public)





### `get_current_threshold() → uint16` (public)





### `is_valid_signer(address signer_address) → bool` (public)





### `is_nonce_used(uint256 nonce) → bool` (public)






### `SignerAdded(address new_signer, uint256 nonce)`





### `SignerRemoved(address old_signer, uint256 nonce)`





### `ThresholdSet(uint16 new_threshold, uint256 nonce)`





