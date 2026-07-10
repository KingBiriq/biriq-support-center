const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tvnlqlyvlxwwhkvzorcg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmxxbHl2bHh3d2hrdnpvcmNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzMjUzNywiZXhwIjoyMDkyODA4NTM3fQ.v10J4N_JM73Lnpmapp8ODSbmLDtZw7t2-l1iw8163NU'
);

async function test() {
  // Download the webm file
  const fileRes = await fetch('https://tvnlqlyvlxwwhkvzorcg.supabase.co/storage/v1/object/public/product-images/whatsapp-media/voice-staff-1720543666061.webm');
  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload as mp4
  await supabase.storage.from('product-images').upload('whatsapp-media/voice-staff-1720543666061.mp4', buffer, { contentType: 'audio/mp4' });

  // Then send via WA
  const token = 'EAAL9sXp1ue4BRtYhrIrfYI55CSq1bolUsogcdBY34End3CR0rC5WcX3W7YieKcSJjAejOnkjL31MwEf6TYAzLgfG97aUQ6hcyL67GHkh7RZCFUs3oxKxIRKTxCGcVU9G5DssmNM5gTB7qdpNlPeWRO1ci4fW8QtmzMrZBeWbyyXJmZAG7oCYnDoEFWAJAZDZD';
  const phoneId = '901531193046462';
  const toNumber = '252616417528';

  const res = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toNumber,
      type: 'audio',
      audio: {
        link: 'https://tvnlqlyvlxwwhkvzorcg.supabase.co/storage/v1/object/public/product-images/whatsapp-media/voice-staff-1720543666061.mp4'
      }
    })
  });
  console.log('Audio mp4 disguise:', await res.json());
}
test();
