import twilio from 'twilio';
import { requiredEnv } from './db.js';

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function briefingTwiml(briefing, baseUrl) {
  const safe = xmlEscape(briefing);
  const action = `${baseUrl.replace(/\/$/, '')}/voice/respond`;
  return `<Response><Gather input="speech" method="POST" action="${xmlEscape(action)}" speechTimeout="auto" language="en-KE"><Say language="en-KE" voice="Polly.Joanna">${safe}</Say><Say language="en-KE" voice="Polly.Joanna">You can say repeat, done, or tell me an instruction to record.</Say></Gather><Say language="en-KE" voice="Polly.Joanna">No response received. Have a productive day.</Say></Response>`;
}

export function responseTwiml(message, baseUrl) {
  const safe = xmlEscape(message);
  const action = `${baseUrl.replace(/\/$/, '')}/voice/respond`;
  return `<Response><Gather input="speech" method="POST" action="${xmlEscape(action)}" speechTimeout="auto" language="en-KE"><Say language="en-KE" voice="Polly.Joanna">${safe}</Say></Gather><Say language="en-KE" voice="Polly.Joanna">Goodbye.</Say></Response>`;
}

export function createTwilioClient() {
  const sid = requiredEnv('TWILIO_ACCOUNT_SID');
  const token = requiredEnv('TWILIO_AUTH_TOKEN');
  return twilio(sid, token);
}

export async function placeMorningCall({ briefing, baseUrl }) {
  const client = createTwilioClient();
  return client.calls.create({
    to: requiredEnv('AGENT_TO_NUMBER'),
    from: requiredEnv('TWILIO_FROM_NUMBER'),
    twiml: briefingTwiml(briefing, baseUrl),
    statusCallback: `${baseUrl.replace(/\/$/, '')}/voice/status`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  });
}
