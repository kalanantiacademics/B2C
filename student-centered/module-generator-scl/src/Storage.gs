var SCL_SCHEMA_METADATA_KEY_ = 'SCL_GENERATOR_SCHEMA_VERSION';
var SCL_PROTECTION_DESCRIPTION_ = 'Kalananti SCL Generator managed storage';

var SCL_STORAGE_DEFINITIONS_ = Object.freeze([
  Object.freeze({
    key: 'layouts',
    sheetName: '_Generator_Layouts',
    headers: Object.freeze([
      'layout_id', 'row_key', 'field', 'block_key', 'order_index', 'layout_json',
      'created_at', 'updated_at', 'updated_by'
    ]),
    jsonFields: Object.freeze(['layout_json']),
    integerFields: Object.freeze(['order_index'])
  }),
  Object.freeze({
    key: 'tables',
    sheetName: '_Generator_Tables',
    headers: Object.freeze([
      'table_id', 'row_key', 'field', 'order_index', 'anchor_hash', 'table_json',
      'created_at', 'updated_at', 'updated_by'
    ]),
    jsonFields: Object.freeze(['table_json']),
    integerFields: Object.freeze(['order_index'])
  }),
  Object.freeze({
    key: 'locks',
    sheetName: '_Generator_Locks',
    headers: Object.freeze([
      'lock_key', 'editor_label', 'editor_email', 'token_hash', 'acquired_at',
      'heartbeat_at', 'expires_at'
    ]),
    jsonFields: Object.freeze([]),
    integerFields: Object.freeze([])
  }),
  Object.freeze({
    key: 'history',
    sheetName: '_Generator_History',
    headers: Object.freeze([
      'history_id', 'row_key', 'revision_before', 'revision_after', 'changed_fields',
      'snapshot_json', 'tables_snapshot_json', 'layouts_snapshot_json', 'editor_label', 'created_at'
    ]),
    jsonFields: Object.freeze(['snapshot_json', 'tables_snapshot_json', 'layouts_snapshot_json']),
    integerFields: Object.freeze([])
  }),
  Object.freeze({
    key: 'audit',
    sheetName: '_Generator_Audit',
    headers: Object.freeze([
      'audit_id', 'event_type', 'request_id', 'status', 'error_code', 'course_key',
      'level', 'session', 'editor_label', 'duration_ms', 'metadata_json', 'created_at'
    ]),
    jsonFields: Object.freeze(['metadata_json']),
    integerFields: Object.freeze(['duration_ms'])
  }),
  Object.freeze({
    key: 'publishes',
    sheetName: '_Generator_Publishes',
    headers: Object.freeze([
      'publish_id', 'request_id', 'course_key', 'level', 'version',
      'source_revision_digest', 'publish_status', 'is_latest', 'file_id',
      'file_name', 'page_count', 'file_size_bytes', 'renderer_version',
      'published_by', 'created_at', 'completed_at', 'error_code', 'metadata_json'
    ]),
    jsonFields: Object.freeze(['metadata_json']),
    integerFields: Object.freeze(['version', 'page_count', 'file_size_bytes'])
  })
]);

function verifyGeneratorStorage_(options) {
  var config = requireConfiguration_();
  var repair = Boolean(options && options.repair);
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var results = SCL_STORAGE_DEFINITIONS_.map(function (definition) {
    return verifyStorageSheet_(spreadsheet, definition, repair);
  });
  var diagnostics = [];
  results.forEach(function (result) {
    result.diagnostics.forEach(function (diagnostic) {
      diagnostics.push(diagnostic);
    });
  });
  return {
    ok: results.every(function (result) { return result.ok; }),
    safeMode: results.some(function (result) { return result.safeMode; }),
    schemaVersion: SCL_SCHEMA_VERSION_,
    diagnostics: diagnostics,
    sheets: results
  };
}

