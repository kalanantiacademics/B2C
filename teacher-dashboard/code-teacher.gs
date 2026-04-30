/**
 * B2C SCL - Teacher Dashboard Backend
 * Deployment: Deploy as Web App, accessible to "Anyone".
 */

const DB_SPREADSHEET_ID = "1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ";
const SHEET_NAME = "Class Database";

// Absensi sheet: data starts at row 16 (0-indexed: 15)
const ABS_DATA_ROW   = 16;   // first student row (1-indexed)
const ABS_COL_NAME   = 2;    // col B
const ABS_COL_AGE    = 3;    // col C
const ABS_COL_LEVEL  = 5;    // col E
const ABS_COL_SESI1  = 6;    // col F  → Sesi 1
const MAX_SESSIONS   = 12;

// Progress sheet: structure per-session block
// Row layout per session block (relative, 5 rows each):
// 0 = Date, 1 = Progress, 2 = Quiz Score, 3 = Star gained, 4 = Project Uploaded
const PROG_ROWS_PER_SESSION = 5;
const PROG_ROW_PROJECT      = 4; // "Project Uploaded" offset within block
const PROG_COL_MATRIX       = 2; // col B
const PROG_COL_FIRST_STUDENT = 3; // col C = first student

// ── doGet dispatcher ─────────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getClasses')   return handleLogin(e.parameter.email);
  if (action === 'getStudents')  return handleGetStudents(e.parameter.classLink);
  if (action === 'saveAbsensi')  return handleSaveAbsensi(e);
  if (action === 'checkSync')    return handleCheckSync(e.parameter.classLink);

  return createJSONResponse({ success: false, message: "Action not recognized." });
}

// ── doPost dispatcher ────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'approveProject') return handleApproveProject(data);
    if (data.action === 'giveBonus') return handleGiveBonus(data);
    
    return createJSONResponse({ success: false, message: "Invalid POST action" });
  } catch (err) {
    return createJSONResponse({ success: false, message: "Server POST Error: " + err.toString() });
  }
}

// ── getClasses (login) ───────────────────────────────────────────────────────
function handleLogin(email) {
  if (!email) return createJSONResponse({ success: false, message: "Email tidak boleh kosong." });

  try {
    const ss    = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return createJSONResponse({ success: false, message: "Sheet not found: " + SHEET_NAME });

    const data        = sheet.getDataRange().getValues();
    const searchEmail = String(email).trim().toLowerCase();
    let teacherNameRaw = "";
    const classes = [];

    for (var i = 1; i < data.length; i++) {
      var row         = data[i];
      var rowEmail    = String(row[8]).trim().toLowerCase();
      var classCode   = String(row[1]).trim();
      var classStatus = String(row[2]).trim();

      if (rowEmail === searchEmail && classCode.startsWith("SCL") && classStatus.toLowerCase() === "active") {
        if (!teacherNameRaw) teacherNameRaw = String(row[7]).trim();
        classes.push({
          classCode:   classCode,
          branchName:  String(row[0]).trim(),
          programName: String(row[3]).trim(),
          classLink:   String(row[9]).trim(),
          day:         String(row[17]).trim(),
          time:        String(row[20]).trim()
        });
      }
    }

    if (classes.length > 0) {
      let teacherName = teacherNameRaw;
      if (!teacherName.toLowerCase().startsWith("kak ")) teacherName = "Kak " + teacherName;
      return createJSONResponse({ success: true, teacherName, teacherEmail: searchEmail, classes });
    }

    return createJSONResponse({ success: false, message: "Email tidak terdaftar atau tidak ada kelas SCL aktif." });
  } catch (err) {
    return createJSONResponse({ success: false, message: "Terjadi kesalahan sistem: " + err.toString() });
  }
}

