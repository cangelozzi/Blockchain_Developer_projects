const express = require("express");
const bodyParser = require("body-parser");
const bitcoinMessage = require("bitcoinjs-message");

const app = express();
app.use(bodyParser.json());

const chain = require("./simpleChain");

// import utilities functions
const utilityFunctions = require("./utility_functions");

const blockchain = new chain.Blockchain();


//! ----- POST ENDPOINT to Request Validation for a Star Registry (in 5 minutes time window to be signed).
app.post("/requestValidation", (req, res) => {
  // "address": "1PfE2HU25KSB7JAUnR27d8yd8KVc33ugWX"

  // base values
  let valWindow = 300;
  let address = "";
  let time = 0;

  // check a previous 'address' was already set in this URL
  if (app.get('address') && app.get('address') === req.body.address) {
    address = app.get('address');
    time = app.get("request_initiated");
    valWindow = 300 - (new Date().getTime().toString().slice(0, -3) - app.get('request_initiated'));
    if (valWindow <= 0) { 
      time = new Date().getTime().toString().slice(0, -3); 
      valWindow = 300;
    }
  } else {
    address = req.body.address;
    app.set("address", address);
    time = new Date().getTime().toString().slice(0, -3);
    app.set("request_initiated", time);
  };

  res.json({
    address: address,
    requestTimeStamp: time,
    message: `${address}:${time}:starRegistry`,
    validationWindow: valWindow,
    note: "Please visit url http://localhost:8000/message-signature/validate to sign request within 5 minutes."
  });
});

//! ----- POST ENDPOINT to Request Validation for a Star Registry (in 5 minutes time window to be signed).
app.post("/message-signature/validate", (req, res) => {

  let address = req.body.address;
  const time = new Date().getTime().toString().slice(0, -3);

  // obtain Signature from Electrum
  let signature = req.body.signature;

  // get initial time request was initiated from route /requestValidation
  let reqInit = app.get("request_initiated");

  let message = `${address}:${reqInit}:starRegistry`;

  // check validation and request are within 5 minutes time limit
  if (time - reqInit > 300) {
    address = "";
    res.send({
      note:
        "Five Minutes time limit for Signature is expired, your Wallet Address, has been removed, please visit http://localhost:8000/requestValidation to start the process again."
    });
  } else {

    // check Signature, Message and Wallet Address are valid.
    let signatureIsValid = bitcoinMessage.verify(message, address, signature);
 
    app.set("signatureIsValid", signatureIsValid);
    app.set("addressValidated", address);

    // check Signature is valid before sending response
    if (signatureIsValid) {
      res.json({
        registerStar: true,
        status: {
          address: address,
          requestTimeStamp: reqInit,
          message: message,
          validationWindow: 300 - (time - reqInit),
          messageSignature: "valid"
        }
      });
    } else {
      res.send({
        note: "Signature is NOT Valid."
      });
    }
  }
});

//! ----- GET ENDPOINT to SEARCH and ACCESS information about a specific block, by Block Height.
app.get("/block/:blockHeight", async (req, res) => {
  const blockHeight = req.params.blockHeight;
  const blockSelected = await blockchain.getBlock(blockHeight);

  // decode story for blocks other than the Genesis Block which does not have this property
  if (blockHeight > 0) {
    blockSelected.body.star.storyDecoded = Buffer.from(blockSelected.body.star.story, "hex").toString("utf8");
  }

  res.json({block: blockSelected});
});

//! ----- GET ENDPOINT to SEARCH stars by Wallet ADDRESS.
app.get("/stars/address::walletAddress", async (req, res) => {
  const address = req.params.walletAddress;
  // get whole blockchain
  const chainArray = await blockchain.getBlockchain();

  // iterate through objects and add decoded story property, not in Genesis Block
  utilityFunctions.storyDecode(chainArray);

  // filter array of objects by address
  let starsByAddress = chainArray.filter(obj => {
    return obj.body.address === address;
  });

  res.json({ stars_ByWalletAddress: starsByAddress });
});

//! ----- GET ENDPOINT to SEARCH stars by Hash.
app.get('/stars/hash::blockHash', async (req, res) => {
  const hash = req.params.blockHash;
  // get whole blockchain
  const chainArray = await blockchain.getBlockchain();

  // iterate through objects and add decoded story property, not in Genesis Block
  utilityFunctions.storyDecode(chainArray);

   // filter array of objects by hash
  let starByHash = chainArray.filter(obj => {
     return obj.hash === hash;
   })

  res.json({ stars_ByHash: starByHash });

})

//! ----- POST ENDPOINT to add new Block in the chain.
app.post("/block", async (req, res) => {

  // body content object
  const blockContent = {};
  // add Wallet Address property
  blockContent.address = req.body.address;

  // function to limit story string to 250 words
  function limitTo250(string, wordsLimit = 250) {
    return string.split(" ").splice(0, wordsLimit).join(" ");
  }

  // add star object property, with Ascii Story string Hex encoded
  blockContent.star = req.body.star
 
  blockContent.star.story = Buffer.from(limitTo250(req.body.star.story), "ascii").toString("hex");

  // verify that the request to add a star has been validated with valid signature and address
  if (app.get("signatureIsValid") && blockContent.address === app.get('addressValidated')) {
    // request body content
    req.body.body = blockContent;

    // set signature validation to FALSE in order to allow just one star registration
    app.set("signatureIsValid", false);

    // check if bodyContent exist
    if (!blockContent) {
      res.send({
        note: "New Block Rejected, please add some body content."
      });
    }

    // create new Block
    const newBlock = new chain.Block(blockContent);

    // add new Block to the chain
    await blockchain.addBlock(newBlock);

    // reset adderss if the sameone wants to start process again.
    app.set("address", "")

    const newBlock_height = await blockchain.getBlockHeight();

    // check if Block is Valid prior to send response.
    if (blockchain.validateBlock(newBlock_height)) {
      res.send({
        note: "New Star Block added succesfully!",
        block: newBlock
      });
    } else {
      res.send({
        note: "New Block is NOT Valid!"
      });
    }
  } else {
    res.send({
      note:
        "Signature/Address has not been validated yet, or request already processed; please go through the process again to register your star."
    });
  }
});

//! ----- App Listening on port 8000.
app.listen(8000, () =>
  console.log("Blockchain Web Service started on port 8000!")
);
