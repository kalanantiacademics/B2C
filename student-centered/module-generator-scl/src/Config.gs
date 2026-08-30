var SCL_APP_NAME_ = 'Kalananti SCL Module Generator';
var SCL_SCHEMA_VERSION_ = 'scl-generator/v1';
var SCL_DEFAULT_SESSION_TTL_SECONDS_ = 43200;
var SCL_MAX_SESSION_TTL_SECONDS_ = 43200;
var SCL_DEFAULT_LEASE_SECONDS_ = 120;

var SCL_CONFIG_KEYS_ = Object.freeze({
  spreadsheetId: 'SCL_SPREADSHEET_ID',
  passwordSalt: 'SCL_PASSWORD_SALT',
  passwordHash: 'SCL_PASSWORD_HASH',
  signingSecret: 'SCL_SESSION_SIGNING_SECRET',
  imageMaxBytes: 'SCL_IMAGE_MAX_BYTES',
  driveFolderId: 'SCL_DRIVE_FOLDER_ID',
  sessionTtlSeconds: 'SCL_SESSION_TTL_SECONDS',
  leaseSeconds: 'SCL_LEASE_SECONDS',
  tocMaxIterations: 'SCL_TOC_MAX_ITERATIONS',
  topicMaxChars: 'SCL_TOPIC_MAX_CHARS'
});

var SCL_REQUIRED_CONFIG_KEYS_ = Object.freeze([
  SCL_CONFIG_KEYS_.spreadsheetId,
  SCL_CONFIG_KEYS_.passwordSalt,
  SCL_CONFIG_KEYS_.passwordHash,
  SCL_CONFIG_KEYS_.signingSecret,
  SCL_CONFIG_KEYS_.imageMaxBytes
]);

var SCL_COURSES_ = Object.freeze({
  roblox: Object.freeze({
    key: 'roblox',
    sheetName: 'B2C_RobloxStudio_Modul',
    label: 'Roblox Studio',
    coverLabel: 'ROBLOX STUDIO'
  }),
  scratch: Object.freeze({
    key: 'scratch',
    sheetName: 'B2C_Scratch_Modul',
    label: 'Scratch',
    coverLabel: 'SCRATCH'
  }),
  python: Object.freeze({
    key: 'python',
    sheetName: 'B2C_Python_Modul',
    label: 'Python',
    coverLabel: 'PYTHON'
  })
});

function getConfigurationState_() {
  var properties = PropertiesService.getScriptProperties().getProperties();
  var missing = SCL_REQUIRED_CONFIG_KEYS_.filter(function (key) {
    return !String(properties[key] || '').trim();
  });
  var invalid = [];

  if (properties[SCL_CONFIG_KEYS_.imageMaxBytes]) {
    validateIntegerProperty_(properties, SCL_CONFIG_KEYS_.imageMaxBytes, 65536, 26214400, invalid);
  }
  validateIntegerProperty_(properties, SCL_CONFIG_KEYS_.sessionTtlSeconds, 300, SCL_MAX_SESSION_TTL_SECONDS_, invalid, true);
  validateIntegerProperty_(properties, SCL_CONFIG_KEYS_.leaseSeconds, 60, 600, invalid, true);
  validateIntegerProperty_(properties, SCL_CONFIG_KEYS_.tocMaxIterations, 1, 10, invalid, true);
  validateIntegerProperty_(properties, SCL_CONFIG_KEYS_.topicMaxChars, 20, 240, invalid, true);

  return {
    configured: missing.length === 0 && invalid.length === 0,
    missingProperties: missing,
    invalidProperties: invalid,
    values: properties
  };
}

function validateIntegerProperty_(properties, key, minimum, maximum, invalid, optional) {
  var raw = properties[key];
  if ((raw === undefined || raw === null || raw === '') && optional) {
    return;
  }
  var value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    invalid.push(key);
  }
}

function requireConfiguration_() {
  var state = getConfigurationState_();
  if (!state.configured) {
    throw new SclError_('CONFIGURATION_REQUIRED');
  }
  return {
    spreadsheetId: state.values[SCL_CONFIG_KEYS_.spreadsheetId],
    passwordSalt: state.values[SCL_CONFIG_KEYS_.passwordSalt],
    passwordHash: state.values[SCL_CONFIG_KEYS_.passwordHash],
    signingSecret: state.values[SCL_CONFIG_KEYS_.signingSecret],
    imageMaxBytes: Number(state.values[SCL_CONFIG_KEYS_.imageMaxBytes]),
    sessionTtlSeconds: readIntegerDefault_(state.values, SCL_CONFIG_KEYS_.sessionTtlSeconds, SCL_DEFAULT_SESSION_TTL_SECONDS_),
    leaseSeconds: readIntegerDefault_(state.values, SCL_CONFIG_KEYS_.leaseSeconds, SCL_DEFAULT_LEASE_SECONDS_),
    tocMaxIterations: readIntegerDefault_(state.values, SCL_CONFIG_KEYS_.tocMaxIterations, 5),
    topicMaxChars: readIntegerDefault_(state.values, SCL_CONFIG_KEYS_.topicMaxChars, 80),
    driveFolderId: String(state.values[SCL_CONFIG_KEYS_.driveFolderId] || '').trim()
  };
}

function readIntegerDefault_(properties, key, fallback) {
  var value = Number(properties[key]);
  return Number.isInteger(value) ? value : fallback;
}

function resolveCourse_(courseKey) {
  if (typeof courseKey !== 'string' || !Object.prototype.hasOwnProperty.call(SCL_COURSES_, courseKey)) {
    throw new SclError_('UNKNOWN_COURSE');
  }
  return SCL_COURSES_[courseKey];
}

function getPublicCourseCatalog_() {
  return Object.keys(SCL_COURSES_).map(function (key) {
    return {
      key: SCL_COURSES_[key].key,
      label: SCL_COURSES_[key].label,
      coverLabel: SCL_COURSES_[key].coverLabel
    };
  });
}
