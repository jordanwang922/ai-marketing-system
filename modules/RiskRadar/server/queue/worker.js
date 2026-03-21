const { processNextTask } = require('./queue');

function startWorker({ db, intervalMs = 3000 }) {
  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processNextTask(db);
    } finally {
      running = false;
    }
  }, intervalMs);

  return () => clearInterval(timer);
}

module.exports = {
  startWorker,
};
