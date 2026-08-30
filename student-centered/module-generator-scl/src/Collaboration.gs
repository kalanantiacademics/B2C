var SCL_LEASE_SECONDS_ = 120;
var SCL_HEARTBEAT_SECONDS_ = 30;
var SCL_HISTORY_LIMIT_ = 20;
var SCL_SCRIPT_LOCK_WAIT_MS_ = 5000;
var SCL_MAX_FIELD_TEXT_LENGTH_ = 200000;
var SCL_MAX_RICH_TEXT_RUNS_ = 2000;

function configuredLeaseSeconds_() {
  try {
    var config = requireConfiguration_();
    return Number(config.leaseSeconds) || SCL_DEFAULT_LEASE_SECONDS_ || 120;
  } catch (error) {
    return SCL_LEASE_SECONDS_;
  }
}

function acquireSessionLease_(sessionPayload, courseKey, requestedLevel, requestedSession, nowMs) {
  var timestamp = collaborationNowMs_(nowMs);
  return withCollaborationScriptLock_(function () {
    var context = resolveSourceSessionContext_(courseKey, requestedLevel, requestedSession);
    var locks = managedSheetContext_(context.spreadsheet, 'locks');
    var existing = findManagedRecord_(locks, 'lock_key', context.rowKey);
    var staleEditor = '';

    if (existing && activeLeaseRecord_(existing.record, timestamp)) {
      throw new SclError_('SESSION_LOCKED', null, false, {
        editorLabel: String(existing.record.editor_label || 'Editor lain'),
        lastActivity: String(existing.record.heartbeat_at || existing.record.acquired_at || '')
      });
    }
    if (existing) {
      staleEditor = String(existing.record.editor_label || '');
    }

    var leaseSeconds = configuredLeaseSeconds_();
    var leaseToken = createLeaseToken_();
    var record = {
      lock_key: context.rowKey,
      editor_label: String(sessionPayload.label || 'Editor'),
      editor_email: String(sessionPayload.email || ''),
      token_hash: hashText_(leaseToken),
      acquired_at: isoTimestamp_(timestamp),
      heartbeat_at: isoTimestamp_(timestamp),
      expires_at: isoTimestamp_(timestamp + leaseSeconds * 1000)
    };
    writeManagedRecord_(locks, existing ? existing.rowNumber : null, record);
    appendAuditRecord_(context.spreadsheet, {
      event_type: staleEditor ? 'lock_stale_acquire' : 'lock_acquire',
      request_id: '',
      status: 'SUCCESS',
      error_code: '',
      course_key: context.course.key,
      level: context.level,
      session: context.session,
      editor_label: String(sessionPayload.label || 'Editor'),
      duration_ms: 0,
      metadata_json: JSON.stringify(staleEditor ? { previousEditorLabel: staleEditor } : {}),
      created_at: isoTimestamp_(timestamp)
    });
    return {
      leaseToken: leaseToken,
      acquiredAt: record.acquired_at,
      expiresAt: record.expires_at,
      heartbeatIntervalSeconds: SCL_HEARTBEAT_SECONDS_,
      sourceRevision: context.sourceRevision,
      editor: {
        label: record.editor_label,
        selfDeclared: Boolean(sessionPayload.selfDeclared)
      }
    };
  });
}

function heartbeatSessionLease_(sessionPayload, leaseToken, courseKey, requestedLevel, requestedSession, nowMs) {
  var timestamp = collaborationNowMs_(nowMs);
  return withCollaborationScriptLock_(function () {
    var context = resolveSourceSessionContext_(courseKey, requestedLevel, requestedSession);
    var locks = managedSheetContext_(context.spreadsheet, 'locks');
    var match = requireLeaseRecord_(locks, context.rowKey, leaseToken, timestamp);
    var leaseSeconds = configuredLeaseSeconds_();
    var nextExpiry = isoTimestamp_(timestamp + leaseSeconds * 1000);
    writeManagedRecord_(locks, match.rowNumber, {
      heartbeat_at: isoTimestamp_(timestamp),
      expires_at: nextExpiry
    });
    return {
      expiresAt: nextExpiry,
      heartbeatIntervalSeconds: SCL_HEARTBEAT_SECONDS_,
      editorLabel: String(sessionPayload.label || '')
    };
  });
}

