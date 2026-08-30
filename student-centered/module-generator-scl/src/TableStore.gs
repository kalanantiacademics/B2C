var SCL_TABLE_SCHEMA_VERSION_ = 'scl-table/v1';
var SCL_MAX_TABLES_PER_SESSION_ = 50;
var SCL_MAX_TABLE_ROWS_ = 200;
var SCL_MAX_TABLE_COLUMNS_ = 20;
var SCL_MAX_TABLE_CELL_LENGTH_ = 5000;

function attachLevelTables_(spreadsheet, project) {
  var managed;
  try {
    managed = managedSheetContext_(spreadsheet, 'tables');
  } catch (error) {
    project.diagnostics.push({ code: 'TABLE_STORAGE_UNAVAILABLE', severity: 'BLOCKING' });
    return project;
  }
  var recordsByRowKey = {};
  managed.records.forEach(function (entry) {
    var rowKey = String(entry.record.row_key || '');
    if (!recordsByRowKey[rowKey]) {
      recordsByRowKey[rowKey] = [];
    }
    recordsByRowKey[rowKey].push(entry.record);
  });
  project.sessions.forEach(function (session) {
    if (!session.rowKey) {
      return;
    }
    var anchors = materialAnchorHashes_(session.fields && session.fields.materials);
    session.tables = (recordsByRowKey[session.rowKey] || []).map(function (record) {
      var table = normalizeStoredTableRecord_(record);
      table.anchorStatus = anchors.indexOf(table.anchorHash) === -1 ? 'STALE' : 'RESOLVED';
      if (table.anchorStatus === 'STALE') {
        table.warning = 'TABLE_ANCHOR_STALE';
        session.warnings.push({ code: 'TABLE_ANCHOR_STALE', severity: 'BLOCKING', tableId: table.tableId });
      }
      return table;
    }).sort(function (left, right) {
      return left.orderIndex - right.orderIndex || left.tableId.localeCompare(right.tableId);
    });
    session.sourceRevision = computeSessionRevisionFromBase_(session.sourceRevision, session.tables);
  });
  return project;
}

function loadSessionTables_(spreadsheet, rowKey, materialsModel) {
  var context = managedSheetContext_(spreadsheet, 'tables');
  var anchors = materialAnchorHashes_(materialsModel);
  return context.records.filter(function (entry) {
    return String(entry.record.row_key || '') === rowKey;
  }).map(function (entry) {
    var table = normalizeStoredTableRecord_(entry.record);
    table.anchorStatus = anchors.indexOf(table.anchorHash) === -1 ? 'STALE' : 'RESOLVED';
    if (table.anchorStatus === 'STALE') {
      table.warning = 'TABLE_ANCHOR_STALE';
    }
    return table;
  }).sort(function (left, right) {
    return left.orderIndex - right.orderIndex || left.tableId.localeCompare(right.tableId);
  });
}

function normalizeStoredTableRecord_(record) {
  var parsed;
  try {
    parsed = JSON.parse(String(record.table_json || ''));
  } catch (error) {
    throw new SclError_('TABLE_STORAGE_CORRUPT');
  }
  var normalized = normalizeTablePayload_(parsed);
  return {
    tableId: requireString_(record.table_id, 'tableId', 120),
    field: String(record.field || ''),
    orderIndex: normalizeTableOrderIndex_(record.order_index),
    anchorHash: requireString_(record.anchor_hash, 'anchorHash', 120),
    table: normalized
  };
}

function normalizeClientTables_(tables) {
  if (!Array.isArray(tables) || tables.length > SCL_MAX_TABLES_PER_SESSION_) {
    throw new SclError_('INVALID_TABLE');
  }
  var ids = {};
  return tables.map(function (entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new SclError_('INVALID_TABLE');
    }
    var tableId = requireString_(entry.tableId, 'tableId', 120);
    if (ids[tableId]) {
      throw new SclError_('INVALID_TABLE');
    }
    ids[tableId] = true;
    var field = String(entry.field || 'materials');
    if (field !== 'materials') {
      throw new SclError_('INVALID_TABLE');
    }
    return {
      tableId: tableId,
      field: field,
      orderIndex: normalizeTableOrderIndex_(entry.orderIndex),
      anchorHash: requireString_(entry.anchorHash, 'anchorHash', 120),
      table: normalizeTablePayload_(entry.table)
    };
  }).sort(function (left, right) {
    return left.orderIndex - right.orderIndex || left.tableId.localeCompare(right.tableId);
  });
}

