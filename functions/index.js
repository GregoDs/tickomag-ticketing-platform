const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");

const mpesaRoutes = require("./routes/mpesa.routes");
const ticketRoutes = require("./routes/ticket.routes");
const eventRoutes = require("./routes/event.routes");

const app = express();

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  return next();
});

app.use(express.json());

app.use("/api/mpesa", mpesaRoutes);
app.use("/mpesa", mpesaRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/tickets", ticketRoutes);
app.use("/api/events", eventRoutes);
app.use("/events", eventRoutes);

exports.api = onRequest({ invoker: "public" }, app);