function releaseSessionLease_(sessionPayload, leaseToken, courseKey, requestedLevel, requestedSession, nowMs) {
  var timestamp = collaborationNowMs_(nowMs);
  return withCollaborationScriptLock_(function () {
    var context = resolveSourceSessionContext_(courseKey, requestedLevel, requestedSession);
    var locks = managedSheetContext_(context.spreadsheet, 'locks');
    var match = requireLeaseRecord_(locks, context.rowKey, leaseToken, timestamp);
    clearManagedRecord_(locks, match.rowNumber);
    appendAuditRecord_(context.spreadsheet, {
      event_type: 'lock_release',
      request_id: '',
      status: 'SUCCESS',
      error_code: '',
      course_key: context.course.key,
      level: context.level,
      session: context.session,
      editor_label: String(sessionPayload.label || 'Editor'),
      duration_ms: 0,
      metadata_json: '{}',
      created_at: isoTimestamp_(timestamp)
    });
    return { released: true };
  });
}

function saveSessionPatch_(sessionPayload, leaseToken, request, nowMs) {
  var timestamp = collaborationNowMs_(nowMs);
  var normalizedRequest = normalizeSaveRequest_(request);
  return withCollaborationScriptLock_(function () {
    var context = resolveSourceSessionContext_(
      normalizedRequest.courseKey,
      normalizedRequest.level,
      normalizedRequest.session
    );
    var locks = managedSheetContext_(context.spreadsheet, 'locks');
    requireLeaseRecord_(locks, context.rowKey, leaseToken, timestamp);

    var priorResult = findIdempotentResult_(
      context.spreadsheet,
      'autosave',
      normalizedRequest.requestId,
      context
    );
    if (priorResult) {
      return Object.assign({ duplicate: true }, priorResult);
    }
    if (context.sourceRevision !== normalizedRequest.baseRevision) {
      throw new SclError_('REVISION_CONFLICT', null, false, {
        currentRevision: context.sourceRevision
      });
    }

    var historyId = Utilities.getUuid();
    var previousFields = context.allFields;
    var previousTables = context.tables;
    var previousLayouts = context.layouts;
    writeSourceFieldPatch_(context, normalizedRequest.changes);
    if (normalizedRequest.tables !== null) {
      writeSessionTables_(context, normalizedRequest.tables, sessionPayload.label, timestamp);
    }
    if (normalizedRequest.layouts !== null) { writeSessionLayouts_(context, normalizedRequest.layouts, sessionPayload.label, timestamp); }
    var updated = refreshSourceSessionContext_(context);
    appendHistoryRecord_(context.spreadsheet, {
      history_id: historyId,
      row_key: context.rowKey,
      revision_before: context.sourceRevision,
      revision_after: updated.sourceRevision,
      changed_fields: JSON.stringify(Object.keys(normalizedRequest.changes)),
      snapshot_json: JSON.stringify(previousFields),
      tables_snapshot_json: JSON.stringify(normalizeTablesForRevision_(previousTables)),
      layouts_snapshot_json: JSON.stringify(normalizeLayoutsForRevision_(previousLayouts)),
      editor_label: String(sessionPayload.label || 'Editor'),
      created_at: isoTimestamp_(timestamp)
    });
    pruneHistory_(context.spreadsheet, context.rowKey);

    var result = {
      requestId: normalizedRequest.requestId,
      newRevision: updated.sourceRevision,
      savedAt: isoTimestamp_(timestamp),
      historyId: historyId,
      changedFields: Object.keys(normalizedRequest.changes),
      tablesChanged: normalizedRequest.tables !== null
      ,layoutsChanged: normalizedRequest.layouts !== null
    };
    appendAuditRecord_(context.spreadsheet, {
      event_type: 'autosave',
      request_id: normalizedRequest.requestId,
      status: 'SUCCESS',
      error_code: '',
      course_key: context.course.key,
      level: context.level,
      session: context.session,
      editor_label: String(sessionPayload.label || 'Editor'),
      duration_ms: 0,
      metadata_json: JSON.stringify(result),
      created_at: result.savedAt
    });
    return result;
  });
}

