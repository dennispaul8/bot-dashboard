// backend/src/routes/auth.js
const express = require("express");
const passport = require("passport");
const TwitterStrategy = require("passport-twitter").Strategy;
const { createOrUpdateUser, getUserByTwitterId } = require("../models/User");

const router = express.Router();

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser((id, cb) => cb(null, { id }));

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.API_KEY,
      consumerSecret: process.env.API_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      requestTokenURL: "https://api.twitter.com/oauth/request_token",
      accessTokenURL: "https://api.twitter.com/oauth/access_token",
      userAuthorizationURL: "https://api.twitter.com/oauth/authenticate",
    },
    async (token, tokenSecret, profile, done) => {
      try {
        const existing = await getUserByTwitterId(profile.id);
        const id = existing ? existing.id : `${profile.username || profile.id}`;

        const saved = createOrUpdateUser(id, {
          twitterId: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          accessToken: token,
          accessSecret: tokenSecret,
          message: existing?.message || "🎉 Thank you for your support!",
          gifPath: existing?.gifPath || "",
          lastMilestone: existing?.lastMilestone || 0, // ✅ preserve milestone
        });

        return done(null, saved);
      } catch (err) {
        console.error("OAuth1 callback error:", err);
        return done(err);
      }
    }
  )
);

router.get(
  "/twitter",
  (req, res, next) => {
    console.log("🆕 OAuth start — session ID:", req.sessionID);
    next();
  },
  passport.authenticate("twitter")
);

router.get(
  "/twitter/callback",
  (req, res, next) => {
    console.log("📩 OAuth callback — session ID:", req.sessionID);
    next();
  },
  passport.authenticate("twitter", { failureRedirect: "/auth/failure" }),
  (req, res) => {
    console.log("✅ Auth success:", req.user);
    req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      const userId = req.user.id || req.user.username;
      res.redirect(`${process.env.FRONTEND_URL}?userId=${userId}`);
    });
  }
);

router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out" });
    });
  });
});

router.get("/failure", (req, res) => res.status(401).send("Auth failed"));

module.exports = router;
