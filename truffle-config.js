var fs = require("fs");
var HDWalletProvider = require("@truffle/hdwallet-provider");

var infuraToken = fs.readFileSync(".infura-token.tmp").toString().trim();
var mnemonic = fs.readFileSync(".mnemonic.tmp").toString().trim();

module.exports = {
  compilers: {
    solc: {
      version: "0.8.6",
    }
  },
  mocha: {},
  networks: {
    localhost: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/v3/" + infuraToken)
      },
      network_id: "3",
      gas: 4700000
    },
  },
};