function getSessionHistory_(courseKey, requestedLevel, requestedSession) {
  var context = resolveSourceSessionContext_(courseKey, requestedLevel, requestedSession);
  var history = managedSheetContext_(context.spreadsheet, 'history');
  return history.records.filter(function (entry) {
    return String(entry.record.row_key || '') === context.rowKey;
  }).sort(function (left, right) {
    return Date.parse(String(right.record.created_at || '')) - Date.parse(String(left.record.created_at || ''));
  }).slice(0, SCL_HISTORY_LIMIT_).map(function (entry) {
    return {
      historyId: String(entry.record.history_id || ''),
      revisionBefore: String(entry.record.revision_before || ''),
      revisionAfter: String(entry.record.revision_after || ''),
      changedFields: parseJsonArray_(entry.record.changed_fields),
      editorLabel: String(entry.record.editor_label || ''),
      createdAt: String(entry.record.created_at || '')
    };
  });
}

function restoreSessionRevision_(sessionPayload, leaseToken, request, nowMs) {
  var timestamp = collaborationNowMs_(nowMs);
  var normalizedRequest = normalizeRestoreRequest_(request);
  return withCollaborationScriptLock_(function () {
    var context = resolveSourceSessionContext_(
      normalizedRequest.courseKey,
      normalizedRequest.level,
      normalizedRequest.session
    );
    var locks = managedSheetContext_(context.spreadsheet, 'locks');
    requireLeaseRecord_(locks, context.rowKey, leaseToken, timestamp);

    var priorResult = findIdempotentResult_(
      context.spreadsheet,
      'restore',
      normalizedRequest.requestId,
      context
    );
    if (priorResult) {
      return Object.assign({ duplicate: true }, priorResult);
    }
    if (context.sourceRevision !== normalizedRequest.baseRevision) {
      throw new SclError_('REVISION_CONFLICT', null, false, {
        currentRevision: context.sourceRevision
      });
    }

    var target = findHistoryRecord_(context.spreadsheet, context.rowKey, normalizedRequest.historyId);
    if (!target) {
      throw new SclError_('HISTORY_NOT_FOUND');
    }
    var targetFields = parseHistorySnapshot_(target.record.snapshot_json);
    var targetTables = parseHistoryTablesSnapshot_(target.record.tables_snapshot_json);
    var targetLayouts = parseHistoryLayoutsSnapshot_(target.record.layouts_snapshot_json);
    var currentFields = context.allFields;
    var currentTables = context.tables;
    var currentLayouts = context.layouts;
    var changedFields = Object.keys(targetFields);
    writeSourceFieldPatch_(context, targetFields, true);
    writeSessionTables_(context, targetTables, sessionPayload.label, timestamp);
    writeSessionLayouts_(context, targetLayouts, sessionPayload.label, timestamp);
    var updated = refreshSourceSessionContext_(context);
    var historyId = Utilities.getUuid();
    appendHistoryRecord_(context.spreadsheet, {
      history_id: historyId,
      row_key: context.rowKey,
      revision_before: context.sourceRevision,
      revision_after: updated.sourceRevision,
      changed_fields: JSON.stringify(changedFields),
      snapshot_json: JSON.stringify(currentFields),
      tables_snapshot_json: JSON.stringify(normalizeTablesForRevision_(currentTables)),
      layouts_snapshot_json: JSON.stringify(normalizeLayoutsForRevision_(currentLayouts)),
      editor_label: String(sessionPayload.label || 'Editor'),
      created_at: isoTimestamp_(timestamp)
    });
    pruneHistory_(context.spreadsheet, context.rowKey);

    var result = {
      requestId: normalizedRequest.requestId,
      newRevision: updated.sourceRevision,
      restoredAt: isoTimestamp_(timestamp),
      historyId: historyId,
      restoredFromHistoryId: normalizedRequest.historyId
    };
    appendAuditRecord_(context.spreadsheet, {
      event_type: 'restore',
      request_id: normalizedRequest.requestId,
      status: 'SUCCESS',
      error_code: '',
      course_key: context.course.key,
      level: context.level,
      session: context.session,
      editor_label: String(sessionPayload.label || 'Editor'),
      duration_ms: 0,
      metadata_json: JSON.stringify(result),
      created_at: result.restoredAt
    });
    return result;
  });
}

