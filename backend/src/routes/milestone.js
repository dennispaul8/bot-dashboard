// backend/src/routes/milestone.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { TwitterApi } = require("twitter-api-v2");
const { getUser, createOrUpdateUser } = require("../models/User");
const { upload } = require("../utils/storage");
const { addLog } = require("../models/Logs");

const router = express.Router();

// ✅ App-level Twitter client (for fallback/non-user tasks)
const appClient = new TwitterApi({
  appKey: process.env.API_KEY,
  appSecret: process.env.API_SECRET,
});

// ✅ POST: update custom message
router.post("/:userId/message", (req, res) => {
  const { message } = req.body;
  if (typeof message !== "string")
    return res.status(400).json({ error: "Invalid message" });

  const user = createOrUpdateUser(req.params.userId, { message });
  res.json({ success: true, message: "Saved", user });
});

// ✅ POST: upload GIF
router.post("/:userId/gif", upload.single("gif"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const fullPath = path.resolve(req.file.path);
  const publicPath = `/uploads/${req.file.filename}`;

  const user = createOrUpdateUser(req.params.userId, {
    gifPath: fullPath,
    gifUrl: publicPath,
  });

  res.json({ success: true, path: publicPath, user });
});

// ✅ GET: user config
router.get("/:userId", (req, res) => {
  const user = getUser(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    message: user.message || "",
    gifPath: user.gifUrl || "",
    lastMilestone: user.lastMilestone || 0,
  });
});

// 🧠 Helper: upload a local GIF file to Twitter
async function uploadGif(user, localPath) {
  const absPath = path.resolve(localPath);
  if (!fs.existsSync(absPath))
    throw new Error(`GIF file not found at ${absPath}`);

  // Create a per-user client
  const userClient = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET,
    accessToken: user.accessToken,
    accessSecret: user.accessSecret,
  });

  return await userClient.v1.uploadMedia(absPath, { mimeType: "image/gif" });
}

// 🚀 Post milestone tweet (per user)
async function postMilestoneTweet(user, milestone) {
  try {
    const message = user.message || `🎉 Just hit ${milestone} followers!`;
    let mediaId;

    // Create user-level client
    const twitterClient = new TwitterApi({
      appKey: process.env.API_KEY,
      appSecret: process.env.API_SECRET,
      accessToken: user.accessToken,
      accessSecret: user.accessSecret,
    });

    if (user.gifPath) {
      addLog(user.id, "Uploading GIF to Twitter...");
      mediaId = await uploadGif(user, user.gifPath);
    }

    const tweet = await twitterClient.v2.tweet({
      text: message,
      ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
    });

    addLog(user.id, `✅ Tweet posted for ${milestone} followers`);
    console.log(`✅ Tweet sent for ${user.username}:`, tweet.data.id);
    return tweet.data.id;
  } catch (err) {
    console.error("❌ Failed to post tweet:", err);
    addLog(user.id, `❌ Tweet failed: ${err.message}`);
  }
}

module.exports = router;
module.exports.postMilestoneTweet = postMilestoneTweet;
