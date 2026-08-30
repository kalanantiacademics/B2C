var SCL_PUBLISH_DEFAULT_LIMIT_ = 50;
var SCL_PUBLISH_MAX_LIMIT_ = 100;
var SCL_PUBLISH_STATUSES_ = Object.freeze(['PENDING', 'RENDERING', 'UPLOADING', 'PUBLISHED', 'FAILED']);

function reservePublishVersion_(spreadsheet, sessionPayload, request, sourceRevisionDigest, nowMs) {
  var normalized = normalizePublishReservationRequest_(request, sourceRevisionDigest);
  var timestamp = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
  return withCollaborationScriptLock_(function () {
    var publishes = managedSheetContext_(spreadsheet, 'publishes');
    var existing = findManagedRecord_(publishes, 'request_id', normalized.requestId);
    if (existing) {
      if (String(existing.record.course_key || '') !== normalized.courseKey ||
          String(existing.record.level || '') !== normalized.level ||
          String(existing.record.source_revision_digest || '') !== normalized.sourceRevisionDigest) {
        throw new SclError_('INVALID_REQUEST');
      }
      return Object.assign({ duplicate: true }, publishRecordForClient_(existing.record));
    }
    var version = publishes.records.filter(function (entry) {
      return String(entry.record.course_key || '') === normalized.courseKey &&
        String(entry.record.level || '') === normalized.level;
    }).reduce(function (maximum, entry) {
      var candidate = Number(entry.record.version);
      return Number.isInteger(candidate) ? Math.max(maximum, candidate) : maximum;
    }, 0) + 1;
    var publishId = Utilities.getUuid();
    var record = {
      publish_id: publishId,
      request_id: normalized.requestId,
      course_key: normalized.courseKey,
      level: normalized.level,
      version: version,
      source_revision_digest: normalized.sourceRevisionDigest,
      publish_status: 'PENDING',
      is_latest: false,
      file_id: '',
      file_name: buildPublishFilename_(normalized.courseKey, normalized.level, version),
      page_count: '',
      file_size_bytes: '',
      renderer_version: '',
      published_by: safeEditorLabel_(sessionPayload && sessionPayload.label),
      created_at: isoTimestamp_(timestamp),
      completed_at: '',
      error_code: '',
      metadata_json: '{}'
    };
    writeManagedRecord_(publishes, null, record);
    return publishRecordForClient_(record);
  });
}

function setPublishStage_(spreadsheet, publishId, status, nowMs) {
  var normalizedStatus = String(status || '').toUpperCase();
  if (['RENDERING', 'UPLOADING'].indexOf(normalizedStatus) === -1) {
    throw new SclError_('INVALID_REQUEST');
  }
  return withCollaborationScriptLock_(function () {
    var publishes = managedSheetContext_(spreadsheet, 'publishes');
    var match = findManagedRecord_(publishes, 'publish_id', requireString_(publishId, 'publishId', 160));
    if (!match) {
      throw new SclError_('PUBLISH_NOT_FOUND');
    }
    writeManagedRecord_(publishes, match.rowNumber, {
      publish_status: normalizedStatus,
      error_code: '',
      metadata_json: '{}'
    });
    return publishRecordForClient_(Object.assign({}, match.record, { publish_status: normalizedStatus }));
  });
}

function finalizePublish_(spreadsheet, publishId, fileMetadata, nowMs) {
  var normalized = normalizePublishedFileMetadata_(fileMetadata);
  var timestamp = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
  return withCollaborationScriptLock_(function () {
    var publishes = managedSheetContext_(spreadsheet, 'publishes');
    var match = findManagedRecord_(publishes, 'publish_id', requireString_(publishId, 'publishId', 160));
    if (!match) {
      throw new SclError_('PUBLISH_NOT_FOUND');
    }
    if (String(match.record.publish_status || '') === 'PUBLISHED') {
      return Object.assign({ duplicate: true }, publishRecordForClient_(match.record));
    }
    publishes.records.forEach(function (entry) {
      if (entry.rowNumber !== match.rowNumber &&
          String(entry.record.course_key || '') === String(match.record.course_key || '') &&
          String(entry.record.level || '') === String(match.record.level || '') &&
          String(entry.record.is_latest).toLowerCase() === 'true') {
        writeManagedRecord_(publishes, entry.rowNumber, { is_latest: false });
      }
    });
    var patch = {
      publish_status: 'PUBLISHED',
      is_latest: true,
      file_id: normalized.fileId,
      file_name: normalized.fileName || String(match.record.file_name || ''),
      page_count: normalized.pageCount,
      file_size_bytes: normalized.fileSizeBytes,
      renderer_version: normalized.rendererVersion,
      completed_at: isoTimestamp_(timestamp),
      error_code: '',
      metadata_json: '{}'
    };
    writeManagedRecord_(publishes, match.rowNumber, patch);
    return publishRecordForClient_(Object.assign({}, match.record, patch));
  });
}

