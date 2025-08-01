const clientsByUser = new Map();

// register a new SSE client
function addClient(userId, res) {
  const key = userId.toString();
  if (!clientsByUser.has(key)) {
    clientsByUser.set(key, []);
  }
  clientsByUser.get(key).push(res);
}

// remove a closed SSE client
function removeClient(userId, res) {
  const key = userId.toString();
  const list = clientsByUser.get(key) || [];
  clientsByUser.set(key, list.filter(r => r !== res));
}

// broadcast payload to all SSE clients of a user
function sendToUser(userId, payload) {
  const key = userId.toString();
  const list = clientsByUser.get(key) || [];
  const json = JSON.stringify(payload);
  list.forEach(res => {
    try {
      res.write(`data: ${json}\n\n`);
    } catch (e) {
      // ignore; cleanup happens on close
    }
  });
}

module.exports = {
  addClient,
  removeClient,
  sendToUser
};
