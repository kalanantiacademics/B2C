var SCL_MAX_LAYOUTS_PER_SESSION_ = 1000;

function attachLevelLayouts_(spreadsheet, project) {
  var managed = managedSheetContext_(spreadsheet, 'layouts');
  var byRow = {};
  managed.records.forEach(function (entry) {
    var rowKey = String(entry.record.row_key || '');
    if (!byRow[rowKey]) { byRow[rowKey] = []; }
    byRow[rowKey].push(validateLayoutJson_(JSON.parse(String(entry.record.layout_json || '{}'))));
  });
  project.sessions.forEach(function (session) {
    session.layouts = normalizeClientLayouts_(byRow[session.rowKey] || []);
    session.sourceRevision = computeSessionRevisionFromBaseWithLayouts_(session.sourceRevision, session.layouts);
  });
  return project;
}

function normalizeClientLayouts_(layouts) {
  if (!Array.isArray(layouts) || layouts.length > SCL_MAX_LAYOUTS_PER_SESSION_) { throw new SclError_('INVALID_PATCH'); }
  var ids = {};
  return layouts.map(function (entry) {
    var layout;
    try {
      layout = validateLayoutJson_(entry);
    } catch (error) {
      throw new SclError_('INVALID_PATCH');
    }
    if (ids[layout.blockKey]) { throw new SclError_('INVALID_PATCH'); }
    ids[layout.blockKey] = true;
    return JSON.parse(JSON.stringify(layout));
  }).sort(function (left, right) { return left.orderIndex - right.orderIndex || left.blockKey.localeCompare(right.blockKey); });
}

function loadSessionLayouts_(spreadsheet, rowKey) {
  return managedSheetContext_(spreadsheet, 'layouts').records.filter(function (entry) {
    return String(entry.record.row_key || '') === rowKey;
  }).map(function (entry) {
    var parsed;
    try { parsed = JSON.parse(String(entry.record.layout_json || '')); } catch (error) { throw new SclError_('STORAGE_UNAVAILABLE'); }
    return validateLayoutJson_(parsed);
  }).sort(function (left, right) { return left.orderIndex - right.orderIndex || left.blockKey.localeCompare(right.blockKey); });
}

function normalizeLayoutsForRevision_(layouts) { return normalizeClientLayouts_(layouts || []); }

function writeSessionLayouts_(context, layouts, editorLabel, timestamp) {
  var managed = managedSheetContext_(context.spreadsheet, 'layouts');
  var existing = managed.records.filter(function (entry) { return String(entry.record.row_key || '') === context.rowKey; });
  var byKey = {}; existing.forEach(function (entry) { byKey[String(entry.record.block_key || '')] = entry; });
  var retained = {};
  layouts.forEach(function (layout) {
    retained[layout.blockKey] = true; var match = byKey[layout.blockKey];
    writeManagedRecord_(managed, match ? match.rowNumber : null, {
      layout_id: match ? String(match.record.layout_id || Utilities.getUuid()) : Utilities.getUuid(),
      row_key: context.rowKey, field: layout.blockKey.split(':')[0], block_key: layout.blockKey,
      order_index: layout.orderIndex, layout_json: JSON.stringify(layout),
      created_at: match ? String(match.record.created_at || isoTimestamp_(timestamp)) : isoTimestamp_(timestamp),
      updated_at: isoTimestamp_(timestamp), updated_by: String(editorLabel || 'Editor')
    });
  });
  existing.forEach(function (entry) { if (!retained[String(entry.record.block_key || '')]) { clearManagedRecord_(managed, entry.rowNumber); } });
}

function computeSessionRevisionWithLayouts_(fields, tables, layouts) {
  return computeSessionRevisionFromBaseWithLayouts_(
    computeSessionRevisionFromBase_(computeSourceRevision_(fields), tables),
    layouts
  );
}

function computeSessionRevisionFromBaseWithLayouts_(sourceRevision, layouts) {
  return hashText_(JSON.stringify({
    sourceRevision: sourceRevision,
    layouts: normalizeLayoutsForRevision_(layouts)
  }));
}
