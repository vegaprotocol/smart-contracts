# Vega Smart Contracts
> "this bridge allows users of Vega to deposit and withdraw Ethereum-based tokens to and from their Vega account"

The smart contracts that make up the ERC20 bridge functionality for the [Vega](https://vega.xyz) testnet. [Read about the architecture in this blog post](https://medium.com/vegaprotocol/vega-erc20-bridge-331a5235efa2).

# Deployments
These contracts are on Ropsten. To find details and ABIs, visit [Public_Test_Bridge_Tools](https://github.com/vegaprotocol/Public_Test_Bridge_Tools).

# Audit
Pending. This repository will be updated when the audit is complete.

# Test
```
npm install
npm test:local
```

Or more manually:
* Terminal 1: `ganache-cli -m "oak bottom post title exhaust fix random poverty inherit quality drop defense"`
* Terminal 2: `truffle test`

# License
[MIT](https://choosealicense.com/licenses/mit/)
