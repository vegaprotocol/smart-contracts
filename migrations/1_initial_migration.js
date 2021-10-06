const abi = require("ethereumjs-abi");
const crypto = require("crypto");
const ethUtil = require("ethereumjs-util");
const fs = require("fs-extra");

const Migrations = artifacts.require("Migrations");

const Base_Faucet_Token = artifacts.require("Base_Faucet_Token");
const MultisigControl = artifacts.require("MultisigControl");
const ERC20_Asset_Pool = artifacts.require("ERC20_Asset_Pool");
const ERC20_Bridge_Logic = artifacts.require("ERC20_Bridge_Logic");
const ERC20_Vesting = artifacts.require("ERC20_Vesting");
const Vega_Staking_Bridge = artifacts.require("Vega_Staking_Bridge");

function multisign(
  param_types,
  params,
  function_name,
  sender,
  validator_privkeys
) {
  let nonce = new ethUtil.BN(crypto.randomBytes(32));
  params.push(nonce);
  param_types.push("uint256");
  params.push(function_name);
  param_types.push("string");
  let encoded = abi.rawEncode(
    ["bytes", "address"],
    [abi.rawEncode(param_types, params), sender]
  );
  let msg_hash = ethUtil.keccak256(encoded);
  let sigs = "0x";
  for (let privkey of validator_privkeys) {
    let sig = ethUtil.ecsign(msg_hash, privkey);
    sigs += sig.r.toString("hex");
    sigs += sig.s.toString("hex");
    sigs += sig.v.toString(16);
  }
  return {
    nonce: nonce,
    sigs: sigs,
  };
}

async function set_threshold(
  multisigcontrol_instance,
  new_threshold,
  sender_address,
  validator_privkeys,
  gas,
  gasPrice
) {
  let ms = multisign(
    ["uint16"],
    [new_threshold],
    "set_threshold",
    sender_address,
    validator_privkeys
  );
  await multisigcontrol_instance.methods
    .set_threshold(new_threshold, ms.nonce, ms.sigs)
    .send({
      gas: gas,
      gasPrice: gasPrice,
      from: sender_address,
    });
}

async function add_signer(
  multisigcontrol_instance,
  new_signer,
  sender_address,
  validator_privkeys,
  gas,
  gasPrice
) {
  let ms = multisign(
    ["address"],
    [new_signer],
    "add_signer",
    sender_address,
    validator_privkeys
  );
  await multisigcontrol_instance.methods
    .add_signer(new_signer, ms.nonce, ms.sigs)
    .send({
      gas: gas,
      gasPrice: gasPrice,
      from: sender_address,
    });
}

async function remove_signer(
  multisigcontrol_instance,
  old_signer,
  sender_address,
  validator_privkeys,
  gas,
  gasPrice
) {
  let ms = multisign(
    ["address"],
    [old_signer],
    "remove_signer",
    sender_address,
    validator_privkeys
  );
  await multisigcontrol_instance.methods
    .remove_signer(old_signer, ms.nonce, ms.sigs)
    .send({
      gas: gas,
      gasPrice: gasPrice,
      from: sender_address,
    });
}

async function add_signers() {
  // ASSUMPTION: The contract creator is a signer.
  try {
    let cfg = require(configfilename);
    let abi = require(cfg.multisigcontrol.abi_filename);
    let w3 = new Web3(new HDWalletProvider(cfg.HDWalletProvider));
    let multisigcontrol_instance = new w3.eth.Contract(
      abi,
      cfg.multisigcontrol.address
    );

    // Set the threshold to 1/1000 so we only need one signature for later operations.
    await set_threshold(
      multisigcontrol_instance,
      1, // 0 < threshold <= 1000
      cfg.source.pubkey,
      [Buffer.from(cfg.source.privkey, "hex")],
      cfg.ethereum.gas,
      cfg.ethereum.gasPrice
    );

    for (let i = 0; i < cfg.new_signers.length && run; i++) {
      // Add a signer
      await add_signer(
        multisigcontrol_instance,
        cfg.new_signers[i],
        cfg.source.pubkey,
        [Buffer.from(cfg.source.privkey, "hex")],
        cfg.ethereum.gas,
        cfg.ethereum.gasPrice
      );
      console.log("Added MultisigControl signer: " + cfg.new_signers[i]);
    }

    // Finally, set the threshold to the proper value
    await set_threshold(
      multisigcontrol_instance,
      500, // 0 < threshold <= 1000
      cfg.source.pubkey,
      [Buffer.from(cfg.source.privkey, "hex")],
      cfg.ethereum.gas,
      cfg.ethereum.gasPrice
    );

    process.exit(0);
  } catch (e) {
    console.error("Caught an exception: " + e + JSON.stringify(e));
    process.exit(1);
  }
}

async function erc20_asset_pool_set_bridge_address(
  erc20_asset_pool_instance,
  bridge_address,
  validator_privkeys // list
) {
  let ms = multisign(
    ["address"],
    [bridge_address],
    "set_bridge_address",
    erc20_asset_pool_instance.address,
    validator_privkeys
  );
  await erc20_asset_pool_instance.set_bridge_address(
    bridge_address,
    ms.nonce,
    ms.sigs
  );
}

async function list_asset_on_bridge(
  bridge_instance,
  asset_address,
  cfg,
  validator_privkeys
) {
  let ms = multisign(
    ["address", "bytes32"],
    [asset_address, cfg.vega_id],
    "list_asset",
    bridge_instance.address,
    validator_privkeys
  );

  return await bridge_instance.list_asset(
    asset_address,
    cfg.vega_id,
    ms.nonce,
    ms.sigs
  );
}

