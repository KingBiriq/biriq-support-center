const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: roles, error: err1 } = await supabase.from('support_roles').select('*');
  console.log("ROLES:");
  console.log(roles);
  
  const { data: profiles, error: err2 } = await supabase.from('support_staff_profiles').select('*');
  console.log("PROFILES:");
  console.log(profiles);
}
run();