function failPublish_(spreadsheet, publishId, errorCode, nowMs) {
  var code = safeOptionalIdentity_(errorCode, 80);
  return withCollaborationScriptLock_(function () {
    var publishes = managedSheetContext_(spreadsheet, 'publishes');
    var match = findManagedRecord_(publishes, 'publish_id', requireString_(publishId, 'publishId', 160));
    if (!match) {
      throw new SclError_('PUBLISH_NOT_FOUND');
    }
    var patch = {
      publish_status: 'FAILED',
      is_latest: false,
      completed_at: isoTimestamp_(Number.isFinite(nowMs) ? nowMs : Date.now()),
      error_code: code || 'PUBLISH_FAILED',
      metadata_json: '{}'
    };
    writeManagedRecord_(publishes, match.rowNumber, patch);
    return publishRecordForClient_(Object.assign({}, match.record, patch));
  });
}

function listPublishedModules_(sessionPayload, request) {
  if (!sessionPayload || !sessionPayload.label) {
    throw new SclError_('SESSION_INVALID');
  }
  var page = normalizeBoundedPageRequest_(request, SCL_PUBLISH_DEFAULT_LIMIT_, SCL_PUBLISH_MAX_LIMIT_);
  var spreadsheet = SpreadsheetApp.openById(requireConfiguration_().spreadsheetId);
  var records = managedSheetContext_(spreadsheet, 'publishes').records.sort(function (left, right) {
    return Date.parse(String(right.record.created_at || '')) - Date.parse(String(left.record.created_at || '')) ||
      right.rowNumber - left.rowNumber;
  });
  var items = records.slice(page.cursor, page.cursor + page.limit).map(function (entry) {
    return publishRecordForClient_(entry.record);
  });
  var nextCursor = page.cursor + items.length;
  return {
    schemaVersion: 'scl-publish-list/v1',
    items: items,
    nextCursor: nextCursor < records.length ? nextCursor : null,
    hasMore: nextCursor < records.length
  };
}

function computeProjectRevisionDigest_(project) {
  var sessions = Array.isArray(project && project.sessions) ? project.sessions.slice() : [];
  sessions.sort(function (left, right) { return Number(left.session) - Number(right.session); });
  return hashText_(sessions.map(function (session) {
    return String(session.session || '') + ':' + String(session.sourceRevision || '');
  }).join('|'));
}

function normalizePublishReservationRequest_(request, sourceRevisionDigest) {
  if (!request || Object.prototype.toString.call(request) !== '[object Object]') {
    throw new SclError_('INVALID_REQUEST');
  }
  var requestId = safeOptionalIdentity_(request.requestId, 160);
  var digest = safeOptionalIdentity_(sourceRevisionDigest, 200);
  if (!requestId || !digest) {
    throw new SclError_('INVALID_REQUEST');
  }
  return {
    requestId: requestId,
    courseKey: resolveCourse_(requireString_(request.courseKey, 'courseKey', 40)).key,
    level: normalizeLevelToken_(request.level),
    sourceRevisionDigest: digest
  };
}

function normalizePublishedFileMetadata_(metadata) {
  if (!metadata || Object.prototype.toString.call(metadata) !== '[object Object]') {
    throw new SclError_('INVALID_REQUEST');
  }
  var fileId = requireString_(metadata.fileId, 'fileId', 256);
  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) {
    throw new SclError_('INVALID_REQUEST');
  }
  var pageCount = Number(metadata.pageCount);
  var fileSizeBytes = Number(metadata.fileSizeBytes);
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 10000 ||
      !Number.isInteger(fileSizeBytes) || fileSizeBytes < 1 || fileSizeBytes > 52428800) {
    throw new SclError_('INVALID_REQUEST');
  }
  return {
    fileId: fileId,
    fileName: sanitizePublishFilename_(String(metadata.fileName || '')),
    pageCount: pageCount,
    fileSizeBytes: fileSizeBytes,
    rendererVersion: safeOptionalIdentity_(metadata.rendererVersion, 120) || 'unknown'
  };
}

function publishRecordForClient_(record) {
  var status = String(record.publish_status || 'FAILED');
  if (SCL_PUBLISH_STATUSES_.indexOf(status) === -1) {
    status = 'FAILED';
  }
  var fileId = String(record.file_id || '');
  return {
    publishId: String(record.publish_id || ''),
    courseKey: String(record.course_key || ''),
    level: String(record.level || ''),
    version: Number(record.version) || 0,
    status: status,
    isLatest: String(record.is_latest).toLowerCase() === 'true',
    fileName: String(record.file_name || ''),
    pageCount: Number(record.page_count) || 0,
    fileSizeBytes: Number(record.file_size_bytes) || 0,
    rendererVersion: String(record.renderer_version || ''),
    publishedBy: String(record.published_by || 'Editor'),
    createdAt: String(record.created_at || ''),
    completedAt: String(record.completed_at || ''),
    errorCode: String(record.error_code || ''),
    openUrl: status === 'PUBLISHED' && /^[A-Za-z0-9_-]+$/.test(fileId)
      ? 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view'
      : ''
  };
}

function buildPublishFilename_(courseKey, level, version) {
  var course = resolveCourse_(courseKey);
  return sanitizePublishFilename_(
    'Kalananti-SCL-' + course.coverLabel + '-Level-' + level + '-v' + String(version).padStart(3, '0') + '.pdf'
  );
}

function sanitizePublishFilename_(value) {
  var text = String(value || '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!text) {
    return '';
  }
  if (!/\.pdf$/i.test(text)) {
    text += '.pdf';
  }
  return text.slice(0, 180);
}
