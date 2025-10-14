// backend/src/routes/bot.js
console.log(
  "🔐 Bearer Token:",
  process.env.BEARER_TOKEN ? "✅ Loaded" : "❌ Missing"
);

const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const { addLog, getLogs } = require("../models/Logs");

// POST /api/bot/check/:userId — check follower milestone
router.post("/check/:userId", async (req, res) => {
  console.log("🟢 /api/bot/check hit with:", req.params.userId);
  const { userId } = req.params;

  console.log("🟠 Fetching Twitter API with:", {
    url: `https://api.twitter.com/2/users/by/username/${userId}?user.fields=public_metrics,profile_image_url`,
    tokenLoaded: !!process.env.BEARER_TOKEN,
    tokenPrefix: process.env.BEARER_TOKEN?.slice(0, 20) + "...",
  });

  try {
    addLog(userId, "Started follower check...");
    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${userId}?user.fields=public_metrics,profile_image_url`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      addLog(userId, `Twitter API error: ${response.status}`);
      const errorText = await response.text();
      console.error("Twitter API error:", errorText);
      return res.status(response.status).json({
        error: `Twitter API error (${response.status})`,
        details: errorText,
      });
    }

    const data = await response.json();
    const followers = data.data?.public_metrics?.followers_count || 0;
    const milestone = Math.floor(followers / 100) * 100;

    addLog(userId, `Fetched ${followers} followers`);
    res.json({
      success: true,
      username: data.data?.username,
      followers,
      milestone,
      profile_image_url: data.data?.profile_image_url,
    });
  } catch (err) {
    console.error("Error fetching from Twitter:", err);
    res.status(500).json({ error: "Failed to fetch from Twitter" });
  }
});

// 🪵 Add this route back — to show logs in frontend
router.get("/logs/:userId", (req, res) => {
  const { userId } = req.params;
  console.log("📜 Fetching logs for:", userId);
  const logs = getLogs(userId);
  res.json({ logs });
});

module.exports = router;
