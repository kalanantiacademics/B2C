var SCL_DRIVE_FOLDER_MIME_ = 'application/vnd.google-apps.folder';
var SCL_PDF_MIME_ = 'application/pdf';
var SCL_DRIVE_FIXTURE_MAX_BYTES_ = 1048576;
var SCL_DRIVE_FIXTURE_PURPOSE_ = 'drive-foundation-v2';
var SCL_DRIVE_FIXTURE_REQUEST_ID_ = 'v2-p4-drive-foundation-fixture';

function getDrivePublishingCapability_(sessionPayload) {
  if (!sessionPayload || !sessionPayload.label) {
    throw new SclError_('SESSION_INVALID');
  }
  var state = getConfigurationState_();
  var folderId = String(state.values[SCL_CONFIG_KEYS_.driveFolderId] || '').trim();
  if (!folderId) {
    return { configured: false, accessible: false, canAddChildren: false, sharedDrive: false };
  }
  var capability = inspectDriveFolderCapability_(folderId);
  return {
    configured: true,
    accessible: capability.accessible,
    canAddChildren: capability.canAddChildren,
    sharedDrive: capability.sharedDrive
  };
}

function configureDrivePublishingForOwner(folderId) {
  return runRpc_(function () {
    requireDeploymentOwnerExecution_();
    var normalizedFolderId = requireString_(folderId, 'folderId', 256);
    if (!/^[A-Za-z0-9_-]+$/.test(normalizedFolderId)) {
      throw new SclError_('INVALID_REQUEST');
    }
    var capability = inspectDriveFolderCapability_(normalizedFolderId);
    if (!capability.accessible || !capability.canAddChildren) {
      throw new SclError_('DRIVE_PERMISSION_REQUIRED');
    }
    PropertiesService.getScriptProperties().setProperty(SCL_CONFIG_KEYS_.driveFolderId, normalizedFolderId);
    return {
      configured: true,
      accessible: true,
      canAddChildren: true,
      sharedDrive: capability.sharedDrive
    };
  });
}

function runDriveFoundationFixtureForOwner() {
  return runRpc_(function () {
    var owner = requireDeploymentOwnerExecution_();
    var config = requireConfiguration_();
    var rootFolderId = requireDriveFolderId_();
    var capability = inspectDriveFolderCapability_(rootFolderId);
    if (!capability.accessible || !capability.canAddChildren) {
      throw new SclError_('DRIVE_PERMISSION_REQUIRED');
    }
    var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    var reservation = reservePublishVersion_(spreadsheet, {
      label: owner,
      selfDeclared: false
    }, {
      requestId: SCL_DRIVE_FIXTURE_REQUEST_ID_,
      courseKey: 'roblox',
      level: 'fixture'
    }, hashText_(SCL_DRIVE_FIXTURE_PURPOSE_), Date.now());
    if (reservation.status === 'PUBLISHED') {
      return fixtureResult_(reservation, true, capability.sharedDrive);
    }
    try {
      var fixtureFolderId = findOrCreateFixtureFolder_(rootFolderId);
      var existingFile = findDriveFixtureFile_(fixtureFolderId, reservation.publishId);
      if (existingFile) {
        var reconciled = finalizePublish_(spreadsheet, reservation.publishId, {
          fileId: existingFile.id,
          fileName: existingFile.name,
          pageCount: 1,
          fileSizeBytes: Number(existingFile.size),
          rendererVersion: 'synthetic-pdf-v1'
        }, Date.now());
        return fixtureResult_(reconciled, true, capability.sharedDrive);
      }
      setPublishStage_(spreadsheet, reservation.publishId, 'UPLOADING', Date.now());
      var blob = buildSyntheticFixturePdf_();
      validateDriveUploadBlob_(blob, SCL_DRIVE_FIXTURE_MAX_BYTES_);
      var created = Drive.Files.create({
        name: 'Kalananti-SCL-V2-Drive-Foundation-Fixture.pdf',
        mimeType: SCL_PDF_MIME_,
        parents: [fixtureFolderId],
        appProperties: {
          sclPublishId: reservation.publishId,
          sclFixturePurpose: SCL_DRIVE_FIXTURE_PURPOSE_
        }
      }, blob, {
        supportsAllDrives: true,
        fields: 'id,name,mimeType,size,appProperties'
      });
      var verified = Drive.Files.get(created.id, {
        supportsAllDrives: true,
        fields: 'id,name,mimeType,size,appProperties'
      });
      if (String(verified.mimeType || '') !== SCL_PDF_MIME_ || Number(verified.size) < 1) {
        throw new SclError_('DRIVE_FILE_INVALID');
      }
      var completed = finalizePublish_(spreadsheet, reservation.publishId, {
        fileId: verified.id,
        fileName: verified.name,
        pageCount: 1,
        fileSizeBytes: Number(verified.size),
        rendererVersion: 'synthetic-pdf-v1'
      }, Date.now());
      return fixtureResult_(completed, false, capability.sharedDrive);
    } catch (error) {
      var safeError = normalizeDrivePublisherError_(error);
      failPublish_(spreadsheet, reservation.publishId, safeError.code, Date.now());
      throw safeError;
    }
  });
}

function runV2P4OwnerSetupAndFixture() {
  var setup = runRpc_(function () {
    requireDeploymentOwnerExecution_();
    var health = verifyGeneratorStorage_({ repair: true });
    if (!health.ok || health.safeMode) {
      throw new SclError_('STORAGE_UNAVAILABLE', null, false, {
        diagnosticCodes: storageHealthForClient_(health).diagnosticCodes
      });
    }
    return { storageReady: true };
  });
  if (!setup.ok) {
    logV2P4OwnerResult_(setup);
    return setup;
  }
  var fixture = runDriveFoundationFixtureForOwner();
  var result = fixture.ok ? {
    ok: true,
    data: Object.assign({ storageReady: true }, fixture.data)
  } : fixture;
  logV2P4OwnerResult_(result);
  return result;
}

