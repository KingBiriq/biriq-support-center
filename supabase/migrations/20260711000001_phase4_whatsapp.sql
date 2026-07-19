-- Phase 4: Support Center Whatsapp Integration

CREATE TABLE IF NOT EXISTS support_whatsapp_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT UNIQUE NOT NULL,
    external_message_id TEXT,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature_valid BOOLEAN DEFAULT false,
    processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processing', 'processed', 'failed', 'dead_letter')),
    attempts INT DEFAULT 0,
    last_error TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_outbound_message_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    support_message_id UUID REFERENCES support_messages(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL DEFAULT 'whatsapp',
    job_status TEXT NOT NULL DEFAULT 'pending' CHECK (job_status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    next_retry_at TIMESTAMPTZ DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_media_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_media_id TEXT NOT NULL,
    message_id UUID REFERENCES support_messages(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'completed', 'failed')),
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    next_retry_at TIMESTAMPTZ DEFAULT NOW(),
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_template_name TEXT UNIQUE NOT NULL,
    language TEXT NOT NULL,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    header_type TEXT,
    header_content TEXT,
    body TEXT,
    footer TEXT,
    buttons JSONB,
    variables JSONB,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_whatsapp_connection_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'disconnected',
    last_webhook_received_at TIMESTAMPTZ,
    last_error TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additive Columns
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS customer_service_window_expires_at TIMESTAMPTZ;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS external_error_code TEXT;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS external_error_details TEXT;

-- Enable RLS
ALTER TABLE support_whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_outbound_message_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_media_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_whatsapp_connection_status ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_outbound_jobs_status ON support_outbound_message_jobs(job_status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_support_media_jobs_status ON support_media_jobs(status, next_retry_at);
