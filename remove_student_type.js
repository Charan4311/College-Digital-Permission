const fs = require('fs');

const replaceInFile = (file, replacements) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (const rep of replacements) {
    if (typeof rep === 'function') {
      content = rep(content);
    } else {
      content = content.replace(rep[0], rep[1]);
    }
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
};

const removeLinesWith = (str) => (content) => {
  const lines = content.split('\n');
  return lines.filter(l => !l.includes(str)).join('\n');
};

const removeRegex = (regex, replacement = '') => (content) => {
  return content.replace(regex, replacement);
};

// models
['backend/src/models/Student.js', 'backend/src/models/User.js', 'backend/src/models/OutpassRequest.js'].forEach(file => {
  replaceInFile(file, [
    removeRegex(/.*studentType.*[\r\n]*/g, ''),
  ]);
});

// Outpass controller
replaceInFile('backend/src/modules/outpass/controller.js', [
  removeRegex(/studentType,\s*/g, ''),
  removeRegex(/studentType:[\s\S]*?student\.studentType\s*\|\|[\s\S]*?'DAY_SCHOLAR',\s*/g, ''),
  removeRegex(/if \(user\?\.authorityScope\?\.studentType\) \{[\s\S]*?\} else if/g, 'if'),
  removeRegex(/if \(user\?\.authorityScope\?\.studentType\) \{[\s\S]*?\}/g, ''),
  removeRegex(/filter\.studentType = 'HOSTELER';\s*/g, ''),
  removeRegex(/const studentType =[\s\S]*?'DAY_SCHOLAR'\);\s*/g, ''),
  removeRegex(/return studentType === 'HOSTELER'[\s\S]*?\? \['CTPO', 'HOD', 'HOSTEL_INCHARGE'\][\s\S]*?\: \['CTPO', 'HOD'\];/g, "return ['CTPO', 'HOD'];"),
  removeRegex(/dbUser\.authorityScope\?\.studentType &&[\s\S]*?request\.studentType !==[\s\S]*?user\.authorityScope\.studentType\s*\)\s*\{[\s\S]*?\}/g, ''),
  removeRegex(/studentType:\s*studentType\s*\|\|\s*student\.studentType\s*\|\|\s*'DAY_SCHOLAR',/g, '')
]);

// Auth controller
replaceInFile('backend/src/modules/auth/controller.js', [
  removeRegex(/studentType:\s*account\.studentType,\s*/g, ''),
  removeRegex(/studentType,\s*/g, ''),
  removeRegex(/if \(studentType !== undefined\) \{[\s\S]*?\}/g, ''),
]);

// Admin controller
replaceInFile('backend/src/modules/admin/controller.js', [
  removeRegex(/studentType,\s*/g, ''),
  removeRegex(/if \(role === 'HOD'.*authorityScope\?\.studentType.*/g, "if (role === 'HOD' && (!authorityScope?.yearTier)) {"),
  removeRegex(/.*authorityScope\.yearTier and authorityScope\.studentType.*/g, "      return res.status(400).json({ success: false, message: 'authorityScope.yearTier required for HOD' });"),
  removeRegex(/if \(studentType && studentType !== 'all'.*/g, ''),
  removeRegex(/const typeStr = s\.studentType === 'DAY_SCHOLAR'.*?\: 'Unknown';/gs, ''),
  removeRegex(/,\s*Type:\s*typeStr/g, ''),
  removeRegex(/exports\.bulkUpdateStudentType = async[\s\S]*?exports\.bulkUpdateHostelStatus/g, 'exports.bulkUpdateHostelStatus'),
  removeRegex(/'Student Type': r\.studentId\?\.studentType === 'HOSTELER' \? 'Hosteler' : 'Day Scholar',\s*/g, '')
]);

// Security controller
replaceInFile('backend/src/modules/security/controller.js', [
  removeRegex(/studentType:\s*p\.requestId\?\.studentType,\s*/g, '')
]);

// outpass workflowService
replaceInFile('backend/src/modules/outpass/workflowService.js', [
  removeRegex(/if \(request\.studentType === 'DAY_SCHOLAR'\) return 'ISSUED';\s*/g, '')
]);

// Frontend files
replaceInFile('frontend/src/pages/StudentProfilePage.jsx', [
  removeRegex(/studentType:\s*'DAY_SCHOLAR',\s*/g, ''),
  removeRegex(/studentType:\s*user\.studentType \|\| 'DAY_SCHOLAR',\s*/g, ''),
  removeRegex(/const displayStudentType =.*?;/g, ''),
  removeRegex(/<div className="profile-field">\s*<span className="field-label">Student Type<\/span>\s*<span className="field-value">\{displayStudentType\}<\/span>\s*<\/div>/g, '')
]);

replaceInFile('frontend/src/pages/RequestDetail.jsx', [
  removeRegex(/return request\.studentType === 'HOSTELER'\s*\?\s*\['CTPO', 'HOD', 'HOSTEL_INCHARGE'\]\s*\:\s*\['CTPO', 'HOD'\];/g, "return ['CTPO', 'HOD'];"),
  removeRegex(/studentType:\s*req\.studentType \|\| 'DAY_SCHOLAR',\s*/g, '')
]);

replaceInFile('frontend/src/pages/PlacementDashboard.jsx', [
  removeRegex(/HOSTEL_INCHARGE:.*?,/g, ''),
  removeRegex(/request\.studentType === 'HOSTELER'/g, 'false'),
  removeRegex(/request\.studentType === 'DAY_SCHOLAR'/g, 'true')
]);

replaceInFile('frontend/src/pages/ApproverDashboard.jsx', [
  removeRegex(/HOSTEL_INCHARGE:.*?,/g, ''),
  removeRegex(/request\.studentType === 'HOSTELER'/g, 'false'),
  removeRegex(/request\.studentType === 'DAY_SCHOLAR'/g, 'true')
]);

replaceInFile('frontend/src/pages/hod/HODBranches.jsx', [
  removeRegex(/type === "DAY_SCHOLAR" \|\|/g, ''),
  removeRegex(/type === "HOSTELER" \|\|/g, ''),
  removeRegex(/request\.studentType === "DAY_SCHOLAR"/g, 'false'),
  removeRegex(/request\.studentType === "HOSTELER"/g, 'false')
]);

replaceInFile('frontend/src/pages/hod/HODReports.jsx', [
  removeRegex(/\|\|\s*value\.includes\('HOSTELER'\)/g, ''),
  removeRegex(/if \(value\.includes\('DAY_SCHOLAR'\)\) return 'Day Scholar';/g, ''),
  removeRegex(/if \(value\.includes\('HOSTELER'\)\) return 'Hosteler';/g, ''),
  removeRegex(/\{\s*name:\s*'Day Scholar',.*?\},/gs, ''),
  removeRegex(/\{\s*name:\s*'Hosteler',.*?\},/gs, '')
]);

replaceInFile('frontend/src/pages/hod/HODApprovals.jsx', [
  removeRegex(/if \(type === 'DAY_SCHOLAR'\) \{.*?return 'DAY_SCHOLAR';\s*\}/gs, ''),
  removeRegex(/if \(type === 'HOSTELER'\) \{.*?return 'HOSTELER';\s*\}/gs, '')
]);

replaceInFile('frontend/src/index.css', [
  removeRegex(/\.badge-day_scholar\s*\{.*?\}/gs, ''),
  removeRegex(/\.badge-hosteler\s*\{.*?\}/gs, '')
]);

console.log("Replacements complete.");
