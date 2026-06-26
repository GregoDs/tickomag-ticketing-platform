const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");

const mpesaRoutes = require("./routes/mpesa.routes");

const app = express();

app.use(express.json());

app.use("/api/mpesa", mpesaRoutes);

exports.api = onRequest(app);
