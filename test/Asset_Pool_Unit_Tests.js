const ERC20_Asset_Pool = artifacts.require("ERC20_Asset_Pool");
const MultisigControl = artifacts.require("MultisigControl");
const ERC20_Bridge_Logic = artifacts.require("ERC20_Bridge_Logic");
const Base_Faucet_Token = artifacts.require("TEST_TOKEN");

var abi = require('ethereumjs-abi');
var crypto = require("crypto");
var ethUtil = require('ethereumjs-util');


let new_asset_id = crypto.randomBytes(32);

let bridge_addresses = require("../bridge_addresses.json");
//
/*
ganache-cli -m "oak bottom post title exhaust fix random poverty inherit quality drop defense"
*/
let private_keys =
    {
        "0x0B3BCb0149aB77dD58aE04F8150e290254ac4D5E":Buffer.from("84779c643301503f0fea13b2b0e956d1820a0f4020337e2cdad79913eada13b5",'hex'),
        "0x17d2A3C879D3C2DA0bcFD1251a786c905bE0Ed4E":Buffer.from("610ea474b7ade35270df9bbd3515f4f0e767d37eb13ac53e70126df0db9aaef6",'hex'),
        "0xcf6394759359b6f8d95BE1668ED79A436BD3b740":Buffer.from("f3862e1dc80e9fb9ff571dc37194560425a10f1bc40afd5455c49cab5389a120", 'hex'),
        "0x8bdBf7416F8EcC71397D6Ce4d9E2De0F6a094059":Buffer.from("0b54c75c181db4977a4c8e6a723e9690a86769fd83dd68d2e76609049aa740a9", 'hex'),
        "0x4f71194807D25F6239ed0098E87acDd008c9034B":Buffer.from("d814473b5045576f7351adbc3dadd4be9de2ffbe79d06d1adb4751a0b2302424", 'hex'),
        "0x7E7a8bC6025833EfacC25740Ae4153A8c57F3139":Buffer.from("7a646ae2acc3bca2bb8a88ab399506bfce4a77d356c72ea8cf76f5da9edcfcbd", 'hex'),
        "0x2A1Ac092a2349ecA8F2001bD8FFf1e185aB9CB92":Buffer.from("7f71bc9731f4c5cc5949a5595854b66e818fbb1fac56bd14371351ee3de87baa", 'hex')
    };


//sender for MultisigControl itself is submitting user
//sender for all consuming contracts is the address of that contract
function get_message_to_sign(param_types, params, nonce, function_name, sender){
    params.push(nonce);
    param_types.push("uint256");
    params.push(function_name);
    param_types.push("string");
    //var encoded_a = abi.rawEncode([ "address","uint256", "string"], [ wallet2, nonce, "add_signer" ]);
    let encoded_a = abi.rawEncode(param_types, params);
    //let encoded = abi.rawEncode(["bytes", "address"], [encoded_a, wallet1]);
    return abi.rawEncode(["bytes", "address"], [encoded_a, sender]);

}
async function list_asset(bridge_logic_instance, from_address){
  let nonce = new ethUtil.BN(crypto.randomBytes(32));
  //create signature
  let encoded_message = get_message_to_sign(
      ["address", "bytes32"],
      [bridge_addresses.test_token_address, new_asset_id],
      nonce,
      "list_asset",
      ERC20_Bridge_Logic.address);
  let encoded_hash = ethUtil.keccak256(encoded_message);

  let signature = ethUtil.ecsign(encoded_hash, private_keys[from_address]);
  let sig_string = to_signature_string(signature);

  //NOTE Sig tests are in MultisigControl
  await bridge_logic_instance.list_asset(bridge_addresses.test_token_address, new_asset_id, nonce, sig_string);
}

function to_signature_string(sig){
    return "0x" + sig.r.toString('hex') + "" + sig.s.toString('hex') +""+ sig.v.toString(16);
}