function attachSessionLocks_(spreadsheet, project, nowMs) {
  var sheet = spreadsheet.getSheetByName('_Generator_Locks');
  if (!sheet || sheet.getLastRow() < 2) {
    return project;
  }
  var locks;
  try {
    locks = managedSheetContext_(spreadsheet, 'locks');
  } catch (error) {
    project.diagnostics.push({ code: 'LOCK_STORAGE_UNAVAILABLE', severity: 'BLOCKING' });
    return project;
  }
  var timestamp = collaborationNowMs_(nowMs);
  var byKey = {};
  locks.records.forEach(function (entry) {
    if (activeLeaseRecord_(entry.record, timestamp)) {
      byKey[String(entry.record.lock_key || '')] = entry.record;
    }
  });
  project.sessions.forEach(function (session) {
    var record = byKey[session.rowKey];
    if (!record) {
      return;
    }
    session.status = 'Locked';
    session.lock = {
      editorLabel: String(record.editor_label || 'Editor lain'),
      lastActivity: String(record.heartbeat_at || record.acquired_at || ''),
      expiresAt: String(record.expires_at || '')
    };
  });
  return project;
}

function resolveSourceSessionContext_(courseKey, requestedLevel, requestedSession) {
  var config = requireConfiguration_();
  var course = resolveCourse_(courseKey);
  var level = normalizeLevelToken_(requestedLevel);
  var session = normalizeSessionToken_(requestedSession);
  if (!session) {
    throw new SclError_('INVALID_REQUEST');
  }
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var snapshot = readCourseSnapshot_(spreadsheet, course);
  var matches = [];
  for (var rowIndex = snapshot.header.rowIndex + 1; rowIndex < snapshot.values.length; rowIndex += 1) {
    var rawLevel = sourceCellValue_(snapshot, rowIndex, 'Level');
    if (rawLevel === '' || rawLevel === null || rawLevel === undefined ||
        normalizeLevelToken_(rawLevel) !== level) {
      continue;
    }
    if (normalizeSessionToken_(sourceCellValue_(snapshot, rowIndex, 'Session')) === session) {
      matches.push(rowIndex);
    }
  }
  if (matches.length !== 1) {
    throw new SclError_(matches.length ? 'SESSION_NOT_EDITABLE' : 'SESSION_NOT_FOUND');
  }
  var context = {
    config: config,
    course: course,
    level: level,
    session: session,
    spreadsheet: spreadsheet,
    sheet: spreadsheet.getSheetByName(course.sheetName),
    snapshot: snapshot,
    rowIndex: matches[0],
    rowNumber: matches[0] + 1,
    rowKey: course.sheetName + '::' + level + '::' + session
  };
  context.allFields = readAllSourceFields_(snapshot, context.rowIndex);
  context.tables = loadSessionTables_(spreadsheet, context.rowKey, context.allFields.materials);
  context.layouts = loadSessionLayouts_(spreadsheet, context.rowKey);
  context.sourceRevision = computeSessionRevisionWithLayouts_(context.allFields, context.tables, context.layouts);
  return context;
}

