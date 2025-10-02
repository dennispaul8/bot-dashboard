// backend/src/jobs/milestoneJob.js
const fs = require("fs");
const path = require("path");
const { createUserClient } = require("../utils/twitterClient");
const { getUser, createOrUpdateUser, listUsers } = require("../models/User");
const { UPLOAD_DIR } = require("../utils/storage");
const CronJob = require("cron").CronJob;

// store last logs in-memory (simple)
const lastRunLogs = {}; // { userId: [messages...] }

function pushLog(userId, msg) {
  lastRunLogs[userId] = lastRunLogs[userId] || [];
  lastRunLogs[userId].unshift(`${new Date().toISOString()} - ${msg}`);
  if (lastRunLogs[userId].length > 50) lastRunLogs[userId].pop();
}

// Run check for a single user
async function runUserMilestoneCheck(userId) {
  const user = getUser(userId);
  if (!user) throw new Error("User not found");

  if (!user.accessToken || !user.accessSecret) {
    pushLog(userId, "Missing user tokens.");
    return { ok: false, msg: "Missing tokens" };
  }

  // build client
  const client = createUserClient({
    accessToken: user.accessToken,
    accessSecret: user.accessSecret,
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET,
  });

  try {
    // get the authenticated user id (ensure correct user)
    const me = await client.v2.me({ "user.fields": "public_metrics" });
    const followers = me.data.public_metrics.followers_count;
    const milestone = Math.floor(followers / 100) * 100;
    const last = user.lastMilestone || 0;

    pushLog(
      userId,
      `Followers: ${followers}, milestone: ${milestone}, last: ${last}`
    );

    if (milestone > 0 && milestone !== last && followers >= milestone) {
      // choose gif
      const gifPath = user.gifPath
        ? path.join(process.cwd(), user.gifPath)
        : path.join(__dirname, "..", "..", "uploads", "celebration.gif");
      if (!fs.existsSync(gifPath)) {
        pushLog(userId, `GIF not found at ${gifPath}, skipping media upload.`);
      }
      let mediaId;
      if (fs.existsSync(gifPath)) {
        const mediaBuffer = fs.readFileSync(gifPath);
        mediaId = await client.v1.uploadMedia(mediaBuffer, { type: "gif" });
      }

      const text =
        user.message || `🎉 Thank you for ${milestone} followers! 🚀`;

      await client.v2.tweet({
        text,
        media: mediaId ? { media_ids: [mediaId] } : undefined,
      });

      // update lastMilestone
      createOrUpdateUser(userId, { lastMilestone: milestone });
      pushLog(userId, `Tweeted milestone ${milestone}`);
      return { ok: true, tweeted: true, milestone };
    } else {
      pushLog(userId, "No new milestone");
      return { ok: true, tweeted: false, milestone };
    }
  } catch (err) {
    pushLog(userId, `Error: ${err.message}`);
    throw err;
  }
}

// Optional: run all users (for a scheduled cron)
async function runAllUsersOnce() {
  const users = listUsers();
  for (const user of users) {
    try {
      // only if user has tokens
      if (user.accessToken && user.accessSecret) {
        // eslint-disable-next-line no-await-in-loop
        await runUserMilestoneCheck(user.id);
      }
    } catch (e) {
      console.error(`Error for user ${user.id}:`, e.message);
    }
  }
  return true;
}

function startAllCron(cronExpr = "0 * * * *") {
  // default: every hour at minute 0
  const job = new CronJob(cronExpr, async () => {
    console.log("Running scheduled milestone checks for all users...");
    await runAllUsersOnce();
  });
  job.start();
  return job;
}

function getLastRunLogForUser(userId) {
  return lastRunLogs[userId] || [];
}

module.exports = {
  runUserMilestoneCheck,
  runAllUsersOnce,
  startAllCron,
  getLastRunLogForUser,
};
