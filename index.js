import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { initDB } from "./src/db.js";
import createBot from "./src/bot.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve kitchen dashboard static files
app.use(express.static("public"));

app.post("/order/:id/ready", async (req, res) => {
  const { updateOrderStatus } = require("./src/db");
  await updateOrderStatus(req.params.id, "ready");
  res.json({ ok: true });
});

// Kitchen dashboard - real-time order view
io.on("connection", (socket) => {
  console.log("Kitchen dashboard connected");
});

async function start() {
  await initDB(); // create table if they don't exist
  createBot(io); // start Telegram polling

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Kitchen dashboard: http://localhost:${PORT}`);
  });
}

start().catch(console.error);