function verifyStorageSheet_(spreadsheet, definition, repair) {
  var sheet = spreadsheet.getSheetByName(definition.sheetName);
  var created = false;
  var actions = [];

  if (!sheet) {
    if (!repair) {
      return storageResult_(definition.key, false, false, [{ code: 'STORAGE_TAB_MISSING' }], []);
    }
    sheet = spreadsheet.insertSheet(definition.sheetName);
    sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers.slice()]);
    sheet.setFrozenRows(1);
    sheet.addDeveloperMetadata(SCL_SCHEMA_METADATA_KEY_, SCL_SCHEMA_VERSION_);
    created = true;
    actions.push('created');
  }

  var snapshot = inspectStorageSheet_(sheet, definition);
  var plan = planStorageRepair_(definition, snapshot);
  if (plan.safeMode) {
    return storageResult_(definition.key, false, true, plan.diagnostics, actions);
  }

  if (repair && !created) {
    if (plan.missingHeaders.length) {
      var startColumn = Math.max(1, sheet.getLastColumn() + 1);
      sheet.getRange(1, startColumn, 1, plan.missingHeaders.length).setValues([plan.missingHeaders]);
      actions.push('columns_added');
    }
    if (plan.addSchemaMetadata) {
      sheet.addDeveloperMetadata(SCL_SCHEMA_METADATA_KEY_, SCL_SCHEMA_VERSION_);
      actions.push('schema_metadata_added');
    }
  }

  if (repair) {
    actions = actions.concat(applyStoragePresentation_(sheet));
  }

  var needsRepair = !repair && (plan.missingHeaders.length > 0 || plan.addSchemaMetadata);
  var diagnostics = needsRepair ? [{ code: 'STORAGE_REPAIR_REQUIRED' }] : [];
  return storageResult_(definition.key, !needsRepair, false, diagnostics, actions);
}

function inspectStorageSheet_(sheet, definition) {
  var lastColumn = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  var headers = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    : [];
  var rows = lastRow > 1 && lastColumn > 0
    ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
    : [];
  var metadataValues = sheet.createDeveloperMetadataFinder()
    .withKey(SCL_SCHEMA_METADATA_KEY_)
    .find()
    .map(function (metadata) { return String(metadata.getValue() || ''); });

  return {
    exists: true,
    headers: headers,
    rows: rows,
    metadataValues: metadataValues,
    definition: definition
  };
}

function planStorageRepair_(definition, snapshot) {
  var headers = (snapshot.headers || []).map(function (header) { return String(header || '').trim(); });
  var normalized = headers.map(normalizeHeader_);
  var diagnostics = [];
  var seen = {};

  normalized.forEach(function (header, index) {
    if (!header) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(seen, header)) {
      diagnostics.push({ code: 'STORAGE_DUPLICATE_HEADER', column: index + 1 });
    } else {
      seen[header] = index;
    }
  });

  var blankDataColumn = findBlankHeaderWithData_(normalized, snapshot.rows || []);
  if (blankDataColumn !== -1) {
    diagnostics.push({ code: 'STORAGE_AMBIGUOUS_HEADER', column: blankDataColumn + 1 });
  }

  var metadataValues = snapshot.metadataValues || [];
  if (metadataValues.length > 1) {
    diagnostics.push({ code: 'STORAGE_AMBIGUOUS_SCHEMA_VERSION' });
  } else if (metadataValues.length === 1 && metadataValues[0] !== SCL_SCHEMA_VERSION_) {
    diagnostics.push({ code: 'STORAGE_SCHEMA_VERSION_MISMATCH' });
  }

  diagnostics = diagnostics.concat(validateStorageRows_(definition, normalized, snapshot.rows || []));
  var safeMode = diagnostics.length > 0;
  var missingHeaders = safeMode ? [] : definition.headers.filter(function (header) {
    return normalized.indexOf(normalizeHeader_(header)) === -1;
  });

  return {
    safeMode: safeMode,
    diagnostics: diagnostics,
    missingHeaders: missingHeaders,
    addSchemaMetadata: !safeMode && metadataValues.length === 0
  };
}

