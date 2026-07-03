function doGet(e) {
  // 1. Handle Legacy Sheet Fetching (Dashboard Roadmap)
  if (e.parameter && e.parameter.sheet) {
    return handleGetSheetData(e.parameter.sheet);
  }

  var action = e.parameter.action;
  
  if (action === 'getStudents') {
    var code = e.parameter.code;
    return getStudentsByClassCode(code);
  }
  
  if (action === 'getStudentProgress') {
    return handleGetStudentProgress(e.parameter.code, e.parameter.name);
  }
  
  if (action === 'checkSync') {
    return handleCheckSync(e.parameter.code);
  }
  
  // Default behavior if not action=getStudents
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Action not valid atau parameter action tidak ditemukan.'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * FIX: Mengambil Header dari Baris 2 dan Data dari Baris 3 ke bawah
 */
function handleGetSheetData(sheetName) {
  var CURRICULUM_SS_ID = "1nGihCZS3S9moNY2dt7GIzmBESIQ72Jh5J7d90nhZvX0";
  var ALLOWED_SHEETS = ["B2C_RobloxStudio_Modul", "B2C_Scratch_Modul", "B2C_Python_Modul", "B2C_ScratchJr_Modul", "B2C_RobloxStudio_INS", "B2C_Scratch_INS"];
  
  if (ALLOWED_SHEETS.indexOf(sheetName) === -1) {
    return createJsonResponse({ success: false, error: "Sheet '" + sheetName + "' not whitelisted." });
  }

  try {
    var ss = SpreadsheetApp.openById(CURRICULUM_SS_ID);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");

    // Mengambil seluruh data di sheet
    var data = sheet.getDataRange().getValues();
    
    // PERBAIKAN 1: Header ada di Baris 2 (Index 1)
    var headers = data[1]; 
    if (!headers) throw new Error("Header di baris 2 tidak ditemukan.");

    var result = [];

    // PERBAIKAN 2: Data dimulai dari Baris 3 (Index 2)
    for (var i = 2; i < data.length; i++) {
      var row = data[i];
      
      // Lewati baris jika kolom Level (A) dan Session (B) kosong
      if (!row[0] && !row[1]) continue; 

      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        // Membersihkan nama header dari spasi liar
        var headerName = headers[j] ? headers[j].toString().trim() : "col_" + (j+1);
        
        // PERBAIKAN 3: Memastikan konten (terutama teks panjang di kolom D) 
        // dikonversi menjadi String agar tidak hilang saat JSON.stringify
        var cellValue = row[j];
        if (cellValue !== undefined && cellValue !== null) {
          obj[headerName] = cellValue.toString();
        } else {
          obj[headerName] = "";
        }
      }
      result.push(obj);
    }
    
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

// ── Sync Helpers ────────────────────────────────────────────────────────────

function updateSyncFlag(ss) {
  try {
    var sheet = ss.getSheetByName("Progress");
    if (sheet) {
      sheet.getRange("Z1").setValue(new Date().getTime());
    }
  } catch (e) { console.error("updateSyncFlag error", e); }
}

function handleCheckSync(classCode) {
  if (!classCode) return createJsonResponse({ success: false, message: "classCode required" });
  try {
    var info = getClassInfo(classCode);
    if (!info || !info.ssId) return createJsonResponse({ success: false, message: "Class info not found" });
    
    var ss = SpreadsheetApp.openById(info.ssId);
    var sheet = ss.getSheetByName("Progress");
    var version = sheet ? sheet.getRange("Z1").getValue() : 0;
    return createJsonResponse({ success: true, syncVersion: version || 0 });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Support for CORS preflight
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function handleGetStudentProgress(classCode, studentName) {
  var DB_SPREADSHEET_ID = '1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ';
  
  try {
    if (!classCode || !studentName) {
      return createJsonResponse({ success: false, message: 'Class Code dan Student Name diperlukan.' });
    }
    
    // 1. Dapatkan programName dan classLink dari Class Database
    var ssDB = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    var dbSheet = ssDB.getSheetByName('Class Database');
    var dbData = dbSheet.getDataRange().getValues();
    
    var programName = '';
    var teacherName = '';
    var classLink = '';
    var searchCode = String(classCode).trim().toUpperCase();
    
    for (var i = 1; i < dbData.length; i++) {
      if (String(dbData[i][1]).trim().toUpperCase() === searchCode) {
         programName = String(dbData[i][3]).trim();
         teacherName = String(dbData[i][7]).trim();
         classLink = String(dbData[i][9]).trim();
         break;
      }
    }
    
    if (!classLink) {
      return createJsonResponse({ success: false, message: 'Class Link tidak ditemukan untuk kode kelas ini.' });
    }
    
    // 2. Buka spreadsheet kelas dan cari sheet Progress
    // Extract ID from URL (robust, same approach as teacher dashboard)
    var idMatch = (classLink || '').match(/\/d\/([a-zA-Z0-9-_]+)/);
    var ssClass = idMatch ? SpreadsheetApp.openById(idMatch[1]) : SpreadsheetApp.openByUrl(classLink);
    var progressSheet = ssClass.getSheetByName('Progress');
    
    if (!progressSheet) {
      return createJsonResponse({ success: false, message: 'Sheet Progress tidak ditemukan pada spreadsheet kelas.' });
    }
    
    var progData = progressSheet.getDataRange().getValues();
    
    // 3. Cari kolom siswa menggunakan normalizeStr (sama persis dengan teacher dashboard)
    //    Prioritas: baris 2 (index 1) dulu, lalu baris 1 (index 0) sebagai fallback
    var studentCol = -1;
    var searchName = normalizeStr(studentName);
    var rowsToSearch = [1, 0];
    
    // Pass 1: Exact Match
    for (var ri = 0; ri < rowsToSearch.length && studentCol === -1; ri++) {
      var hRow = progData[rowsToSearch[ri]] || [];
      for (var c = 2; c < hRow.length; c++) {
        var hNorm = normalizeStr(hRow[c]);
        if (hNorm && hNorm === searchName) {
          studentCol = c;
          break;
        }
      }
    }
    
    // Pass 2: Partial Match only if exact fails
    if (studentCol === -1 && searchName.length > 3) {
      for (var ri = 0; ri < rowsToSearch.length && studentCol === -1; ri++) {
        var hRow = progData[rowsToSearch[ri]] || [];
        for (var c = 2; c < hRow.length; c++) {
          var hNorm = normalizeStr(hRow[c]);
          if (hNorm && (hNorm.indexOf(searchName) > -1 || searchName.indexOf(hNorm) > -1)) {
            studentCol = c;
            break;
          }
        }
      }
    }
    
    if (studentCol === -1) {
      return createJsonResponse({ success: false, message: 'Siswa tidak ditemukan di sheet Progress.' });
    }
    
    // 4. Hitung currentSession & totalStars dengan dynamic label scanning (identik teacher dashboard)
    //    Struktur sheet: S1 block mulai di row index 3 (row 4), tiap block = 5 baris
    //    Col B (index 1) = label: "Progress/Progres", "Quiz", "Bintang/Star", "Project Uploaded"
    var MAX_SESSIONS = 12;
    var PROG_ROWS_PER_SESSION = 5;
    var currentSession = 1;
    var totalStars = 0;
    var sessionProgress = []; // [{session, progress, isComplete, stars, rawStars}]
    
    for (var s = 1; s <= MAX_SESSIONS; s++) {
      var baseRowIdx = 3 + (s - 1) * PROG_ROWS_PER_SESSION; // S1 → index 3 (row 4)
      if (baseRowIdx >= progData.length) break;
      
      // Scan col B (index 1) seluruh 5-row block untuk cari baris "Progress" dan "Star"
      var progOff = 0; // default
      var starOff = -1; // -1 = tidak ditemukan
      var linkOff = -1;
      
      for (var m = 0; m < PROG_ROWS_PER_SESSION; m++) {
        var rowIdx = baseRowIdx + m;
        if (rowIdx >= progData.length) break;
        var label = String(progData[rowIdx][1] || '').toLowerCase(); // col B = index 1
        if (label.indexOf('progres') > -1) {
          progOff = m;
        } else if (label.indexOf('star') > -1 || label.indexOf('bintang') > -1 || label.indexOf('nilai') > -1) {
          starOff = m;
        } else if (label.indexOf('upload') > -1 || label.indexOf('project') > -1 || label.indexOf('link') > -1) {
          linkOff = m;
        }
      }
      
      // Baca nilai Progress
      var progressRowIdx = baseRowIdx + progOff;
      if (progressRowIdx >= progData.length) break;
      
      var progressVal = progData[progressRowIdx][studentCol];
      var strVal = String(progressVal).trim().toLowerCase();
      
      // 100% = nilai 1 (desimal dari Google Sheets), "100%", "1", "100"
      var isComplete = (progressVal === 1 || strVal === '100%' || strVal === '1' || strVal === '100');
      
      // Baca & hitung bintang sesi ini (sama persis dengan teacher dashboard)
      var sSessionStars = 0;
      var rawStarsText = '';
      if (starOff !== -1) {
        var rawStars = String(progData[baseRowIdx + starOff][studentCol] || '');
        rawStarsText = rawStars.trim();
        var starMatches = rawStars.match(/(\d+)\s*(Star|Bintang)/gi);
        if (starMatches) {
          for (var sm = 0; sm < starMatches.length; sm++) {
            var numMatch = starMatches[sm].match(/\d+/);
            if (numMatch) sSessionStars += parseInt(numMatch[0]) || 0;
          }
        } else {
          // Fallback: angka biasa
          var simpleNum = parseFloat(rawStars);
          if (!isNaN(simpleNum) && simpleNum > 0) sSessionStars += simpleNum;
        }
        totalStars += sSessionStars;
      }
      
      var uploadedLink = '';
      if (linkOff !== -1) {
        uploadedLink = String(progData[baseRowIdx + linkOff][studentCol] || '').trim();
      }
      
      var uploadedLinkLower = uploadedLink.toLowerCase();
      var rawStarsTextLower = rawStarsText.toLowerCase();

      var submittedMustDo = uploadedLinkLower.indexOf('[must do]') > -1;
      var submittedShouldDo = uploadedLinkLower.indexOf('[should do]') > -1;
      var submittedAspire = uploadedLinkLower.indexOf('[aspire') > -1;

      var gradedMustDo = rawStarsTextLower.indexOf('must do') > -1;
      var gradedShouldDo = rawStarsTextLower.indexOf('should do') > -1;
      var gradedAspire = rawStarsTextLower.indexOf('aspire') > -1;

      var hasTeacherStars = false;

      if (submittedMustDo || submittedShouldDo || submittedAspire) {
          // Harus dinilai sesuai dengan apa yang dikumpulkan
          hasTeacherStars = true;
          if (submittedMustDo && !gradedMustDo) hasTeacherStars = false;
          if (submittedShouldDo && !gradedShouldDo) hasTeacherStars = false;
          if (submittedAspire && !gradedAspire) hasTeacherStars = false;
      } else {
          // Fallback jika tidak ada label spesifik di link
          hasTeacherStars = sSessionStars > 0 || gradedMustDo || gradedShouldDo || gradedAspire;
      }

      sessionProgress.push({ session: s, progress: strVal || '0%', isComplete: isComplete, stars: sSessionStars, rawStars: rawStarsText, link: uploadedLink, graded: hasTeacherStars });
      
      // Unlock next session logic (Always take the highest completed session + 1)
      if (isComplete && hasTeacherStars) {
          currentSession = Math.max(currentSession, s + 1);
      }
    }
    
    if (currentSession > MAX_SESSIONS) currentSession = MAX_SESSIONS;
    
    // 5. Baca Absensi sheet untuk attendanceSession (berapa sesi yang sudah dihadiri)
    var attendanceSession = 1;
    try {
      var absSheet = ssClass.getSheetByName('Absensi');
      if (absSheet) {
        var absData = absSheet.getDataRange().getValues();
        
        // Dynamically find correct header rows instead of hardcoding row 16 / col F
        var absDataRowStart = 15;
        var colNameIdx = 1;
        var colSesi1Idx = 5;
        
        for (var i = 0; i < absData.length; i++) {
           var rowNorm = absData[i].map(function(v) { return String(v).trim().toLowerCase(); });
           var foundNameIdx = -1;
           for (var c = 0; c < rowNorm.length; c++) {
               if (rowNorm[c] === "students name" || rowNorm[c] === "student's name" || rowNorm[c] === "nama siswa") {
                   foundNameIdx = c;
                   break;
               }
           }
           if (foundNameIdx !== -1) {
               absDataRowStart = i + 1;
               colNameIdx = foundNameIdx;
               var sesi1Idx = rowNorm.indexOf("sesi 1");
               if (sesi1Idx !== -1) colSesi1Idx = sesi1Idx;
               break;
           }
        }

        var MAX_ABS_SESSIONS = 12;
        
        for (var r = absDataRowStart; r < absData.length; r++) {
          var absName = normalizeStr(absData[r][colNameIdx]);
          if (!absName) continue;
          if (absName === searchName || (searchName.length > 3 && (absName.indexOf(searchName) > -1 || searchName.indexOf(absName) > -1))) {
            // Hitung berapa sesi yang ada tanggalnya, pastikan bukan N/A
            for (var sIdx = 0; sIdx < MAX_ABS_SESSIONS; sIdx++) {
              var sVal = absData[r][colSesi1Idx + sIdx];
              if (sVal !== '' && sVal !== null && sVal !== undefined && String(sVal).trim().toUpperCase() !== 'N/A') {
                attendanceSession = Math.max(attendanceSession, sIdx + 1);
              }
            }
            break;
          }
        }
      }
    } catch (absErr) {
      // Gagal baca Absensi — tidak masalah, gunakan currentSession saja
    }
    
    // 6. Log the date in Progress sheet when student accesses their dashboard
    try {
      if (studentCol !== -1 && currentSession >= 1 && currentSession <= MAX_SESSIONS) {
        var dateRow = 3 + (currentSession - 1) * PROG_ROWS_PER_SESSION; // S1 => row 3, S2 => row 8
        
        // Cek apakah progress < 100% dan quiz score kosong/NaN
        var blockVals = progressSheet.getRange(dateRow, studentCol + 1, 5, 1).getValues();
        var blockLabels = progressSheet.getRange(dateRow, 2, 5, 1).getValues();
        
        var isSessionComplete = false;
        var isQuizDone = false;
        
        for (var i = 0; i < 5; i++) {
           var lab = String(blockLabels[i][0]).toLowerCase();
           var val = String(blockVals[i][0]).trim().toLowerCase();
           
           if (lab.indexOf('quiz') > -1) {
               if (val && val !== 'nan' && val !== '-' && val !== '') isQuizDone = true;
           }
           if (lab.indexOf('progres') > -1) {
               if (val === '100%' || val === '1' || val === '100') isSessionComplete = true;
           }
        }

        if (!isSessionComplete) {
          var cellDate = progressSheet.getRange(dateRow, studentCol + 1);
          var rawValue = blockVals[0][0];
          var existingDates = "";
          
          if (rawValue instanceof Date) {
            existingDates = Utilities.formatDate(rawValue, "Asia/Jakarta", "d MMM yyyy");
          } else {
            existingDates = String(rawValue || '').trim();
          }
          
          var todayDate = Utilities.formatDate(new Date(), "Asia/Jakarta", "d MMM yyyy");
          if (existingDates.indexOf(todayDate) === -1) {
            // Use "; " as separator as requested
            var newVal = existingDates ? existingDates + "; " + todayDate : todayDate;
            cellDate.setValue(newVal);
          }
        }
      }
    } catch (dateErr) {
      console.error("Gagal update tanggal di sheet Progress:", dateErr);
    }
    
    return createJsonResponse({
      success: true,
      programName: programName,
      teacherName: teacherName,
      currentSession: currentSession,
      attendanceSession: attendanceSession,
      totalStars: totalStars,
      sessionProgress: sessionProgress
    });
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Server error: ' + error.toString()
    });
  }
}

// Normalisasi string: hapus karakter non-alphanumeric, lowercase
// Identik dengan teacher dashboard (code-teacher.gs)
function normalizeStr(str) {
  if (!str) return '';
  return str.toString()
    .replace(/[\n\r]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function getClassInfo(classCode) {
  var DB_SPREADSHEET_ID = '1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ';
  var ssDB = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  var dbSheet = ssDB.getSheetByName('Class Database');
  var dbData = dbSheet.getDataRange().getValues();
  var searchCode = String(classCode).trim().toUpperCase();
  
  for (var i = 1; i < dbData.length; i++) {
    if (String(dbData[i][1]).trim().toUpperCase() === searchCode) {
       var link = String(dbData[i][9]).trim();
       var idMatch = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
       return {
         programName: String(dbData[i][3]).trim(),
         teacherName: String(dbData[i][7]).trim(),
         classLink: link,
         ssId: idMatch ? idMatch[1] : null
       };
    }
  }
  return null;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === 'uploadScreenshot') {
      return handleUploadScreenshot(data);
    }
    if (action === 'submitProject') {
      return handleSubmitProject(data);
    }
    if (action === 'getStudentProgress') {
      return handleGetStudentProgress(data.classCode, data.studentName);
    }
    if (action === 'updateProgress') {
      return handleUpdateProgress(data);
    }
    if (action === 'saveQuiz') {
      return handleSaveQuiz(data);
    }
    
    return createJsonResponse({ success: false, message: 'Invalid action for POST' });
  } catch (err) {
    return createJsonResponse({ success: false, message: 'Server error on POST: ' + err.toString() });
  }
}

function handleSubmitProject(data) {
  if (!data) return createJsonResponse({ success: false, message: 'No data provided. Jika Anda menjalankan ini dari Editor, abaikan error ini karena fungsi ini butuh input dari dashboard.' });
  
  var DB_SPREADSHEET_ID = '1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ';
  var baseFolderId = '16FwcvV1VMCH1PmxHEGdastGPQH2EDtRC'; // Base folder Kalananti drive

  try {
    var classCode = data.classCode;
    var searchCode = String(classCode).trim().toUpperCase();
    var studentName = data.studentName;
    var sessionNum = data.session || "Unknown";
    var projectUrl = data.projectUrl || data.url || "";
    var fileData = data.fileData;
    var phase = data.phase || "Uploads";

    // 1. Dapatkan classLink dari DB
    var info = getClassInfo(classCode);
    if (!info || !info.classLink) {
      return createJsonResponse({ success: false, message: 'Informasi kelas tidak ditemukan untuk kode ' + searchCode });
    }
    
    var programName = info.programName;
    var classLink = info.classLink;
    var ssId = info.ssId;
    if (!ssId) throw new Error("ID Spreadsheet tidak valid dari link: " + classLink);

    // 2. Upload files if any
    var files = data.files || [];
    if (files.length > 0) {
      var baseFolder = DriveApp.getFolderById(baseFolderId);
      var studentFolderName = (searchCode + "-" + studentName + "-" + programName).trim();
      var studentFolder = getOrCreateFolder(baseFolder, studentFolderName);
      
      var sessionFolderName = "Session " + sessionNum;
      var sessionFolder = getOrCreateFolder(studentFolder, sessionFolderName);
      var taskFolder = getOrCreateFolder(sessionFolder, phase);
      
      for (var f = 0; f < files.length; f++) {
        var fileObj = files[f];
        var blobData = fileObj.data;
        if (blobData.indexOf(',') > -1) {
          blobData = blobData.split(',')[1];
        }
        var blob = Utilities.newBlob(Utilities.base64Decode(blobData), fileObj.mimeType || 'application/octet-stream', fileObj.name || ('File_' + f));
        taskFolder.createFile(blob);
      }
      
      // Save Folder URL as Screenshot type
      updateProgressSheet(ssId, studentName, sessionNum, taskFolder.getUrl(), phase, "Screenshot");
    }

    // 3. Save Project URL if exists as Link type
    if (projectUrl) {
      updateProgressSheet(ssId, studentName, sessionNum, projectUrl, phase, "Link");
    }

    return createJsonResponse({
      success: true,
      message: 'Submisi berhasil disimpan!',
      url: projectUrl
    });
    
  } catch (err) {
    return createJsonResponse({ success: false, message: 'Server error on submitProject: ' + err.toString() });
  }
}

function handleUploadScreenshot(data) {
  if (!data) return createJsonResponse({ success: false, message: 'No data provided.' });
  var base64Data = data.fileData; // format: "data:image/png;base64,iVBORw0..."
  var blobData = base64Data;
  if(base64Data.indexOf(',') > -1) {
    blobData = base64Data.split(',')[1];
  }
  
  var blob = Utilities.newBlob(Utilities.base64Decode(blobData), data.mimeType || 'image/png', data.fileName || 'Screenshot.png');
  
  // Base folder Kalananti drive:
  var baseFolderId = '16FwcvV1VMCH1PmxHEGdastGPQH2EDtRC';
  var baseFolder = DriveApp.getFolderById(baseFolderId);
  
  // Dinamis: ClassCode-StudentName-Program-Level
  var progStr = data.program ? data.program : "Program";
  var lvlStr = data.level ? data.level : "Level";
  var classNameStr = data.className ? data.className : "NoClass";
  var studentNameStr = data.studentName ? data.studentName : "UnknownStudent";
  
  // 1. Folder Siswa
  var studentFolderName = (classNameStr + "-" + studentNameStr + "-" + progStr + "-" + lvlStr).trim();
  var studentFolder = getOrCreateFolder(baseFolder, studentFolderName);
  
  // 2. Folder Sesi
  var sessionStr = data.session ? data.session : "Unknown";
  var sessionFolderName = "Session " + sessionStr;
  var sessionFolder = getOrCreateFolder(studentFolder, sessionFolderName);
  
  // 3. Folder Tugas (Must Do / Should Do / Aspire)
  var taskFolderName = data.metric || "Uploads";
  var taskFolder = getOrCreateFolder(sessionFolder, taskFolderName);
  
  // Upload screenshot ke task folder
  var file = taskFolder.createFile(blob);
  
  // Request URL dari folder utama (Session)
  var sessionFolderUrl = sessionFolder.getUrl();
  
  // Update with tag
  var info = getClassInfo(data.classCode);
  var ssId = info ? info.ssId : null;
  updateProgressSheet(ssId, studentNameStr, sessionStr, sessionFolderUrl, data.metric, "Screenshot");
  
  return createJsonResponse({
    success: true,
    message: 'Upload berhasil',
    sessionFolderUrl: sessionFolderUrl
  });
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

function updateProgressSheet(ssId, studentName, sessionNum, url, phase, type) {
  if (!ssId) throw new Error("Spreadsheet ID (ssId) diperlukan untuk updateProgressSheet.");
  
  var ss = SpreadsheetApp.openById(ssId);
  var sheet = ss.getSheetByName('Progress');
  if (!sheet) throw new Error("Sheet 'Progress' tidak ditemukan di spreadsheet " + ssId);

  var lastCol = Math.max(sheet.getLastColumn(), 100); 

  var row12Values = sheet.getRange(1, 1, 2, lastCol).getValues(); 
  var studentCol = -1;
  var searchN = normalizeStr(studentName);
  
  for (var c = 2; c < lastCol; c++) { 
    var val1 = normalizeStr(row12Values[0][c]);
    var val2 = normalizeStr(row12Values[1][c]);
    if (val1 === searchN || val2 === searchN) {
      studentCol = c + 1; 
      break;
    }
  }
  
  if (studentCol === -1 && searchN.length > 3) {
    for (var c = 2; c < lastCol; c++) { 
      var val1 = normalizeStr(row12Values[0][c]);
      var val2 = normalizeStr(row12Values[1][c]);
      if ((val1 && val1.indexOf(searchN) > -1) || (val2 && val2.indexOf(searchN) > -1) || (val1 && searchN.indexOf(val1) > -1) || (val2 && searchN.indexOf(val2) > -1)) {
        studentCol = c + 1;
        break;
      }
    }
  }
  
  if (studentCol === -1) throw new Error("Siswa tidak ditemukan di kolom manapun. Cek penulisan nama di spreadsheet.");

  // Robust Session Row finding using index (Row 3 for Session 1, Row 8 for Session 2, etc.)
  var sessionStartRow = 3 + (parseInt(sessionNum) - 1) * 5; 
  
  // Double check if this row actually contains session info or search fallback
  var labelInA = String(sheet.getRange(sessionStartRow, 1).getValue()).toLowerCase();
  if (labelInA.indexOf(String(sessionNum)) === -1) {
      // Fallback: search manually in Col A if not found at calculated row
      sessionStartRow = -1;
      for (var r = 3; r < 500; r++) {
         var valA = String(sheet.getRange(r+1, 1).getValue()).trim().toLowerCase();
         // Matches "3", "Session 3", "S-3", "Sesi 3", etc.
         if (valA === String(sessionNum) || 
             (valA.indexOf(String(sessionNum)) > -1 && (valA.indexOf('ses') > -1 || valA.indexOf('pert') > -1 || valA.indexOf('meet') > -1 || valA.indexOf('mate') > -1))) {
            sessionStartRow = r + 1;
            break;
         }
      }
  }

  if (sessionStartRow === -1 || sessionStartRow < 1) {
    throw new Error("Sesi " + sessionNum + " tidak ditemukan di Kolom A pada spreadsheet ini.");
  }

  // Cari baris 'Project Uploaded' (di kolom Matrix / B) di bawah Session tersebut
  var matrixValues = sheet.getRange(sessionStartRow, 2, 5, 1).getValues();
  var offsetRow = 4; // default offset
  for (var m = 0; m < matrixValues.length; m++) {
    var mval = String(matrixValues[m][0]).trim().toLowerCase();
    if (mval.indexOf('project') > -1 || mval.indexOf('upload') > -1 || mval.indexOf('link') > -1) {
      offsetRow = m; // Ketemu di baris ini!
      break;
    }
  }

  var targetRow = sessionStartRow + offsetRow;
  var currentVal = String(sheet.getRange(targetRow, studentCol).getValue());
  
  var phasePrefix = "";
  if (phase === 'must-do') phasePrefix = "[Must Do]";
  else if (phase === 'should-do') phasePrefix = "[Should Do]";
  else if (phase === 'aspire-do') phasePrefix = "[Aspire]";
  
  var fullPrefix = phasePrefix + (type ? "[" + type + "] " : " ");
  var finalString = fullPrefix + url;
  
  // Split combined values and update or insert new entry
  var entries = currentVal.split("\n\n").filter(Boolean);
  var entryIndex = entries.findIndex(function(e) { 
      // Match by phase and type (e.g. Must Do AND Screenshot)
      return e.trim().indexOf(phasePrefix) === 0 && e.indexOf("[" + type + "]") > -1; 
  });
  
  if (entryIndex > -1) {
    entries[entryIndex] = finalString; 
  } else {
    entries.push(finalString); 
  }
  
  sheet.getRange(targetRow, studentCol).setValue(entries.join("\n\n"));
  updateSyncFlag(ss);
}

function getStudentsByClassCode(code) {
  var SPREADSHEET_ID = '1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ';
  var SHEET_NAME = 'Student Active';

  try {
    if (!code) {
      return createJsonResponse({ success: false, message: 'Kode Kelas tidak boleh kosong.' });
    }
    
    var uppercaseCode = code.toUpperCase().trim();
    
    if (uppercaseCode === 'ADMIN001') {
      return createJsonResponse({ 
        success: true, 
        isAdmin: true, 
        message: 'Akses Admin berhasil.' 
      });
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createJsonResponse({ success: false, message: 'Sheet "Student Active" tidak ditemukan di Spreadsheet!' });
    }

    var codeCol = 22; 
    var nameCol = 2;  
    var statusCol = 23; 
    
    var lastRow = sheet.getLastRow() || 2;
    var searchRange = sheet.getRange(2, codeCol, lastRow, 1);
    
    var ranges = searchRange.createTextFinder(uppercaseCode).matchEntireCell(false).findAll();
    
    var students = [];
    var rowNumbers = [];
    
    for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i].getRow();
        if (rowNumbers.indexOf(r) === -1) {
            rowNumbers.push(r);
        }
    }

    for (var i = 0; i < rowNumbers.length; i++) {
      var r = rowNumbers[i];
      var name = sheet.getRange(r, nameCol).getValue();
      var status = sheet.getRange(r, statusCol).getValue();
      
      var strName = String(name).trim();
      var strStatus = String(status).toLowerCase().trim();
      
      if (strName !== "" && strStatus.indexOf('graduated') === -1) {
          students.push(strName);
      }
    }

    if (students.length > 0) {
      return createJsonResponse({
        success: true,
        isAdmin: false,
        className: uppercaseCode,
        students: students
      });
    } else {
      return createJsonResponse({
        success: false,
        message: 'Kode Kelas "' + uppercaseCode + '" tidak ditemukan atau belum ada siswa terdaftar.'
      });
    }

  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Server error: ' + error.toString()
    });
  }
}