function normalizeTablePayload_(table) {
  if (!table || typeof table !== 'object' || Array.isArray(table) ||
      table.schemaVersion !== SCL_TABLE_SCHEMA_VERSION_ || !Array.isArray(table.headers) ||
      !Array.isArray(table.rows) || table.headers.length < 1 ||
      table.headers.length > SCL_MAX_TABLE_COLUMNS_ || table.rows.length > SCL_MAX_TABLE_ROWS_) {
    throw new SclError_('INVALID_TABLE');
  }
  var columnCount = table.headers.length;
  var headers = table.headers.map(normalizeTableCell_);
  var rows = table.rows.map(function (row) {
    if (!Array.isArray(row) || row.length !== columnCount) {
      throw new SclError_('INVALID_TABLE');
    }
    return row.map(normalizeTableCell_);
  });
  var alignments = Array.isArray(table.alignments) ? table.alignments.map(function (alignment) {
    var value = String(alignment || 'left').toLowerCase();
    return ['left', 'center', 'right'].indexOf(value) === -1 ? 'left' : value;
  }) : [];
  while (alignments.length < columnCount) {
    alignments.push('left');
  }
  return {
    schemaVersion: SCL_TABLE_SCHEMA_VERSION_,
    caption: normalizeTableCell_(table.caption || ''),
    headers: headers,
    rows: rows,
    alignments: alignments.slice(0, columnCount)
  };
}

function normalizeTableCell_(value) {
  var cell = normalizeCellText_(value).replace(/[\r\n]+/g, ' ').trim();
  if (cell.length > SCL_MAX_TABLE_CELL_LENGTH_) {
    throw new SclError_('INVALID_TABLE');
  }
  return cell;
}

function normalizeTableOrderIndex_(value) {
  var index = Number(value);
  if (!Number.isInteger(index) || index < 0 || index > 100000) {
    throw new SclError_('INVALID_TABLE');
  }
  return index;
}

function materialAnchorHashes_(model) {
  return String(model && model.text || '').split('\n').map(function (line) {
    return tableAnchorHash_(line);
  }).filter(function (hash) { return Boolean(hash); });
}

function tableAnchorHash_(text) {
  var value = normalizeCellText_(text).trim();
  if (!value || value === '[[SCL_PAGE_BREAK]]' || /^(?:kc|fyk)\d+\*$/i.test(value) ||
      /^https:\/\/\S+$/i.test(value)) {
    return '';
  }
  var hash = 2166136261;
  for (var index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'fnv1a32:' + ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}

function computeSessionRevision_(fields, tables) {
  return computeSessionRevisionFromBase_(computeSourceRevision_(fields), tables);
}

function computeSessionRevisionFromBase_(sourceRevision, tables) {
  return hashText_(JSON.stringify({ sourceRevision: sourceRevision, tables: normalizeTablesForRevision_(tables) }));
}

function normalizeTablesForRevision_(tables) {
  return (tables || []).map(function (entry) {
    return {
      tableId: entry.tableId,
      field: entry.field,
      orderIndex: entry.orderIndex,
      anchorHash: entry.anchorHash,
      table: entry.table
    };
  });
}

function writeSessionTables_(context, tables, editorLabel, timestamp) {
  var managed = managedSheetContext_(context.spreadsheet, 'tables');
  var existing = managed.records.filter(function (entry) {
    return String(entry.record.row_key || '') === context.rowKey;
  });
  var existingById = {};
  existing.forEach(function (entry) { existingById[String(entry.record.table_id || '')] = entry; });
  var retained = {};
  tables.forEach(function (entry) {
    retained[entry.tableId] = true;
    var match = existingById[entry.tableId];
    writeManagedRecord_(managed, match ? match.rowNumber : null, {
      table_id: entry.tableId,
      row_key: context.rowKey,
      field: entry.field,
      order_index: entry.orderIndex,
      anchor_hash: entry.anchorHash,
      table_json: JSON.stringify(entry.table),
      created_at: match ? String(match.record.created_at || isoTimestamp_(timestamp)) : isoTimestamp_(timestamp),
      updated_at: isoTimestamp_(timestamp),
      updated_by: String(editorLabel || 'Editor')
    });
  });
  existing.forEach(function (entry) {
    if (!retained[String(entry.record.table_id || '')]) {
      clearManagedRecord_(managed, entry.rowNumber);
    }
  });
}