// ── getStudents ───────────────────────────────────────────────────────────────
// Returns: { success, students: [{ name, age, level, currentSession, totalSessions, projectLinks: {sesi: link} }] }
function handleGetStudents(classLink) {
  if (!classLink) return createJSONResponse({ success: false, message: "classLink diperlukan." });

  try {
    // Clean URL: common fix for SpreadsheetApp.openByUrl errors with malformed strings
    // ── Pre-process URL ──
    let spreadsheetId = "";
    const idMatch = (classLink || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch) {
      spreadsheetId = idMatch[1];
    } else {
      // Fallback: try openByUrl with minimal cleaning if ID match fails
      let fallbackLink = String(classLink || "").trim();
      if (fallbackLink.indexOf('?') > -1) fallbackLink = fallbackLink.split('?')[0];
      const ss = SpreadsheetApp.openByUrl(fallbackLink);
      spreadsheetId = ss.getId();
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);

    // ── Read Absensi sheet ──
    const absSheet = ss.getSheetByName("Absensi");
    if (!absSheet) return createJSONResponse({ success: false, message: "Sheet 'Absensi' tidak ditemukan." });

    const absData    = absSheet.getDataRange().getValues();
    const absHeaders = absData.slice(0, ABS_DATA_ROW - 1); // rows above data

    // Students start at ABS_DATA_ROW (1-indexed), i.e. index ABS_DATA_ROW-1
    const students = [];
    for (var r = ABS_DATA_ROW - 1; r < absData.length; r++) {
      const row  = absData[r];
      const name = String(row[ABS_COL_NAME - 1] || "").trim();
      if (!name) continue;

      const age   = String(row[ABS_COL_AGE - 1]   || "").trim();
      const level = String(row[ABS_COL_LEVEL - 1]  || "").trim();

      // Sesi 1–12 → columns F–Q (0-indexed: 5–16)
      let attendanceSession = 0; // 0 = belum mulai sama sekali
      const sessionDates = {};
      for (var s = 0; s < MAX_SESSIONS; s++) {
        const cellVal = row[ABS_COL_SESI1 - 1 + s];
        if (cellVal !== "" && cellVal !== null && cellVal !== undefined) {
          attendanceSession = s + 1;
          // Format date nicely
          const d = cellVal instanceof Date ? cellVal : new Date(cellVal);
          sessionDates[s + 1] = isNaN(d.getTime()) ? String(cellVal) : Utilities.formatDate(d, "Asia/Jakarta", "d MMM yyyy");
        }
      }

      students.push({ name, age, level, attendanceSession, totalSessions: MAX_SESSIONS, sessionDates });
    }

    // ── Read Progress sheet for project links ──
    const progSheet = ss.getSheetByName("Progress");
    if (progSheet) {
      const progData = progSheet.getDataRange().getValues();
      const progNotes = progSheet.getDataRange().getNotes();
      
      // Build student column maps from BOTH header rows (row 1 & 2)
      const headerRows = [progData[0] || [], progData[1] || []];
      const normHeaders = headerRows.map(row => row.map(h => normalize(h)));
      
      for (var stu of students) {
        stu.sessionData = {}; 
        stu.materialSession = 1; 
        stu.totalStars = 0;
        stu.todayGain = 0;
        
        const nameNorm = normalize(stu.name);
        let colIdx = -1;
        
        // Strategy 1: Search Row 2 (index 1) first, then Row 1 (index 0)
        for (let ri = 1; ri >= 0 && colIdx === -1; ri--) {
          colIdx = normHeaders[ri].indexOf(nameNorm);
        }
        
        // Strategy 2: Partial match if exact fails
        if (colIdx === -1) {
          for (let ri = 1; ri >= 0 && colIdx === -1; ri--) {
            for (let c = PROG_COL_FIRST_STUDENT - 1; c < normHeaders[ri].length; c++) {
              const h = normHeaders[ri][c];
              if (h && (nameNorm.includes(h) || h.includes(nameNorm))) {
                colIdx = c;
                break;
              }
            }
          }
        }
        
        if (colIdx === -1) continue;

        const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "d MMM yyyy");

        // Collect all 12 sessions
        for (var sNum = 1; sNum <= MAX_SESSIONS; sNum++) {
          const baseRowIdx = 3 + (sNum - 1) * PROG_ROWS_PER_SESSION; 
          if (baseRowIdx >= progData.length) break;

          // Dynamically detect offsets in this 5-row block
          let progOff = 0, starOff = 2, linkOff = 1, quizOff = 3; 
          
          for (var m = 0; m < PROG_ROWS_PER_SESSION; m++) {
            const rowIdx = baseRowIdx + m;
            if (rowIdx >= progData.length) break;
            const label = String(progData[rowIdx][PROG_COL_MATRIX - 1] || "").toLowerCase();
            if (label.includes("progres")) progOff = m;
            else if (label.includes("star") || label.includes("bintang") || label.includes("nilai")) starOff = m;
            else if (label.includes("project") || label.includes("upload") || label.includes("link")) linkOff = m;
            else if (label.includes("quiz")) quizOff = m;
          }

          const rawProg = progData[baseRowIdx + progOff][colIdx];
          let progress = "0%";
          if (typeof rawProg === 'number') {
            progress = Math.round(rawProg * 100) + "%";
          } else if (rawProg) {
            progress = String(rawProg).trim();
            if (!progress.includes("%") && !isNaN(progress) && progress !== "") progress = Math.round(parseFloat(progress)*100) + "%";
          }

          const rawStars = String(progData[baseRowIdx + starOff][colIdx] || "");
          const starNote = progNotes[baseRowIdx + starOff][colIdx];
          
          let starsVal = 0;
          const starMatches = rawStars.match(/(\d+)\s*(Star|Bintang)/gi);
          if (starMatches) {
            starMatches.forEach(match => {
              const num = parseInt(match.match(/\d+/)[0]);
              if (!isNaN(num)) starsVal += num;
            });
          } else {
            starsVal = parseFloat(rawStars) || 0;
          }

          const stars    = rawStars.trim();
          const link     = String(progData[baseRowIdx + linkOff][colIdx] || "").trim();
          
          const rawQuiz  = String(progData[baseRowIdx + quizOff][colIdx] || "").trim();
          let quizStars  = 0;
          if (rawQuiz.includes('/')) {
            quizStars = parseFloat(rawQuiz.split('/')[0]) || 0;
          } else {
            quizStars = parseFloat(rawQuiz) || 0;
            if (quizStars > 5) quizStars = Math.round(quizStars / 20); 
          }
          
          const dateVal  = String(progData[baseRowIdx - 1][colIdx] || "").trim(); 

          stu.sessionData[sNum] = { 
            progress, 
            stars, 
            starsVal, 
            link, 
            quiz: rawQuiz, 
            quizStars, 
            date: dateVal, 
            note: starNote 
          };
          stu.totalStars += starsVal;

          if (dateVal.includes(todayStr)) {
            stu.todayGain += starsVal;
          }

          if (progress === "100%" || progress === "1" || rawProg === 1) {
            stu.materialSession = Math.min(MAX_SESSIONS, sNum + 1);
          }
        }
        
        stu.projectLinks = {};
        stu.sessionStars = {};
        for (let sKey in stu.sessionData) {
          if (stu.sessionData[sKey].link) stu.projectLinks[sKey] = stu.sessionData[sKey].link;
          if (stu.sessionData[sKey].stars) stu.sessionStars[sKey] = stu.sessionData[sKey].stars;
        }
      }
    }


    return createJSONResponse({ success: true, students });
  } catch (err) {
    return createJSONResponse({ 
      success: false, 
      message: "getStudents error: " + err.toString() + (err.stack ? "\n" + err.stack : "") 
    });
  }
}

