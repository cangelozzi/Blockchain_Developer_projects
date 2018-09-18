const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const chain = require('./simpleChain');

const blockchain = new chain.Blockchain();

//! ----- GET ENDPOINT to SEARCH and ACCESS information about a specific block, by Block Height.
app.get("/block/:blockHeight", async (req, res) => {
  const blockHeight = req.params.blockHeight;
  const blockSelected = await blockchain.getBlock(blockHeight);

  res.json({
    block: blockSelected
  });

});

//! ----- POST ENDPOINT to add new Block in the chain.
app.post("/block", async (req, res) => {

  // body content
  const blockContent = req.body.body;

  // check if bodyContent is false or is not a string
  if (!blockContent || typeof blockContent !== "string") {
    res.send({
      note:
        "New Block Rejected, please add some body content in string format"
    });
  }

  // create new Block
  const newBlock = new chain.Block(blockContent);
  
  // add new Block to the chain
  await blockchain.addBlock(newBlock);

  const newBlock_height = await blockchain.getBlockHeight();

  // check if Block is Valid prior to send response.
  if (blockchain.validateBlock(newBlock_height)) {

    res.send({
      note: "New Block added succesfully!",
      block: newBlock
    });

  } else {

    res.send({
      note: "New Block is NOT Valid!",
    });

  }


});

//! ----- App Listening on port 8000.
app.listen(8000, () => console.log("Blockchain Web Service started on port 8000!"));
