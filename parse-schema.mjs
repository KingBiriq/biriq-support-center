import fs from 'fs';

const spec = JSON.parse(fs.readFileSync('live_schema_spec.json', 'utf8'));

const definitions = spec.definitions || spec.components?.schemas || {};
const result = {};

for (const [tableName, schema] of Object.entries(definitions)) {
  if (tableName.startsWith('support_') || tableName === 'orders' || tableName === 'payments') {
    result[tableName] = Object.keys(schema.properties || {});
  }
}

fs.writeFileSync('support_tables_summary.json', JSON.stringify(result, null, 2));
console.log('Summary saved to support_tables_summary.json');
