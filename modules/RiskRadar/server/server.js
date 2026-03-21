const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { initDb } = require('./db/db');
const { routes } = require('./api/routes');
const { startWorker } = require('./queue/worker');

const app = express();
const PORT = process.env.RISKRADAR_PORT || 3015;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const db = initDb();

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'riskradar' });
});

app.use('/api/riskradar', routes({ db }));

startWorker({ db, intervalMs: 3000 });

app.listen(PORT, () => {
  console.log(`[RiskRadar] server running on port ${PORT}`);
});