async function set_multisig_control(asset_pool_instance, multisig_control_address, account){
  let nonce = new ethUtil.BN(crypto.randomBytes(32));
  //create signature
  let encoded_message = get_message_to_sign(
      ["address"],
      [multisig_control_address],
      nonce,
      "set_multisig_control",
      asset_pool_instance.address);
  let encoded_hash = ethUtil.keccak256(encoded_message);

  let signature = ethUtil.ecsign(encoded_hash, private_keys[account]);
  let sig_string = to_signature_string(signature);

  //NOTE Sig tests are in MultisigControl
  await asset_pool_instance.set_multisig_control(multisig_control_address, nonce, sig_string);
}

async function set_bridge_address( asset_pool_instance, bridge_logic_address, account){
  let nonce = new ethUtil.BN(crypto.randomBytes(32));
  //create signature
  let encoded_message = get_message_to_sign(
      ["address"],
      [bridge_logic_address],
      nonce,
      "set_bridge_address",
      asset_pool_instance.address);
  let encoded_hash = ethUtil.keccak256(encoded_message);

  let signature = ethUtil.ecsign(encoded_hash, private_keys[account]);
  let sig_string = to_signature_string(signature);

  //NOTE Sig tests are in MultisigControl
  await asset_pool_instance.set_bridge_address(bridge_logic_address, nonce, sig_string);
}



async function deposit_asset(bridge_logic_instance, test_token_instance, account, token_balance){
  let wallet_pubkey = crypto.randomBytes(32);
  await test_token_instance.faucet();
  if(token_balance === undefined || token_balance === null){
    token_balance = await test_token_instance.balanceOf(account);
  }
  await test_token_instance.approve(ERC20_Bridge_Logic.address, token_balance);
  await bridge_logic_instance.deposit_asset(bridge_addresses.test_token_address, token_balance, wallet_pubkey);
  return token_balance;
}

async function withdraw_asset(bridge_logic_instance, test_token_instance, account, expire, bad_params, bad_user){
  let nonce = new ethUtil.BN(crypto.randomBytes(32));
  let expiry = Math.floor(Date.now()/1000) + 2; // 2 seconds
  let to_withdraw = (await test_token_instance.balanceOf(ERC20_Asset_Pool.address)).toString();

  let target = account;
  if(bad_user !== undefined){
    target = bad_user;
  }
  //create signature
  let encoded_message = get_message_to_sign(
      ["address", "uint256", "uint256", "address"],
      [test_token_instance.address, to_withdraw, expiry, target],
      nonce,
      "withdraw_asset",
      ERC20_Bridge_Logic.address);
  let encoded_hash = ethUtil.keccak256(encoded_message);
  let signature = ethUtil.ecsign(encoded_hash, private_keys[account]);

  let sig_string = to_signature_string(signature);
  if(expire){
    //wait 3 seconds
    await timeout(3000);
  }
  //NOTE Sig tests are in MultisigControl
  if(bad_params){
    to_withdraw = "1"
  }
  await bridge_logic_instance.withdraw_asset(test_token_instance.address, to_withdraw, expiry, target, nonce, sig_string);
}




////FUNCTIONS
contract("Asset_Pool Function: set_multisig_control",  (accounts) => {
    //function set_multisig_control(address new_address, uint256 nonce, bytes memory signatures) public {
    it("should change multisig control address", async () => {
      let multisig_control_instance = await MultisigControl.deployed();
      let asset_pool_instance = await ERC20_Asset_Pool.deployed();
      //set new multisig_control_address
      assert.equal(
          await asset_pool_instance.multisig_control_address(),
          multisig_control_instance.address,
          "unexpected initial multisig_control_address"
      );

      await set_multisig_control(asset_pool_instance, accounts[1], accounts[0]);

      assert.equal(
          await asset_pool_instance.multisig_control_address(),
          accounts[1],
          "unexpected multisig_control_address"
      );

    });
    //NOTE signature tests are in MultisigControl tests
});

