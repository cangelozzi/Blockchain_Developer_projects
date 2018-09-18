/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require("level");
const chainDB = "./chaindata";
const db = level(chainDB, { valueEncoding: "json" });

/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require("crypto-js/sha256");

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block {
  constructor(data) {
    (this.hash = ""),
      (this.height = ""),
      (this.body = data),
      (this.time = 0),
      (this.previousBlockHash = "");
  }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {
  constructor() {
    this.chain = db;

    // check if we have data from stream, if no data...add Genesis as first block
    this.getBlockHeight().then(data => {
      if (data === -1 || undefined) {
        this.addBlock(new Block("First block in the chain - Genesis block"));
      }
    });
  }

  // ----------  ADD NEW BLOCK ---------- (to return a Promise)
  async addBlock(newBlock) {
    // using await to "wait async response" related to Block Height, needed in put method.
    let blockHeight = await this.getBlockHeight();

    newBlock.height = blockHeight + 1;
    newBlock.time = new Date()
      .getTime()
      .toString()
      .slice(0, -3);

    let check = false; // hash check
    if (newBlock.height > 0) {
      let previousBlock = await this.getBlock(blockHeight);
      newBlock.previousBlockHash = previousBlock.hash;
      if (newBlock.previousBlockHash === previousBlock.hash) check = true;
    }

    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();

    // add block in levelDB
    this.chain.put(newBlock.height, JSON.stringify(newBlock), function(err) {
      if (err) return console.log("Block submission failed", err);
      console.log(`
      ---- Block #${newBlock.height} ----
      Timestamp: ${newBlock.time}
      Previous Block hash: ${newBlock.previousBlockHash}
      New Block hash: ${newBlock.hash}
      `);
      if (newBlock.height === 0) {
        check = true;
        console.log("Genesis Block.");
      }

      if (check && newBlock.height > 0) {
        console.log("Block is Valid");
      } else if (!check) {
        console.log("WARNING! ... Block is NOT Valid.");
      }
    });
  }

  // ---------- GET BLOCK HEIGHT ----------
  // create async request to LevelDB data, returning a Promise with data count...first one is returning -1 ...that when run addBlock will ++ becoiming 0, which is going to be the Genesis Block. ----- This is a costlier operation of fetching a height because you are using createReadStream() and it will always count from database whenever getBlockHeight(). Instead, you can use height as key and store the updated height in the height key. When this function is called you can use db.get('height') to get the height easily.
  getBlockHeight() {
    return new Promise((resolve, reject) => {
      let i = -1;

      this.chain
        .createReadStream()
        .on("data", data => {
          i++;
        })
        .on("error", error => {
          reject(error);
        })
        .on("close", () => {
          resolve(i);
        });
    });
  }

  // ---------- GET BLOCK ----------
  async getBlock(blockHeight) {
    // parsed in JSON obj to get the hash property value for previous block
    return JSON.parse(await this.getBlockFromChain(blockHeight));
  }

  // ---------- VALIDATE BLOCK ----------
  async validateBlock(blockHeight) {
    // get block object
    let block = await this.getBlock(blockHeight);
    // store block.hash and empty it to recalculate and compare validity
    // get block hash
    let blockHash = block.hash;
    // remove block hash to test block integrity
    block.hash = "";

    // generate block hash
    let validBlockHash = SHA256(JSON.stringify(block)).toString();

    // Compare
    if (blockHash === validBlockHash) {
      return true;
    } else {
      console.log(
        "Block #" +
          blockHeight +
          " invalid hash:\n" +
          blockHash +
          "<>" +
          validBlockHash
      );
      return false;
    }
  }

  // ---------- VALIDATE BLOCKCHAIN ----------
  async validateChain() {
    let errorLog = [];
    // empty prevous hash
    let previousHash = "";
    // set block not valid as initial state
    let validBlock = false;

    const chainLength = (await this.getBlockHeight()) + 1;
    console.log(`
    -------------------
    Blocks in the chain: ${chainLength}
    -------------------
    `);

    for (let i = 0; i < chainLength; i++) {
      this.getBlock(i).then(block => {
        validBlock = this.validateBlock(block.height);

        if (!validBlock) errorLog.push(i);
        // compare blocks hash
        if (block.previousBlockHash !== previousHash) errorLog.push(i);

        previousHash = block.hash;

        // 'i' is always (chainLength - 1), adding the if conditional it will run errorLog check just at the end of chain iteration, without it, the errorLog will display in every iteration.
        if (i === chainLength - 1) {
          if (errorLog.length > 0) {
            console.log("Block errors = " + errorLog.length);
            console.log("Blocks: " + errorLog);
          } else {
            console.log("No errors detected");
          }
        }
      });
    }
  }

  /* ===============================================
  |                    Utility Promises	            |
  |  ==============================================*/

  getBlockFromChain(key) {
    return new Promise((resolve, reject) => {
      this.chain.get(key, function(err, value) {
        if (err) return console.log("Not found!", err);
        resolve(value);
      });
    });
  }
}

// ---------- TEST ----------
let blockchain = new Blockchain();

(function theLoop(i) {
  setTimeout(function() {
    let blockTest = new Block("Test Block - " + (i + 1));
    blockchain.addBlock(blockTest).then(result => {
      if (--i) theLoop(i);
    });
  }, 100);
})(10);
setTimeout(() => blockchain.validateChain(), 2000);
