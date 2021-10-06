const abi = require("ethereumjs-abi");
const crypto = require("crypto");
const ethUtil = require("ethereumjs-util");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs-extra");
const path = require("path");
const solc = require("solc");
const Web3 = require("web3");

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

async function multisigcontrol_set_threshold(
  multisigcontrol_instance,
  new_threshold,
  sender,
  validator_privkeys // list
) {
  console.log(`multisigcontrol: set_threshold new_threshold=${new_threshold}`);
  let ms = multisign(
    ["uint16"],
    [new_threshold],
    "set_threshold",
    sender,
    validator_privkeys
  );
  await multisigcontrol_instance.methods
    .set_threshold(new_threshold, ms.nonce, ms.sigs)
    .send({
      from: sender,
      gasPrice: (150e9).toString(),
      gas: (3e6).toString(),
    });
}

async function multisigcontrol_add_signer(
  multisigcontrol_instance,
  new_signer,
  sender,
  validator_privkeys // list
) {
  console.log(`multisigcontrol: add_signer new_signer=${new_signer}`);
  let ms = multisign(
    ["address"],
    [new_signer],
    "add_signer",
    sender,
    validator_privkeys
  );
  await multisigcontrol_instance.methods
    .add_signer(new_signer, ms.nonce, ms.sigs)
    .send({
      from: sender,
      gasPrice: (150e9).toString(),
      gas: (3e6).toString(),
    });
}

async function multisigcontrol_remove_signer(
  multisigcontrol_instance,
  old_signer,
  sender,
  validator_privkeys // list
) {
  console.log(`multisigcontrol: remove_signer old_signer=${old_signer}`);
  let ms = multisign(
    ["address"],
    [old_signer],
    "remove_signer",
    sender,
    validator_privkeys
  );
  await multisigcontrol_instance.remove_signer(old_signer, ms.nonce, ms.sigs);
}

async function erc20_asset_pool_set_bridge_address(
  erc20_asset_pool_instance,
  bridge_address,
  validator_privkeys // list
) {
  console.log(
    `erc20_asset_pool: set_bridge_address bridge_addres=${bridge_address}`
  );
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

async function erc20_bridge_list_asset(
  bridge_instance,
  asset_address,
  vega_id,
  sender,
  validator_privkeys
) {
  console.log(
    `erc20_bridge_list_asset: asset_address=${asset_address} vega_id=${vega_id}`
  );
  let ms = multisign(
    ["address", "bytes32"],
    [asset_address, vega_id],
    "list_asset",
    bridge_instance._address,
    validator_privkeys
  );
  return await bridge_instance.methods
    .list_asset(asset_address, vega_id, ms.nonce, ms.sigs)
    .send({
      from: sender,
      gasPrice: (150e9).toString(),
      gas: (3e6).toString(),
    });
}

function findImports(p) {
  return {
    contents: fs.readFileSync(path.resolve(__dirname, "contracts", p), "utf-8"),
  };
}

function load_contract(w3, contract_name, contract_address) {
  console.log(`load_contract: ${contract_name} @${contract_address}`);
  return new w3.eth.Contract(
    JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "build",
          "contracts",
          `${contract_name}_ABI.json`
        ),
        "utf-8"
      )
    ),
    contract_address
  );
}