function logV2P4OwnerResult_(result) {
  if (typeof console === 'undefined' || typeof console.log !== 'function') {
    return;
  }
  console.log('SCL_V2_P4_SAFE_RESULT ' + JSON.stringify(result));
}

function normalizeDrivePublisherError_(error) {
  if (error && ['DRIVE_FILE_INVALID', 'DRIVE_PERMISSION_REQUIRED', 'DRIVE_UNAVAILABLE'].indexOf(error.code) !== -1) {
    return error;
  }
  return new SclError_('DRIVE_UPLOAD_FAILED');
}

function validateDriveUploadBlob_(blob, maximumBytes) {
  if (!blob || typeof blob.getBytes !== 'function' ||
      typeof blob.getContentType !== 'function' || blob.getContentType() !== SCL_PDF_MIME_) {
    throw new SclError_('DRIVE_FILE_INVALID');
  }
  var byteLength = blob.getBytes().length;
  if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > maximumBytes) {
    throw new SclError_('DRIVE_FILE_INVALID');
  }
  return byteLength;
}

function inspectDriveFolderCapability_(folderId) {
  try {
    var folder = Drive.Files.get(folderId, {
      supportsAllDrives: true,
      fields: 'id,mimeType,driveId,capabilities(canAddChildren)'
    });
    return {
      accessible: String(folder.mimeType || '') === SCL_DRIVE_FOLDER_MIME_,
      canAddChildren: Boolean(folder.capabilities && folder.capabilities.canAddChildren),
      sharedDrive: Boolean(folder.driveId)
    };
  } catch (error) {
    console.error('SCL_DRIVE_CAPABILITY_ERROR');
    throw new SclError_('DRIVE_UNAVAILABLE');
  }
}

function requireDriveFolderId_() {
  var properties = getConfigurationState_().values;
  var folderId = String(properties[SCL_CONFIG_KEYS_.driveFolderId] || '').trim();
  if (!folderId) {
    throw new SclError_('DRIVE_NOT_CONFIGURED');
  }
  return folderId;
}

function requireDeploymentOwnerExecution_() {
  var active = '';
  var effective = '';
  try {
    active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    effective = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  } catch (error) {
    throw new SclError_('OWNER_ONLY');
  }
  if (!active || !effective || active !== effective) {
    throw new SclError_('OWNER_ONLY');
  }
  return active;
}

function findOrCreateFixtureFolder_(rootFolderId) {
  var query = "trashed = false and mimeType = '" + SCL_DRIVE_FOLDER_MIME_ + "' and '" +
    escapeDriveQueryLiteral_(rootFolderId) + "' in parents and appProperties has { key='sclFixturePurpose' and value='" +
    SCL_DRIVE_FIXTURE_PURPOSE_ + "' }";
  var listed = Drive.Files.list({
    q: query,
    spaces: 'drive',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 10,
    fields: 'files(id)'
  });
  if (listed.files && listed.files.length) {
    return String(listed.files[0].id);
  }
  var folder = Drive.Files.create({
    name: 'SCL Generator V2 - Temporary Fixtures',
    mimeType: SCL_DRIVE_FOLDER_MIME_,
    parents: [rootFolderId],
    appProperties: { sclFixturePurpose: SCL_DRIVE_FIXTURE_PURPOSE_ }
  }, null, {
    supportsAllDrives: true,
    fields: 'id'
  });
  return String(folder.id);
}

function findDriveFixtureFile_(folderId, publishId) {
  var query = "trashed = false and mimeType = '" + SCL_PDF_MIME_ + "' and '" +
    escapeDriveQueryLiteral_(folderId) + "' in parents and appProperties has { key='sclPublishId' and value='" +
    escapeDriveQueryLiteral_(publishId) + "' }";
  var listed = Drive.Files.list({
    q: query,
    spaces: 'drive',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 10,
    fields: 'files(id,name,mimeType,size,appProperties)'
  });
  return listed.files && listed.files.length ? listed.files[0] : null;
}

function buildSyntheticFixturePdf_() {
  var stream = 'BT\n/F1 18 Tf\n72 770 Td\n(Kalananti SCL V2 Drive Foundation Fixture) Tj\n0 -28 Td\n/F1 11 Tf\n(Synthetic non-production artifact - one A4 page) Tj\nET\n';
  var objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  var pdf = '%PDF-1.4\n';
  var offsets = [0];
  objects.forEach(function (object, index) {
    offsets.push(pdf.length);
    pdf += String(index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  });
  var xrefOffset = pdf.length;
  pdf += 'xref\n0 ' + String(objects.length + 1) + '\n0000000000 65535 f \n';
  offsets.slice(1).forEach(function (offset) {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += 'trailer\n<< /Size ' + String(objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' +
    String(xrefOffset) + '\n%%EOF\n';
  return Utilities.newBlob(pdf, SCL_PDF_MIME_, 'Kalananti-SCL-V2-Drive-Foundation-Fixture.pdf');
}

function escapeDriveQueryLiteral_(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function fixtureResult_(publish, duplicate, sharedDrive) {
  return {
    created: !duplicate,
    duplicate: Boolean(duplicate),
    status: publish.status,
    version: publish.version,
    pageCount: publish.pageCount,
    fileSizeBytes: publish.fileSizeBytes,
    sharedDrive: Boolean(sharedDrive)
  };
}
