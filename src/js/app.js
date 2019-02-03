App = {
  web3Provider: null,
  contracts: {},
  currentState: 0,
  currentPlayer: 0,
  currentInitiator: 0,
  currentChallenger: 0,
  hasTimedOut: false,
  moveId: -1,
  currentView: 0,
  pwd: "",

  init: async function() {
    // Nothing to do on init for now
    return await App.initWeb3();
  },

  initWeb3: async function() {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('../build/contracts/PersistenRockPaperScissorsGame.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var RPSArtifact = data;
      App.contracts.Game = TruffleContract(RPSArtifact);

      // Set the provider for our contract
      App.contracts.Game.setProvider(App.web3Provider);

      // Use our contract to retrieve the game state
      // and display the correct interface
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        App.currentPlayer = accounts[0];
        return App.displayViewAccordingState();
      });
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-move', App.handleMove);
    $(document).on('keyup', '.in-pwd', App.handlePassword);
    $(document).on('click', '.btn-init', App.handleInit);
    $(document).on('click', '.btn-destroy', App.handleDestroy);
    $(document).on('click', '.btn-challenge', App.handleChallenge);
    $(document).on('click', '.btn-redeem', App.handleRedeem);
    $(document).on('click', '.btn-reveal', App.handleReveal);
  },

  displayViewAccordingState: function(state, account) {
    var gameInstance;

    App.contracts.Game.deployed().then(function(instance) {
      gameInstance = instance;

      return gameInstance.state.call();
    }).then(function(result) {
      App.currentState = result;

      return gameInstance.initiator.call();
    }).then(function(result) {
      App.currentInitiator = result;

      return gameInstance.challenger.call();
    }).then(function(result) {
      App.currentChallenger = result;

      return gameInstance.revelationTimeout.call();
    }).then(function(result) {
      timeout = result.valueOf();
      if(timeout == 0 || timeout > Math.floor(Date.now() / 1000)) {
        App.hasTimedOut = false;
      } else {
        App.hasTimedOut = true;
      }

      return ;
    }).then(function() {

      if(App.currentState == 0) {
        App.displayInitView();
      }
      else if(App.currentState == 1) {
        if(App.currentPlayer == App.currentInitiator){
          App.displayWaitingForChallengerView();
        }
        else {
          App.displayToBeChallengedView();
        }
      }
      else{
        if(App.currentPlayer == App.currentInitiator){
          App.toBeRevealedView();
        }
        else if(App.currentPlayer == App.currentChallenger){
          if(App.hasTimedOut) {
            App.displayChallengerWaitingForRevelationOrRedeemView();
          }
          else {
            App.displayChallengerWaitingForRevelationView();
          }
        }
        else {
          App.displayWaitingForRevelationView();
        }
      }
    }).catch(function(err) {
      console.log(err.message);
    });
  },

  displayInitView: function() {
    var container = $('#gamePlay');
    var view = $('#toBeInitiated');
    container.html(view.html());
    App.currentView = 0;
  },

  displayWaitingForChallengerView: function() {
    var container = $('#gamePlay');
    var view = $('#waitingForChallenger');
    container.html(view.html());
    App.currentView = 1;
  },

  displayToBeChallengedView: function() {
    var container = $('#gamePlay');
    var view = $('#toBeChallenged');
    container.html(view.html());
    App.currentView = 2;
  },

  toBeRevealedView: function() {
    var container = $('#gamePlay');
    var view = $('#toBeRevealed');
    container.html(view.html());
    App.currentView = 3;
  },

  displayChallengerWaitingForRevelationOrRedeemView: function() {
    var container = $('#gamePlay');
    var view = $('#challengerWaitingForRevelationOrRedeem');
    container.html(view.html());
    App.currentView = 4;
  },

  displayChallengerWaitingForRevelationView: function() {
    var container = $('#gamePlay');
    var view = $('#challengerWaitingForRevelation');
    container.html(view.html());
    App.currentView = 5;
  },

  displayWaitingForRevelationView: function() {
    var container = $('#gamePlay');
    var view = $('#waitingForRevelation');
    container.html(view.html());
    App.currentView = 6;
  },

  handleMove: function(event) {
    event.preventDefault();
    App.moveId = parseInt($(event.target).data('id'));

    $(event.target).attr('disabled', true);
    $('.btn-move').each(function(){
      if($(this).data('id') != App.moveId) {
        $(this).attr('disabled', false);
      }
    });

    if(App.currentView == 0 && $('.in-pwd').val() != "") {
      $('.btn-init').attr('disabled', false);
    }
    else if(App.currentView == 2) {
      $('.btn-challenge').attr('disabled', false);
    }
    else if(App.currentView == 3 && $('.in-pwd').val() != "") {
      $('.btn-reveal').attr('disabled', false);
      $('.btn-init').attr('disabled', true);
    }
  },

  handlePassword: function(event) {
    event.preventDefault();
    App.pwd = $(event.target).val();

    if(App.currentView == 0 && App.moveId != -1 && App.pwd != "") {
      $('.btn-init').attr('disabled', false);
    } else if (App.currentView == 3 && App.moveId != -1 && App.pwd != "") {
      $('.btn-reveal').attr('disabled', false);
      $('.btn-init').attr('disabled', true);
    } else {
      $('.btn-init').attr('disabled', true);
      $('.btn-reveal').attr('disabled', true);
    }
  },
  
  handleInit: function(event) {
    if(App.moveId == -1 || App.pwd == "") {
      alert('You must choose a move, and a non-empty password.');
      return ;
    }

    toHash = App.moveId + "-" + App.pwd;
    toSend = "0x" + keccak256(toHash);

    App.contracts.Game.deployed().then(function(instance) {
        gameInstance = instance;

        // Execute initiate as a transaction
        return gameInstance.initiate(toSend, {from: App.currentPlayer, value: 60000000000000000});
      }).then(function(result) {
        return App.displayWaitingForChallengerView();
      }).catch(function(err) {
        console.log(err.message);
      });
  },

  handleDestroy: function(event) {
    App.contracts.Game.deployed().then(function(instance) {
        gameInstance = instance;

        // Execute deleteGame as a transaction
        return gameInstance.deleteGame({from: App.currentPlayer});
      }).then(function(result) {
        return App.displayInitView();
      }).catch(function(err) {
        console.log(err.message);
      });
  },

  handleChallenge: function(event) {
    App.contracts.Game.deployed().then(function(instance) {
        gameInstance = instance;

        // Execute challenge as a transaction
        return gameInstance.challenge(App.moveId, {from: App.currentPlayer, value: 50000000000000000});
      }).then(function(result) {
        return App.displayChallengerWaitingForRevelationView();
      }).catch(function(err) {
        console.log(err.message);
      });
  },

  handleRedeem: function(event) {
    App.contracts.Game.deployed().then(function(instance) {
        gameInstance = instance;

        // Execute redeem as a transaction
        return gameInstance.challengerClaimsVictory({from: App.currentPlayer});
      }).then(function(result) {
        return App.displayInitView();
      }).catch(function(err) {
        console.log(err.message);
      });
  },

  handleReveal: function(event) {
    toSend = App.moveId + "-" + App.pwd;

    App.contracts.Game.deployed().then(function(instance) {
        gameInstance = instance;

        // Execute redeem as a transaction
        return gameInstance.initiatorRevealsMove(toSend, {from: App.currentPlayer});
      }).then(function(result) {
        return App.displayInitView();
      }).catch(function(err) {
        console.log(err.message);
      });
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
