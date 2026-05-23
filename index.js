import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { initDB, updateOrderStatus } from "./src/db.js";
import createBot from "./src/bot.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.json());

// Serve kitchen dashboard static files
app.use(express.static("public"));

// ── Health check — Railway pings this to confirm the app is alive ──
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ── Mark order ready from kitchen dashboard ──
app.post("/order/:id/ready", async (req, res) => {
  try {
    await updateOrderStatus(req.params.id, "ready");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Socket.io ──
io.on("connection", (socket) => {
  console.log("Kitchen dashboard connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Kitchen dashboard disconnected:", socket.id);
  });
});

// ── Boot ──
async function start() {
  try {
    await initDB();
    console.log("Database ready");

    createBot(io);
    console.log("Telegram bot polling started");

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Kitchen dashboard: http://localhost:${PORT}/kitchen.html`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

// ── Graceful shutdown — Railway sends SIGTERM before restarting ──
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

start();
