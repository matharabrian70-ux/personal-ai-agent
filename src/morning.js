import { createPool, migrate, getPlan, savePlan, markCall, recordEvent, requiredEnv } from './db.js';
import { generatePlan } from './planner.js';
import { placeMorningCall } from './voice.js';

function localDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
}

function listEnv(name, fallback) {
  return String(process.env[name] || fallback).split('|').map(x => x.trim()).filter(Boolean).slice(0, 20);
}

async function run() {
  requiredEnv('PUBLIC_BASE_URL');
  const pool = createPool();
  try {
    await migrate(pool);
    const planDate = localDate();
    const goals = listEnv('DAILY_GOALS', 'Make measurable progress on the most important work.');
    const tasks = listEnv('DAILY_TASKS', 'Review priorities|Complete the highest-impact task|Complete planned sales follow-ups');
    const salesTarget = process.env.SALES_TARGET || 'Complete the planned qualified sales conversations and follow-ups.';

    const existing = await getPlan(pool, planDate);
    if (existing?.call_sid && existing.status === 'called' && process.env.ALLOW_REPEAT_CALL !== 'true') {
      console.log(`Plan for ${planDate} already called as ${existing.call_sid}; skipping duplicate.`);
      return;
    }

    const briefing = await generatePlan({ planDate, goals, tasks, salesTarget });
    const plan = await savePlan(pool, { planDate, timezone: 'Africa/Nairobi', goals, tasks, salesTarget, briefing });
    await recordEvent(pool, plan.id, 'plan_generated', { goals, tasks, salesTarget });

    const call = await placeMorningCall({ briefing, baseUrl: process.env.PUBLIC_BASE_URL });
    await markCall(pool, plan.id, call.sid, call.status || 'queued');
    await recordEvent(pool, plan.id, 'call_created', { callSid: call.sid, status: call.status || 'queued' });
    console.log(JSON.stringify({ ok: true, planDate, planId: plan.id, callSid: call.sid }));
  } finally {
    await pool.end();
  }
}

run().catch(error => { console.error(error.stack || error); process.exit(1); });
