module.exports = {

  storyDecode: function(chain) {
    chain.forEach((e, i) => {
      if (i > 0) {
        e.body.star.storyDecoded = Buffer.from(
          e.body.star.story,
          "hex"
        ).toString("utf8");
      }
    });
  }

};
