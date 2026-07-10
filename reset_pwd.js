const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tvnlqlyvlxwwhkvzorcg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmxxbHl2bHh3d2hrdnpvcmNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzMjUzNywiZXhwIjoyMDkyODA4NTM3fQ.v10J4N_JM73Lnpmapp8ODSbmLDtZw7t2-l1iw8163NU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetOrAdd() {
  const email = 'kingbiriq123@gmail.com';
  const newPassword = 'BiriqPassword123!';

  // Try creating user first
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: email,
    password: newPassword,
    email_confirm: true,
  });

  if (createError) {
    console.log('User might exist already. Error:', createError.message);
    
    // Attempting to list users and find them
    let foundUser = null;
    let page = 1;
    while(true) {
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if(usersError || !usersData.users.length) break;
        
        foundUser = usersData.users.find(u => u.email === email);
        if(foundUser) break;
        page++;
    }

    if (foundUser) {
        console.log('User found, updating password...');
        const { error } = await supabase.auth.admin.updateUserById(
            foundUser.id,
            { password: newPassword }
        );
        if (error) {
            console.error('Error updating password:', error);
        } else {
            console.log('Password updated successfully!');
        }
    } else {
        console.log('User still not found in pagination.');
    }

  } else {
    console.log('User created successfully with new password!');
  }
}

resetOrAdd();
