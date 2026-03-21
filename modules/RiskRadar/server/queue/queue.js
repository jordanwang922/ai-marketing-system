const { nanoid } = require('nanoid');
const { TASK_STATUS } = require('../../shared/constants');
const { runEvaluation } = require('../services/evaluator');
const { searchPublicSources } = require('../services/publicSearch');
const { notifyCompletion } = require('../services/notifier');

function now() {
  return new Date().toISOString();
}

function enqueueTask(db, { companyId, mode, locale, userId, tenantId, clientRef }) {
  const id = nanoid();
  const ts = now();

  db.prepare(`
    INSERT INTO tasks (id, company_id, mode, locale, status, progress, user_id, tenant_id, client_ref, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).run(
    id,
    companyId,
    mode,
    locale,
    TASK_STATUS.QUEUED,
    userId || null,
    tenantId || null,
    clientRef || null,
    ts,
    ts
  );

  return id;
}

function getNextQueuedTask(db) {
  return db.prepare(`
    SELECT * FROM tasks WHERE status = ? ORDER BY created_at ASC LIMIT 1
  `).get(TASK_STATUS.QUEUED);
}

function updateTaskStatus(db, id, status, fields = {}) {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return;

  const updated = {
    progress: fields.progress ?? existing.progress,
    error: fields.error ?? existing.error,
    started_at: fields.started_at ?? existing.started_at,
    finished_at: fields.finished_at ?? existing.finished_at,
  };

  db.prepare(`
    UPDATE tasks SET status = ?, progress = ?, error = ?, started_at = ?, finished_at = ?, updated_at = ?
    WHERE id = ?
  `).run(status, updated.progress, updated.error, updated.started_at, updated.finished_at, now(), id);
}

async function processNextTask(db) {
  const task = getNextQueuedTask(db);
  if (!task) return false;

  updateTaskStatus(db, task.id, TASK_STATUS.RUNNING, { started_at: now(), progress: 10 });

  try {
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(task.company_id);

    const searchResult = await searchPublicSources({ companyName: company.name, country: company.country });
    const sources = Array.isArray(searchResult?.sources) ? searchResult.sources : [];

    if (sources.length) {
      const insert = db.prepare(`
        INSERT INTO sources (company_id, source_type, source_url, title, snippet, weight, collected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const ts = now();
      const txn = db.transaction((rows) => {
        rows.forEach((row) => {
          insert.run(
            company.id,
            row.source_type || 'public',
            row.source_url || null,
            row.title || null,
            row.snippet || null,
            Number.isFinite(Number(row.weight)) ? Number(row.weight) : null,
            ts,
          );
        });
      });
      txn(sources);
    }
    updateTaskStatus(db, task.id, TASK_STATUS.RUNNING, { progress: 60 });

    const report = await runEvaluation({
      companyName: company.name,
      country: company.country,
      mode: task.mode,
      locale: task.locale,
      sources,
    });

    const reportId = nanoid();
    db.prepare(`
      INSERT INTO reports (id, company_id, mode, locale, risk_level, confidence_score, summary, result_json, source_task_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      company.id,
      task.mode,
      task.locale,
      report.risk_level,
      report.confidence_score,
      report.summary,
      JSON.stringify(report),
      task.id,
      now()
    );

    updateTaskStatus(db, task.id, TASK_STATUS.DONE, { progress: 100, finished_at: now() });

    await notifyCompletion({
      task_id: task.id,
      client_ref: task.client_ref,
      company_name: company.name,
      country: company.country,
      mode: task.mode,
      locale: task.locale,
      user_id: task.user_id,
      tenant_id: task.tenant_id,
      report,
      finished_at: now(),
    });

    return true;
  } catch (err) {
    updateTaskStatus(db, task.id, TASK_STATUS.FAILED, { error: String(err), finished_at: now() });
    return false;
  }
}

module.exports = {
  enqueueTask,
  processNextTask,
};
