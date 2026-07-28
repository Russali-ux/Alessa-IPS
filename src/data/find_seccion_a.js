import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');

const findFiles = (dir, name, fileList = []) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        findFiles(filePath, name, fileList);
      }
    } else if (file === name) {
      fileList.push(filePath);
    }
  });
  return fileList;
};

console.log('Searching for "SeccionA.jsx"...');
const matches = findFiles(rootDir, 'SeccionA.jsx');
matches.forEach(m => console.log('Found:', m));
