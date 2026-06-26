const { randomUUID, randomBytes } = require("crypto");

function generateScanToken() {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }

  return randomBytes(16).toString("hex");
}

module.exports = {
  generateScanToken,
};
