async function test() {
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
