# Personal AI Agent

An autonomous morning operating agent. Every day at 07:00 Africa/Nairobi, GitHub Actions triggers the protected Render endpoint. The service generates a daily plan with OpenAI, stores it in Postgres, places a Twilio call, and handles basic voice responses.

## Architecture

GitHub Actions scheduler → Render web service → PostgreSQL + OpenAI → Twilio Voice → phone → Twilio webhooks → Render → PostgreSQL event log.

The scheduler is GitHub Actions so the first version does not require a paid Render cron service.

## What V1 does

- Runs automatically at 07:00 Africa/Nairobi (04:00 UTC).
- Builds a plan from configured goals, tasks, and sales target.
- Stores one plan per Nairobi calendar date.
- Prevents duplicate calls by default.
- Calls the configured phone number through Twilio.
- Reads the plan aloud.
- Lets the user say “repeat” or “done”, and records other spoken instructions as events without silently mutating the plan.
- Records plan generation, call creation, call status, and voice input events.
- Exposes `/health` for deployment checks.
- Exposes a token-protected `/admin/run-morning` endpoint for the scheduler and manual end-to-end testing.

## Required secrets

Set these in Render:

- `DATABASE_URL` — connection string for the existing `restaurant-business-ai-db` only if you intentionally choose to share that database; otherwise use the dedicated personal-agent database you created.
- `OPENAI_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `AGENT_TO_NUMBER` (E.164 format, e.g. +2547...)
- `AGENT_TRIGGER_TOKEN`

`PUBLIC_BASE_URL` is already configured as the Render service URL.

Set the same `AGENT_TRIGGER_TOKEN` as a GitHub Actions repository secret named `AGENT_TRIGGER_TOKEN`.

## BUILD → CONNECT → TEST → DEPLOY

### BUILD — complete

Code, database schema, voice webhooks, autonomous execution path, duplicate-call guard, event logging, tests, and scheduler workflow are committed.

### CONNECT — user action

Add the required credentials/secrets. Never commit them to GitHub.

### TEST — after keys are added

1. Confirm Render `/health` returns `{"ok":true,"database":true}`.
2. Use GitHub Actions → Morning Agent → Run workflow.
3. Confirm the workflow receives a successful JSON response containing `callSid`.
4. Confirm the phone call arrives and reads the plan.
5. Say “repeat”; confirm the plan is repeated.
6. Say “done”; confirm the call ends.
7. Inspect the database event log for `plan_generated`, `call_created`, `call_status`, and `voice_input`.
8. Run the workflow a second time the same day; confirm it reports `already_called` and does not place a second call.

### DEPLOY — after successful test

Leave the GitHub schedule enabled. The system then runs automatically every morning.

## Failure behavior

- Missing credentials: execution fails loudly; no fake call is attempted.
- OpenAI failure: no call is placed.
- Database failure: no call is placed and the service reports unhealthy.
- Twilio failure: the run fails and the plan remains stored for diagnosis.
- Duplicate trigger: no second call unless `ALLOW_REPEAT_CALL=true`.
- Voice-processing failure: the user is told the plan was not changed.

## V2 deliberately deferred

Calendar OAuth, task-manager synchronization, full natural-language plan editing, evening review, and long-term performance analytics are not hidden dependencies of V1. They will be added only after the first autonomous morning call passes end-to-end acceptance testing.