// ── saveAbsensi ───────────────────────────────────────────────────────────────
// Expects POST-like GET: action=saveAbsensi&classLink=...&date=...&attendance=JSON
// attendance = [{ name, nextSessAbs, materialSession }] — only students who are HADIR
function handleSaveAbsensi(e) {
  const classLink       = e.parameter.classLink;
  const dateStr         = e.parameter.date;       // "2026-03-25"
  const attendanceStr   = e.parameter.attendance; // JSON array

  if (!classLink || !dateStr || !attendanceStr) {
    return createJSONResponse({ success: false, message: "Parameter tidak lengkap." });
  }

  try {
    const attendanceList = JSON.parse(attendanceStr);
    
    // ── Open Spreadsheet ──
    const idMatch = (classLink || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
    const ss = idMatch ? SpreadsheetApp.openById(idMatch[1]) : SpreadsheetApp.openByUrl(classLink);
    
    const absSheet = ss.getSheetByName("Absensi");
    const progSheet = ss.getSheetByName("Progress");

    if (!absSheet) return createJSONResponse({ success: false, message: "Sheet 'Absensi' tidak ditemukan." });

    const absData = absSheet.getDataRange().getValues();
    
    // Build prog student map if progSheet exists
    let studentColMap = {};
    let progData = [];
    if (progSheet) {
        progData = progSheet.getDataRange().getValues();
        const headerRow = progData[0];
        for (var c = PROG_COL_FIRST_STUDENT - 1; c < headerRow.length; c++) {
            const hName = String(headerRow[c] || "").trim();
            if (hName) studentColMap[hName] = c;
        }
    }

    const savedFor = [];

    for (const entry of attendanceList) {
      const targetNameNorm = normalize(entry.name);
      const nextSessAbs = parseInt(entry.nextSessAbs, 10);
      const matSess     = parseInt(entry.materialSession, 10);
      
      if (!targetNameNorm || isNaN(nextSessAbs) || nextSessAbs < 1 || nextSessAbs > MAX_SESSIONS) continue;

      // 1. Catat ke sheet Absensi
      let foundAbs = false;
      for (var r = ABS_DATA_ROW - 1; r < absData.length; r++) {
        const rowNameNorm = normalize(absData[r][ABS_COL_NAME - 1]);
        if (rowNameNorm !== targetNameNorm) continue;

        // Column for this session (F=Sesi1 → col index 5, etc.)
        const colIdx = ABS_COL_SESI1 - 1 + (nextSessAbs - 1); // 0-based
        const cell   = absSheet.getRange(r + 1, colIdx + 1); // 1-based

        if (!cell.getValue()) {
          const dateObj = new Date(dateStr);
          cell.setValue(dateObj);
          cell.setNumberFormat("d MMM yyyy");
        }
        foundAbs = true;
        break;
      }

      // The date log to Progress sheet has been moved to student side (code-student.gs)
      if (foundAbs) savedFor.push(entry.name);
    }


    updateSyncFlag(ss);

    return createJSONResponse({ success: true, message: "Absensi & History Materi tersimpan.", savedFor });
  } catch (err) {
    return createJSONResponse({ 
      success: false, 
      message: "saveAbsensi error: " + err.toString() + (err.stack ? "\n" + err.stack : "") 
    });
  }
}

// ── approveProject ────────────────────────────────────────────────────────────
function handleApproveProject(data) {
  try {
    const classLink = data.classLink;
    const studentName = data.studentName;
    const sessionNum = parseInt(data.sessionNum, 10);
    const mustStars = parseInt(data.mustStars || 0, 10);
    const shouldStars = parseInt(data.shouldStars || 0, 10);
    const aspireStars = parseInt(data.aspireStars || 0, 10);
    // Note: quizStars now read-only, bonusStars moved to handleGiveBonus

    if (!classLink || !studentName || isNaN(sessionNum)) {
      return createJSONResponse({ success: false, message: "Data tidak lengkap." });
    }

    const idMatch = (classLink || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
    const ss = idMatch ? SpreadsheetApp.openById(idMatch[1]) : SpreadsheetApp.openByUrl(classLink);
    
    const sheet = ss.getSheetByName("Progress");
    if (!sheet) return createJSONResponse({ success: false, message: "Sheet Progress tidak ditemukan." });
    const studentInfo = findStudentAndSession(sheet, studentName, sessionNum);
    if (!studentInfo.success) return createJSONResponse(studentInfo);

    const { studentCol, sessionStartRow } = studentInfo;
    const lastRow = Math.max(sheet.getLastRow(), 100);

    // Search specifically within the next 6 rows for Progress, Quiz, and Star
    const matrixValues = sheet.getRange(sessionStartRow, 2, Math.min(6, lastRow - sessionStartRow + 1), 1).getValues();
    let progressRowOffset = -1;
    let quizRowOffset = -1;
    let starRowOffset = -1;

    for (let m = 0; m < matrixValues.length; m++) {
      const mval = String(matrixValues[m][0]).trim().toLowerCase();
      if (mval.indexOf('progress') > -1) progressRowOffset = m;
      else if (mval.indexOf('quiz') > -1) quizRowOffset = m;
      else if (mval.indexOf('star') > -1 || mval.indexOf('bintang') > -1) starRowOffset = m;
    }

    // Construct Detailed Star String
    let starStrs = [];
    if (mustStars > 0) starStrs.push(`${mustStars} Star - Must do`);
    if (shouldStars > 0) starStrs.push(`${shouldStars} Star - Should do`);
    if (aspireStars > 0) starStrs.push(`${aspireStars} Star - Aspire to do`);
    const quizS = parseInt(data.quizStars || 0, 10);
    if (quizS > 0) starStrs.push(`${quizS} Star - Quiz`);

    const finalStarString = starStrs.length > 0 ? starStrs.join("\n") : "";

    // Sum mission stars only for the date check threshold
    const missionStars = mustStars + shouldStars + aspireStars;

    // Write values
    if (progressRowOffset > -1) sheet.getRange(sessionStartRow + progressRowOffset, studentCol).setValue("100%");
    
    if (starRowOffset > -1 && finalStarString !== "") {
      sheet.getRange(sessionStartRow + starRowOffset, studentCol).setValue(finalStarString);
    }

    // Set Date to Today if stars provided
    if (missionStars > 0) {
      const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "d MMM yyyy");
      const dateCell = sheet.getRange(sessionStartRow - 1, studentCol);
      const currentVal = String(dateCell.getValue() || "");
      if (currentVal.indexOf(todayStr) === -1) {
        dateCell.setValue(currentVal ? currentVal + "\n" + todayStr : todayStr);
      }
    }

    updateSyncFlag(ss);
    return createJSONResponse({ success: true, message: `Persetujuan Sesi ${sessionNum} berhasil disimpan.` });
  } catch (err) {
    return createJSONResponse({ success: false, message: "approveProject Error: " + err.toString() });
  }
}

function handleGiveBonus(data) {
  try {
    const { classLink, studentName, sessionNum, bonusStars, reason } = data;
    const bStars = parseInt(bonusStars || 0, 10);

    if (!classLink || !studentName || isNaN(sessionNum)) {
      return createJSONResponse({ success: false, message: "Data tidak lengkap." });
    }

    const idMatch = (classLink || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
    const ss = idMatch ? SpreadsheetApp.openById(idMatch[1]) : SpreadsheetApp.openByUrl(classLink);
    const sheet = ss.getSheetByName("Progress");
    
    // reuse logic to find studentCol and sessionStartRow (simplified here for brevity)
    // Actually, I should refactor the "find student and session" logic to a helper
    const studentInfo = findStudentAndSession(sheet, studentName, sessionNum);
    if (!studentInfo.success) return createJSONResponse(studentInfo);

    const { studentCol, sessionStartRow } = studentInfo;

    // Find star row
    const matrixValues = sheet.getRange(sessionStartRow, 2, 6, 1).getValues();
    let starRowOffset = -1;
    for (let m = 0; m < matrixValues.length; m++) {
      const mval = String(matrixValues[m][0]).trim().toLowerCase();
      if (mval.indexOf('star') > -1 || mval.indexOf('bintang') > -1) {
        starRowOffset = m;
        break;
      }
    }

    if (starRowOffset === -1) return createJSONResponse({ success: false, message: "Baris Bintang tidak ditemukan." });

    const cell = sheet.getRange(sessionStartRow + starRowOffset, studentCol);
    const currentStars = parseInt(cell.getValue() || 0, 10);
    cell.setValue(currentStars + bStars);
    
    if (reason) {
      const existingNote = cell.getNote() || "";
      const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "d-MMM");
      const newNote = existingNote ? existingNote + "\n" + todayStr + ": " + reason : todayStr + ": " + reason;
      cell.setNote(newNote);
    }

    updateSyncFlag(ss);
    return createJSONResponse({ success: true, message: "Bonus bintang berhasil diberikan!" });
  } catch (err) {
    return createJSONResponse({ success: false, message: "giveBonus Error: " + err.toString() });
  }
}

function findStudentAndSession(sheet, studentName, sessionNum) {
  const lastCol = Math.max(sheet.getLastColumn(), 20);
  const row12 = sheet.getRange(1, 1, 2, lastCol).getValues();
  let studentCol = -1;
  const sNameNorm = normalize(studentName);
  
  for (let c = 2; c < lastCol; c++) {
    const v1Norm = normalize(row12[0][c]);
    const v2Norm = normalize(row12[1][c]);
    if (v1Norm === sNameNorm || v2Norm === sNameNorm || (sNameNorm.length > 3 && (v1Norm.includes(sNameNorm) || v2Norm.includes(sNameNorm)))) {
      studentCol = c + 1;
      break;
    }
  }
  if (studentCol === -1) return { success: false, message: "Siswa tidak ditemukan: " + studentName };

  const lastRow = Math.max(sheet.getLastRow(), 100);
  const colAValues = sheet.getRange(1, 1, lastRow, 1).getValues();
  let sessionStartRow = -1;
  
  const target = String(sessionNum).toLowerCase();
  for (let r = 0; r < lastRow; r++) {
    const valA = String(colAValues[r][0]).trim().toLowerCase();
    if (!valA) continue;
    
    // Support multiple languages and formats
    if (valA === target || 
        valA === "session " + target || 
        valA === "sesi " + target || 
        valA === "materi " + target ||
        valA === "sessi " + target ||
        valA === "s" + target ||
        valA === "s " + target) {
      sessionStartRow = r + 1;
      break;
    }
  }

  // Fallback: S1 @ Row 4, Block 5 rows (Row index = (Session-1)*5 + 4)
  if (sessionStartRow === -1) {
    sessionStartRow = 4 + (sessionNum - 1) * PROG_ROWS_PER_SESSION;
  }

  return { success: true, studentCol, sessionStartRow };
}

/**
 * Robust normalization: remove special chars, spaces, and handle newlines from GS headers
 */
function normalize(str) {
  if (!str) return "";
  return str.toString()
    .replace(/[\n\r]/g, " ") // Replace newlines with space
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric
    .trim();
}


// ── Sync Helper ─────────────────────────────────────────────────────────────
function updateSyncFlag(ss) {
  try {
    const sheet = ss.getSheetByName("Progress");
    if (sheet) {
      // Store current timestamp in Z1 (far to the right)
      sheet.getRange("Z1").setValue(new Date().getTime());
    }
  } catch (e) { console.error("updateSyncFlag error", e); }
}

function handleCheckSync(classLink) {
  if (!classLink) return createJSONResponse({ success: false, message: "classLink required" });
  try {
    const idMatch = (classLink || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
    const ss = idMatch ? SpreadsheetApp.openById(idMatch[1]) : SpreadsheetApp.openByUrl(classLink);
    const sheet = ss.getSheetByName("Progress");
    const version = sheet ? sheet.getRange("Z1").getValue() : 0;
    return createJSONResponse({ success: true, syncVersion: version || 0 });
  } catch (e) {
    return createJSONResponse({ success: false, message: e.toString() });
  }
}

function createJSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