function validateStorageRows_(definition, normalizedHeaders, rows) {
  var diagnostics = [];
  var fieldsToValidate = [];
  definition.jsonFields.forEach(function (field) {
    fieldsToValidate.push({ field: field, type: 'json' });
  });
  definition.integerFields.forEach(function (field) {
    fieldsToValidate.push({ field: field, type: 'integer' });
  });

  fieldsToValidate.forEach(function (item) {
    var columnIndex = normalizedHeaders.indexOf(normalizeHeader_(item.field));
    if (columnIndex === -1) {
      return;
    }
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      var value = rows[rowIndex][columnIndex];
      if (value === '' || value === null || value === undefined) {
        continue;
      }
      if (item.type === 'integer' && (!Number.isFinite(Number(value)) || !Number.isInteger(Number(value)))) {
        diagnostics.push({ code: 'STORAGE_INCOMPATIBLE_ROW', row: rowIndex + 2 });
        break;
      }
      if (item.type === 'json') {
        try {
          var parsed = JSON.parse(String(value));
          if (definition.key === 'layouts' && item.field === 'layout_json') { validateLayoutJson_(parsed); }
        } catch (error) {
          diagnostics.push({ code: 'STORAGE_INCOMPATIBLE_ROW', row: rowIndex + 2 });
          break;
        }
      }
    }
  });
  if (definition.key === 'publishes') {
    diagnostics = diagnostics.concat(validatePublishStorageRows_(normalizedHeaders, rows));
  }
  return diagnostics;
}

function validatePublishStorageRows_(normalizedHeaders, rows) {
  var fields = {};
  ['publish_id', 'request_id', 'course_key', 'level', 'version', 'source_revision_digest',
    'publish_status', 'is_latest', 'file_id', 'metadata_json'].forEach(function (field) {
    fields[field] = normalizedHeaders.indexOf(normalizeHeader_(field));
  });
  var allowedStatuses = ['PENDING', 'RENDERING', 'UPLOADING', 'PUBLISHED', 'FAILED'];
  var diagnostics = [];
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    var row = rows[rowIndex];
    if (!row.some(function (value) { return value !== '' && value !== null && value !== undefined; })) {
      continue;
    }
    var publishId = fields.publish_id === -1 ? '' : String(row[fields.publish_id] || '');
    var requestId = fields.request_id === -1 ? '' : String(row[fields.request_id] || '');
    var courseKey = fields.course_key === -1 ? '' : String(row[fields.course_key] || '');
    var level = fields.level === -1 ? '' : String(row[fields.level] || '');
    var digest = fields.source_revision_digest === -1 ? '' : String(row[fields.source_revision_digest] || '');
    var status = fields.publish_status === -1 ? '' : String(row[fields.publish_status] || '');
    var latest = fields.is_latest === -1 ? '' : String(row[fields.is_latest]).toLowerCase();
    var fileId = fields.file_id === -1 ? '' : String(row[fields.file_id] || '');
    var metadata = fields.metadata_json === -1 ? '{}' : String(row[fields.metadata_json] || '{}');
    var validMetadata = false;
    try {
      var parsedMetadata = JSON.parse(metadata);
      validMetadata = parsedMetadata && Object.prototype.toString.call(parsedMetadata) === '[object Object]' &&
        Object.keys(parsedMetadata).length === 0;
    } catch (error) {
      validMetadata = false;
    }
    if (!publishId || !requestId || !level || !digest ||
        !Object.prototype.hasOwnProperty.call(SCL_COURSES_, courseKey) ||
        allowedStatuses.indexOf(status) === -1 ||
        ['true', 'false'].indexOf(latest) === -1 ||
        (fileId && !/^[A-Za-z0-9_-]+$/.test(fileId)) || !validMetadata) {
      diagnostics.push({ code: 'STORAGE_INCOMPATIBLE_ROW', row: rowIndex + 2 });
      break;
    }
  }
  return diagnostics;
}

