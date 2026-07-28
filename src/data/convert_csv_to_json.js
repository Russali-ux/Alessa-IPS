import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, 'WHO ATC-DDD 2024-07-31.csv');
const jsonPath = path.join(__dirname, 'atc_data.json');

try {
  console.log('Reading CSV file from:', csvPath);
  const binaryContent = fs.readFileSync(csvPath, 'binary');
  const latin1Content = Buffer.from(binaryContent, 'binary').toString('latin1');
  
  const lines = latin1Content.split(/\r?\n/);
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header line: "atc_code;atc_name;ddd;uom;adm_r;note;TRAD"
  const headerLine = lines[0].trim();
  const headers = headerLine.split(';').map(h => h.trim());
  console.log('Detected headers:', headers);

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(';').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    
    // Check if it is a valid row
    if (row.atc_code) {
      results.push(row);
    }
  }

  console.log(`Successfully parsed ${results.length} rows.`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('JSON saved successfully to:', jsonPath);
} catch (error) {
  console.error('Error during conversion:', error);
}
