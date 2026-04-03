// frontend/scripts/update-styles.cjs
const fs = require('fs');
const path = require('path');

const colorsMap = {
  '#f1f5f9': 'var(--bg-primary)',
  '#f9fafb': 'var(--bg-secondary)',
  '#ffffff': 'var(--bg-card)',
  'white': 'var(--bg-card)',
  '#0f172a': 'var(--text-primary)',
  '#111827': 'var(--text-primary)',
  '#374151': 'var(--text-primary)',
  '#1f2937': 'var(--text-primary)',
  '#64748b': 'var(--text-secondary)',
  '#6b7280': 'var(--text-secondary)',
  '#e5e7eb': 'var(--border-color)',
  '#e2e8f0': 'var(--border-color)',
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
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
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