function handleUpdateProgress(data) {
  if (!data) return createJsonResponse({ success: false, message: 'No data provided.' });
  var DB_SPREADSHEET_ID = '1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ';
  try {
    var classCode = data.classCode;
    var studentName = data.studentName;
    var sessionNum = parseInt(data.session, 10);
    var progressVal = data.progress; // e.g. "75%"

    if (isNaN(sessionNum)) return createJsonResponse({ success: false, message: 'Invalid session' });

    var info = getClassInfo(classCode);
    if (!info || !info.ssId) return createJsonResponse({ success: false, message: 'Class info or ssId not found' });

    var ssClass = SpreadsheetApp.openById(info.ssId);
    var sheet = ssClass.getSheetByName('Progress');
    
    var lastCol = sheet.getLastColumn();
    var names = sheet.getRange(1, 1, 2, lastCol).getValues();
    var studentCol = -1;
    var searchN = normalizeStr(studentName);
    for (var c = 2; c < lastCol; c++) {
      var n1 = normalizeStr(names[0][c]);
      var n2 = normalizeStr(names[1][c]);
      if (n1 === searchN || n2 === searchN) {
        studentCol = c + 1;
        break;
      }
    }
    
    if (studentCol === -1 && searchN.length > 3) {
      for (var c = 2; c < lastCol; c++) {
        var n1 = normalizeStr(names[0][c]);
        var n2 = normalizeStr(names[1][c]);
        if ((n1 && n1.indexOf(searchN) > -1) || (n2 && n2.indexOf(searchN) > -1) || (n1 && searchN.indexOf(n1) > -1) || (n2 && searchN.indexOf(n2) > -1)) {
          studentCol = c + 1;
          break;
        }
      }
    }
    if (studentCol === -1) return createJsonResponse({ success: false, message: 'Student not found' });

    // Target Progress Row: 4 + (session - 1) * 5
    var targetRow = 4 + (sessionNum - 1) * 5;
    var cell = sheet.getRange(targetRow, studentCol);
    var currentVal = String(cell.getValue() || '').trim();
    
    var currentPerc = parseInt(currentVal.replace('%',''), 10) || 0;
    var newPerc = parseInt(String(progressVal).replace('%',''), 10) || 0;
    
    if (newPerc > currentPerc) {
        cell.setValue(progressVal);
        updateSyncFlag(ssClass);
    }

    return createJsonResponse({ success: true, updated: newPerc > currentPerc });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

/**
 * JALANKAN FUNGSI INI SEKALI SAJA di Apps Script Editor
 * untuk memicu dialog "Review Permissions" sehingga script
 * memiliki akses ke Google Drive dan Google Sheets Anda.
 */
function triggerPermissions() {
  var drive = DriveApp.getRootFolder();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Baris ini sengaja ditambahkan agar sistem Google tahu script ini
  // BUTUH izin untuk MEMBUAT file/folder (full drive access).
  var dummyFolder = DriveApp.createFolder("Kalananti_Auth_Dummy_Refresh");
  dummyFolder.setTrashed(true);
  
  Logger.log("Izin pembuatan folder sudah diberikan secara Penuh! Drive: " + drive.getName());
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleSaveQuiz(data) {
  if (!data) return createJsonResponse({ success: false, message: 'No data provided.' });
  var DB_SPREADSHEET_ID = '1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ';
  try {
    var classCode = data.classCode;
    var studentName = data.studentName;
    var sessionNum = parseInt(data.session, 10);
    var finalScore = Math.round((data.score / data.total) * 100);
    var starsEarned = Math.floor((data.score / data.total) * 5);
    var scoreStr = finalScore; // Store as number/percentage

    if (isNaN(sessionNum)) return createJsonResponse({ success: false, message: 'Invalid session' });

    // ... (existing spreadsheet opening logic)
    var ssDB = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    var dbSheet = ssDB.getSheetByName('Class Database');
    var dbData = dbSheet.getDataRange().getValues();
    var classLink = '';
    var searchCode = String(classCode).trim().toUpperCase();
    for (var i = 1; i < dbData.length; i++) {
        if (String(dbData[i][1]).trim().toUpperCase() === searchCode) {
            classLink = String(dbData[i][9]).trim();
            break;
        }
    }
    if (!classLink) return createJsonResponse({ success: false, message: 'ClassSS not found' });

    var idMatch = classLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
    var ssClass = idMatch ? SpreadsheetApp.openById(idMatch[1]) : SpreadsheetApp.openByUrl(classLink);
    var sheet = ssClass.getSheetByName('Progress');
    
    var lastCol = sheet.getLastColumn();
    var names = sheet.getRange(1, 1, 2, lastCol).getValues();
    var studentCol = -1;
    var searchN = normalizeStr(studentName);
    for (var c = 2; c < lastCol; c++) {
      var n1 = normalizeStr(names[0][c]);
      var n2 = normalizeStr(names[1][c]);
      if (n1 === searchN || n2 === searchN) {
         studentCol = c + 1;
         break;
      }
    }
    
    if (studentCol === -1 && searchN.length > 3) {
      for (var c = 2; c < lastCol; c++) {
        var n1 = normalizeStr(names[0][c]);
        var n2 = normalizeStr(names[1][c]);
        if ((n1 && n1.indexOf(searchN) > -1) || (n2 && n2.indexOf(searchN) > -1) || (n1 && searchN.indexOf(n1) > -1) || (n2 && searchN.indexOf(n2) > -1)) {
          studentCol = c + 1;
          break;
        }
      }
    }
    if (studentCol === -1) return createJsonResponse({ success: false, message: 'Student not found in Progress' });

    var targetRow = -1;
    var starRow = -1;
    var progRow = -1;
    var MAX_SESSIONS = 12;
    var PROG_ROWS_PER_SESSION = 5;
    var baseRowIdx = 3 + (sessionNum - 1) * PROG_ROWS_PER_SESSION;
    
    var blockLabels = sheet.getRange(baseRowIdx, 2, PROG_ROWS_PER_SESSION, 1).getValues();
    for (var m = 0; m < PROG_ROWS_PER_SESSION; m++) {
        var lab = String(blockLabels[m][0]).toLowerCase();
        if (lab.indexOf('quiz') > -1) {
            targetRow = baseRowIdx + m;
        } else if (lab.indexOf('star') > -1 || lab.indexOf('bintang') > -1) {
            starRow = baseRowIdx + m;
        } else if (lab.indexOf('progres') > -1) {
            progRow = baseRowIdx + m;
        }
    }

    if (targetRow !== -1) {
        sheet.getRange(targetRow, studentCol).setValue(scoreStr);
    }

    // Auto-set Progress to 100% when quiz is done
    if (progRow !== -1) {
        sheet.getRange(progRow, studentCol).setValue("100%");
    }
    
    if (starRow !== -1) {
        var starCell = sheet.getRange(starRow, studentCol);
        var currentStars = String(starCell.getValue() || '').trim();
        var quizStarEntry = starsEarned + " Star - Quiz";
        
        if (currentStars) {
            // Check if "X Star - Quiz" exists
            var regex = /(\d+\s*Star\s*-\s*Quiz)/i;
            if (regex.test(currentStars)) {
                currentStars = currentStars.replace(regex, quizStarEntry);
            } else {
                currentStars += "\n" + quizStarEntry;
            }
            starCell.setValue(currentStars);
        } else {
            starCell.setValue(quizStarEntry);
        }
        updateSyncFlag(ssClass);
    }

    return createJsonResponse({ success: true, updated: true, score: scoreStr, stars: starsEarned });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.toString() });
  }
}
