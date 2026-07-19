const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('support_channels').update({ status: 'connected' }).neq('status', 'connected');
  if (error) console.error(error);
  else console.log('Updated successfully', data);
}
main();
