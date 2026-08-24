"use strict";

const { reportHandlerArchive } = require("./report.cjs");

module.exports = {
  async onPostBuild({ constants, utils }) {
    await reportHandlerArchive({
      constants,
      fail: (message) => utils.build.failBuild(message),
    });
  },
};
