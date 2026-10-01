const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');

const filesToUpdate = [
    'StudentDashboard.jsx',
    'StudentMyRequestsPage.jsx',
    'PlacementDashboard.jsx',
    'ApproverDashboard.jsx',
    'CTPO/CTPODashboard.jsx',
    'CTPO/CTPOPendingRequests.jsx',
    'CTPO/CTPOAllRequests.jsx',
    'CTPO/CTPOHistory.jsx',
    'CTPO/CTPOReports.jsx'
];

function transformFile(filePath) {
    const fullPath = path.join(pagesDir, filePath);
    if (!fs.existsSync(fullPath)) return;
    
    console.log(`Processing ${fullPath}...`);
    let code = fs.readFileSync(fullPath, 'utf-8');

    // Due to the complexity of Babel AST generation for React JSX and the risk of losing formatting, 
    // it's much safer and more predictable to use targeted Regex replacements for these specific UI elements
    // since they follow a relatively consistent pattern in this codebase.

    let modified = false;

    // 1. KPI Cards (Stat Cards)
    // We will look for <div className="stat-card" ...>
    const statCardRegex = /<div\s+className="stat-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    // Wait, regex might fail on nested divs. Let's do a custom replacement loop.
    // Instead of doing it blindly, let's use a simpler approach.
    // Let's replace the inline styles for stat cards.
    code = code.replace(/className="stat-card"([^>]*)style={{[^}]*}}/g, (match, p1) => {
        modified = true;
        return `className="card" ${p1}style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', minHeight: 100, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', display: 'flex', alignItems: 'center', gap: 16 }}`;
    });

    // Replace the inner divs of stat card.
    // We can replace the icon wrapper style
    code = code.replace(/style={{\s*width:\s*'46px',\s*height:\s*'46px',\s*borderRadius:\s*'14px',\s*background:\s*([^,]+),\s*color:\s*([^,]+),\s*display:\s*'flex',\s*alignItems:\s*'center',\s*justifyContent:\s*'center',\s*flexShrink:\s*0\s*}}/g, (match, bg, color) => {
        modified = true;
        return `style={{ width: 48, height: 48, borderRadius: 14, background: ${bg}, color: ${color}, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}`;
    });

    // Replace the label style
    code = code.replace(/style={{\s*fontSize:\s*'14px',\s*color:\s*'#475569',\s*fontWeight:\s*700,\s*lineHeight:\s*1.3\s*}}/g, () => {
        modified = true;
        return `style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 4 }}`;
    });

    // Replace the value style
    code = code.replace(/style={{\s*fontSize:\s*'32px',\s*fontWeight:\s*800,\s*color:\s*'#1f2937',\s*lineHeight:\s*1\s*}}/g, () => {
        modified = true;
        return `style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}`;
    });

    // For ApproverDashboard, it has slightly different stat-card styles:
    code = code.replace(/className="stat-card"([^>]*)style={{[^}]*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'14px',\s*cursor:\s*'pointer',\s*transition:\s*'all 0.2s ease'\s*}}/g, (match, p1) => {
        modified = true;
        return `className="card" ${p1}style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', minHeight: 100, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', display: 'flex', alignItems: 'center', gap: 16 }}`;
    });
    
    code = code.replace(/<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>/g, (match) => {
        modified = true;
        return `<div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>`;
    });

    // Let's standardise the buttons. View buttons and Review buttons.
    // Student Dashboard View buttons:
    code = code.replace(/style={{\s*padding:\s*'6px 14px',\s*background:\s*'#eff6ff',\s*color:\s*'#2563eb',\s*borderRadius:\s*'8px',\s*fontSize:\s*'12px',\s*fontWeight:\s*600,\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'6px',\s*transition:\s*'all 0.2s ease'\s*}}/g, () => {
        modified = true;
        return `style={{ height: 32, padding: '0 10px', border: '1px solid #dbeafe', borderRadius: 7, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}`;
    });

    code = code.replace(/<FaEye size={14} \/>/g, "<Eye size={14} />");
    code = code.replace(/<FaEye size={16} \/>/g, "<Eye size={14} />");

    // Standardize status badges by delegating to HOD style badge, if a StatusBadge component exists, 
    // it usually is imported. If it's inline, replace inline styles.
    // Example: background: '#dcfce7', color: '#16a34a' -> just rely on HOD StatusBadge if we can.
    
    if (modified) {
        fs.writeFileSync(fullPath, code, 'utf-8');
        console.log(`Updated ${fullPath}`);
    }
}

filesToUpdate.forEach(transformFile);
