// backend/src/cron/followerCheck.js
const cron = require("node-cron");
const fetch = require("node-fetch");
const https = require("https");
const agent = new https.Agent({ keepAlive: true, secureOptions: 0x4 }); // allow TLS fallback
const { addLog } = require("../models/Logs");
const { getUser, createOrUpdateUser } = require("../models/User");
const { postMilestoneTweet } = require("../routes/milestone");

const usernames = ["dennis_iCode", "some_other_user"];

cron.schedule("*/15 * * * *", async () => {
  console.log("🕒 Running scheduled follower checks...");

  for (const userId of usernames) {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/users/by/username/${userId}?user.fields=public_metrics`,
        {
          headers: {
            Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
            agent,
          },
        }
      );

      if (!res.ok) {
        addLog(userId, `⚠️ Twitter API error: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const followers = data.data.public_metrics.followers_count;
      const milestone = Math.floor(followers / 100) * 100;

      // ✅ Always get a valid user object (fallback)
      let user = getUser(userId);
      if (!user) {
        user = { id: userId, username: userId, displayName: userId };
        createOrUpdateUser(userId, user);
      }

      const message = user.message || "🎉 Just hit another milestone!";
      const gifPath = user.gifPath || ""; // ✅ include gifPath
      const lastMilestone = user.lastMilestone || 0;

      addLog(userId, `✅ Auto check: ${followers} followers`);

      // 🎯 Only tweet new milestones
      if (milestone > lastMilestone && milestone !== 0) {
        addLog(
          userId,
          `🎯 Milestone ${milestone} reached! Posting tweet with message${
            gifPath ? " + GIF" : ""
          }...`
        );

        // ✅ Pass user with gifPath and message to the tweet function
        await postMilestoneTweet({ ...user, message, gifPath }, milestone);

        createOrUpdateUser(userId, { lastMilestone: milestone });

        if (global.io) {
          global.io.emit(
            `log-update-${userId}`,
            `🎉 ${message} (Milestone: ${milestone})`
          );
          global.io.emit(`follower-update-${userId}`, followers);
        }
      }

      // Live update for every check
      if (global.io) {
        global.io.emit(
          `log-update-${userId}`,
          `Cron job ran — checked ${followers} followers`
        );
      }
    } catch (err) {
      const errorMsg =
        "❌ Error in auto check: " +
        (err instanceof Error ? err.message : JSON.stringify(err));
      console.error(errorMsg);
      addLog(userId, errorMsg);
      if (global.io) global.io.emit(`log-update-${userId}`, errorMsg);
    }
  }
});
