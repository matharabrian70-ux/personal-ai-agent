import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createPool() {
  const connectionString = requiredEnv('DATABASE_URL');
  return new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 5 });
}

export async function migrate(pool) {
  const schema = await fs.readFile(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);
}

export async function getPlan(pool, planDate) {
  const { rows } = await pool.query('SELECT * FROM daily_plans WHERE plan_date = $1', [planDate]);
  return rows[0] ?? null;
}

export async function savePlan(pool, input) {
  const { rows } = await pool.query(
    `INSERT INTO daily_plans (plan_date, timezone, goals, tasks, sales_target, briefing, status)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, 'generated')
     ON CONFLICT (plan_date) DO UPDATE SET timezone=EXCLUDED.timezone, goals=EXCLUDED.goals,
       tasks=EXCLUDED.tasks, sales_target=EXCLUDED.sales_target, briefing=EXCLUDED.briefing,
       status='generated', updated_at=NOW()
     RETURNING *`,
    [input.planDate, input.timezone, JSON.stringify(input.goals), JSON.stringify(input.tasks), input.salesTarget, input.briefing]
  );
  return rows[0];
}

export async function recordEvent(pool, planId, eventType, payload = {}) {
  await pool.query('INSERT INTO agent_events (plan_id, event_type, payload) VALUES ($1, $2, $3::jsonb)', [planId, eventType, JSON.stringify(payload)]);
}

export async function markCall(pool, planId, callSid, callStatus = 'queued') {
  await pool.query(`UPDATE daily_plans SET status='called', call_sid=$2, call_status=$3, updated_at=NOW() WHERE id=$1`, [planId, callSid, callStatus]);
}
