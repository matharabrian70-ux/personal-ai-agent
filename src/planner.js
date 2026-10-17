const OPENAI_URL = 'https://api.openai.com/v1/responses';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function clean(value, max = 4000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function generatePlan({ planDate, goals, tasks, salesTarget }) {
  const apiKey = required('OPENAI_API_KEY');
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const payload = {
    model,
    input: [
      {
        role: 'system',
        content: `You are the user's personal morning operating agent. Create a concise spoken plan for ${planDate} in Africa/Nairobi. Prioritize 1-3 outcomes, order the supplied tasks, include the sales target, identify one distraction to avoid, and finish with a short readiness question. Never invent calendar events, deadlines, completed work, numbers, or commitments. Use only supplied facts. Keep it under 90 seconds when spoken.`,
      },
      {
        role: 'user',
        content: JSON.stringify({ planDate, timezone: 'Africa/Nairobi', goals, tasks, salesTarget }),
      },
    ],
  };

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  const data = await response.json();
  const text = data.output_text ?? data.output?.flatMap(x => x.content ?? []).find(x => x.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI returned no plan text');
  return clean(text);
}
