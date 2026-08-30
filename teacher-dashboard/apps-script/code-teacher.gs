/**
 * LOCAL SOURCE COPY
 *
 * Fungsi file: backend Google Apps Script untuk Teacher Dashboard.
 * Runtime produksi berada pada deployment Google Apps Script Web App.
 * Mengubah file lokal ini tidak memperbarui produksi secara otomatis.
 * Panduan deployment: ../docs/DEPLOYMENT.md
 * Deployment: Web App, accessible to "Anyone".
 */

const DB_SPREADSHEET_ID = "1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ";
const SHEET_NAME = "Class Database";

// Absensi sheet fallbacks (0-indexed)
const FALLBACK_ABS_DATA_ROW   = 15;
const FALLBACK_ABS_COL_NAME   = 1;
const FALLBACK_ABS_COL_AGE    = 2;
const FALLBACK_ABS_COL_LEVEL  = 4;
const FALLBACK_ABS_COL_SESI1  = 5;
const FALLBACK_ABS_COL_PLANNED= 31;
const FALLBACK_ABS_COL_JAM_SESI = 30; // Kolom AE (0-indexed)
const FALLBACK_ABS_COL_TOTAL_STARS = 26;

const MAX_SESSIONS   = 12;

function cleanClassDatabaseValue(value) {
  const text = String(value === null || value === undefined ? "" : value).trim();
  if (!text || /^#(REF|N\/A|VALUE|NAME\?|DIV\/0|NUM|NULL)!?$/i.test(text)) return "";
  return text;
}

function getClassDetailsFromAbsensi(classLink) {
  const details = { day: "", startTime: "", endTime: "", room: "" };
  if (!classLink) return details;

  try {
    const idMatch = String(classLink).match(/\/d\/([a-zA-Z0-9-_]+)/);
    const ss = idMatch ? SpreadsheetApp.openById(idMatch[1]) : SpreadsheetApp.openByUrl(classLink);
    const sheet = ss.getSheetByName("Absensi");
    if (!sheet) return details;

    const rowCount = Math.min(Math.max(sheet.getLastRow(), 13), 30);
    const colCount = Math.min(Math.max(sheet.getLastColumn(), 2), 6);
    const displayData = sheet.getRange(1, 1, rowCount, colCount).getDisplayValues();

    for (let r = 0; r < displayData.length; r++) {
      for (let c = 0; c < displayData[r].length - 1; c++) {
        const label = String(displayData[r][c] || "").trim().toLowerCase().replace(/:$/, "");
        const value = cleanClassDatabaseValue(displayData[r][c + 1]);
        if (!value) continue;

        if (label === "hari") details.day = value;
        else if (label === "jam mulai") details.startTime = value;
        else if (label === "jam selesai") details.endTime = value;
        else if (label === "ruangan" || label === "room") details.room = value;
      }
    }
  } catch (err) {
    console.error("getClassDetailsFromAbsensi error: " + err.toString());
  }

  return details;
}

function getAbsensiMapping(absData) {
  let mapping = {
    dataRowStart: FALLBACK_ABS_DATA_ROW,
    colName: FALLBACK_ABS_COL_NAME,
    colAge: FALLBACK_ABS_COL_AGE,
    colLevel: FALLBACK_ABS_COL_LEVEL,
    colSesi1: FALLBACK_ABS_COL_SESI1,
    colPlannedSesi1: FALLBACK_ABS_COL_PLANNED,
    colJamSesi: FALLBACK_ABS_COL_JAM_SESI,
    colTotalStars: FALLBACK_ABS_COL_TOTAL_STARS,
    found: false
  };

  for (let r = 0; r < absData.length; r++) {
    let rowNorm = absData[r].map(v => String(v).trim().toLowerCase());
    
    let nameIdx = -1;
    for (let c = 0; c < rowNorm.length; c++) {
      if (rowNorm[c] === "students name" || rowNorm[c] === "student's name" || rowNorm[c] === "nama siswa") {
        nameIdx = c;
        break;
      }
    }

    if (nameIdx !== -1) {
      mapping.found = true;
      mapping.dataRowStart = r + 1; // Data starts below header
      mapping.colName = nameIdx;
      
      let ageIdx = rowNorm.indexOf("usia");
      if (ageIdx !== -1) mapping.colAge = ageIdx;
      
      let levelIdx = rowNorm.indexOf("level");
      if (levelIdx !== -1) mapping.colLevel = levelIdx;
      
      let sesi1Idx = rowNorm.indexOf("sesi 1");
      if (sesi1Idx !== -1) mapping.colSesi1 = sesi1Idx;

      let plannedIdx = rowNorm.findIndex(h => h.includes("tanggal seharusnya sesi 1") || h === "tanggal sesi 1" || h === "tanggal seharusnya sesi 1 (rumus)");
      if (plannedIdx !== -1) mapping.colPlannedSesi1 = plannedIdx;

      let jamSesiIdx = rowNorm.findIndex(h => h.includes("jumlah jam/sesi") || h.includes("jumlah sesi") || h.includes("jumlah jam"));
      if (jamSesiIdx !== -1) mapping.colJamSesi = jamSesiIdx;

      let starIdx = rowNorm.findIndex(h => h.includes("quiz score total") || h.includes("total stars"));
      if (starIdx !== -1) mapping.colTotalStars = starIdx;

      break;
    }
  }
  return mapping;
}

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
  if (action === 'markBolos')    return handleMarkBolos(e);
  if (action === 'checkSync')    return handleCheckSync(e.parameter.classLink);
  if (action === 'getRubrics')   return handleGetRubrics();

  return createJSONResponse({ success: false, message: "Action not recognized." });
}

