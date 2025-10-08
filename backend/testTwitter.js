// testTwitter.js
const fetch = require("node-fetch");
require("dotenv").config();

(async () => {
  const res = await fetch(
    "https://api.twitter.com/2/users/by/username/dennis_iCode",
    {
      headers: { Authorization: `Bearer ${process.env.BEARER_TOKEN}` },
    }
  );
  const data = await res.json();
  console.log(res.status, data);
})();
