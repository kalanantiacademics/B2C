var SCL_AUTH_VERSION_ = 1;
var SCL_LOGIN_LIMIT_ = 5;
var SCL_LOGIN_WINDOW_SECONDS_ = 300;
var SCL_REVOKED_TOKEN_PREFIX_ = 'scl_revoked_';

function authenticateEditor_(passcode, editorLabel, nowSeconds) {
  var config = requireConfiguration_();
  var normalizedPasscode = requireString_(passcode, 'passcode', 256);
  var rateKey = getLoginRateKey_();
  enforceLoginRateLimit_(rateKey);

  var expectedHash = String(config.passwordHash);
  var actualHash = derivePasscodeHash_(normalizedPasscode, config.passwordSalt);
  if (!constantTimeEquals_(actualHash, expectedHash)) {
    recordLoginFailure_(rateKey);
    try {
      if (typeof recordFailedLoginAggregate_ === 'function') {
        recordFailedLoginAggregate_();
      }
    } catch (error) {
      // Authentication failure reporting must never weaken or change the auth response.
    }
    throw new SclError_('AUTHENTICATION_FAILED', null, false, {
      retryAfterSeconds: SCL_LOGIN_WINDOW_SECONDS_
    });
  }

  clearLoginFailures_(rateKey);
  var identity = resolveEditorIdentity_(editorLabel);
  var issuedAt = Number.isFinite(nowSeconds) ? Math.floor(nowSeconds) : Math.floor(Date.now() / 1000);
  var expiresAt = issuedAt + Math.min(config.sessionTtlSeconds, SCL_MAX_SESSION_TTL_SECONDS_);
  var payload = {
    v: SCL_AUTH_VERSION_,
    sid: Utilities.getUuid(),
    iat: issuedAt,
    exp: expiresAt,
    label: identity.label,
    email: identity.email,
    selfDeclared: identity.selfDeclared
  };

  return {
    token: signSessionPayload_(payload, config.signingSecret),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    editor: identity
  };
}

function validateSessionToken_(token, nowSeconds) {
  var config = requireConfiguration_();
  var normalizedToken = requireString_(token, 'token', 4096);
  var parts = normalizedToken.split('.');
  if (parts.length !== 2) {
    throw new SclError_('SESSION_INVALID');
  }

  var expectedSignature = signValue_(parts[0], config.signingSecret);
  if (!constantTimeEquals_(parts[1], expectedSignature)) {
    throw new SclError_('SESSION_INVALID');
  }

  var payload;
  try {
    payload = JSON.parse(decodeWebSafeText_(parts[0]));
  } catch (error) {
    throw new SclError_('SESSION_INVALID');
  }

  if (!payload || payload.v !== SCL_AUTH_VERSION_ || !payload.sid || !payload.exp || !payload.iat) {
    throw new SclError_('SESSION_INVALID');
  }
  if (payload.exp - payload.iat > SCL_MAX_SESSION_TTL_SECONDS_) {
    throw new SclError_('SESSION_INVALID');
  }

  var current = Number.isFinite(nowSeconds) ? Math.floor(nowSeconds) : Math.floor(Date.now() / 1000);
  if (current >= payload.exp) {
    throw new SclError_('SESSION_EXPIRED');
  }
  if (isSessionRevoked_(payload.sid)) {
    throw new SclError_('SESSION_INVALID');
  }
  return payload;
}

function revokeSession_(token) {
  var payload = validateSessionToken_(token);
  var remaining = Math.max(1, payload.exp - Math.floor(Date.now() / 1000));
  CacheService.getScriptCache().put(SCL_REVOKED_TOKEN_PREFIX_ + hashText_(payload.sid), '1', remaining);
}

function isSessionRevoked_(sessionId) {
  return CacheService.getScriptCache().get(SCL_REVOKED_TOKEN_PREFIX_ + hashText_(sessionId)) === '1';
}

function resolveEditorIdentity_(editorLabel) {
  var activeEmail = '';
  try {
    activeEmail = String(Session.getActiveUser().getEmail() || '').trim();
  } catch (error) {
    activeEmail = '';
  }
  if (activeEmail) {
    return {
      label: activeEmail,
      email: activeEmail,
      selfDeclared: false
    };
  }
  if (typeof editorLabel !== 'string' || !editorLabel.trim()) {
    throw new SclError_('EDITOR_LABEL_REQUIRED');
  }
  return {
    label: requireString_(editorLabel, 'editorLabel', 120),
    email: '',
    selfDeclared: true
  };
}

function signSessionPayload_(payload, signingSecret) {
  var encodedPayload = encodeWebSafeText_(JSON.stringify(payload));
  return encodedPayload + '.' + signValue_(encodedPayload, signingSecret);
}

function signValue_(value, key) {
  return stripBase64Padding_(Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(value, key, Utilities.Charset.UTF_8)
  ));
}

function derivePasscodeHash_(passcode, salt) {
  return signValue_('scl-passcode-v1\u0000' + passcode, salt);
}

function encodeWebSafeText_(value) {
  return stripBase64Padding_(Utilities.base64EncodeWebSafe(value, Utilities.Charset.UTF_8));
}

function decodeWebSafeText_(value) {
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(value)).getDataAsString('UTF-8');
}

function stripBase64Padding_(value) {
  return String(value).replace(/=+$/g, '');
}

function constantTimeEquals_(left, right) {
  var a = String(left || '');
  var b = String(right || '');
  var length = Math.max(a.length, b.length);
  var mismatch = a.length ^ b.length;
  for (var index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function hashText_(value) {
  return stripBase64Padding_(Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8)
  ));
}

function getLoginRateKey_() {
  var identity = 'anonymous';
  try {
    identity = Session.getTemporaryActiveUserKey() || identity;
  } catch (error) {
    identity = 'anonymous';
  }
  return 'scl_login_' + hashText_(identity);
}

function enforceLoginRateLimit_(rateKey) {
  var entry = readRateEntry_(rateKey);
  if (entry.count >= SCL_LOGIN_LIMIT_) {
    throw new SclError_('AUTHENTICATION_FAILED', null, false, {
      retryAfterSeconds: SCL_LOGIN_WINDOW_SECONDS_
    });
  }
}

function recordLoginFailure_(rateKey) {
  var cache = CacheService.getScriptCache();
  var entry = readRateEntry_(rateKey);
  cache.put(rateKey, JSON.stringify({ count: entry.count + 1 }), SCL_LOGIN_WINDOW_SECONDS_);
}

function clearLoginFailures_(rateKey) {
  CacheService.getScriptCache().remove(rateKey);
}

function readRateEntry_(rateKey) {
  var raw = CacheService.getScriptCache().get(rateKey);
  if (!raw) {
    return { count: 0 };
  }
  try {
    var entry = JSON.parse(raw);
    return { count: Number(entry.count) || 0 };
  } catch (error) {
    return { count: 0 };
  }
}