async function deploy_contract(w3, from_addr, contract_name, args) {
  console.log(`deploy_contract: ${contract_name} args:${args} ...`);
  let filename = `${contract_name}.sol`;

  let input = {
    language: "Solidity",
    settings: {
      optimizer: {
        enabled: false,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
    sources: {},
  };
  let source = fs.readFileSync(
    path.resolve(__dirname, "contracts", filename),
    "utf-8"
  );
  input.sources[filename] = { content: source };
  let output = solc.compile(JSON.stringify(input), { import: findImports });
  if (output.errors) {
    output.errors.forEach((err) => {
      console.log("Error: " + err);
    });
    process.exit(1);
  }
  let compiled = JSON.parse(output);
  let proto = new w3.eth.Contract(
    compiled.contracts[filename][contract_name].abi,
    {
      from: from_addr,
      gasPrice: (150e9).toString(),
      gas: (3e6).toString(),
    }
  );
  instance = await proto
    .deploy({
      data: compiled.contracts[filename][contract_name].evm.bytecode.object,
      arguments: args,
    })
    .send({
      from: from_addr,
      gasPrice: (150e9).toString(),
      gas: (6e6).toString(),
    });
  console.log(`deploy_contract: ${contract_name} @${instance._address}`);
  return instance;
}

async function deploy_or_load(
  w3,
  addresses,
  contract_name,
  instance_name,
  sender,
  args
) {
  if (addresses[instance_name]) {
    return load_contract(w3, contract_name, addresses[instance_name]);
  }

  let instance = await deploy_contract(w3, sender, contract_name, args);
  addresses[instance_name] = instance._address;
  return instance;
}

async function go() {
  let mnemonic = fs.readFileSync(".mnemonic.tmp").toString().trim();
  let infura_token = fs.readFileSync(".infura-token.tmp").toString().trim();

  let w3 = new Web3(
    new HDWalletProvider({
      mnemonic: {
        phrase: mnemonic,
      },
      providerOrUrl: `https://ropsten.infura.io/v3/${infura_token}`,
    })
  );

  let addresses = {
    MultisigControl: "0x839A5012d47F18fd54BbC4fE108DC04DD2d20296", // uploaded to etherscan
    ERC20_Asset_Pool: "0x4d528692d745891D18a50581B377e9C3449f86B8", // uploaded to etherscan
    ERC20_Bridge_Logic1: "0x8e59E263c666d2768c0Ff41D19551Ba04916fdfC", // uploaded to etherscan
    ERC20_Bridge_Logic2: "0x700C219b7554b4840F99a92B258aCE87F186D617", // uploaded to etherscan
    VEGA: "0xc93137f9F4B820Ca85FfA3C7e84cCa6Ebc7bB517",
    VEGAv1: "0xBb359F61D36fCF1B6Cdb3205c08a9F0c58c3fB8A",
    tBTC: "0xC912F059b4eCCEF6C969B2E0e2544A1A2581C094",
    tDAI: "0x6E3b01547c634942F9073CE863682ab32Dc500fc",
    tEURO: "0xD03f574C22EC71b5834DAE1D4cfBD00AcbAfAb89",
    tUSDC: "0xCc1dE7A9ff1dF05B9f0e49CBfFCA1D02cb5a0E40",
    Staking_Bridge: "0x3cCe40e1e47cedf76c03db3E48507f421b575523", // uploaded to etherscan
    ERC20_Vesting: "0xd751FF6264234cAfAE88e4BF6003878fAB9630a7", // uploaded to etherscan
    Claim_Codes: "0x8Cef746ab7C83B61F6461cC92882bD61AB65a994", // uploaded to etherscan
  };
  let accounts = await w3.eth.getAccounts();

  // "ERC20_Vesting",
  // "ETH_Asset_Pool",
  // "ETH_Bridge_Logic",
  // "Vega_Staking_Bridge",

  let multisigcontrol_instance = await deploy_or_load(
    w3,
    addresses,
    "MultisigControl",
    "MultisigControl",
    accounts[0],
    []
  );
  let erc20_asset_pool_instance = await deploy_or_load(
    w3,
    addresses,
    "ERC20_Asset_Pool",
    "ERC20_Asset_Pool",
    accounts[0],
    [addresses.MultisigControl]
  );
  let erc20_bridge_logic1_instance = await deploy_or_load(
    w3,
    addresses,
    "ERC20_Bridge_Logic",
    "ERC20_Bridge_Logic1",
    accounts[0],
    [addresses.ERC20_Asset_Pool, addresses.MultisigControl]
  );
  let erc20_bridge_logic2_instance = await deploy_or_load(
    w3,
    addresses,
    "ERC20_Bridge_Logic",
    "ERC20_Bridge_Logic2",
    accounts[0],
    [addresses.ERC20_Asset_Pool, addresses.MultisigControl]
  );

  let privkey =
    "adef89153e4bd6b43876045efdd6818cec359340683edaec5e8588e635e8428b";
  let initial_validators = [Buffer.from(privkey, "hex")];

  // erc20_asset_pool_set_bridge_address(
  //   erc20_asset_pool_instance,
  //   erc20_bridge_logic1_instance._address,
  //   initial_validators
  // );

  // await multisigcontrol_set_threshold(
  //   multisigcontrol_instance,
  //   1, // 0 < threshold <= 1000
  //   accounts[0],
  //   initial_validators,
  // );

  let token_config = [
    {
      name: "Vega (devnet)",
      symbol: "VEGA",
      decimals: 18,
      total_supply_whole_tokens: "64999723",
      faucet_amount: (1e18).toString(),
      vega_id:
        "0xfc7fd956078fb1fc9db5c19b88f0874c4299b2a7639ad05a47a28c0aef291b55",
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
  // for (let i = 0; i < token_config.length; i++) {
  //   await deploy_or_load(
  //     w3,
  //     addresses,
  //     "Base_Faucet_Token",
  //     token_config[i].symbol,
  //     accounts[0],
  //     [
  //       token_config[i].name,
  //       token_config[i].symbol,
  //       token_config[i].decimals,
  //       token_config[i].total_supply_whole_tokens,
  //       token_config[i].faucet_amount,
  //     ]
  //   );
  // }

  // let validators = [
  //   "0x539ac90d9523f878779491D4175dc11AD09972F0",
  //   "0x7629Faf5B7a3BB167B6f2F86DB5fB7f13B20Ee90",
  //   "0x5945ae02D5EE15181cc4AC0f5EaeF4C25Dc17Aa8"
  // ];
  // for (let i = 0; i < validators.length; i++) {
  //   multisigcontrol_add_signer(
  //     multisigcontrol_instance,
  //     validators[i],
  //     accounts[0],
  //     initial_validators
  //   );
  // }
  // multisigcontrol_remove_signer(
  //   multisigcontrol_instance,
  //   "0xEbD0509923b3a1788032996f8B0fAC34803991fc",
  //   accounts[0],
  //   initial_validators
  // );

  // await multisigcontrol_set_threshold(
  //   multisigcontrol_instance,
  //   667, // 0 < threshold <= 1000
  //   accounts[0],
  //   initial_validators,
  // );

  let real_validators = [
    Buffer.from(
      "c9baadd63bb8d42d24e72d5d9b79052316c99a3a451521c707acdde4078b93d4",
      "hex"
    ),
    Buffer.from(
      "d643b1fd3b20e219618bbf977de6dc24105c85b7a8e67b61b9347dae0b12450a",
      "hex"
    ),
    Buffer.from(
      "5d37db95ac58a8c437617dd153846e4e8335c07b1ff4df08f00f9578e7922bd3",
      "hex"
    ),
    initial_validators[0],
  ];
  // multisigcontrol_add_signer(
  //   multisigcontrol_instance,
  //   accounts[0], // remove contract creator
  //   accounts[0],
  //   real_validators
  // );

  // await multisigcontrol_set_threshold(
  //   multisigcontrol_instance,
  //   1, // 0 < threshold <= 1000
  //   accounts[0],
  //   real_validators,
  // );

  token_config = [
    {
      symbol: "tBTC",
      vega_id:
        "0x5cfa87844724df6069b94e4c8a6f03af21907d7bc251593d08e4251043ee9f7c",
    },
    {
      symbol: "tDAI",
      vega_id:
        "0x6d9d35f657589e40ddfb448b7ad4a7463b66efb307527fedd2aa7df1bbd5ea61",
    },
    {
      symbol: "tEURO",
      vega_id:
        "0x8b52d4a3a4b0ffe733cddbc2b67be273816cfeb6ca4c8b339bac03ffba08e4e4",
    },
    {
      symbol: "tUSDC",
      vega_id:
        "0x993ed98f4f770d91a796faab1738551193ba45c62341d20597df70fea6704ede",
    },
    {
      symbol: "VEGA",
      vega_id:
        "0xb4f2726571fbe8e33b442dc92ed2d7f0d810e21835b7371a7915a365f07ccd9b",
    },
    {
      symbol: "VEGAv1",
      vega_id:
        "0xc1607f28ec1d0a0b36842c8327101b18de2c5f172585870912f5959145a9176c",
    },
  ];

  // Listing tokens on ERC20 Bridge
  // for (let i = 0; i < token_config.length; i++) {
  //   let asset_address = addresses[token_config[i].symbol];
  //   let result = await erc20_bridge_logic1_instance.methods
  //     .is_asset_listed(asset_address).call();
  //   if (result === true) {
  //     console.log(`erc20_bridge: asset ${asset_address} already listed`);
  //   } else {
  //     await erc20_bridge_list_asset(
  //       erc20_bridge_logic1_instance,
  //       addresses[token_config[i].symbol],
  //       token_config[i].vega_id,
  //       accounts[0],
  //       real_validators
  //     );
  //   }
  // }

  let staking_bridge_instance = await deploy_or_load(
    w3,
    addresses,
    "Vega_Staking_Bridge",
    "Staking_Bridge",
    accounts[0],
    [addresses.VEGA]
  );

  let erc20_vesting_instance = await deploy_or_load(
    w3,
    addresses,
    "ERC20_Vesting",
    "ERC20_Vesting",
    accounts[0],
    [
      addresses.VEGAv1,
      addresses.VEGA,
      [],
      []
    ]
  );

  let claim_codes_instance = await deploy_or_load(
    w3,
    addresses,
    "Claim_Codes",
    "Claim_Codes",
    accounts[0],
    [addresses.ERC20_Vesting]
  );


  let addresses_serialised = JSON.stringify(addresses, null, 2);
  console.log(addresses_serialised);
  console.log("Save data to addresses.json");
  fs.writeFileSync("addresses.json", addresses_serialised);
  process.exit(0);
}

go();
