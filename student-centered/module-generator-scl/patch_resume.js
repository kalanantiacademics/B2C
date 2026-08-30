function resumeSessionLease_(sessionPayload, leaseToken, courseKey, requestedLevel, requestedSession, nowMs) {
  var timestamp = collaborationNowMs_(nowMs);
  return withCollaborationScriptLock_(function () {
    var context = resolveSourceSessionContext_(courseKey, requestedLevel, requestedSession);
    var locks = managedSheetContext_(context.spreadsheet, 'locks');
    
    var normalizedLease = requireString_(leaseToken, 'leaseToken', 4096);
    var match = findManagedRecord_(locks, 'lock_key', context.rowKey);
    
    // Jika tidak ada lock sama sekali, atau hash token berbeda, artinya bukan milik kita lagi
    if (!match || !constantTimeEquals_(String(match.record.token_hash || ''), hashText_(normalizedLease))) {
      throw new SclError_('LEASE_INVALID', 'Hak edit sudah tidak berlaku atau diambil alih orang lain.');
    }
    
    var nextExpiry = isoTimestamp_(timestamp + SCL_LEASE_SECONDS_ * 1000);
    writeManagedRecord_(locks, match.rowNumber, {
      heartbeat_at: isoTimestamp_(timestamp),
      expires_at: nextExpiry
    });
    
    appendAuditRecord_(context.spreadsheet, {
      event_type: 'lock_resume',
      request_id: '',
      status: 'SUCCESS',
      error_code: '',
      course_key: context.course.key,
      level: context.level,
      session: context.session,
      editor_label: String(sessionPayload.label || 'Editor'),
      duration_ms: 0,
      metadata_json: '{}',
      created_at: isoTimestamp_(timestamp)
    });
    
    return {
      leaseToken: leaseToken, // Return the same token
      acquiredAt: match.record.acquired_at,
      expiresAt: nextExpiry,
      heartbeatIntervalSeconds: SCL_HEARTBEAT_SECONDS_,
      sourceRevision: context.sourceRevision,
      editor: {
        label: match.record.editor_label,
        selfDeclared: Boolean(sessionPayload.selfDeclared)
      }
    };
  });
}
