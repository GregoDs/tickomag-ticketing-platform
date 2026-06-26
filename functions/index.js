const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");

const mpesaRoutes = require("./routes/mpesa.routes");

const app = express();

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  return next();
});

app.use(express.json());

app.use("/api/mpesa", mpesaRoutes);
app.use("/mpesa", mpesaRoutes);

exports.api = onRequest(app);
