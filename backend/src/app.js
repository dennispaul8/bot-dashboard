require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const milestoneRoutes = require("./routes/milestone");
const botRoutes = require("./routes/bot");
const userRoutes = require("./routes/user");
require("./cron/followerCheck");

const { startAllCron } = require("./jobs/milestoneJob");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS: allow cookies (for Twitter OAuth redirect)
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
  })
);

// ✅ Session (required for Passport OAuth1)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // ✅ HTTPS only on Render
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // ✅ allows cross-site cookies
    },
  })
);

// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/milestone", milestoneRoutes);
app.use("/api/user", userRoutes);

// ✅ Serve uploads (for GIFs)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ✅ Health check
app.get("/", (req, res) => {
  res.send("✅ Twitter Milestone Bot Backend running");
});

// ✅ Optional cron
if (process.env.ENABLE_CRON === "true") {
  const cronExpr = process.env.CRON_EXPRESSION || "0 * * * *";
  startAllCron(cronExpr);
  console.log("Started global cron:", cronExpr);
}

module.exports = app;
