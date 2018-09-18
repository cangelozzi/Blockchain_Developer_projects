const bitcoin = require("bitcoinjs-lib");
const bitcoinMessage = require("bitcoinjs-message");

const TestNet = bitcoin.networks.testnet;
let keyPair = bitcoin.ECPair.makeRandom({ network: TestNet });

// Public key generated
let publicKey = keyPair.publicKey.toString("hex");

// Wallet Address generated
let { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });

// PrivateKey must be in <Buffer> format to be used in bitcoinMessage.sign()
let privateKey = keyPair.__d;

console.log(Buffer.from(privateKey, "utf16le"));

console.log(
  `
      > Public Key is: ${publicKey}
      > Address is: ${address}
      `
);

module.exports = {
  privateKey,
  publicKey,
  address,
  keyPair
};

