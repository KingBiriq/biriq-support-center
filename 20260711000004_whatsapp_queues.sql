-- Group E: Durable WhatsApp Queues for Support Center
-- Biriq Store handles Meta Webhooks and forwards to Support Center via queues to prevent data loss.

CREATE TABLE IF NOT EXISTS public.support_whatsapp_forward_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for worker to quickly find pending/failed jobs
CREATE INDEX IF NOT EXISTS idx_support_whatsapp_forward_jobs_status ON public.support_whatsapp_forward_jobs(status, next_retry_at);

-- Support outbox queue for outbound messages (to isolate failures from API latency)
CREATE TABLE IF NOT EXISTS public.support_whatsapp_outbox_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_whatsapp_outbox_jobs_status ON public.support_whatsapp_outbox_jobs(status, next_retry_at);

-- RLS
ALTER TABLE public.support_whatsapp_forward_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_whatsapp_outbox_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on forward_jobs" 
ON public.support_whatsapp_forward_jobs 
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on outbox_jobs" 
ON public.support_whatsapp_outbox_jobs 
FOR ALL TO service_role USING (true) WITH CHECK (true);
