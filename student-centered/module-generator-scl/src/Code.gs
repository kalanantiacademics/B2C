function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle(SCL_APP_NAME_)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getAppBootstrap() {
  return runRpc_(function () {
    var configState = getConfigurationState_();
    return {
      appName: SCL_APP_NAME_,
      requiresLogin: true,
      configurationStatus: configState.configured ? 'READY' : 'SETUP_REQUIRED'
    };
  });
}

function authenticateEditor(passcode, editorLabel) {
  return runRpc_(function () {
    var session = authenticateEditor_(passcode, editorLabel);
    var bootstrap = buildAuthenticatedBootstrap_(session);
    tryRecordActivity_({
      label: session.editor.label,
      selfDeclared: session.editor.selfDeclared
    }, 'login_success', {}, {
      identityType: session.editor.selfDeclared ? 'self-declared' : 'verified'
    });
    return bootstrap;
  });
}

function resumeEditorSession(token) {
  return runRpc_(function () {
    var payload = validateSessionToken_(token);
    var session = {
      token: token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      editor: {
        label: payload.label,
        email: payload.email || '',
        selfDeclared: Boolean(payload.selfDeclared)
      }
    };
    var bootstrap = buildAuthenticatedBootstrap_(session);
    tryRecordActivity_(payload, 'session_resume', {}, {
      identityType: payload.selfDeclared ? 'self-declared' : 'verified'
    });
    return bootstrap;
  });
}

function getAuthenticatedBootstrap(token) {
  return resumeEditorSession(token);
}

function logoutEditor(token) {
  return runRpc_(function () {
    var payload = validateSessionToken_(token);
    tryRecordActivity_(payload, 'logout');
    revokeSession_(token);
    return { loggedOut: true };
  });
}

function listCoursesAndLevels(token) {
  return runRpc_(function () {
    validateSessionToken_(token);
    return listCoursesAndLevels_(requireConfiguration_());
  });
}

function loadLevelProject(token, courseKey, level) {
  return runRpc_(function () {
    var payload = validateSessionToken_(token);
    var course = resolveCourse_(courseKey);
    var project = loadLevelProject_(requireConfiguration_(), course, level);
    tryRecordActivity_(payload, 'project_open', {
      courseKey: course.key,
      level: project.level
    });
    return project;
  });
}

function listActivity(token, request) {
  return runRpc_(function () {
    return listActivity_(validateSessionToken_(token), request);
  });
}

function recordComposeAttempt(token, courseKey, level, result) {
  return runRpc_(function () {
    var payload = validateSessionToken_(token);
    var normalized = result && Object.prototype.toString.call(result) === '[object Object]' ? result : {};
    recordActivityEvent_(payload, 'compose', {
      courseKey: courseKey,
      level: level
    }, {
      pageCount: Number(normalized.pageCount) || 0,
      blockingCount: Number(normalized.blockingCount) || 0,
      warningCount: Number(normalized.warningCount) || 0
    }, normalized.ready ? 'SUCCESS' : 'FAILED', normalized.ready ? '' : 'PREFLIGHT_BLOCKED');
    return { recorded: true };
  });
}

function listPublishedModules(token, request) {
  return runRpc_(function () {
    return listPublishedModules_(validateSessionToken_(token), request);
  });
}

function getDrivePublishingCapability(token) {
  return runRpc_(function () {
    return getDrivePublishingCapability_(validateSessionToken_(token));
  });
}

function preflightImages(token, urls) {
  return runRpc_(function () {
    validateSessionToken_(token);
    return { images: preflightImages_(requireConfiguration_(), urls) };
  });
}

function acquireSessionLease(token, courseKey, level, session) {
  return runRpc_(function () {
    return acquireSessionLease_(validateSessionToken_(token), courseKey, level, session);
  });
}

function resumeSessionLease(token, leaseToken, editSessionId, courseKey, level, session) {
  return runRpc_(function () {
    return resumeSessionLease_(
      validateSessionToken_(token),
      leaseToken,
      editSessionId,
      courseKey,
      level,
      session
    );
  });
}

function heartbeatSessionLease(token, leaseToken, courseKey, level, session) {
  return runRpc_(function () {
    return heartbeatSessionLease_(validateSessionToken_(token), leaseToken, courseKey, level, session);
  });
}

function releaseSessionLease(token, leaseToken, courseKey, level, session) {
  return runRpc_(function () {
    return releaseSessionLease_(validateSessionToken_(token), leaseToken, courseKey, level, session);
  });
}

function saveSessionPatch(token, leaseToken, request) {
  return runRpc_(function () {
    return saveSessionPatch_(validateSessionToken_(token), leaseToken, request);
  });
}

function getSessionHistory(token, courseKey, level, session) {
  return runRpc_(function () {
    validateSessionToken_(token);
    return getSessionHistory_(courseKey, level, session);
  });
}

function restoreSessionRevision(token, leaseToken, request) {
  return runRpc_(function () {
    return restoreSessionRevision_(validateSessionToken_(token), leaseToken, request);
  });
}

function buildAuthenticatedBootstrap_(session) {
  var config = requireConfiguration_();
  var health = verifyGeneratorStorage_({ repair: true });
  return {
    session: session,
    courses: getPublicCourseCatalog_(),
    storage: storageHealthForClient_(health),
    ssotUrl: 'https://docs.google.com/spreadsheets/d/' + config.spreadsheetId + '/edit?rm=minimal',
    ssotExternalUrl: 'https://docs.google.com/spreadsheets/d/' + config.spreadsheetId + '/edit',
    phase: {
      key: 'v2-p4',
      label: 'Drive publishing foundation',
      next: 'Sidebar, activity history, publish registry, dan fondasi Drive siap digunakan.'
    }
  };
}

function tryRecordActivity_(sessionPayload, eventType, context, metadata, status, errorCode) {
  try {
    if (typeof recordActivityEvent_ === 'function') {
      recordActivityEvent_(sessionPayload, eventType, context, metadata, status, errorCode);
    }
  } catch (error) {
    // Audit availability must not invalidate an otherwise safe authenticated action.
  }
}
