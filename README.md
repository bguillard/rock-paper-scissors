# rock-paper-scissors
A simple solidity smart contract + minimal frontend implementing the Rock Paper Scissors game. Uses the commit-and-reveal scheme, so that none of the two players can cheat.

## How it works

1. An *initiator* commits to a move (rock, paper or scissor), and protects it with a password. For that, he pays 0.06 ETH : a 0.05 ETH bid, and a 0.01 ETH commitment fee.
2. A *challenger* plays against the *initiator*. She cannot know the *initiator's* move, since it is stored encrypted with his password as a secret salt. The *challenger* has to pay 0.05 ETH to play (her bid).
3. The *initiator* reveals his move by re-submitting it and his password. The smart contract sends the 0.01 ETH commitment fee back to the *initiator*, and 0.1 ETH to the winner of the game (or 0.05 ETH to each player in case of a tie).

A few additional things to note:
* The *initiator* can remove his bid until he is challenged.
* 24 hours after having played, and if the *initiator* still has not revealed his move, the *challenger* can redeem all the contract's funds. She will get 0.11 ETH (the two bids and the commitment fee).
* Similarlry, if the *initiator* does not stick to his commitment and tries to change his move when revealing it (phase 3.), all the contract's funds are sent to the *challenger*

## Trying it
The contract is deployed on the rinkeby testnet, and playable [here](https://brouwa.github.io/rock-paper-scissors/src/). With Metamask configured on the Rinkeby Test Network, you should see the following:

![alt text](../assets/screenshot.png?raw=true "screenshot")


## Deploying it locally
You can use Truffle and Ganache to run it locally:

1. Fetch the box
```
mkdir rock-paper-scissors
cd rock-paper-scissors
truffle unbox brouwa/rock-paper-scissors
```
2. Build the contracts and locally deploy them (Ganache should be running at this point)
```
truffle compile
truffle migrate --reset
```
3. Launch a web server to locally serve static files
```
npm run dev
```

If you want to deploy it, or a modified version of it, on the Rinkeby test network:
1. Enter your mnemonic seedphrase in the `.secret` file.
2. Run
```
truffle migrate -f 2 --network rinkeby
```