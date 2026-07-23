const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tvnlqlyvlxwwhkvzorcg.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmxxbHl2bHh3d2hrdnpvcmNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzMjUzNywiZXhwIjoyMDkyODA4NTM3fQ.v10J4N_JM73Lnpmapp8ODSbmLDtZw7t2-l1iw8163NU');

async function run() {
  const { data: events, error } = await supabase.from('support_whatsapp_webhook_events')
    .select('*')
    .contains('payload', { messages: [{ id: 'wamid.HBgMMjUyNjE2NDE3NTI4FQIAERgSRkM1OEM2OUUxRDcyNzdFRjEyAA==' }] });
  console.log(JSON.stringify(events, null, 2));
}
run();
