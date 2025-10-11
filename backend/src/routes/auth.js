// backend/src/routes/auth.js
const express = require("express");
const passport = require("passport");
const TwitterStrategy = require("passport-twitter").Strategy;
const { createOrUpdateUser, getUserByTwitterId } = require("../models/User");

const router = express.Router();

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser((id, cb) => cb(null, { id }));

console.log("🔑 Using Twitter credentials:", {
  API_KEY: process.env.API_KEY,
  API_SECRET: process.env.API_SECRET,
  CALLBACK: process.env.TWITTER_CALLBACK_URL,
});

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.API_KEY,
      consumerSecret: process.env.API_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      requestTokenURL: "https://api.x.com/oauth/request_token",
      accessTokenURL: "https://api.x.com/oauth/access_token",
      userAuthorizationURL: "https://api.x.com/oauth/authenticate",
    },
    async (token, tokenSecret, profile, done) => {
      try {
        const existing = getUserByTwitterId(profile.id);
        const id = existing ? existing.id : `${profile.username || profile.id}`;

        const saved = createOrUpdateUser(id, {
          twitterId: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          accessToken: token,
          accessSecret: tokenSecret,
          message: "🎉 Thank you for your support!",
          gifPath: "",
          lastMilestone: 0,
        });

        return done(null, saved);
      } catch (err) {
        console.error("OAuth1 callback error:", err);
        return done(err);
      }
    }
  )
);

router.get("/twitter", passport.authenticate("twitter"));

router.get(
  "/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/auth/failure" }),
  (req, res) => {
    console.log("✅ Callback success. req.user:", req.user);
    if (!req.user) {
      console.error("❌ No user found in session after callback");
      return res.redirect("/auth/failure");
    }

    const userId = req.user.id || req.user.username;
    FRONTEND_URL;
  }
);

router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out" });
      res.redirect("/");
    });
  });
});

router.get("/failure", (req, res) => res.status(401).send("Auth failed"));

module.exports = router;