function refreshSourceSessionContext_(context) {
  var range = context.sheet.getRange(context.rowNumber, 1, 1, context.snapshot.lastColumn);
  var snapshot = {
    header: context.snapshot.header,
    values: [range.getValues()[0]],
    richTextValues: [range.getRichTextValues()[0]]
  };
  var fields = readAllSourceFields_(snapshot, 0);
  var tables = loadSessionTables_(context.spreadsheet, context.rowKey, fields.materials);
  var layouts = loadSessionLayouts_(context.spreadsheet, context.rowKey);
  return { allFields: fields, tables: tables, layouts: layouts, sourceRevision: computeSessionRevisionWithLayouts_(fields, tables, layouts) };
}

function readAllSourceFields_(snapshot, rowIndex) {
  var fields = {};
  SCL_SOURCE_HEADERS_.forEach(function (header) {
    if (header === 'Level' || header === 'Session') {
      return;
    }
    fields[header] = normalizeRichTextValue_(
      sourceCellRichText_(snapshot, rowIndex, header),
      sourceCellValue_(snapshot, rowIndex, header)
    );
  });
  return fields;
}

function writeSourceFieldPatch_(context, changes, internalRestore) {
  var entries = Object.keys(changes).filter(function (field) {
    return Object.prototype.hasOwnProperty.call(context.snapshot.header.columns, field) || !internalRestore;
  }).map(function (field) {
    if (!Object.prototype.hasOwnProperty.call(context.snapshot.header.columns, field)) {
      throw new SclError_('INVALID_PATCH');
    }
    if (!internalRestore && SCL_CLIENT_FIELD_HEADERS_.indexOf(field) === -1) {
      throw new SclError_('INVALID_PATCH');
    }
    if (internalRestore && field !== 'quiz_answers' && SCL_CLIENT_FIELD_HEADERS_.indexOf(field) === -1) {
      throw new SclError_('INVALID_PATCH');
    }
    return {
      column: context.snapshot.header.columns[field] + 1,
      value: internalRestore ? normalizeStoredRichTextModel_(changes[field]) : changes[field]
    };
  }).sort(function (left, right) { return left.column - right.column; });

  contiguousGroups_(entries, 'column').forEach(function (group) {
    context.sheet.getRange(context.rowNumber, group[0].column, 1, group.length)
      .setRichTextValues([group.map(function (entry) { return buildRichTextValue_(entry.value); })]);
  });
}

function normalizeSaveRequest_(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new SclError_('INVALID_REQUEST');
  }
  var changes = request.changes;
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new SclError_('INVALID_PATCH');
  }
  var normalizedChanges = {};
  Object.keys(changes).forEach(function (field) {
    if (SCL_CLIENT_FIELD_HEADERS_.indexOf(field) === -1) {
      throw new SclError_('INVALID_PATCH');
    }
    normalizedChanges[field] = normalizeClientRichTextModel_(changes[field]);
  });
  var normalizedTables = request.tables === undefined ? null : normalizeClientTables_(request.tables);
  var normalizedLayouts = request.layouts === undefined ? null : normalizeClientLayouts_(request.layouts);
  if (Object.keys(normalizedChanges).length === 0 && normalizedTables === null && normalizedLayouts === null) {
    throw new SclError_('INVALID_PATCH');
  }
  return {
    requestId: requireString_(request.requestId, 'requestId', 120),
    courseKey: requireString_(request.courseKey, 'courseKey', 40),
    level: request.level,
    session: request.session,
    baseRevision: requireString_(request.baseRevision, 'baseRevision', 120),
    changes: normalizedChanges,
    tables: normalizedTables,
    layouts: normalizedLayouts
  };
}

function normalizeRestoreRequest_(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new SclError_('INVALID_REQUEST');
  }
  return {
    requestId: requireString_(request.requestId, 'requestId', 120),
    courseKey: requireString_(request.courseKey, 'courseKey', 40),
    level: request.level,
    session: request.session,
    baseRevision: requireString_(request.baseRevision, 'baseRevision', 120),
    historyId: requireString_(request.historyId, 'historyId', 120)
  };
}

