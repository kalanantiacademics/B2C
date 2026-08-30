var SCL_ACTIVITY_DEFAULT_LIMIT_ = 50;
var SCL_ACTIVITY_MAX_LIMIT_ = 100;
var SCL_FAILED_LOGIN_WINDOW_MS_ = 300000;
var SCL_ACTIVITY_EVENT_TYPES_ = Object.freeze([
  'login_failed',
  'login_success',
  'session_resume',
  'logout',
  'project_open',
  'compose',
  'lock_acquire',
  'lock_stale_acquire',
  'lock_release',
  'autosave',
  'restore',
  'publish_reserved',
  'publish_completed',
  'publish_failed'
]);

function recordActivityEvent_(sessionPayload, eventType, context, metadata, status, errorCode, nowMs) {
  var event = String(eventType || '');
  if (SCL_ACTIVITY_EVENT_TYPES_.indexOf(event) === -1) {
    throw new SclError_('INVALID_REQUEST');
  }
  var details = context || {};
  var courseKey = details.courseKey ? resolveCourse_(String(details.courseKey)).key : '';
  var level = details.level === undefined || details.level === null || details.level === ''
    ? ''
    : normalizeLevelToken_(details.level);
  var session = details.session === undefined || details.session === null || details.session === ''
    ? ''
    : normalizeSessionToken_(details.session);
  if (details.session && !session) {
    throw new SclError_('INVALID_REQUEST');
  }
  var timestamp = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
  var spreadsheet = SpreadsheetApp.openById(requireConfiguration_().spreadsheetId);
  appendAuditRecord_(spreadsheet, {
    event_type: event,
    request_id: safeOptionalIdentity_(details.requestId, 160),
    status: normalizeAuditStatus_(status),
    error_code: safeOptionalIdentity_(errorCode, 80),
    course_key: courseKey,
    level: level,
    session: session,
    editor_label: safeEditorLabel_(sessionPayload && sessionPayload.label),
    duration_ms: normalizeDurationMs_(details.durationMs),
    metadata_json: JSON.stringify(normalizeActivityMetadata_(metadata)),
    created_at: isoTimestamp_(timestamp)
  });
}

function listActivity_(sessionPayload, request) {
  if (!sessionPayload || !sessionPayload.label) {
    throw new SclError_('SESSION_INVALID');
  }
  var page = normalizeBoundedPageRequest_(request, SCL_ACTIVITY_DEFAULT_LIMIT_, SCL_ACTIVITY_MAX_LIMIT_);
  var spreadsheet = SpreadsheetApp.openById(requireConfiguration_().spreadsheetId);
  var records = managedSheetContext_(spreadsheet, 'audit').records.filter(function (entry) {
    return SCL_ACTIVITY_EVENT_TYPES_.indexOf(String(entry.record.event_type || '')) !== -1;
  }).sort(function (left, right) {
    return Date.parse(String(right.record.created_at || '')) - Date.parse(String(left.record.created_at || '')) ||
      right.rowNumber - left.rowNumber;
  });
  var items = records.slice(page.cursor, page.cursor + page.limit).map(function (entry) {
    var metadata = parseSafeMetadataObject_(entry.record.metadata_json);
    return {
      eventType: String(entry.record.event_type || ''),
      status: String(entry.record.status || ''),
      courseKey: String(entry.record.course_key || ''),
      level: String(entry.record.level || ''),
      session: String(entry.record.session || ''),
      editorLabel: String(entry.record.editor_label || 'Editor'),
      identityType: /^(?:verified|self-declared)$/.test(String(metadata.identityType || ''))
        ? String(metadata.identityType)
        : 'unknown',
      attemptCount: eventTypeAttemptCount_(entry.record.event_type, metadata),
      createdAt: String(entry.record.created_at || '')
    };
  });
  var nextCursor = page.cursor + items.length;
  return {
    schemaVersion: 'scl-activity/v1',
    items: items,
    nextCursor: nextCursor < records.length ? nextCursor : null,
    hasMore: nextCursor < records.length
  };
}

