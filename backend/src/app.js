require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
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
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// ✅ Session (required for Passport OAuth1)
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // allow Twitter redirects
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
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
