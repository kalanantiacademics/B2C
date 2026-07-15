const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', '..', 'apps-script', 'code-teacher.gs');
let content = fs.readFileSync(file, 'utf8');

// 1. Add handleGetRubrics in doGet
content = content.replace(
  "if (action === 'checkSync')    return handleCheckSync(e.parameter.classLink);",
  "if (action === 'checkSync')    return handleCheckSync(e.parameter.classLink);\n  if (action === 'getRubrics')   return handleGetRubrics();"
);

// 2. Add updateRubrikInAbsensi call in handleApproveProject
content = content.replace(
  "updateTotalStarsInAbsensi(ss, studentCol, studentName);",
  "updateTotalStarsInAbsensi(ss, studentCol, studentName);\n\n    if (sessionNum === 4 || sessionNum === 8) {\n      updateRubrikInAbsensi(ss, studentName, sessionNum, data.obsAktivitasScore, data.obsEngagementScore, data.obsNotes);\n    }"
);

// 3. Add handleGetRubrics and updateRubrikInAbsensi functions
const newFunctions = `
// ── getRubrics ───────────────────────────────────────────────────────────────
function handleGetRubrics() {
  try {
    const rubricSSId = "1RutBjQo881tjyArM5TZFYs_1pWFySuNq7Fj_zj38bfU";
    const ss = SpreadsheetApp.openById(rubricSSId);
    const sheet = ss.getSheetByName("[4S] Mapping Indikator");
    if (!sheet) return createJSONResponse({ success: false, message: "Sheet Rubrik tidak ditemukan." });

    const data = sheet.getDataRange().getValues();
    const rubrics = [];
    
    for (var i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // Skip empty rows
      
      rubrics.push({
        program: String(row[0]).trim(),
        level: String(row[1]).trim(),
        pertemuan: String(row[2]).trim(),
        nilai: parseInt(row[4], 10) || 0,
        obsAktivitas: String(row[6]).trim(),
        obsEngagement: String(row[7]).trim()
      });
    }

    return createJSONResponse({ success: true, rubrics });
  } catch (err) {
    return createJSONResponse({ success: false, message: "getRubrics error: " + err.toString() });
  }
}

function updateRubrikInAbsensi(ss, studentName, sessionNum, obsAktivitas, obsEngagement, obsNotes) {
  try {
    const absSheet = ss.getSheetByName("Absensi");
    if (!absSheet) return;
    
    const absData = absSheet.getDataRange().getValues();
    const mapping = getAbsensiMapping(absData);
    const sNameNorm = normalize(studentName);
    
    for (let r = mapping.dataRowStart; r < absData.length; r++) {
      const rowNameNorm = normalize(absData[r][mapping.colName]);
      if (rowNameNorm === sNameNorm) {
        let colAktivitas = sessionNum === 4 ? 19 : 22;
        let colEngagement = sessionNum === 4 ? 20 : 23;
        let colNotes = sessionNum === 4 ? 21 : 24;
        
        if (obsAktivitas) absSheet.getRange(r + 1, colAktivitas).setValue(obsAktivitas);
        if (obsEngagement) absSheet.getRange(r + 1, colEngagement).setValue(obsEngagement);
        if (obsNotes !== undefined) absSheet.getRange(r + 1, colNotes).setValue(obsNotes);
        break;
      }
    }
  } catch(e) {
    console.error("updateRubrikInAbsensi error: " + e.toString());
  }
}
`;

content += newFunctions;

fs.writeFileSync(file, content);
console.log('code-teacher.gs patched.');
