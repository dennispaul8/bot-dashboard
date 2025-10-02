const { createOrUpdateUser } = require("../src/models/User");

// Replace with your own handle & numeric Twitter user ID
createOrUpdateUser("dennis_iCode", {
  twitterId: "1326494870450614272",
  username: "dennis_iCode",
});

console.log("✅ User seeded!");
