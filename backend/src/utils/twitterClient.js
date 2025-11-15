const { TwitterApi } = require("twitter-api-v2");

const appClient = new TwitterApi(process.env.BEARER_TOKEN || "");

function createUserClient({ accessToken, accessSecret, appKey, appSecret }) {
  if (accessToken && accessSecret) {
    return new TwitterApi({
      appKey: appKey || process.env.API_KEY,
      appSecret: appSecret || process.env.API_SECRET,
      accessToken,
      accessSecret,
    });
  }

  throw new Error("User tokens not provided or unsupported auth type.");
}

module.exports = { createUserClient, appClient };
