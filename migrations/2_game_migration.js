var MyContract = artifacts.require("PersistenRockPaperScissorsGame");

module.exports = function(deployer) {
  // deployment steps
  deployer.deploy(MyContract);
};