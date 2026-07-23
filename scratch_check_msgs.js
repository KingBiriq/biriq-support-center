const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tvnlqlyvlxwwhkvzorcg.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmxxbHl2bHh3d2hrdnpvcmNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzMjUzNywiZXhwIjoyMDkyODA4NTM3fQ.v10J4N_JM73Lnpmapp8ODSbmLDtZw7t2-l1iw8163NU');

async function run() {
  const { data: msgs, error } = await supabase.from('support_messages')
    .select('*')
    .eq('body', 'Hi')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(msgs);
}
run();
