const fs = require('fs');
const file = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/dashboard.html';
let content = fs.readFileSync(file, 'utf8');

const target1 = `        const currentSession = parseInt(localStorage.getItem('currentSession')||'1', 10);`;
const replace1 = `        // Match progress with attendance as requested
        const attSess = parseInt(localStorage.getItem('attendanceSession'), 10);
        const currentSession = !isNaN(attSess) && attSess > 0 ? attSess : parseInt(localStorage.getItem('currentSession')||'1', 10);`;

const target2 = `        const pct = Math.round((sess-1)/MAX_LESSONS*100) || 8;`;
const replace2 = `        // Adjust pct to be based on attendance
        const pct = !isNaN(attSess) ? Math.round((attSess)/MAX_LESSONS*100) : (Math.round((sess-1)/MAX_LESSONS*100) || 8);`;

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);

fs.writeFileSync(file, content);
console.log('dashboard.html patched successfully.');
