// backend/getTwitterId.js
const fetch = require("node-fetch");
require("dotenv").config(); // so it loads .env

(async () => {
  try {
    const res = await fetch(
      "https://api.twitter.com/2/users/by/username/dennis_iCode",
      {
        headers: {
          Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
        },
      }
    );

    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error("Error fetching Twitter ID:", err);
  }
})();
