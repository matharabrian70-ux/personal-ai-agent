import express from 'express';
import { createPool, migrate, getPlan, recordEvent } from './db.js';
import { responseTwiml } from './voice.js';
import { runMorning } from './runMorning.js';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const port = Number(process.env.PORT || 10000);
const pool = process.env.DATABASE_URL ? createPool() : null;

app.get('/health', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok: false, database: false });
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: true });
  } catch (error) {
    res.status(503).json({ ok: false, database: false, error: error.message });
  }
});

app.post('/admin/run-morning', async (req, res) => {
  if (!process.env.AGENT_TRIGGER_TOKEN || req.get('authorization') !== `Bearer ${process.env.AGENT_TRIGGER_TOKEN}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  try {
    const result = await runMorning();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/voice/respond', async (req, res) => {
  const speech = String(req.body.SpeechResult || '').trim();
  const planDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
  try {
    if (!pool) throw new Error('Database is not configured');
    const plan = await getPlan(pool, planDate);
    if (!plan) return res.type('text/xml').send(responseTwiml('I could not find today’s plan. Please check the agent setup.', process.env.PUBLIC_BASE_URL));
    await recordEvent(pool, plan.id, 'voice_input', { speech: speech.slice(0, 1000) });

    let message = 'Got it. I have recorded that. Your current priority remains the top outcome in today’s plan. Have a productive day.';
    if (/\b(repeat|again)\b/i.test(speech)) message = plan.briefing;
    else if (/\b(done|goodbye|bye|finish)\b/i.test(speech)) message = 'Understood. Have a productive day.';
    else if (speech) message = `Understood: ${speech.slice(0, 180)}. I have recorded your instruction for today.`;

    res.type('text/xml').send(responseTwiml(message, process.env.PUBLIC_BASE_URL));
  } catch (error) {
    console.error(error);
    res.type('text/xml').send(responseTwiml('I hit a problem while processing that. I have not changed your plan. Goodbye.', process.env.PUBLIC_BASE_URL));
  }
});

app.post('/voice/status', async (req, res) => {
  try {
    if (pool) {
      const planDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
      const plan = await getPlan(pool, planDate);
      if (plan) await recordEvent(pool, plan.id, 'call_status', { callSid: req.body.CallSid, status: req.body.CallStatus });
    }
  } catch (error) { console.error(error); }
  res.sendStatus(204);
});

async function start() {
  if (pool) await migrate(pool);
  app.listen(port, () => console.log(`Personal AI agent listening on ${port}`));
}

start().catch(error => { console.error(error); process.exit(1); });
