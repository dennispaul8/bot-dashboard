const logs = {};

function addLog(userId, message) {
  if (!logs[userId]) logs[userId] = [];
  logs[userId].unshift(`${new Date().toISOString()} - ${message}`);

  if (global.io) {
    global.io.emit(`log-update-${userId}`, message);
  }
}

function getLogs(userId) {
  return logs[userId] || [];
}

module.exports = { addLog, getLogs };
