const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  'src/pages',
  'src/pages/admin',
  'src/pages/CTPO',
  'src/pages/hod',
  'src/components'
];

const IGNORED_FILES = [
  'StudentDashboard.jsx',
  'StudentMyRequestsPage.jsx',
  'StudentNewPermissionPage.jsx',
  'StudentProfilePage.jsx',
  'StudentLayout.jsx',
  'StudentSidebar.jsx'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace colors
  content = content.replace(/#2563eb/gi, '#10b981');
  content = content.replace(/#3b82f6/gi, '#10b981');
  content = content.replace(/#8b5cf6/gi, '#10b981');
  content = content.replace(/#7c3aed/gi, '#10b981');
  content = content.replace(/#eff6ff/gi, '#ecfdf5');
  content = content.replace(/#dbeafe/gi, '#d1fae5'); // Light blue

  // Fix up gradient syntax in case they got double-replaced
  content = content.replace(/'linear-gradient\(135deg, #10b981, #10b981\)'/g, "'linear-gradient(135deg, #10b981, #14b8a6)'");
  content = content.replace(/'linear-gradient\(135deg, var\(--accent\), #10b981\)'/g, "'linear-gradient(135deg, var(--accent), #14b8a6)'");

  // Fix TOTAL cards specifically in the known dashboards
  // E.g. { key: 'TOTAL', ..., color: '#10b981' }
  content = content.replace(/({[^}]*key:\s*'TOTAL'[^}]*color:\s*)'#10b981'/g, "$1'#3b82f6'");
  // Any "Total Requests" block in admin dashboards
  content = content.replace(/(label:\s*'Total( Requests)?'[^}]*color:\s*)'#10b981'/g, "$1'#3b82f6'");
  content = content.replace(/(label:\s*'Total( Requests)?'[^}]*iconColor:\s*)'#10b981'/g, "$1'#3b82f6'");
  content = content.replace(/(label:\s*'Total( Requests)?'[^}]*iconBg:\s*)'#ecfdf5'/g, "$1'#eff6ff'");
  content = content.replace(/(label:\s*'Total( Requests)?'[^}]*activeColor:\s*)'#10b981'/g, "$1'#3b82f6'");
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

TARGET_DIRS.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) return;
  
  const files = fs.readdirSync(fullPath);
  files.forEach(file => {
    if (file.endsWith('.jsx') && !IGNORED_FILES.includes(file)) {
      processFile(path.join(fullPath, file));
    }
  });
});