function normalizeClientRichTextModel_(model) {
  if (!model || typeof model !== 'object' || Array.isArray(model) || typeof model.text !== 'string') {
    throw new SclError_('INVALID_PATCH');
  }
  if (model.text.length > SCL_MAX_FIELD_TEXT_LENGTH_ || !Array.isArray(model.runs) ||
      model.runs.length > SCL_MAX_RICH_TEXT_RUNS_) {
    throw new SclError_('INVALID_PATCH');
  }
  var normalizedText = normalizeCellText_(model.text);
  var runs = model.runs.map(function (run) {
    if (!run || typeof run !== 'object') {
      throw new SclError_('INVALID_PATCH');
    }
    var start = Number(run.start);
    var end = Number(run.end);
    var link = String(run.link || '');
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start ||
        end > normalizedText.length || (link && !/^https:\/\//i.test(link))) {
      throw new SclError_('INVALID_PATCH');
    }
    return {
      start: start,
      end: end,
      bold: Boolean(run.bold),
      italic: Boolean(run.italic),
      underline: Boolean(run.underline),
      strikethrough: Boolean(run.strikethrough),
      link: link
    };
  });
  if (normalizedText && runs.length === 0) {
    runs.push(defaultRichTextRun_(0, normalizedText.length));
  }
  runs.sort(function (left, right) { return left.start - right.start || left.end - right.end; });
  for (var index = 1; index < runs.length; index += 1) {
    if (runs[index].start < runs[index - 1].end) {
      throw new SclError_('INVALID_PATCH');
    }
  }
  return { text: normalizedText, runs: mergeRichTextRuns_(runs) };
}

function normalizeStoredRichTextModel_(model) {
  return normalizeClientRichTextModel_({
    text: String(model && model.text !== undefined ? model.text : ''),
    runs: Array.isArray(model && model.runs) ? model.runs : []
  });
}

function managedSheetContext_(spreadsheet, key) {
  var definition = SCL_STORAGE_DEFINITIONS_.filter(function (candidate) {
    return candidate.key === key;
  })[0];
  if (!definition) {
    throw new SclError_('STORAGE_UNAVAILABLE');
  }
  var sheet = spreadsheet.getSheetByName(definition.sheetName);
  if (!sheet) {
    throw new SclError_('STORAGE_UNAVAILABLE');
  }
  var snapshot = inspectStorageSheet_(sheet, definition);
  var plan = planStorageRepair_(definition, snapshot);
  if (plan.safeMode || plan.missingHeaders.length || plan.addSchemaMetadata) {
    throw new SclError_('STORAGE_UNAVAILABLE', null, false, {
      diagnosticCodes: plan.diagnostics.map(function (diagnostic) { return diagnostic.code; })
    });
  }
  var headerMap = {};
  snapshot.headers.forEach(function (header, index) {
    headerMap[normalizeHeader_(header)] = index;
  });
  var records = snapshot.rows.map(function (row, rowIndex) {
    var record = {};
    definition.headers.forEach(function (header) {
      record[header] = row[headerMap[normalizeHeader_(header)]];
    });
    return { rowNumber: rowIndex + 2, record: record };
  }).filter(function (entry) {
    return definition.headers.some(function (header) {
      return entry.record[header] !== '' && entry.record[header] !== null && entry.record[header] !== undefined;
    });
  });
  return { definition: definition, sheet: sheet, headerMap: headerMap, records: records };
}

function findManagedRecord_(context, field, value) {
  return context.records.filter(function (entry) {
    return String(entry.record[field] || '') === String(value);
  })[0] || null;
}

function writeManagedRecord_(context, rowNumber, record) {
  var targetRow = rowNumber || Math.max(2, context.sheet.getLastRow() + 1);
  var entries = Object.keys(record).map(function (field) {
    var columnIndex = context.headerMap[normalizeHeader_(field)];
    if (columnIndex === undefined) {
      throw new SclError_('STORAGE_UNAVAILABLE');
    }
    return { column: columnIndex + 1, value: record[field] };
  }).sort(function (left, right) { return left.column - right.column; });
  contiguousGroups_(entries, 'column').forEach(function (group) {
    context.sheet.getRange(targetRow, group[0].column, 1, group.length)
      .setValues([group.map(function (entry) { return entry.value; })]);
  });
  return targetRow;
}

