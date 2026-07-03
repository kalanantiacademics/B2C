const fs = require('fs');
const file = '/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/class-detail.html';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('function openApprovalModal(idx, sNum) {', 'async function openApprovalModal(idx, sNum) {');

fs.writeFileSync(file, content);
console.log('Fixed async');
