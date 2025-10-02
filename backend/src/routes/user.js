const express = require("express");
const { getUser, createOrUpdateUser } = require("../models/User");
const fetch = require("node-fetch");

const router = express.Router();

// cache duration (ms) → 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// GET /api/user/:id → return latest Twitter data
router.get("/:id", async (req, res) => {
  try {
    const user = getUser(req.params.id);
    if (!user) {
      console.error("❌ User not found for id:", req.params.id);
      return res.status(404).json({ error: "User not found" });
    }

    if (!process.env.BEARER_TOKEN) {
      console.error("❌ Missing BEARER_TOKEN env variable");
      return res.status(500).json({ error: "Server not configured properly" });
    }

    // ✅ If cache is fresh, return it
    const now = Date.now();
    if (user.lastFetched && now - user.lastFetched < CACHE_DURATION) {
      console.log("✅ Returning cached user:", user.username);
      return res.json(user);
    }

    // Otherwise, fetch fresh data
    const url = `https://api.twitter.com/2/users/${user.twitterId}?user.fields=public_metrics,profile_image_url`;
    console.log("➡️ Fetching from Twitter:", url);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.BEARER_TOKEN}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Twitter API error:", response.status, errorText);
      return res.status(response.status).json({ error: "Twitter API error" });
    }

    const data = await response.json();
    if (!data.data) {
      console.error("❌ No data in Twitter response:", data);
      return res
        .status(400)
        .json({ error: "Failed to fetch user from Twitter" });
    }

    // Build updated user object
    const updatedUser = {
      id: user.id,
      twitterId: user.twitterId,
      username: data.data.username,
      name: data.data.name,
      followers: data.data.public_metrics.followers_count,
      following: data.data.public_metrics.following_count,
      profile_image_url: data.data.profile_image_url,
      lastFetched: now, // ✅ store timestamp
    };

    // Save updated user to users.json
    createOrUpdateUser(user.id, updatedUser);

    return res.json(updatedUser);
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
