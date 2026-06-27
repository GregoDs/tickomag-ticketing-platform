require("dotenv").config();

const sandbox = require("./sandbox");
const production = require("./production");


const env = process.env.MPESA_ENV || "sandbox";

module.exports = env === "production" ? production : sandbox;
