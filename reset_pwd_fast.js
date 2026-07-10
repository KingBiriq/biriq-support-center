const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tvnlqlyvlxwwhkvzorcg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmxxbHl2bHh3d2hrdnpvcmNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzMjUzNywiZXhwIjoyMDkyODA4NTM3fQ.v10J4N_JM73Lnpmapp8ODSbmLDtZw7t2-l1iw8163NU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPwdFast() {
  const email = 'kingbiriq123@gmail.com';
  const newPassword = 'BiriqPassword123!';

  // Get user ID from profiles table
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profileErr || !profile) {
    console.error('Could not find user in profiles table:', profileErr);
    return;
  }

  const userId = profile.id;
  console.log('Found user ID:', userId);

  const { error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword, email_confirm: true }
  );

  if (error) {
      console.error('Error updating password:', error);
  } else {
      console.log('Password updated successfully!');
  }
}

resetPwdFast();
