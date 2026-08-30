var SCL_SOURCE_HEADERS_ = Object.freeze([
  'Level',
  'Session',
  'objectives',
  'materials',
  'must_do',
  'should_do',
  'aspire_to_do',
  'self-check',
  'kamus_coder',
  'for_your_knowledge',
  'quiz_questions',
  'quiz_options',
  'quiz_answers',
  'Session-topic'
]);

var SCL_REQUIRED_SOURCE_HEADERS_ = Object.freeze(SCL_SOURCE_HEADERS_.filter(function (header) {
  return header !== 'quiz_answers';
}));

var SCL_CLIENT_FIELD_HEADERS_ = Object.freeze(SCL_SOURCE_HEADERS_.filter(function (header) {
  return header !== 'Level' && header !== 'Session' && header !== 'quiz_answers';
}));

var SCL_MINIMUM_HEADER_SCORE_ = Math.floor(SCL_REQUIRED_SOURCE_HEADERS_.length / 2) + 1;

function listCoursesAndLevels_(config) {
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  return {
    schemaVersion: 'scl-level-catalog/v1',
    courses: Object.keys(SCL_COURSES_).map(function (courseKey) {
      var course = SCL_COURSES_[courseKey];
      var snapshot = readCourseSnapshot_(spreadsheet, course, { skipRichText: true });
      return {
        key: course.key,
        label: course.label,
        coverLabel: course.coverLabel,
        levels: summarizeLevelsFromSnapshot_(snapshot, config)
      };
    })
  };
}

function loadLevelProject_(config, course, requestedLevel) {
  var level = normalizeLevelToken_(requestedLevel);
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var snapshot = readCourseSnapshot_(spreadsheet, course);
  var project = buildLevelProjectFromSnapshot_(snapshot, level, config);
  attachLevelTables_(spreadsheet, project);
  attachLevelLayouts_(spreadsheet, project);
  return attachSessionLocks_(spreadsheet, project);
}

function readCourseSnapshot_(spreadsheet, course, options) {
  var sheet = spreadsheet.getSheetByName(course.sheetName);
  if (!sheet) {
    throw new SclError_('SOURCE_SHEET_NOT_FOUND');
  }
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) {
    throw new SclError_('SOURCE_HEADER_NOT_FOUND');
  }

  var range = sheet.getRange(1, 1, lastRow, lastColumn);
  var values = range.getValues();
  var richTextValues = (options && options.skipRichText) ? [] : range.getRichTextValues();
  var header = discoverSourceHeader_(values);
  return {
    course: course,
    values: values,
    richTextValues: richTextValues,
    header: header,
    lastRow: lastRow,
    lastColumn: lastColumn
  };
}

function discoverSourceHeader_(values) {
  var candidates = [];
  var limit = Math.min(10, values.length);
  for (var rowIndex = 0; rowIndex < limit; rowIndex += 1) {
    var seen = {};
    var score = 0;
    values[rowIndex].forEach(function (value) {
      var canonical = canonicalSourceHeader_(value);
      if (canonical && !seen[canonical]) {
        seen[canonical] = true;
        if (SCL_REQUIRED_SOURCE_HEADERS_.indexOf(canonical) !== -1) {
          score += 1;
        }
      }
    });
    if (seen.Level && seen.Session && score >= SCL_MINIMUM_HEADER_SCORE_) {
      candidates.push({ rowIndex: rowIndex, score: score });
    }
  }

  if (candidates.length === 0) {
    throw new SclError_('SOURCE_HEADER_NOT_FOUND');
  }
  candidates.sort(function (left, right) {
    return right.score - left.score || left.rowIndex - right.rowIndex;
  });
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    throw new SclError_('SOURCE_HEADER_AMBIGUOUS');
  }

  var selectedRow = values[candidates[0].rowIndex];
  var columns = {};
  selectedRow.forEach(function (value, columnIndex) {
    var canonical = canonicalSourceHeader_(value);
    if (!canonical) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(columns, canonical)) {
      throw new SclError_('SOURCE_DUPLICATE_HEADER');
    }
    columns[canonical] = columnIndex;
  });

  return {
    rowIndex: candidates[0].rowIndex,
    rowNumber: candidates[0].rowIndex + 1,
    score: candidates[0].score,
    columns: columns,
    missingHeaders: SCL_REQUIRED_SOURCE_HEADERS_.filter(function (header) {
      return !Object.prototype.hasOwnProperty.call(columns, header);
    })
  };
}

function canonicalSourceHeader_(value) {
  var normalized = normalizeHeader_(value);
  for (var index = 0; index < SCL_SOURCE_HEADERS_.length; index += 1) {
    if (normalizeHeader_(SCL_SOURCE_HEADERS_[index]) === normalized) {
      return SCL_SOURCE_HEADERS_[index];
    }
  }
  return '';
}

function normalizeLevelToken_(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new SclError_('INVALID_REQUEST');
  }
  var token = normalizeCellText_(value).trim();
  if (!token || token.length > 120) {
    throw new SclError_('INVALID_REQUEST');
  }
  token = token
    .replace(/^(?:roblox\s*studio|roblox|scratch|python)\s*/i, '')
    .replace(/^(?:level|lvl)\s*/i, '')
    .trim();
  if (/^\d+(?:\.0+)?$/.test(token)) {
    return String(Number(token));
  }
  return token.toLowerCase();
}

function normalizeSessionToken_(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  var token = normalizeCellText_(value)
    .trim()
    .replace(/^(?:session|sesi)\s*/i, '')
    .trim();
  if (!/^\d+(?:\.0+)?$/.test(token)) {
    return '';
  }
  var session = Number(token);
  return Number.isInteger(session) && session >= 1 && session <= 12 ? String(session) : '';
}

function sourceCellValue_(snapshot, rowIndex, header) {
  var columnIndex = snapshot.header.columns[header];
  if (columnIndex === undefined) {
    return '';
  }
  return snapshot.values[rowIndex][columnIndex];
}

function sourceCellRichText_(snapshot, rowIndex, header) {
  var columnIndex = snapshot.header.columns[header];
  if (columnIndex === undefined || !snapshot.richTextValues[rowIndex]) {
    return null;
  }
  return snapshot.richTextValues[rowIndex][columnIndex] || null;
}
