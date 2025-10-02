// backend/src/utils/twitterClient.js
const { TwitterApi } = require("twitter-api-v2");

// App-level client (for actions requiring app auth)
const appClient = new TwitterApi(process.env.BEARER_TOKEN || "");

// Create user client from tokens
function createUserClient({ accessToken, accessSecret, appKey, appSecret }) {
  // If you store user's OAuth1 tokens:
  if (accessToken && accessSecret) {
    return new TwitterApi({
      appKey: appKey || process.env.API_KEY,
      appSecret: appSecret || process.env.API_SECRET,
      accessToken,
      accessSecret,
    });
  }

  // If you use OAuth2 (client ID/secret + refresh token flow) you'll need another flow.
  throw new Error("User tokens not provided or unsupported auth type.");
}

module.exports = { createUserClient, appClient };