function clearManagedRecord_(context, rowNumber) {
  var record = {};
  context.definition.headers.forEach(function (header) { record[header] = ''; });
  writeManagedRecord_(context, rowNumber, record);
}

function contiguousGroups_(entries, columnField) {
  var groups = [];
  entries.forEach(function (entry) {
    var current = groups[groups.length - 1];
    if (!current || entry[columnField] !== current[current.length - 1][columnField] + 1) {
      groups.push([entry]);
    } else {
      current.push(entry);
    }
  });
  return groups;
}

function requireLeaseRecord_(locks, rowKey, leaseToken, timestamp) {
  var normalizedLease = requireString_(leaseToken, 'leaseToken', 4096);
  var match = findManagedRecord_(locks, 'lock_key', rowKey);
  if (!match || !constantTimeEquals_(String(match.record.token_hash || ''), hashText_(normalizedLease))) {
    throw new SclError_('LEASE_INVALID');
  }
  if (!activeLeaseRecord_(match.record, timestamp)) {
    throw new SclError_('LEASE_EXPIRED');
  }
  return match;
}

function activeLeaseRecord_(record, timestamp) {
  var expiry = Date.parse(String(record.expires_at || ''));
  return Number.isFinite(expiry) && expiry > timestamp;
}

function appendHistoryRecord_(spreadsheet, record) {
  writeManagedRecord_(managedSheetContext_(spreadsheet, 'history'), null, record);
}

function pruneHistory_(spreadsheet, rowKey) {
  var context = managedSheetContext_(spreadsheet, 'history');
  var matches = context.records.filter(function (entry) {
    return String(entry.record.row_key || '') === rowKey;
  }).sort(function (left, right) {
    return Date.parse(String(right.record.created_at || '')) - Date.parse(String(left.record.created_at || '')) ||
      right.rowNumber - left.rowNumber;
  });
  matches.slice(SCL_HISTORY_LIMIT_).map(function (entry) {
    return entry.rowNumber;
  }).sort(function (left, right) { return right - left; }).forEach(function (rowNumber) {
    context.sheet.deleteRow(rowNumber);
  });
}

function findHistoryRecord_(spreadsheet, rowKey, historyId) {
  return managedSheetContext_(spreadsheet, 'history').records.filter(function (entry) {
    return String(entry.record.row_key || '') === rowKey &&
      String(entry.record.history_id || '') === historyId;
  })[0] || null;
}

function parseHistorySnapshot_(raw) {
  var parsed;
  try {
    parsed = JSON.parse(String(raw || '{}'));
  } catch (error) {
    throw new SclError_('HISTORY_CORRUPT');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SclError_('HISTORY_CORRUPT');
  }
  var normalized = {};
  Object.keys(parsed).forEach(function (field) {
    if (field === 'quiz_answers' || SCL_CLIENT_FIELD_HEADERS_.indexOf(field) !== -1) {
      normalized[field] = normalizeStoredRichTextModel_(parsed[field]);
    }
  });
  return normalized;
}

function parseHistoryTablesSnapshot_(raw) {
  var parsed;
  try {
    parsed = JSON.parse(String(raw || '[]'));
  } catch (error) {
    throw new SclError_('HISTORY_CORRUPT');
  }
  return normalizeClientTables_(parsed);
}

function parseHistoryLayoutsSnapshot_(raw) {
  var parsed;
  try { parsed = JSON.parse(String(raw || '[]')); } catch (error) { throw new SclError_('HISTORY_CORRUPT'); }
  return normalizeClientLayouts_(parsed);
}

