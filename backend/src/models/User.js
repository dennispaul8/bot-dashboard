const fs = require("fs");
const path = require("path");
const DATA_FILE = path.join(__dirname, "..", "..", "data", "users.json");

const DATA_DIR = path.dirname(DATA_FILE);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to read users.json", e);
    return {};
  }
}

function saveAll(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getUser(id) {
  const all = loadAll();
  return all[id] || null;
}

function getUserByTwitterId(twitterId) {
  const all = loadAll();
  return Object.values(all).find((u) => u.twitterId === twitterId) || null;
}

function createOrUpdateUser(id, obj) {
  const all = loadAll();
  all[id] = { ...(all[id] || {}), ...obj, id };
  saveAll(all);
  return all[id];
}

function deleteUser(id) {
  const all = loadAll();
  if (all[id]) {
    delete all[id];
    saveAll(all);
  }
}

function listUsers() {
  const all = loadAll();
  return Object.values(all);
}

module.exports = {
  loadAll,
  saveAll,
  getUser,
  getUserByTwitterId,
  createOrUpdateUser,
  deleteUser,
  listUsers,
};
