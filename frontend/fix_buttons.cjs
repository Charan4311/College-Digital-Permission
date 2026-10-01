const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  'src/pages',
  'src/pages/admin',
  'src/pages/CTPO',
  'src/pages/hod',
  'src/components'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // The pattern looks for a button styling block that was converted to teal, followed shortly by <Eye ... />
  // We'll replace '#10b981' -> '#3b82f6' and '#ecfdf5' -> '#eff6ff'
  // Regex to match a block containing 'background: '#ecfdf5'' and 'color: '#10b981'' that precedes an Eye icon
  // This might be tricky across multiple lines, so we'll do something simpler.
  
  // Find <button> ... <Eye ... /> ... </button>
  // Then replace the colors inside it.
  
  const buttonRegex = /<button[\s\S]*?<\/button>/gi;
  content = content.replace(buttonRegex, (match) => {
    if (match.includes('<Eye') && (match.includes('View') || match.includes('Review'))) {
      // This is a View button! Revert teal colors to light blue
      return match
        .replace(/#ecfdf5/gi, '#eff6ff')
        .replace(/#10b981/gi, '#3b82f6');
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed Eye buttons in', filePath);
  }
}

TARGET_DIRS.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) return;
  
  const files = fs.readdirSync(fullPath);
  files.forEach(file => {
    if (file.endsWith('.jsx')) {
      processFile(path.join(fullPath, file));
    }
  });
});
