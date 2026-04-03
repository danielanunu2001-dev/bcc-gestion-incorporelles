// frontend/scripts/update-styles.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colorsMap = {
  'var(--bg-primary)': 'var(--bg-primary)',
  'var(--bg-secondary)': 'var(--bg-secondary)',
  'var(--bg-card)': 'var(--bg-card)',
  'var(--bg-card)': 'var(--bg-card)',
  'var(--text-primary)': 'var(--text-primary)',
  'var(--text-primary)': 'var(--text-primary)',
  'var(--text-primary)': 'var(--text-primary)',
  'var(--text-primary)': 'var(--text-primary)',
  'var(--text-secondary)': 'var(--text-secondary)',
  'var(--text-secondary)': 'var(--text-secondary)',
  'var(--border-color)': 'var(--border-color)',
  'var(--border-color)': 'var(--border-color)',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const [oldColor, newColor] of Object.entries(colorsMap)) {
    const regex = new RegExp(`['"]${oldColor}['"]`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `'${newColor}'`);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Mis à jour: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(filePath);
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      processFile(filePath);
    }
  }
}

console.log('🔄 Mise à jour des styles des composants...');
walkDir(path.join(__dirname, '../src'));
console.log('✅ Terminé !');