function appendAuditRecord_(spreadsheet, record) {
  if (!record.audit_id) {
    record.audit_id = Utilities.getUuid();
  }
  writeManagedRecord_(managedSheetContext_(spreadsheet, 'audit'), null, record);
}

function findIdempotentResult_(spreadsheet, eventType, requestId, sourceContext) {
  var match = managedSheetContext_(spreadsheet, 'audit').records.filter(function (entry) {
    var record = entry.record;
    return String(record.event_type || '') === eventType &&
      String(record.request_id || '') === requestId &&
      String(record.status || '') === 'SUCCESS' &&
      String(record.course_key || '') === sourceContext.course.key &&
      String(record.level || '') === sourceContext.level &&
      String(record.session || '') === sourceContext.session;
  }).pop();
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(String(match.record.metadata_json || '{}'));
  } catch (error) {
    throw new SclError_('STORAGE_UNAVAILABLE');
  }
}

function parseJsonArray_(raw) {
  try {
    var value = JSON.parse(String(raw || '[]'));
    return Array.isArray(value) ? value.map(String) : [];
  } catch (error) {
    return [];
  }
}

function createLeaseToken_() {
  return Utilities.getUuid() + '.' + Utilities.getUuid();
}

function withCollaborationScriptLock_(callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(SCL_SCRIPT_LOCK_WAIT_MS_)) {
    throw new SclError_('SERVER_BUSY', null, true);
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function collaborationNowMs_(override) {
  return Number.isFinite(override) ? Math.floor(override) : Date.now();
}

function isoTimestamp_(timestamp) {
  return new Date(timestamp).toISOString();
}
function resumeSessionLease_(
  sessionPayload,
  leaseToken,
  editSessionId,
  courseKey,
  requestedLevel,
  requestedSession,
  nowMs
) {
  var timestamp = collaborationNowMs_(nowMs);
  return withCollaborationScriptLock_(function () {
    var context = resolveSourceSessionContext_(courseKey, requestedLevel, requestedSession);
    var locks = managedSheetContext_(context.spreadsheet, 'locks');

    var normalizedLease = requireString_(leaseToken, 'leaseToken', 4096);
    var normalizedEditSessionId = requireString_(editSessionId, 'editSessionId', 160);
    var match = findManagedRecord_(locks, 'lock_key', context.rowKey);

    // Possession of the existing raw token is the resume proof. The same token
    // may renew an expired record atomically as long as no other editor has
    // replaced it.
    if (!match || !constantTimeEquals_(String(match.record.token_hash || ''), hashText_(normalizedLease))) {
      throw new SclError_('LEASE_INVALID', 'Hak edit sudah tidak berlaku atau diambil alih orang lain.');
    }

    var leaseSeconds = configuredLeaseSeconds_();
    var nextExpiry = isoTimestamp_(timestamp + leaseSeconds * 1000);
    writeManagedRecord_(locks, match.rowNumber, {
      heartbeat_at: isoTimestamp_(timestamp),
      expires_at: nextExpiry
    });

    var priorResume = findIdempotentResult_(
      context.spreadsheet,
      'edit_resumed',
      normalizedEditSessionId,
      context
    );
    if (!priorResume) {
      appendAuditRecord_(context.spreadsheet, {
        event_type: 'edit_resumed',
        request_id: normalizedEditSessionId,
        status: 'SUCCESS',
        error_code: '',
        course_key: context.course.key,
        level: context.level,
        session: context.session,
        editor_label: String(sessionPayload.label || 'Editor'),
        duration_ms: 0,
        metadata_json: JSON.stringify({ resumed: true }),
        created_at: isoTimestamp_(timestamp)
      });
    }

    return {
      leaseToken: leaseToken, // Return the same token
      acquiredAt: match.record.acquired_at,
      expiresAt: nextExpiry,
      heartbeatIntervalSeconds: SCL_HEARTBEAT_SECONDS_,
      sourceRevision: context.sourceRevision,
      editor: {
        label: match.record.editor_label,
        selfDeclared: Boolean(sessionPayload.selfDeclared)
      }
    };
  });
}