function validateLayoutJson_(layout) {
  if (!layout || Object.prototype.toString.call(layout) !== '[object Object]') { throw new Error('LAYOUT_INVALID'); }
  var allowed = ['schemaVersion', 'blockKey', 'orderIndex', 'imageWidthPercent', 'manualBreak', 'attributes'];
  Object.keys(layout).forEach(function (key) {
    if (allowed.indexOf(key) === -1) { throw new Error('LAYOUT_UNKNOWN_FIELD'); }
  });
  if (layout.schemaVersion !== 'scl-layout/v1' || !/^[a-z_-]+:[a-z0-9:_-]+$/i.test(String(layout.blockKey || ''))) { throw new Error('LAYOUT_IDENTITY_INVALID'); }
  if (!Number.isInteger(layout.orderIndex) || layout.orderIndex < 0 || layout.orderIndex > 1000) { throw new Error('LAYOUT_ORDER_INVALID'); }
  if (layout.imageWidthPercent !== undefined && (!Number.isInteger(layout.imageWidthPercent) || layout.imageWidthPercent < 25 || layout.imageWidthPercent > 100)) { throw new Error('LAYOUT_IMAGE_WIDTH_INVALID'); }
  if (layout.manualBreak !== undefined && typeof layout.manualBreak !== 'boolean') { throw new Error('LAYOUT_BREAK_INVALID'); }
  var attributes = layout.attributes === undefined ? {} : layout.attributes;
  if (!attributes || Object.prototype.toString.call(attributes) !== '[object Object]') { throw new Error('LAYOUT_ATTRIBUTES_INVALID'); }
  Object.keys(attributes).forEach(function (key) {
    if (key === 'keepTogether' && typeof attributes[key] === 'boolean') { return; }
    if (key === 'textStyle' && /^(?:normal|heading1|heading2|bullet|numbered)$/.test(String(attributes[key] || ''))) { return; }
    throw new Error('LAYOUT_ATTRIBUTE_REJECTED');
  });
  if (/<\/?[a-z]|on[a-z]+\s*=|quiz_answers|answer[_-]?key/i.test(JSON.stringify(layout))) { throw new Error('LAYOUT_FORBIDDEN_VALUE'); }
  return layout;
}

function findBlankHeaderWithData_(normalizedHeaders, rows) {
  for (var columnIndex = 0; columnIndex < normalizedHeaders.length; columnIndex += 1) {
    if (normalizedHeaders[columnIndex]) {
      continue;
    }
    var hasData = rows.some(function (row) {
      return row[columnIndex] !== '' && row[columnIndex] !== null && row[columnIndex] !== undefined;
    });
    if (hasData) {
      return columnIndex;
    }
  }
  return -1;
}

function applyStoragePresentation_(sheet) {
  var actions = [];
  if (!sheet.isSheetHidden()) {
    sheet.hideSheet();
    actions.push('hidden');
  }
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  var managedProtection = protections.filter(function (protection) {
    return protection.getDescription() === SCL_PROTECTION_DESCRIPTION_;
  })[0];
  if (!managedProtection) {
    managedProtection = sheet.protect().setDescription(SCL_PROTECTION_DESCRIPTION_);
    managedProtection.setWarningOnly(true);
    actions.push('warning_protection_added');
  }
  return actions;
}

function storageResult_(key, ok, safeMode, diagnostics, actions) {
  return {
    key: key,
    ok: ok,
    safeMode: safeMode,
    diagnostics: diagnostics,
    actions: actions
  };
}

function normalizeHeader_(value) {
  return String(value || '').trim().toLowerCase();
}

function storageHealthForClient_(health) {
  var codes = [];
  health.diagnostics.forEach(function (diagnostic) {
    if (codes.indexOf(diagnostic.code) === -1) {
      codes.push(diagnostic.code);
    }
  });
  return {
    ok: health.ok,
    safeMode: health.safeMode,
    schemaVersion: health.schemaVersion,
    diagnosticCodes: codes
  };
}

function setupGeneratorStorageForOwner_() {
  return verifyGeneratorStorage_({ repair: true });
}
