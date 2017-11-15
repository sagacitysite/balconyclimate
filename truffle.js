module.exports = {
  networks: {
    development: {
      host: "5.230.156.126",
      port: 8545,
      network_id: "*" // Match any network id
    },
    testrpc: {
      host: "localhost",
      port: 8546,
      network_id: "*", // Match any network id
      gas: 3141592,
      gasPrice: 100000000000
    }
  }
};
