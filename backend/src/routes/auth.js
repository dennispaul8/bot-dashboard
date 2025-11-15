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
          lastMilestone: existing?.lastMilestone || 0,
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

const fetch = require("node-fetch");

router.get(
  "/twitter/callback",
  (req, res, next) => {
    console.log("📩 OAuth callback — session ID:", req.sessionID);
    next();
  },
  passport.authenticate("twitter", { failureRedirect: "/auth/failure" }),
  async (req, res) => {
    try {
      console.log("✅ Auth success:", req.user);

      const userId = req.user.id || req.user.username;
      const username = req.user.username;
      const profileImageUrl = req.user.photos?.[0]?.value || "";

      const response = await fetch(
        `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
        {
          headers: {
            Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
          },
        }
      );

      let followers = 0;
      if (response.ok) {
        const data = await response.json();
        followers = data.data?.public_metrics?.followers_count || 0;
      } else {
        console.warn("⚠️ Could not fetch followers:", response.status);
      }

      const redirectUrl = `${
        process.env.FRONTEND_URL
      }?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(
        username
      )}&profileImageUrl=${encodeURIComponent(
        profileImageUrl
      )}&followers=${encodeURIComponent(followers)}`;

      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        res.redirect(redirectUrl);
      });
    } catch (error) {
      console.error("❌ Error in Twitter callback:", error);
      res.redirect("/auth/failure");
    }
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
