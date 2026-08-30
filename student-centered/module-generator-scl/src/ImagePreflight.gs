var SCL_IMAGE_MAX_REDIRECTS_ = 3;
var SCL_IMAGE_ALLOWED_MIME_ = Object.freeze({
  'image/png': true,
  'image/jpeg': true,
  'image/jpg': true,
  'image/pjpeg': true,
  'image/x-png': true,
  'image/webp': true,
  'image/gif': true,
  'image/svg+xml': true
});

function preflightImages_(config, urls) {
  if (!Array.isArray(urls) || urls.length > 100) {
    throw new SclError_('INVALID_REQUEST');
  }
  return urls.map(function (url, index) {
    try {
      var result = fetchImageMetadata_(config, requireString_(url, 'imageUrl', 2048), 0);
      result.index = index;
      return result;
    } catch (error) {
      return {
        index: index,
        ok: false,
        code: classifyImagePreflightError_(error)
      };
    }
  });
}

function classifyImagePreflightError_(error) {
  if (error && error.code) {
    return String(error.code);
  }
  var message = String(error && error.message || error || '');
  if (/script\.external_request|permission to call UrlFetchApp|authorization is required/i.test(message)) {
    return 'IMAGE_FETCH_PERMISSION_REQUIRED';
  }
  if (/service invoked too many times|limit exceeded|quota/i.test(message)) {
    return 'IMAGE_FETCH_QUOTA_EXCEEDED';
  }
  return 'IMAGE_FETCH_FAILED';
}

function fetchImageMetadata_(config, url, redirectCount) {
  var target = validatePublicImageUrl_(url);
  var response = UrlFetchApp.fetch(target.url, {
    followRedirects: false,
    muteHttpExceptions: true,
    validateHttpsCertificates: true
  });
  var status = response.getResponseCode();
  if (status >= 300 && status < 400) {
    if (redirectCount >= SCL_IMAGE_MAX_REDIRECTS_) {
      throw imagePreflightError_('IMAGE_REDIRECT_LIMIT');
    }
    var location = response.getHeaders().Location || response.getHeaders().location;
    if (!location || !/^https:\/\//i.test(String(location))) {
      throw imagePreflightError_('IMAGE_REDIRECT_INVALID');
    }
    return fetchImageMetadata_(config, String(location), redirectCount + 1);
  }
  if (status < 200 || status >= 300) {
    throw imagePreflightError_('IMAGE_FETCH_FAILED');
  }
  var blob = response.getBlob();
  var rawMime = String(blob.getContentType() || '').toLowerCase().split(';')[0].trim();
  var bytes = blob.getBytes();
  if (!bytes.length || bytes.length > config.imageMaxBytes) {
    throw imagePreflightError_(bytes.length ? 'IMAGE_TOO_LARGE' : 'IMAGE_EMPTY');
  }
  var mime = detectImageMime_(rawMime, bytes, url);
  if (!mime || !SCL_IMAGE_ALLOWED_MIME_[mime]) {
    throw imagePreflightError_('IMAGE_MIME_UNSUPPORTED');
  }
  var dimensions = readImageDimensions_(bytes, mime);
  if (!dimensions || !dimensions.width || !dimensions.height) {
    throw imagePreflightError_('IMAGE_DIMENSIONS_INVALID');
  }
  return {
    ok: true,
    mime: mime,
    bytes: bytes.length,
    width: dimensions.width,
    height: dimensions.height,
    redirects: redirectCount
  };
}

