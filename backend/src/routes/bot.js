// backend/src/routes/bot.js
const express = require("express");
const {
  runUserMilestoneCheck,
  getLastRunLogForUser,
} = require("../jobs/milestoneJob");

const router = express.Router();

// POST /api/bot/run/:userId  -> runs once for user
router.post("/run/:userId", async (req, res) => {
  try {
    const result = await runUserMilestoneCheck(req.params.userId);
    res.json({ success: true, result });
  } catch (err) {
    console.error("Error running bot for user:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bot/logs/:userId -> return logs (simple)
router.get("/logs/:userId", (req, res) => {
  const logs = getLastRunLogForUser(req.params.userId);
  res.json({ logs });
});

module.exports = router;
