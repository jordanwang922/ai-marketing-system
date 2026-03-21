const express = require('express');
const { enqueueTask } = require('../queue/queue');
const { normalizeCompanyName } = require('../services/normalizer');
const { MODES, LOCALES, TASK_STATUS } = require('../../shared/constants');

function now() {
  return new Date().toISOString();
}

function findOrCreateCompany(db, { name, country }) {
  const normalized = normalizeCompanyName(name);
  const existing = db.prepare('SELECT * FROM companies WHERE normalized_name = ? AND country = ?').get(normalized, country);
  if (existing) return existing;

  const ts = now();
  const result = db.prepare(`
    INSERT INTO companies (name, country, normalized_name, created_at)
    VALUES (?, ?, ?, ?)
  `).run(name, country, normalized, ts);

  return db.prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid);
}

function findLatestReport(db, { companyId, mode, locale }) {
  return db.prepare(`
    SELECT * FROM reports WHERE company_id = ? AND mode = ? AND locale = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(companyId, mode, locale);
}

function routes({ db }) {
  const router = express.Router();

  router.post('/evaluate', (req, res) => {
    const {
      company_name: companyName,
      country = '中国',
      mode = MODES.QUICK,
      locale = LOCALES.ZH,
      user_id: userId,
      tenant_id: tenantId,
      force_refresh: forceRefresh = false,
    } = req.body || {};

    if (!companyName) {
      return res.status(400).json({ error: 'company_name required' });
    }

    if (![MODES.QUICK, MODES.STANDARD, MODES.DEEP].includes(mode)) {
      return res.status(400).json({ error: 'invalid mode' });
    }

    if (![LOCALES.ZH, LOCALES.EN].includes(locale)) {
      return res.status(400).json({ error: 'invalid locale' });
    }

    const company = findOrCreateCompany(db, { name: companyName, country });

    if (!forceRefresh) {
      const report = findLatestReport(db, { companyId: company.id, mode, locale });
      if (report) {
        return res.json({
          status: TASK_STATUS.DONE,
          cached: true,
          report: JSON.parse(report.result_json),
          created_at: report.created_at,
        });
      }
    }

    const taskId = enqueueTask(db, {
      companyId: company.id,
      mode,
      locale,
      userId,
      tenantId,
    });

    return res.json({
      status: TASK_STATUS.QUEUED,
      task_id: taskId,
      created_at: now(),
    });
  });

  router.get('/task/:id', (req, res) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    let report = null;
    if (task.status === TASK_STATUS.DONE) {
      const reportRow = db.prepare('SELECT * FROM reports WHERE source_task_id = ?').get(task.id);
      if (reportRow) report = JSON.parse(reportRow.result_json);
    }

    return res.json({
      status: task.status,
      progress: task.progress,
      error: task.error,
      report,
      created_at: task.created_at,
      updated_at: task.updated_at,
      finished_at: task.finished_at,
    });
  });

  router.get('/report', (req, res) => {
    const { company_name: companyName, country = '中国', mode = MODES.QUICK, locale = LOCALES.ZH } = req.query;
    if (!companyName) {
      return res.status(400).json({ error: 'company_name required' });
    }

    const company = findOrCreateCompany(db, { name: companyName, country });
    const report = findLatestReport(db, { companyId: company.id, mode, locale });
    if (!report) {
      return res.status(404).json({ error: 'report not found' });
    }

    return res.json({
      status: TASK_STATUS.DONE,
      report: JSON.parse(report.result_json),
      created_at: report.created_at,
    });
  });

  return router;
}

module.exports = {
  routes,
};
