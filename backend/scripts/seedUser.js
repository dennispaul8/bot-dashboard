const { createOrUpdateUser } = require("../src/models/User");

createOrUpdateUser("dennis_iCode", {
  twitterId: "1326494870450614272",
  username: "dennis_iCode",
});

console.log("✅ User seeded!");