function recordFailedLoginAggregate_(nowMs) {
  var timestamp = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
  var bucketStart = Math.floor(timestamp / SCL_FAILED_LOGIN_WINDOW_MS_) * SCL_FAILED_LOGIN_WINDOW_MS_;
  var requestId = 'login-failed-' + String(bucketStart);
  var spreadsheet = SpreadsheetApp.openById(requireConfiguration_().spreadsheetId);
  withCollaborationScriptLock_(function () {
    var audit = managedSheetContext_(spreadsheet, 'audit');
    var existing = audit.records.filter(function (entry) {
      return String(entry.record.event_type || '') === 'login_failed' &&
        String(entry.record.request_id || '') === requestId;
    }).pop();
    var metadata = existing ? parseSafeMetadataObject_(existing.record.metadata_json) : {};
    var attemptCount = Math.min(100000, Math.max(0, Number(metadata.attemptCount) || 0) + 1);
    var patch = {
      status: 'FAILED',
      error_code: 'AUTHENTICATION_FAILED',
      editor_label: 'Anonymous',
      duration_ms: 0,
      metadata_json: JSON.stringify({ attemptCount: attemptCount }),
      created_at: isoTimestamp_(timestamp)
    };
    if (existing) {
      writeManagedRecord_(audit, existing.rowNumber, patch);
      return;
    }
    appendAuditRecord_(spreadsheet, Object.assign({
      event_type: 'login_failed',
      request_id: requestId,
      course_key: '',
      level: '',
      session: ''
    }, patch));
  });
}

function normalizeBoundedPageRequest_(request, defaultLimit, maximumLimit) {
  var value = request && Object.prototype.toString.call(request) === '[object Object]' ? request : {};
  var cursor = value.cursor === undefined ? 0 : Number(value.cursor);
  var limit = value.limit === undefined ? defaultLimit : Number(value.limit);
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > 1000000 ||
      !Number.isInteger(limit) || limit < 1 || limit > maximumLimit) {
    throw new SclError_('INVALID_REQUEST');
  }
  return { cursor: cursor, limit: limit };
}

function normalizeActivityMetadata_(metadata) {
  var source = metadata && Object.prototype.toString.call(metadata) === '[object Object]' ? metadata : {};
  var result = {};
  if (/^(?:verified|self-declared)$/.test(String(source.identityType || ''))) {
    result.identityType = String(source.identityType);
  }
  ['pageCount', 'blockingCount', 'warningCount', 'attemptCount'].forEach(function (field) {
    if (Number.isInteger(Number(source[field])) && Number(source[field]) >= 0 && Number(source[field]) <= 10000) {
      result[field] = Number(source[field]);
    }
  });
  return result;
}

function eventTypeAttemptCount_(eventType, metadata) {
  if (String(eventType || '') !== 'login_failed') {
    return 0;
  }
  var value = Number(metadata && metadata.attemptCount);
  return Number.isInteger(value) && value >= 1 && value <= 100000 ? value : 1;
}

function parseSafeMetadataObject_(raw) {
  try {
    var parsed = JSON.parse(String(raw || '{}'));
    return parsed && Object.prototype.toString.call(parsed) === '[object Object]' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function safeEditorLabel_(value) {
  var label = String(value || 'Editor').trim();
  return (label || 'Editor').slice(0, 120);
}

function safeOptionalIdentity_(value, maximumLength) {
  var text = String(value || '').trim();
  if (!text) {
    return '';
  }
  if (text.length > maximumLength || !/^[A-Za-z0-9._:-]+$/.test(text)) {
    throw new SclError_('INVALID_REQUEST');
  }
  return text;
}

function normalizeAuditStatus_(value) {
  var status = String(value || 'SUCCESS').toUpperCase();
  if (['SUCCESS', 'FAILED', 'PENDING'].indexOf(status) === -1) {
    throw new SclError_('INVALID_REQUEST');
  }
  return status;
}

function normalizeDurationMs_(value) {
  var duration = Number(value || 0);
  return Number.isInteger(duration) && duration >= 0 && duration <= 3600000 ? duration : 0;
}
