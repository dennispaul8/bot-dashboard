// backend/src/routes/milestone.js
const express = require("express");
const { getUser, createOrUpdateUser } = require("../models/User");
const { upload } = require("../utils/storage");
const path = require("path");

const router = express.Router();

// GET config
router.get("/:userId", (req, res) => {
  const user = getUser(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    message: user.message || "",
    gifPath: user.gifPath || "",
    lastMilestone: user.lastMilestone || 0,
  });
});

// POST update message
router.post("/:userId/message", (req, res) => {
  const { message } = req.body;
  if (typeof message !== "string")
    return res.status(400).json({ error: "Invalid message" });
  const user = createOrUpdateUser(req.params.userId, { message });
  res.json({ success: true, message: "Saved", user });
});

// POST upload GIF
router.post("/:userId/gif", upload.single("gif"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const gifPath = path.relative(process.cwd(), req.file.path); // store relative path
  const user = createOrUpdateUser(req.params.userId, { gifPath });
  res.json({ success: true, path: gifPath, user });
});

module.exports = router;
