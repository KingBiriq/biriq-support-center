const crypto = require('crypto');
const secret = 'biriq_support_super_secret_key_2026_xyz';
const ts = Date.now().toString();
const id = crypto.randomUUID();
const q = '?q=252616417528';
const payload = ts + '.' + id + '.' + q;
const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

fetch('http://localhost:3000/api/internal/support/orders'+q, {
  headers: {
    'x-biriq-signature-256': sig,
    'x-biriq-timestamp': ts,
    'x-biriq-request-id': id
  }
}).then(r => r.text()).then(console.log).catch(console.error);
