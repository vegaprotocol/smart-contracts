const Migrations = artifacts.require("Migrations");
const TEST_TOKEN = artifacts.require("TEST_TOKEN");
const ERC20_Asset_Pool = artifacts.require("ERC20_Asset_Pool");
const ERC20_Bridge_Logic = artifacts.require("ERC20_Bridge_Logic");
const MultisigControl = artifacts.require("MultisigControl");

const fs = require('fs');

module.exports = async function (deployer) {
  deployer.deploy(Migrations);

  await deployer.deploy(TEST_TOKEN, "Test", "TEST", 5, "0","10000000000");

  await deployer.deploy(MultisigControl);
  await deployer.deploy(ERC20_Asset_Pool, MultisigControl.address);
  let logic_1 = await deployer.deploy(ERC20_Bridge_Logic, ERC20_Asset_Pool.address, MultisigControl.address);
  let logic_2 = await deployer.deploy(ERC20_Bridge_Logic, ERC20_Asset_Pool.address, MultisigControl.address);

  let bridge_addresses = {
        multisig_control: MultisigControl.address,
        asset_pool: ERC20_Asset_Pool.address,
        logic_1:logic_1.address,
        logic_2:logic_2.address,
        test_token_address: TEST_TOKEN.address
    };
    fs.writeFileSync('./bridge_addresses.json',  JSON.stringify(bridge_addresses));
};
