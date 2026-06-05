-- packages/db/schema.sql — load-bearing tables

-- 1. ACTIONS — every action ever attempted
CREATE TABLE actions (
    action_id     UUID PRIMARY KEY,
    session_id    UUID NOT NULL REFERENCES sessions(session_id),
    agent_role    TEXT NOT NULL,
    intent        TEXT NOT NULL,
    tool          TEXT NOT NULL,
    args          JSONB NOT NULL,
    risk_tier     TEXT NOT NULL CHECK (risk_tier IN ('green','yellow','red')),
    phase         TEXT NOT NULL,  -- classified|approved|denied|executed|failed
    result        JSONB,
    error         TEXT,
    spend_usd     NUMERIC(10,6) DEFAULT 0,
    duration_ms   INTEGER,
    snapshot_id   UUID REFERENCES snapshots(snapshot_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON actions (session_id, created_at);
CREATE INDEX ON actions (agent_role, created_at);
CREATE INDEX ON actions (risk_tier, phase);

-- 2. SESSIONS — agent runs (rooted in a goal)
CREATE TABLE sessions (
    session_id    UUID PRIMARY KEY,
    goal          TEXT NOT NULL,
    user_id       UUID NOT NULL REFERENCES users(user_id),
    initiating_agent TEXT NOT NULL,
    status        TEXT NOT NULL,  -- planning|executing|paused|completed|failed
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at      TIMESTAMPTZ,
    total_spend_usd NUMERIC(10,6) DEFAULT 0
);

-- 3. MEMORY — vector + structured + episodic
CREATE TABLE memory (
    memory_id     UUID PRIMARY KEY,
    kind          TEXT NOT NULL,  -- episodic|semantic|procedural|adr|postmortem|skill
    content       TEXT NOT NULL,
    embedding     vector(1024),    -- bge-large-en-v1.5
    metadata      JSONB NOT NULL DEFAULT '{}',
    project       TEXT,
    confidence    REAL CHECK (confidence BETWEEN 0 AND 1),
    source_action UUID REFERENCES actions(action_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed TIMESTAMPTZ NOT NULL DEFAULT now(),
    access_count  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ON memory USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON memory (kind, project);

-- 4. SKILLS — versioned, testable recipes
CREATE TABLE skills (
    skill_id      UUID PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    version       TEXT NOT NULL,
    description   TEXT NOT NULL,
    code_path     TEXT NOT NULL,  -- skills/send_invoice/v1.2.0/
    parameters    JSONB NOT NULL,  -- Zod-style schema
    risk_tier_default TEXT NOT NULL,
    test_path     TEXT NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    avg_duration_ms INTEGER,
    last_run_at   TIMESTAMPTZ
);

-- 5. APPROVALS — Red-tier paper trail
CREATE TABLE approvals (
    approval_id   UUID PRIMARY KEY,
    action_id     UUID NOT NULL REFERENCES actions(action_id),
    requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at    TIMESTAMPTZ,
    decided_by    UUID REFERENCES users(user_id),
    granted       BOOLEAN,
    reason        TEXT,
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes')
);

-- 6. SNAPSHOTS — rollback points
CREATE TABLE snapshots (
    snapshot_id   UUID PRIMARY KEY,
    kind          TEXT NOT NULL,  -- vss|file|git|db|registry
    target        TEXT NOT NULL,
    storage_uri   TEXT NOT NULL,
    size_bytes    BIGINT,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. SPEND_LEDGER — append-only money tracker
CREATE TABLE spend_ledger (
    ledger_id     UUID PRIMARY KEY,
    action_id     UUID REFERENCES actions(action_id),
    category      TEXT NOT NULL,  -- llm_api|cloud_compute|saas|domain
    vendor        TEXT NOT NULL,
    amount_usd    NUMERIC(10,6) NOT NULL,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON spend_ledger (occurred_at);
CREATE INDEX ON spend_ledger (category, vendor);

-- 8. CREDENTIALS — pointer to Windows Credential Manager (NEVER raw)
CREATE TABLE credential_refs (
    cred_id       UUID PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    backend       TEXT NOT NULL,  -- 'wincred'|'1password'|'wrangler-secret'
    backend_key   TEXT NOT NULL,  -- pointer only
    scope         TEXT NOT NULL,  -- which agents can use this
    rotation_due  TIMESTAMPTZ
);

-- 0. USERS — system users
CREATE TABLE users (
    user_id       UUID PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create test user
INSERT INTO users (user_id, username, email) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'rick', 'rjbizsolution23@gmail.com');