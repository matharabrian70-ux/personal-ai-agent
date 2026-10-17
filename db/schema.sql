CREATE TABLE IF NOT EXISTS daily_plans (
  id BIGSERIAL PRIMARY KEY,
  plan_date DATE NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  sales_target TEXT,
  briefing TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','called','failed')),
  call_sid TEXT,
  call_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_events (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES daily_plans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_plan_id ON agent_events(plan_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON agent_events(created_at DESC);
