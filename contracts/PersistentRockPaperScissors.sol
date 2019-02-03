pragma solidity ^0.5.0;

contract PersistenRockPaperScissorsGame {
    enum Move {Rock, Paper, Scissors}
    enum ContractState {WaitingForInitiator,
                        WaitingForChallenger,
                        WaitingForRevelation}
    
    uint128 constant public bidAmount = 0.05 ether;
    uint128 constant public initiatorIncentive = 0.01 ether;
    ContractState public state = ContractState.WaitingForInitiator;
    
    bytes32 public initiatorCommit;
    address payable public initiator;
    address payable public challenger;
    Move private challengerMove;
    
    uint public revelationTimeout;
    
    // --------------------------------------------------------
    // Standard modifiers
    // --------------------------------------------------------
    
    modifier hasNotBeenInitiated() {
        require(state == ContractState.WaitingForInitiator);
        _;
    }
    
    modifier hasBeenChallenged() {
        require(state == ContractState.WaitingForRevelation);
        _;
    }
    
    modifier hasNotBeenChallenged() {
        require(state == ContractState.WaitingForChallenger);
        _;
    }
    
    modifier fromInitiator(address sender) {
        require(initiator == sender);
        _;
    }
    
    modifier fromChallenger(address sender) {
        require(challenger == sender);
        _;
    }
    
    // --------------------------------------------------------
    // Public functions
    // --------------------------------------------------------
    
    // Registers the initiator and its commit
    // (ie salted hash of its move)
    // He has to send bidAmount AND initiatorIncentive as an incentive to 
    // reveal his move even if he has lost (and in this case
    // he will retrieve initiatorIncentive)
    function initiate(bytes32 _initiatorCommit) payable public hasNotBeenInitiated {
        require(msg.value == bidAmount + initiatorIncentive);
        initiatorCommit = _initiatorCommit;
        initiator = msg.sender;
        state = ContractState.WaitingForChallenger;
    }
    
    
    // A challenger can play against the initiator, as long as
    // no one has done so, as he provides the requested bid.
    function challenge(Move _challengerMove) payable public hasNotBeenChallenged {
        require(msg.value == bidAmount);
        challenger = msg.sender;
        challengerMove = _challengerMove;
        revelationTimeout = now + 24 hours;
        state = ContractState.WaitingForRevelation;
    }
    
    // The initiator can destroy the contract as long as he has
    // not been challenged.
    function deleteGame() public fromInitiator(msg.sender) hasNotBeenChallenged {
        initiator.transfer(bidAmount + initiatorIncentive);
        state = ContractState.WaitingForInitiator;
    }
    
    // The initiator can reveal its move if he has been challenged.
    // Funds are sent to the winner.
    function initiatorRevealsMove(string memory moveAndSalt)
    public fromInitiator(msg.sender) hasBeenChallenged {
        bytes memory moveAndSaltByte = bytes(moveAndSalt);
        if(initiatorCommit == keccak256(moveAndSaltByte))
        {
            // Initiator not lying -> compare moves and compute winner
            Move initiatorMove = byteToMove(moveAndSaltByte[0]);
            if(initiatorMove == challengerMove)
            {
                // It's a tie, send everyone's funds back
                challenger.transfer(bidAmount);
                initiator.transfer(bidAmount + initiatorIncentive);
            }
            else if(isSuperiorTo(initiatorMove, challengerMove))
            {
                // Initiator wins, send him back all the funds
                initiator.transfer(2*bidAmount + initiatorIncentive);
            }
            else
            {
                // Challenger wins
                challenger.transfer(2*bidAmount);
                initiator.transfer(initiatorIncentive);
            }
        }
        else
        {
            // Initiator is lying and trying to change its move
            // -> all funds sent to challenger
            challenger.transfer(2*bidAmount + initiatorIncentive);
        }
        state = ContractState.WaitingForInitiator;
    }
    
    // The challenger can claim victory if the initiator has not
    // revealed its move after the timeout
    function challengerClaimsVictory() public 
    fromChallenger(msg.sender) hasBeenChallenged {
        require(now > revelationTimeout);
        challenger.transfer(2*bidAmount + initiatorIncentive);
        state = ContractState.WaitingForInitiator;
    }
    
    
    // --------------------------------------------------------
    // Private utility functions
    // --------------------------------------------------------
    
    // Convert byte to Move enum
    // '0'>Rock, '1'>Paper, '2'>Scissors
    function byteToMove(bytes1 b) private pure returns (Move) {
        if(b == '0')
            return Move.Rock;
        if(b == '1')
            return Move.Paper;
        return Move.Scissors;
    }
    
    // Compare two moves: does Move a wins on Move b?
    function isSuperiorTo(Move a, Move b) private pure returns (bool) {
        if(     (a == Move.Paper && b == Move.Rock)
            ||  (a == Move.Rock && b == Move.Scissors)
            ||  (a == Move.Scissors && b == Move.Paper))
            return true;
        return false;
    }
    
}
