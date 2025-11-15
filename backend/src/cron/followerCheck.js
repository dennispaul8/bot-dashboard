
const cron = require("node-cron");
const fetch = require("node-fetch");
const https = require("https");
const agent = new https.Agent({ keepAlive: true, secureOptions: 0x4 });
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
        let friendlyMsg;

        switch (res.status) {
          case 429:
            friendlyMsg =
              "⚠️ Too many requests — please wait a bit before trying again.";
            break;
          case 500:
          case 502:
          case 503:
            friendlyMsg =
              "⚠️ Twitter seems to be having some issues — please try again later.";
            break;
          case 401:
          case 403:
            friendlyMsg =
              "⚠️ Your Twitter connection might have expired. Please reconnect your account.";
            break;
          default:
            friendlyMsg =
              "⚠️ Unable to fetch your Twitter data right now. Please try again shortly.";
        }

        
        addLog(userId, friendlyMsg);

        console.error(`Twitter API error for ${userId}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const followers = data.data.public_metrics.followers_count;
      const milestone = Math.floor(followers / 100) * 100;

      let user = getUser(userId);
      if (!user) {
        user = { id: userId, username: userId, displayName: userId };
        createOrUpdateUser(userId, user);
      }

      const message = user.message || "🎉 Just hit another milestone!";
      const gifPath = user.gifPath || "";
      const lastMilestone = user.lastMilestone || 0;

      addLog(userId, `✅ Auto check: ${followers} followers`);

      if (milestone > (user.lastMilestone ?? 0)) {
        addLog(
          userId,
          `🎯 Milestone ${milestone} reached! Posting tweet with message${
            gifPath ? " + GIF" : ""
          }...`
        );

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

      if (global.io) {
        global.io.emit(
          `log-update-${userId}`,
          `Bot checked - ${followers} followers`
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
