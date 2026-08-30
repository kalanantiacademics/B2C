var SCL_PUBLIC_ERROR_MESSAGES_ = Object.freeze({
  AUTHENTICATION_FAILED: 'Passcode tidak valid atau percobaan terlalu sering.',
  CONFIGURATION_REQUIRED: 'Aplikasi belum dikonfigurasi oleh maintainer.',
  DRIVE_FILE_INVALID: 'File hasil uji Drive tidak valid.',
  DRIVE_NOT_CONFIGURED: 'Folder Drive belum dikonfigurasi oleh maintainer.',
  DRIVE_PERMISSION_REQUIRED: 'Account deployment belum dapat menambahkan file ke folder Drive.',
  DRIVE_UPLOAD_FAILED: 'File uji belum dapat disimpan ke Drive. Coba lagi setelah memeriksa quota dan izin.',
  DRIVE_UNAVAILABLE: 'Folder Drive belum dapat diakses. Periksa konfigurasi dan izin.',
  EDITOR_LABEL_REQUIRED: 'Masukkan nama atau email kerja untuk melanjutkan.',
  HISTORY_CORRUPT: 'Revision history rusak dan tidak dapat dipulihkan dengan aman.',
  HISTORY_NOT_FOUND: 'Revision history yang dipilih tidak ditemukan.',
  INVALID_PATCH: 'Perubahan tidak valid dan tidak disimpan.',
  INVALID_REQUEST: 'Permintaan tidak valid.',
  LEASE_EXPIRED: 'Hak edit session telah berakhir. Perubahan lokal tetap disimpan.',
  LEASE_INVALID: 'Hak edit session tidak valid. Muat ulang sebelum menyimpan.',
  LEVEL_NOT_FOUND: 'Level tidak ditemukan pada course ini.',
  OWNER_ONLY: 'Operasi ini hanya dapat dijalankan oleh deployment owner.',
  PUBLISH_NOT_FOUND: 'Record publish tidak ditemukan.',
  REVISION_CONFLICT: 'Source berubah di luar editor. Perubahan lokal tidak ditimpa.',
  SERVER_BUSY: 'Server sedang memproses perubahan lain. Silakan coba kembali.',
  SESSION_LOCKED: 'Session sedang diedit oleh pengguna lain.',
  SESSION_NOT_EDITABLE: 'Session memiliki identity ganda dan tidak aman untuk diedit.',
  SESSION_NOT_FOUND: 'Session belum tersedia pada source dan tidak dapat diedit.',
  SESSION_EXPIRED: 'Sesi telah berakhir. Silakan masuk kembali.',
  SESSION_INVALID: 'Sesi tidak valid. Silakan masuk kembali.',
  SOURCE_DUPLICATE_HEADER: 'Source modul memiliki header ganda dan perlu diperiksa.',
  SOURCE_HEADER_AMBIGUOUS: 'Baris header source modul ambigu dan perlu diperiksa.',
  SOURCE_HEADER_NOT_FOUND: 'Header source modul tidak ditemukan pada sepuluh baris awal.',
  SOURCE_SHEET_NOT_FOUND: 'Tab source modul tidak ditemukan.',
  STORAGE_UNAVAILABLE: 'Penyimpanan aplikasi membutuhkan pemeriksaan maintainer.',
  UNKNOWN_COURSE: 'Course tidak dikenali.'
});

function SclError_(code, message, retryable, details) {
  this.name = 'SclError';
  this.code = code || 'INTERNAL_ERROR';
  this.message = message || SCL_PUBLIC_ERROR_MESSAGES_[code] || 'Terjadi kesalahan pada aplikasi.';
  this.retryable = Boolean(retryable);
  this.details = details || {};
}

SclError_.prototype = Object.create(Error.prototype);

function runRpc_(callback) {
  try {
    return {
      ok: true,
      data: callback()
    };
  } catch (error) {
    return {
      ok: false,
      error: publicErrorEnvelope_(error)
    };
  }
}

function publicErrorEnvelope_(error) {
  var code = error && error.code ? String(error.code) : 'INTERNAL_ERROR';
  var isKnown = Object.prototype.hasOwnProperty.call(SCL_PUBLIC_ERROR_MESSAGES_, code);
  return {
    code: isKnown ? code : 'INTERNAL_ERROR',
    message: isKnown
      ? SCL_PUBLIC_ERROR_MESSAGES_[code]
      : 'Terjadi kesalahan. Silakan coba lagi atau hubungi maintainer.',
    retryable: Boolean(error && error.retryable),
    details: isKnown && error && error.details ? safeErrorDetails_(error.details) : {}
  };
}

function safeErrorDetails_(details) {
  var allowed = {};
  ['retryAfterSeconds', 'diagnosticCodes', 'editorLabel', 'lastActivity', 'currentRevision'].forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(details, key)) {
      allowed[key] = details[key];
    }
  });
  return allowed;
}

function requireString_(value, fieldName, maxLength) {
  if (typeof value !== 'string') {
    throw new SclError_('INVALID_REQUEST');
  }
  var normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new SclError_('INVALID_REQUEST', null, false, { field: fieldName });
  }
  return normalized;
}