module.exports = async function (deployer) {
  let validator_list = [
    "0x539ac90d9523f878779491D4175dc11AD09972F0",
    "0x7629Faf5B7a3BB167B6f2F86DB5fB7f13B20Ee90",
    "0x5945ae02D5EE15181cc4AC0f5EaeF4C25Dc17Aa8",
    "0xEbD0509923b3a1788032996f8B0fAC34803991fc",
  ];

  deployer.deploy(Migrations);

  // Contracts
  await deployer.deploy(MultisigControl);
  let multisigcontrol_instance = await MultisigControl.deployed();

  await deployer.deploy(ERC20_Asset_Pool, MultisigControl.address);
  let logic_1 = await deployer.deploy(
    ERC20_Bridge_Logic,
    ERC20_Asset_Pool.address,
    MultisigControl.address
  );
  let logic_2 = await deployer.deploy(
    ERC20_Bridge_Logic,
    ERC20_Asset_Pool.address,
    MultisigControl.address
  );
  let erc20_asset_pool_instance = await ERC20_Asset_Pool.deployed();

  let initial_validators = [
    Buffer.from(
      "adef89153e4bd6b43876045efdd6818cec359340683edaec5e8588e635e8428b",
      "hex"
    ),
  ];

  await erc20_asset_pool_set_bridge_address(
    erc20_asset_pool_instance,
    logic_1.address,
    initial_validators
  );

  addresses = {
    MultisigControl: MultisigControl.address,
    ERC20_Asset_Pool: ERC20_Asset_Pool.address,
    logic_1: logic_1.address,
    logic_2: logic_2.address,
    tBTC: "0xC912F059b4eCCEF6C969B2E0e2544A1A2581C094", // tBTC (TEST)
    tDAI: "0x6E3b01547c634942F9073CE863682ab32Dc500fc", // tDAI (TEST)
    tEURO: "0xD03f574C22EC71b5834DAE1D4cfBD00AcbAfAb89", // tEURO (TEST)
    tUSDC: "0xCc1dE7A9ff1dF05B9f0e49CBfFCA1D02cb5a0E40", // tUSDC (TEST)
  };

  // Tokens
  let token_config = [
    // {
    //   "name": "BTC (TEST)",
    //   "symbol": "tBTC",
    //   "decimals": 5,
    //   "total_supply_whole_tokens": "0",
    //   "faucet_amount": "100000",
    //   "vega_id": "0x5cfa87844724df6069b94e4c8a6f03af21907d7bc251593d08e4251043ee9f7c"
    // },
    // {
    //   "name": "DAI (TEST)",
    //   "symbol": "tDAI",
    //   "decimals": 5,
    //   "total_supply_whole_tokens": "0",
    //   "faucet_amount": "10000000000",
    //   "vega_id": "0x6d9d35f657589e40ddfb448b7ad4a7463b66efb307527fedd2aa7df1bbd5ea61"
    // },
    // {
    //   "name": "EURO (TEST)",
    //   "symbol": "tEURO",
    //   "decimals": 5,
    //   "total_supply_whole_tokens": "0",
    //   "faucet_amount": "10000000000",
    //   "vega_id": "0x8b52d4a3a4b0ffe733cddbc2b67be273816cfeb6ca4c8b339bac03ffba08e4e4"
    // },
    // {
    //   "name": "USDC (TEST)",
    //   "symbol": "tUSDC",
    //   "decimals": 5,
    //   "total_supply_whole_tokens": "0",
    //   "faucet_amount": "10000000000",
    //   "vega_id": "0x993ed98f4f770d91a796faab1738551193ba45c62341d20597df70fea6704ede"
    // },
    {
      name: "VEGA (devnet)",
      symbol: "VEGA",
      decimals: 18,
      total_supply_whole_tokens: "64999723",
      faucet_amount: (1e18).toString(),
      vega_id:
        "0xfc7fd956078fb1fc9db5c19b88f0874c4299b2a7639ad05a47a28c0aef291b55", // b4f2726571fbe8e33b442dc92ed2d7f0d810e21835b7371a7915a365f07ccd9b",
    },
    {
      name: "Vega V1 (devnet) (do not use)",
      symbol: "VEGAv1",
      decimals: 18,
      total_supply_whole_tokens: "64999723",
      faucet_amount: (1e18).toString(),
      vega_id:
        "0xc1607f28ec1d0a0b36842c8327101b18de2c5f172585870912f5959145a9176c",
    },
  ];
  for (let i = 0; i < token_config.length; i++) {
    let token_contract = await deployer.deploy(
      Base_Faucet_Token,
      token_config[i].name,
      token_config[i].symbol,
      token_config[i].decimals,
      token_config[i].total_supply_whole_tokens,
      token_config[i].faucet_amount
    );
    addresses[token_config[i].symbol] = token_contract.address;
  }

  // Listing tokens on bridge
  for (let i = 0; i < token_config.length; i++) {
    try {
      let result = await list_asset_on_bridge(
        logic_1,
        addresses[token_config[i].symbol],
        token_config[i],
        initial_validators
      );
      console.log(
        `Listed ${token_config[i].symbol} block ${result.receipt.blockNumber} ` +
          `tx ${result.receipt.transactionHash} gas ${result.receipt.cumulativeGasUsed}`
      );
    } catch (e) {
      console.log(
        `Caught an exception trying to list ${token_config[i].symbol}: ${e}`
      );
      process.exit(1);
    }
  }

  // setup the staking bridge.
  let staking = await deployer.deploy(Vega_Staking_Bridge, addresses["VEGA"]);
  addresses["staking_bridge"] = staking.address;

  let erc20_vesting = await deployer.deploy(
    ERC20_Vesting,
    addresses["VEGAv1"],
    addresses["VEGA"],
    [],
    []
  );
  addresses["erc20_vesting"] = erc20_vesting.address;

  // New migrations go just above this comment.

  // Save data
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
};