function detectImageMime_(headerMime, signedBytes, url) {
  var mime = String(headerMime || '').toLowerCase().split(';')[0].trim();
  if (mime === 'image/jpg' || mime === 'image/pjpeg') { return 'image/jpeg'; }
  if (mime === 'image/x-png') { return 'image/png'; }
  if (mime && SCL_IMAGE_ALLOWED_MIME_[mime] && mime !== 'application/octet-stream' && mime !== 'binary/octet-stream') {
    return mime;
  }
  if (signedBytes && signedBytes.length >= 4) {
    var b = signedBytes.slice(0, 16).map(function (v) { return v < 0 ? v + 256 : v; });
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) {
      return 'image/png';
    }
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
      return 'image/jpeg';
    }
    if (b.length >= 12 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP') {
      return 'image/webp';
    }
    if (b.length >= 6 && String.fromCharCode(b[0], b[1], b[2]) === 'GIF') {
      return 'image/gif';
    }
  }
  if (/\.png(?:[?#]|$)/i.test(url)) { return 'image/png'; }
  if (/\.(?:jpe?g)(?:[?#]|$)/i.test(url)) { return 'image/jpeg'; }
  if (/\.webp(?:[?#]|$)/i.test(url)) { return 'image/webp'; }
  if (/\.gif(?:[?#]|$)/i.test(url)) { return 'image/gif'; }
  return mime || 'image/png';
}

function validatePublicImageUrl_(url) {
  var match = String(url).match(/^https:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
  if (!match) {
    throw imagePreflightError_('IMAGE_URL_INVALID');
  }
  var authority = match[1];
  if (authority.indexOf('@') !== -1) {
    throw imagePreflightError_('IMAGE_URL_INVALID');
  }
  var host = authority.replace(/^\[/, '').replace(/\](:\d+)?$/, '').replace(/:\d+$/, '').toLowerCase();
  if (!host || isBlockedImageHost_(host)) {
    throw imagePreflightError_('IMAGE_HOST_BLOCKED');
  }
  return { url: String(url), host: host };
}

function isBlockedImageHost_(host) {
  if (host === 'localhost' || /(?:^|\.)localhost$/.test(host) || /\.local$/.test(host)) {
    return true;
  }
  if (host === 'metadata.google.internal' || /(?:^|\.)metadata\.google\.internal$/.test(host)) {
    return true;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    var parts = host.split('.').map(Number);
    return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] >= 224;
  }
  if (/^(?:0x[0-9a-f]+|[0-9.]+)$/i.test(host)) {
    return true;
  }
  return host === '::1' || /^fe[89ab]/i.test(host) || /^fc/i.test(host) || /^fd/i.test(host);
}

function readImageDimensions_(signedBytes, mime) {
  var bytes = signedBytes.map(function (value) { return value < 0 ? value + 256 : value; });
  if (mime === 'image/png' && bytes.length >= 24 && bytes.slice(1, 4).join(',') === '80,78,71') {
    return { width: readUint32Be_(bytes, 16), height: readUint32Be_(bytes, 20) };
  }
  if (mime === 'image/jpeg') {
    for (var offset = 2; offset + 8 < bytes.length;) {
      if (bytes[offset] !== 255) { offset += 1; continue; }
      var marker = bytes[offset + 1];
      if (marker >= 192 && marker <= 195) {
        return { height: readUint16Be_(bytes, offset + 5), width: readUint16Be_(bytes, offset + 7) };
      }
      var length = readUint16Be_(bytes, offset + 2);
      if (length < 2) { break; }
      offset += length + 2;
    }
  }
  if (mime === 'image/webp' && bytes.length >= 30 && String.fromCharCode.apply(null, bytes.slice(0, 4)) === 'RIFF') {
    var kind = String.fromCharCode.apply(null, bytes.slice(12, 16));
    if (kind === 'VP8X') {
      return { width: 1 + readUint24Le_(bytes, 24), height: 1 + readUint24Le_(bytes, 27) };
    }
    if (kind === 'VP8L') {
      var bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      return { width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1 };
    }
    if (kind === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      return { width: readUint16Le_(bytes, 26) & 16383, height: readUint16Le_(bytes, 28) & 16383 };
    }
  }
  return null;
}

function readUint16Be_(bytes, offset) { return bytes[offset] * 256 + bytes[offset + 1]; }
function readUint32Be_(bytes, offset) { return bytes[offset] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3]; }
function readUint24Le_(bytes, offset) { return bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536; }
function readUint16Le_(bytes, offset) { return bytes[offset] + bytes[offset + 1] * 256; }
function imagePreflightError_(code) { var error = new Error(code); error.code = code; return error; }
