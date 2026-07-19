import fs from 'fs';

async function fetchSchema() {
  const url = 'https://tvnlqlyvlxwwhkvzorcg.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmxxbHl2bHh3d2hrdnpvcmNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzMjUzNywiZXhwIjoyMDkyODA4NTM3fQ.v10J4N_JM73Lnpmapp8ODSbmLDtZw7t2-l1iw8163NU';
  const roleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmxxbHl2bHh3d2hrdnpvcmNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzMjUzNywiZXhwIjoyMDkyODA4NTM3fQ.v10J4N_JM73Lnpmapp8ODSbmLDtZw7t2-l1iw8163NU';
  
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': roleKey,
        'Authorization': `Bearer ${roleKey}`
      }
    });
    
    if (!res.ok) {
      console.error('Failed to fetch schema:', res.status, res.statusText, await res.text());
      return;
    }
    
    const schema = await res.json();
    fs.writeFileSync('live_schema_spec.json', JSON.stringify(schema, null, 2));
    console.log('Schema saved to live_schema_spec.json');
  } catch (err) {
    console.error('Error:', err);
  }
}

fetchSchema();