contract("Asset_Pool Function: set_bridge_address",  (accounts) => {
    //function set_bridge_address(address new_address, uint256 nonce, bytes memory signatures) public {
    it("should change the bridge address to a new address, should now ignore old address", async () => {
      let multisig_control_instance = await MultisigControl.deployed();
      let asset_pool_instance = await ERC20_Asset_Pool.deployed();

      assert.equal(
          await asset_pool_instance.erc20_bridge_address(),
          "0x0000000000000000000000000000000000000000",
          "unexpected initial erc20_bridge_address"
      );

      await set_bridge_address(asset_pool_instance, bridge_addresses.logic_1, accounts[0]);

      assert.equal(
          await asset_pool_instance.erc20_bridge_address(),
          bridge_addresses.logic_1,
          "unexpected erc20_bridge_address"
      );
    });
});
contract("Asset_Pool Function: withdraw",  (accounts) => {
    //function withdraw(address token_address, address target, uint256 amount) public returns(bool){
    it("should allow bridge to withdraw target asset", async () => {
      let bridge_logic_instance = await ERC20_Bridge_Logic.deployed();
      let test_token_instance = await Base_Faucet_Token.deployed();
      let asset_pool_instance = await ERC20_Asset_Pool.deployed();
      //list asset
      try {
        await list_asset(bridge_logic_instance, accounts[0]);
      } catch(e){/*ignore if already listed*/}

      //new asset ID is listed
      assert.equal(
          await bridge_logic_instance.is_asset_listed(test_token_instance.address),
          true,
          "token isn't listed, should be"
      );

      await set_bridge_address(asset_pool_instance, bridge_logic_instance.address, accounts[0]);

      //deposit asset
      await deposit_asset(bridge_logic_instance, test_token_instance, accounts[0]);

      let account_bal_before = await test_token_instance.balanceOf(accounts[0]);
      let pool_bal_before = await test_token_instance.balanceOf(asset_pool_instance.address);

      //withdraw asset
      await withdraw_asset(bridge_logic_instance, test_token_instance, accounts[0], false, false);

      let account_bal_after = await test_token_instance.balanceOf(accounts[0]);
      let pool_bal_after = await test_token_instance.balanceOf(asset_pool_instance.address);

      assert.equal(
          account_bal_before.add(pool_bal_before).toString(),
          account_bal_after.toString(),
          "account balance didn't go up"
      );

      assert.equal(
          pool_bal_after.toString(),
          "0",
          "pool should be empty, isn't"
      );
    });
    it("withdraw function should fail to run from any address but the current bridge", async () => {
      let bridge_logic_instance = await ERC20_Bridge_Logic.deployed();
      let test_token_instance = await Base_Faucet_Token.deployed();
      let asset_pool_instance = await ERC20_Asset_Pool.deployed();
      //list asset
      try {
        await list_asset(bridge_logic_instance, accounts[0]);
      } catch(e){/*ignore if already listed*/}

      //new asset ID is listed
      assert.equal(
          await bridge_logic_instance.is_asset_listed(test_token_instance.address),
          true,
          "token isn't listed, should be"
      );

      await set_bridge_address(asset_pool_instance, bridge_logic_instance.address, accounts[0]);

      //deposit asset
      await deposit_asset(bridge_logic_instance, test_token_instance, accounts[0]);

      let account_bal_before = await test_token_instance.balanceOf(accounts[0]);
      let pool_bal_before = await test_token_instance.balanceOf(asset_pool_instance.address);

      //withdraw asset
      try {
        await asset_pool_instance.withdraw(test_token_instance.address, accounts[0], await test_token_instance.balanceOf(asset_pool_instance.address));
        assert.equal(true, false, "Withdrawal worked from unauthorized bridge address")
      }catch(e){}



    });
});


//NOTE views are public getters, don't need to_signature_string
