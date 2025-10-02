// backend/src/app.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");

const authRoutes = require("./routes/auth");
const milestoneRoutes = require("./routes/milestone");
const botRoutes = require("./routes/bot");

const { startAllCron } = require("./jobs/milestoneJob");

const app = express();
app.use(express.json());

// session (required for passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/api/config", milestoneRoutes);
app.use("/api/bot", botRoutes);

// serve uploaded files publicly at /uploads/*
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "..", "uploads"))
);

// basic health endpoint
app.get("/", (req, res) => res.send("✅ Twitter Milestone Bot Backend"));

// start background cron if env says so
if (process.env.ENABLE_CRON === "true") {
  const cronExpr = process.env.CRON_EXPRESSION || "0 * * * *";
  startAllCron(cronExpr);
  console.log("Started global cron:", cronExpr);
}

module.exports = app;
