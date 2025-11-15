const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.io = io;

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected"));
});

const { addLog: originalAddLog } = require("./models/Logs");
const addLog = (userId, message, followerCount = null) => {
  originalAddLog(userId, message);
  io.emit(`log-update-${userId}`, message);

  if (followerCount !== null) {
    io.emit(`follower-update-${userId}`, followerCount);
  }
};

module.exports.addLog = addLog;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));

require("./cron/followerCheck");