// ── doPost dispatcher ────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'approveProject') return handleApproveProject(data);
    if (data.action === 'giveBonus') return handleGiveBonus(data);
    if (data.action === 'submitPlaylist') return handleSubmitPlaylist(data);
    
    return createJSONResponse({ success: false, message: "Invalid POST action" });
  } catch (err) {
    return createJSONResponse({ success: false, message: "Server POST Error: " + err.toString() });
  }
}

// ── handleSubmitPlaylist ─────────────────────────────────────────────────────
function handleSubmitPlaylist(data) {
  try {
    // 1. Simpan ke class sheet Absensi B3
    let savedToAbsensi = false;
    if (data.classLink) {
      const match = data.classLink.match(/[-\w]{25,}/);
      if (match) {
        const ss = SpreadsheetApp.openById(match[0]);
        const sheet = ss.getSheetByName('Absensi');
        if (sheet) {
          sheet.getRange('B3').setValue(data.link);
          savedToAbsensi = true;
        }
      }
    }
    
    // 2. Simpan ke database utama guru (opsional) jika ada sheet Playlists
    try {
      const db = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
      let plSheet = db.getSheetByName('Playlists');
      if (!plSheet) {
        plSheet = db.insertSheet('Playlists');
        plSheet.appendRow(['Timestamp', 'Class Code', 'Teacher Name', 'Teacher Email', 'Playlist Link', 'Notes']);
      }
      plSheet.appendRow([new Date(), data.classCode, data.teacherName, data.teacherEmail, data.link, data.notes]);
    } catch(e) {
      // Abaikan jika tidak ada akses atau gagal membuat sheet
    }

    return createJSONResponse({ 
      success: true, 
      message: "Playlist berhasil disimpan" + (savedToAbsensi ? " dan dimasukkan ke sheet Absensi B3" : "")
    });
  } catch (err) {
    return createJSONResponse({ success: false, message: err.toString() });
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
      var normalizedStatus = classStatus.toLowerCase();
      var canTeacherAccess = normalizedStatus === "active" || normalizedStatus === "postponed";

      if (rowEmail === searchEmail && classCode.startsWith("SCL") && canTeacherAccess) {
        if (!teacherNameRaw) teacherNameRaw = String(row[7]).trim();
        const classLink = cleanClassDatabaseValue(row[9]);
        const absensiDetails = getClassDetailsFromAbsensi(classLink);
        const fallbackDay = cleanClassDatabaseValue(row[17]);
        const fallbackTime = cleanClassDatabaseValue(row[20]);
        const absensiTime = absensiDetails.startTime && absensiDetails.endTime
          ? absensiDetails.startTime + " - " + absensiDetails.endTime
          : (absensiDetails.startTime || absensiDetails.endTime);

        classes.push({
          classCode:   classCode,
          classStatus: classStatus,
          branchName:  cleanClassDatabaseValue(row[0]),
          programName: cleanClassDatabaseValue(row[3]),
          classLink:   classLink,
          room:        absensiDetails.room,
          day:         absensiDetails.day || fallbackDay,
          time:        absensiTime || fallbackTime,
          scheduleSource: (absensiDetails.day || absensiTime) ? "Absensi" : "Class Database"
        });
      }
    }

    if (classes.length > 0) {
      let teacherName = teacherNameRaw;
      if (!teacherName.toLowerCase().startsWith("kak ")) teacherName = "Kak " + teacherName;
      return createJSONResponse({ success: true, teacherName, teacherEmail: searchEmail, classes });
    }

    return createJSONResponse({ success: false, message: "Email tidak terdaftar atau tidak ada kelas SCL Active/Postponed." });
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
    const mapping = getAbsensiMapping(absData);
    const absHeaders = absData.slice(0, mapping.dataRowStart); // rows above data

    const students = [];
    for (var r = mapping.dataRowStart; r < absData.length; r++) {
      const row  = absData[r];
      const name = String(row[mapping.colName] || "").trim();
      if (!name) continue;

      const age   = String(row[mapping.colAge]   || "").trim();
      const level = String(row[mapping.colLevel]  || "").trim();

      // Sesi 1–12
      let attendanceSession = 0; // 0 = belum mulai sama sekali
      const sessionDates = {};
      for (var s = 0; s < MAX_SESSIONS; s++) {
        const cellVal = row[mapping.colSesi1 + s];
        if (cellVal !== "" && cellVal !== null && cellVal !== undefined && String(cellVal).trim().toUpperCase() !== "N/A") {
          attendanceSession = s + 1;
          // Format date nicely
          const d = cellVal instanceof Date ? cellVal : new Date(cellVal);
          sessionDates[s + 1] = isNaN(d.getTime()) ? String(cellVal) : Utilities.formatDate(d, "Asia/Jakarta", "d MMM yyyy");
        }
      }

      // ── Parse Sessions Per Meeting ──
      const jamSesiVal = String(row[mapping.colJamSesi] || "").toLowerCase();
      let sessionsPerMeeting = 1;
      
      // Jika teksnya mengandung angka 2 (misal "2 Jam", "2 Sesi", "2"), jadikan 2
      if (jamSesiVal.includes("2")) {
        sessionsPerMeeting = 2;
      }
      
      const meetings = [];
      for (var s = 0; s < MAX_SESSIONS; s += sessionsPerMeeting) {
        let currentMeeting = [];
        for (var i = 0; i < sessionsPerMeeting && (s + i) < MAX_SESSIONS; i++) {
          currentMeeting.push(s + i + 1);
        }
        meetings.push(currentMeeting);
      }

      students.push({ name, age, level, attendanceSession, totalSessions: MAX_SESSIONS, sessionDates, meetings, skipCount: 0 });
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
        let headerRowIdx = -1;
        
        // Strategy 1: Search Row 2 (index 1) first, then Row 1 (index 0)
        for (let ri = 1; ri >= 0 && colIdx === -1; ri--) {
          colIdx = normHeaders[ri].indexOf(nameNorm);
          if (colIdx !== -1) headerRowIdx = ri;
        }
        
        // Strategy 2: Partial match if exact fails
        if (colIdx === -1) {
          for (let ri = 1; ri >= 0 && colIdx === -1; ri--) {
            for (let c = PROG_COL_FIRST_STUDENT - 1; c < normHeaders[ri].length; c++) {
              const h = normHeaders[ri][c];
              if (h && (nameNorm.includes(h) || h.includes(nameNorm))) {
                colIdx = c;
                headerRowIdx = ri;
                break;
              }
            }
          }
        }
        
        if (colIdx === -1) continue;

        // Extract skipCount (Bolos) from the header cell Note
        if (headerRowIdx !== -1) {
          const noteText = String(progNotes[headerRowIdx][colIdx] || "");
          const skipMatch = noteText.match(/\[BOLOS:\s*(\d+)\]/i);
          if (skipMatch) {
            stu.skipCount = parseInt(skipMatch[1], 10);
          }
        }

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
    const mapping = getAbsensiMapping(absData);
    
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
      const sessionsToMark = Array.isArray(entry.sessionsToMark) ? entry.sessionsToMark : [parseInt(entry.nextSessAbs, 10)];
      const matSess     = parseInt(entry.materialSession, 10);
      const skipCount   = parseInt(entry.skipCount || 0, 10);
      
      if (!targetNameNorm) continue;

      // 1. Catat ke sheet Absensi
      let foundAbs = false;
      let newAttendedCount = 0;
      let rowIdxForNA = -1;

      for (var r = mapping.dataRowStart; r < absData.length; r++) {
        const rowNameNorm = normalize(absData[r][mapping.colName]);
        if (rowNameNorm !== targetNameNorm) continue;

        rowIdxForNA = r;

        // Count how many are currently filled before we add the new ones
        for (let s = 0; s < MAX_SESSIONS; s++) {
          const val = absData[r][mapping.colSesi1 + s];
          if (val !== "" && val !== null && val !== undefined && String(val).trim().toUpperCase() !== "N/A") {
             newAttendedCount++;
          }
        }

        // Loop over sessionsToMark and fill them
        for (const sessNum of sessionsToMark) {
          if (isNaN(sessNum) || sessNum < 1 || sessNum > MAX_SESSIONS) continue;
          
          const colIdx = mapping.colSesi1 + (sessNum - 1); // 0-based
          const cell   = absSheet.getRange(r + 1, colIdx + 1); // 1-based

          if (!cell.getValue() || String(cell.getValue()).trim().toUpperCase() === "N/A") {
            const dateObj = new Date(dateStr);
            cell.setValue(dateObj);
            cell.setNumberFormat("d MMM yyyy");
            newAttendedCount++; // increment attended count
          }
        }
        
        foundAbs = true;
        break;
      }

      // 2. Check Budget (Max 15 hours/sessions)
      if (foundAbs && rowIdxForNA !== -1) {
        if ((newAttendedCount + skipCount) >= 15) {
          // Fill remaining sessions with "N/A"
          for (let s = 0; s < MAX_SESSIONS; s++) {
             const colIdx = mapping.colSesi1 + s;
             const cell = absSheet.getRange(rowIdxForNA + 1, colIdx + 1);
             if (!cell.getValue()) {
               cell.setValue("N/A");
             }
          }
        }
        savedFor.push(entry.name);
      }
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

    // Preserve an existing bonus when the teacher edits mission/quiz ratings.
    // Bonus is managed separately by handleGiveBonus(), but lives in the same cell.
    let existingBonusLine = "";
    if (starRowOffset > -1) {
      const currentStarValue = String(sheet.getRange(sessionStartRow + starRowOffset, studentCol).getValue() || "");
      const bonusMatch = currentStarValue.split(/\r?\n/).find(line => /\b(bonus)\b/i.test(line));
      if (bonusMatch) existingBonusLine = bonusMatch.trim();
    }
    if (existingBonusLine) starStrs.push(existingBonusLine);

    const finalStarString = starStrs.length > 0 ? starStrs.join("\n") : "";

    // Sum mission stars only for the date check threshold
    const missionStars = mustStars + shouldStars + aspireStars;

    // Write values
    if (progressRowOffset > -1) sheet.getRange(sessionStartRow + progressRowOffset, studentCol).setValue("100%");
    
    if (starRowOffset > -1) {
      sheet.getRange(sessionStartRow + starRowOffset, studentCol).setValue(finalStarString);
    }

    // sessionStartRow menunjuk ke baris Date (S1 = row 3). Jangan dikurangi
    // satu karena row 2 adalah header nama siswa.
    if (missionStars > 0) {
      const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "d MMM yyyy");
      const dateCell = sheet.getRange(sessionStartRow, studentCol);
      const currentVal = String(dateCell.getValue() || "");
      if (currentVal.indexOf(todayStr) === -1) {
        dateCell.setValue(currentVal ? currentVal + "\n" + todayStr : todayStr);
      }
    }

    // Update total stars di tab Absensi kolom AA
    updateTotalStarsInAbsensi(ss, studentCol, studentName);

    if (sessionNum === 4 || sessionNum === 8) {
      updateRubrikInAbsensi(ss, studentName, sessionNum, data.obsAktivitasScore, data.obsEngagementScore, data.obsNotes);
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
    if (isNaN(bStars) || bStars < 1 || bStars > 3) {
      return createJSONResponse({ success: false, message: "Bonus harus antara 1 sampai 3 bintang." });
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
    const currentValue = String(cell.getValue() || "").trim();
    let starLines = currentValue ? currentValue.split(/\r?\n/).map(line => line.trim()).filter(Boolean) : [];

    // Keep Must Do, Should Do, Aspire, and Quiz intact. Re-saving the modal edits
    // the existing bonus line instead of repeatedly adding another bonus.
    const bonusLine = `${bStars} Star - Bonus`;
    const existingBonusIndex = starLines.findIndex(line => /\bbonus\b/i.test(line));
    if (existingBonusIndex > -1) {
      starLines[existingBonusIndex] = bonusLine;
      // Clean up duplicate bonus lines left by any earlier malformed data.
      starLines = starLines.filter((line, index) => !/\bbonus\b/i.test(line) || index === existingBonusIndex);
    } else {
      starLines.push(bonusLine);
    }
    cell.setValue(starLines.join("\n"));
    
    if (String(reason || "").trim()) {
      const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "d-MMM");
      // The note represents the current editable bonus reason, not an append-only log.
      cell.setNote(todayStr + ": " + String(reason).trim());
    } else {
      cell.setNote("");
    }

    // Update total stars di tab Absensi kolom AA
    updateTotalStarsInAbsensi(ss, studentCol, studentName);

    updateSyncFlag(ss);
    return createJSONResponse({ success: true, message: "Bonus bintang berhasil disimpan!", bonusStars: bStars });
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

  // Fallback menunjuk ke baris Date: S1 @ row 3, lalu setiap blok 5 baris.
  if (sessionStartRow === -1) {
    sessionStartRow = 3 + (sessionNum - 1) * PROG_ROWS_PER_SESSION;
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
const SYNC_SHEET_NAME = "Absensi";
const SYNC_CELL_A1 = "AQ1";

function updateSyncFlag(ss) {
  try {
    const sheet = ss.getSheetByName(SYNC_SHEET_NAME);
    if (sheet) {
      // Metadata sinkronisasi diletakkan jauh di ujung tab Absensi.
      sheet.getRange(SYNC_CELL_A1).setValue(new Date().getTime());
    }
  } catch (e) { console.error("updateSyncFlag error", e); }
}

function handleCheckSync(classLink) {
  if (!classLink) return createJSONResponse({ success: false, message: "classLink required" });
  try {
    const idMatch = (classLink || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
    const ss = idMatch ? SpreadsheetApp.openById(idMatch[1]) : SpreadsheetApp.openByUrl(classLink);
    const sheet = ss.getSheetByName(SYNC_SHEET_NAME);
    const version = sheet ? sheet.getRange(SYNC_CELL_A1).getValue() : 0;
    return createJSONResponse({ success: true, syncVersion: version || 0 });
  } catch (e) {
    return createJSONResponse({ success: false, message: e.toString() });
  }
}

function createJSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── markBolos ───────────────────────────────────────────────────────────────
function handleMarkBolos(e) {
  try {
    const classLink = e.parameter.classLink;
    const studentName = e.parameter.studentName;
    const sessionsSkipped = parseInt(e.parameter.sessionsSkipped || "1", 10);
    if (!classLink || !studentName) return createJSONResponse({ success: false, message: "Missing params" });

    // ── Pre-process URL ──
    let spreadsheetId = "";
    const idMatch = (classLink || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch) {
      spreadsheetId = idMatch[1];
    } else {
      let fallbackLink = String(classLink || "").trim();
      if (fallbackLink.indexOf('?') > -1) fallbackLink = fallbackLink.split('?')[0];
      const ss2 = SpreadsheetApp.openByUrl(fallbackLink);
      spreadsheetId = ss2.getId();
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const progSheet = ss.getSheetByName("Progress");
    if (!progSheet) return createJSONResponse({ success: false, message: "Progress sheet not found" });

    const progData = progSheet.getDataRange().getValues();
    const nameNorm = normalize(studentName);
    
    const headerRows = [progData[0] || [], progData[1] || []];
    const normHeaders = headerRows.map(row => row.map(h => normalize(h)));
    
    let colIdx = -1;
    let headerRowIdx = -1;
    for (let ri = 1; ri >= 0 && colIdx === -1; ri--) {
      colIdx = normHeaders[ri].indexOf(nameNorm);
      if (colIdx !== -1) headerRowIdx = ri;
    }
    
    if (colIdx === -1) {
      for (let ri = 1; ri >= 0 && colIdx === -1; ri--) {
        for (let c = PROG_COL_FIRST_STUDENT - 1; c < normHeaders[ri].length; c++) {
          const h = normHeaders[ri][c];
          if (h && (nameNorm.includes(h) || h.includes(nameNorm))) {
            colIdx = c;
            headerRowIdx = ri;
            break;
          }
        }
      }
    }

    if (colIdx === -1) return createJSONResponse({ success: false, message: "Student not found in Progress" });

    const headerCell = progSheet.getRange(headerRowIdx + 1, colIdx + 1);
    const noteText = String(headerCell.getNote() || "");
    
    let currentSkipCount = 0;
    const skipMatch = noteText.match(/\[BOLOS:\s*(\d+)\]/i);
    if (skipMatch) {
      currentSkipCount = parseInt(skipMatch[1], 10);
    }
    
    const newSkipCount = currentSkipCount + sessionsSkipped;
    const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "d MMM yyyy");
    
    // Replace old bolos tag or append new one
    let newNoteText = noteText;
    if (skipMatch) {
      newNoteText = noteText.replace(/\[BOLOS:\s*\d+\]/gi, `[BOLOS: ${newSkipCount}]`);
    } else {
      newNoteText = noteText + (noteText ? "\n" : "") + `[BOLOS: ${newSkipCount}]`;
    }
    newNoteText += `\nBolos ditandai pada: ${todayStr} (+${sessionsSkipped} jam)`;
    
    headerCell.setNote(newNoteText);

    return createJSONResponse({ success: true, skipCount: newSkipCount });
  } catch (err) {
    return createJSONResponse({ success: false, message: err.toString() });
  }
}

// ── Helper to update Total Stars in Absensi ──────────────────────────────────
function updateTotalStarsInAbsensi(ss, studentCol, studentName) {
  try {
    const progSheet = ss.getSheetByName("Progress");
    if (!progSheet) return;
    
    const lastRow = Math.max(progSheet.getLastRow(), 100);
    const matrixValues = progSheet.getRange(1, PROG_COL_MATRIX, lastRow, 1).getValues();
    const colValues = progSheet.getRange(1, studentCol, lastRow, 1).getValues();
    
    let totalStars = 0;
    
    for (let r = 0; r < matrixValues.length; r++) {
      const mval = String(matrixValues[r][0] || "").trim().toLowerCase();
      if (mval.indexOf('star') > -1 || mval.indexOf('bintang') > -1) {
        const val = String(colValues[r][0] || "").trim();
        if (!val) continue;
        
        // Split by newline and parse each line
        const lines = val.split('\n');
        for (const line of lines) {
          const l = line.trim();
          if (/^\d+$/.test(l)) {
            // Just a pure number
            totalStars += parseInt(l, 10);
          } else {
            // E.g. "5 Star - Must do"
            const match = l.match(/^(\d+)/);
            if (match) {
              totalStars += parseInt(match[1], 10);
            }
          }
        }
      }
    }
    
    const absSheet = ss.getSheetByName("Absensi");
    if (!absSheet) return;
    
    const absData = absSheet.getDataRange().getValues();
    const mapping = getAbsensiMapping(absData);
    const sNameNorm = normalize(studentName);
    
    for (let r = mapping.dataRowStart; r < absData.length; r++) {
      const rowNameNorm = normalize(absData[r][mapping.colName]);
      if (rowNameNorm === sNameNorm) {
        absSheet.getRange(r + 1, mapping.colTotalStars + 1).setValue(totalStars).setNumberFormat('0');
        break;
      }
    }
  } catch(e) {
    console.error("updateTotalStarsInAbsensi error: " + e.toString());
  }
}

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
