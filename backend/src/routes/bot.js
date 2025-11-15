console.log(
  "🔐 Bearer Token:",
  process.env.BEARER_TOKEN ? "✅ Loaded" : "❌ Missing"
);

const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const { addLog, getLogs } = require("../models/Logs");

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
      let friendlyMsg;

      switch (response.status) {
        case 429:
          friendlyMsg =
            "⚠️ Too many requests — please wait a bit before trying again.";
          break;
        case 500:
        case 502:
        case 503:
          friendlyMsg =
            "⚠️ Twitter seems to be having some temporary issues. Try again soon.";
          break;
        case 401:
        case 403:
          friendlyMsg =
            "⚠️ Your Twitter connection might have expired. Please reconnect your account.";
          break;
        default:
          friendlyMsg =
            "⚠️ Unable to fetch your Twitter data right now. Please try again later.";
      }

      addLog(userId, friendlyMsg);

      const errorText = await response.text();
      console.error(`Twitter API error (${response.status}):`, errorText);

      return res.status(response.status).json({
        error: friendlyMsg,
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

router.get("/logs/:userId", (req, res) => {
  const { userId } = req.params;
  console.log("📜 Fetching logs for:", userId);
  const logs = getLogs(userId);
  res.json({ logs });
});

module.exports = router;
