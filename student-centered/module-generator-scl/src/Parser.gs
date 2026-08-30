function summarizeLevelsFromSnapshot_(snapshot, options) {
  var levels = {};
  for (var rowIndex = snapshot.header.rowIndex + 1; rowIndex < snapshot.values.length; rowIndex += 1) {
    var rawLevel = sourceCellValue_(snapshot, rowIndex, 'Level');
    if (rawLevel === '' || rawLevel === null || rawLevel === undefined) {
      continue;
    }
    var level = normalizeLevelToken_(rawLevel);
    if (!levels[level]) {
      levels[level] = true;
    }
  }
  return Object.keys(levels).sort(compareLevelTokens_).map(function (level) {
    var project = buildLevelProjectFromSnapshot_(snapshot, level, options);
    return {
      level: level,
      readyCount: project.readyCount,
      incompleteCount: project.sessions.filter(function (session) {
        return session.status === 'Incomplete';
      }).length,
      needsFixCount: project.sessions.filter(function (session) {
        return session.status === 'Needs Fix';
      }).length,
      missingCount: project.sessions.filter(function (session) {
        return session.status === 'On Progress';
      }).length,
      warningCount: project.warningCount
    };
  });
}

function compareLevelTokens_(left, right) {
  var leftNumber = Number(left);
  var rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return String(left).localeCompare(String(right));
}

function buildLevelProjectFromSnapshot_(snapshot, level, options) {
  var matchingRows = [];
  var projectDiagnostics = [];
  for (var rowIndex = snapshot.header.rowIndex + 1; rowIndex < snapshot.values.length; rowIndex += 1) {
    var rawLevel = sourceCellValue_(snapshot, rowIndex, 'Level');
    if (rawLevel === '' || rawLevel === null || rawLevel === undefined) {
      continue;
    }
    if (normalizeLevelToken_(rawLevel) !== level) {
      continue;
    }
    var session = normalizeSessionToken_(sourceCellValue_(snapshot, rowIndex, 'Session'));
    if (!session) {
      projectDiagnostics.push({
        code: 'SESSION_INVALID',
        severity: 'BLOCKING',
        sourceRow: rowIndex + 1
      });
      continue;
    }
    matchingRows.push({ rowIndex: rowIndex, session: session });
  }

  if (matchingRows.length === 0 && projectDiagnostics.length === 0) {
    throw new SclError_('LEVEL_NOT_FOUND');
  }

  var rowsBySession = {};
  matchingRows.forEach(function (entry) {
    rowsBySession[entry.session] = rowsBySession[entry.session] || [];
    rowsBySession[entry.session].push(entry.rowIndex);
  });

  var sessions = [];
  for (var sessionNumber = 1; sessionNumber <= 12; sessionNumber += 1) {
    var token = String(sessionNumber);
    var sourceRows = rowsBySession[token] || [];
    if (sourceRows.length === 0) {
      sessions.push(buildOnProgressSlot_(level, token));
      continue;
    }
    var normalized = normalizeSessionRow_(snapshot, sourceRows[0], level, token, options);
    if (sourceRows.length > 1) {
      normalized.status = 'Needs Fix';
      normalized.warnings.unshift({
        code: 'DUPLICATE_SESSION_IDENTITY',
        severity: 'BLOCKING',
        sourceRows: sourceRows.map(function (row) { return row + 1; })
      });
      projectDiagnostics.push({
        code: 'DUPLICATE_SESSION_IDENTITY',
        severity: 'BLOCKING',
        session: token,
        sourceRows: sourceRows.map(function (row) { return row + 1; })
      });
    }
    sessions.push(normalized);
  }

  var warningCount = sessions.reduce(function (count, session) {
    return count + session.warnings.length;
  }, 0) + projectDiagnostics.length;
  return {
    schemaVersion: 'scl-level/v1',
    course: {
      key: snapshot.course.key,
      label: snapshot.course.label,
      coverLabel: snapshot.course.coverLabel
    },
    level: level,
    readyCount: sessions.filter(function (session) { return session.status === 'Ready'; }).length,
    totalSlots: 12,
    warningCount: warningCount,
    sessions: sessions,
    diagnostics: projectDiagnostics
  };
}

function buildOnProgressSlot_(level, session) {
  return {
    schemaVersion: 'scl-module/v1',
    rowKey: '',
    sourceRevision: '',
    level: level,
    session: session,
    topic: '',
    status: 'On Progress',
    fields: {},
    objectives: [],
    materialBlocks: [],
    tasks: {},
    quiz: [],
    tables: [],
    warnings: []
  };
}

function normalizeSessionRow_(snapshot, rowIndex, level, session, options) {
  var allFields = {};
  SCL_SOURCE_HEADERS_.forEach(function (header) {
    if (header === 'Level' || header === 'Session') {
      return;
    }
    allFields[header] = normalizeRichTextValue_(
      sourceCellRichText_(snapshot, rowIndex, header),
      sourceCellValue_(snapshot, rowIndex, header)
    );
  });

  var safeFields = {};
  SCL_CLIENT_FIELD_HEADERS_.forEach(function (header) {
    safeFields[header] = allFields[header] || { text: '', runs: [] };
  });
  var warnings = [];
  var topic = safeFields['Session-topic'].text.trim();
  var topicMaxChars = (options && options.topicMaxChars) || 80;
  var objectiveModel = safeFields.objectives;
  var materialResult = parseMaterials_(
    safeFields.materials,
    safeFields.kamus_coder.text,
    safeFields.for_your_knowledge.text
  );
  warnings = warnings.concat(materialResult.warnings);

  if (!topic) {
    warnings.push({ code: 'SESSION_TOPIC_REQUIRED', severity: 'WARNING' });
  } else if (topic.length > topicMaxChars) {
    warnings.push({
      code: 'SESSION_TOPIC_TOO_LONG',
      severity: 'WARNING',
      maxLength: topicMaxChars,
      length: topic.length
    });
  }
  if (!objectiveModel.text.trim()) {
    warnings.push({ code: 'OBJECTIVES_REQUIRED', severity: 'WARNING' });
  }
  if (!safeFields.materials.text.trim()) {
    warnings.push({ code: 'MATERIALS_REQUIRED', severity: 'WARNING' });
  }

  var tasks = {
    mustDo: parseTaskField_(safeFields.must_do),
    shouldDo: parseTaskField_(safeFields.should_do),
    aspireToDo: parseTaskField_(safeFields.aspire_to_do),
    selfCheck: parseTaskField_(safeFields['self-check'])
  };
  if (safeFields.should_do.text.trim() &&
      safeFields.should_do.text.trim() === safeFields.aspire_to_do.text.trim()) {
    warnings.push({ code: 'DUPLICATE_ENRICHMENT_TASK', severity: 'WARNING' });
  }

  var quizResult = parseQuiz_(safeFields.quiz_questions, safeFields.quiz_options);
  warnings = warnings.concat(quizResult.warnings);
  var incomplete = !topic || !objectiveModel.text.trim() || !safeFields.materials.text.trim();

  return {
    schemaVersion: 'scl-module/v1',
    rowKey: snapshot.course.sheetName + '::' + level + '::' + session,
    sourceRevision: computeSourceRevision_(allFields),
    level: level,
    session: session,
    topic: topic,
    status: incomplete ? 'Incomplete' : 'Ready',
    fields: safeFields,
    objectives: parseLineItems_(objectiveModel),
    materialBlocks: materialResult.blocks,
    tasks: tasks,
    quiz: quizResult.items,
    tables: [],
    warnings: uniqueWarnings_(warnings)
  };
}

function parseLineItems_(richTextModel) {
  return splitRichTextLines_(richTextModel).filter(function (line) {
    return line.text.trim();
  }).map(function (line) {
    var listPrefix = listPrefixInfo_(line.text.trim());
    var rawText = line.text.trim();
    var heading = rawText.match(/^#{1,3}\s+(.+)$/);
    var text = listPrefix ? listPrefix.text : (heading ? heading[1].trim() : rawText);
    if (heading) {
      var headingStart = line.text.indexOf(heading[1]);
      return {
        type: 'text',
        text: text,
        textStyle: heading[0].indexOf('###') === 0 ? 'heading2' : 'heading1',
        richText: sliceRichTextModel_(richTextModel, line.contentStart + headingStart, line.contentEnd)
      };
    }
    return {
      type: 'text',
      richText: sliceRichTextModel_(richTextModel, line.contentStart, line.contentEnd),
      text: text
    };
  });
}

function parseTaskField_(richTextModel) {
  return splitRichTextLines_(richTextModel).filter(function (line) {
    return line.text.trim();
  }).map(function (line) {
    var text = line.text.trim();
    if (/^https:\/\/\S+$/i.test(text)) {
      return {
        type: 'image',
        text: text,
        richText: sliceRichTextModel_(richTextModel, line.contentStart, line.contentEnd)
      };
    }
    var checkMatch = text.match(/^(?:[-*•‣◦∙⁃▪●○✦]\s+)?\[(?:\s|x|X)?\]\s*(.*)$/);
    var visibleText = checkMatch ? checkMatch[1].trim() : text;
    var offset = line.text.indexOf(visibleText);
    if (offset < 0) { offset = 0; }
    return {
      type: 'text',
      text: visibleText,
      richText: sliceRichTextModel_(richTextModel, line.contentStart + offset, line.contentEnd)
    };
  });
}

function parseMaterials_(richTextModel, kamusText, fykText) {
  var kcDefinitions = parseMarkerDefinitions_(kamusText, 'kc');
  var fykDefinitions = parseMarkerDefinitions_(fykText, 'fyk');
  var usedKc = {};
  var usedFyk = {};
  var warnings = kcDefinitions.warnings.concat(fykDefinitions.warnings);
  var blocks = [];

  splitRichTextLines_(richTextModel).forEach(function (line) {
    var text = line.text.trim();
    if (!text) {
      return;
    }
    if (text === '[[SCL_PAGE_BREAK]]') {
      blocks.push({ type: 'page-break', manual: true });
      return;
    }
    var markdownHeading = text.match(/^(#{1,3})\s+(.+)$/);
    if (markdownHeading) {
      var headingText = markdownHeading[2].trim();
      var headingOffset = text.indexOf(headingText);
      blocks.push({
        type: 'paragraph',
        text: headingText,
        richText: sliceRichTextModel_(richTextModel, line.contentStart + headingOffset, line.contentEnd),
        textStyle: markdownHeading[1].length === 1 ? 'heading1' : 'heading2'
      });
      return;
    }
    var markerMatch = text.match(/^(kc|fyk)(\d+)\*$/i);
    if (markerMatch) {
      var markerType = markerMatch[1].toLowerCase();
      var markerId = markerType + markerMatch[2];
      var definitionSet = markerType === 'kc' ? kcDefinitions : fykDefinitions;
      var usedSet = markerType === 'kc' ? usedKc : usedFyk;
      usedSet[markerId] = true;
      blocks.push({
        type: markerType === 'kc' ? 'tutor-says' : 'did-you-know',
        marker: markerId,
        definition: definitionSet.definitions[markerId] || '',
        missingDefinition: !definitionSet.definitions[markerId]
      });
      if (!definitionSet.definitions[markerId]) {
        warnings.push({
          code: markerType.toUpperCase() + '_DEFINITION_MISSING',
          severity: 'WARNING',
          marker: markerId
        });
      }
      return;
    }

    var inlineImageBlocks = parseInlineImageBlocks_(richTextModel, line);
    if (inlineImageBlocks) {
      Array.prototype.push.apply(blocks, inlineImageBlocks);
      return;
    }

    var type = 'paragraph';
    if (/^https:\/\/\S+$/i.test(text)) {
      type = 'image';
    } else if (/^(?:Tahap|Bagian|Langkah)\s+\d+/i.test(text)) {
      type = 'section-heading';
    } else {
      var listPrefix = listPrefixInfo_(text);
      if (listPrefix) {
        type = listPrefix.kind === 'numbered' ? 'numbered-item' : 'bullet';
      }
    }
    var strippedText = text;
    var contentStart = line.contentStart;
    if (type === 'bullet' || type === 'numbered-item') {
      var strippedPrefix = listPrefixInfo_(text);
      strippedText = strippedPrefix ? strippedPrefix.text : text;
      contentStart += text.indexOf(strippedText);
    }
    var blockRichText = sliceRichTextModel_(richTextModel, contentStart, line.contentEnd);
    var imageWidth = type === 'image' ? parseImageWidthMetadata_(blockRichText) : null;
    blocks.push({
      type: type,
      text: strippedText,
      richText: blockRichText,
      displayWidthPercent: imageWidth,
      explicitOrdinal: listPrefix && listPrefix.ordinal ? listPrefix.ordinal : null
    });
  });

  addUnusedMarkerWarnings_(warnings, kcDefinitions.definitions, usedKc, 'KC');
  addUnusedMarkerWarnings_(warnings, fykDefinitions.definitions, usedFyk, 'FYK');
  return { blocks: blocks, warnings: uniqueWarnings_(warnings) };
}

function parseInlineImageBlocks_(richTextModel, line) {
  var pattern = /https:\/\/[^\s<>"']+?\.(?:png|jpe?g|webp)(?:[?#][^\s<>"']*)?/ig;
  var matches = [];
  var match;
  while ((match = pattern.exec(line.text))) {
    matches.push({ index: match.index, text: match[0] });
  }
  if (!matches.length || (matches.length === 1 && matches[0].index === 0 && matches[0].text.length === line.text.length)) {
    return null;
  }

  var blocks = [];
  var cursor = 0;
  matches.forEach(function (entry) {
    appendInlineParagraphBlock_(blocks, richTextModel, line, cursor, entry.index);
    var start = line.contentStart + entry.index;
    blocks.push({
      type: 'image',
      text: entry.text,
      richText: sliceRichTextModel_(richTextModel, start, start + entry.text.length),
      displayWidthPercent: 69
    });
    cursor = entry.index + entry.text.length;
  });
  appendInlineParagraphBlock_(blocks, richTextModel, line, cursor, line.text.length);
  return blocks;
}

function listPrefixInfo_(text) {
  var match = String(text || '').match(/^([\s\u200B-\u200D\u2060\uFEFF]*)([-*•‣◦∙⁃▪●○✦]|\d+[.)])(\s+)(.*)$/);
  if (!match) {
    return null;
  }
  var marker = String(match[2] || '');
  return {
    kind: /^\d/.test(marker) ? 'numbered' : 'bullet',
    text: String(match[4] || '').trim()
  };
}

function appendInlineParagraphBlock_(blocks, richTextModel, line, startOffset, endOffset) {
  var raw = line.text.slice(startOffset, endOffset);
  var leading = raw.search(/\S/);
  if (leading < 0) {
    return;
  }
  var trailing = raw.length - raw.replace(/\s+$/, '').length;
  var start = line.contentStart + startOffset + leading;
  var end = line.contentStart + endOffset - trailing;
  blocks.push({
    type: 'paragraph',
    text: richTextModel.text.slice(start, end),
    richText: sliceRichTextModel_(richTextModel, start, end),
    displayWidthPercent: null
  });
}

function parseImageWidthMetadata_(richTextModel) {
  var link = richTextModel && richTextModel.runs && richTextModel.runs.length
    ? String(richTextModel.runs[0].link || '')
    : '';
  var match = link.match(/#scl-width=(\d{1,3})$/i);
  if (!match) {
    return 50;
  }
  return Math.max(25, Math.min(100, Number(match[1])));
}

function parseMarkerDefinitions_(text, prefix) {
  var definitions = {};
  var warnings = [];
  var current = '';
  normalizeCellText_(text).split('\n').forEach(function (line) {
    var match = line.match(new RegExp('^\\s*(' + prefix + '\\d+)\\s*:\\s*(.*)$', 'i'));
    if (match) {
      current = match[1].toLowerCase();
      if (Object.prototype.hasOwnProperty.call(definitions, current)) {
        warnings.push({
          code: prefix.toUpperCase() + '_DEFINITION_DUPLICATE',
          severity: 'WARNING',
          marker: current
        });
      } else {
        definitions[current] = match[2];
      }
      return;
    }
    if (current) {
      definitions[current] += (definitions[current] ? '\n' : '') + line;
    }
  });
  Object.keys(definitions).forEach(function (key) {
    definitions[key] = definitions[key].trim();
  });
  return { definitions: definitions, warnings: warnings };
}

function addUnusedMarkerWarnings_(warnings, definitions, used, prefix) {
  Object.keys(definitions).forEach(function (marker) {
    if (!used[marker]) {
      warnings.push({
        code: prefix + '_DEFINITION_UNUSED',
        severity: 'WARNING',
        marker: marker
      });
    }
  });
}

function parseQuiz_(questionModel, optionModel) {
  var questions = parseNumberedGroups_(questionModel.text);
  var optionGroups = parseNumberedGroups_(optionModel.text);
  var optionsByNumber = {};
  optionGroups.forEach(function (group) {
    optionsByNumber[group.number] = parseQuizOptions_(group.text);
  });
  var warnings = [];
  var items = questions.map(function (question) {
    var options = optionsByNumber[question.number] || [];
    if (options.length === 0) {
      warnings.push({ code: 'QUIZ_OPTIONS_MISSING', severity: 'WARNING', number: question.number });
    }
    delete optionsByNumber[question.number];
    return {
      number: question.number,
      question: question.text,
      options: options
    };
  });
  Object.keys(optionsByNumber).forEach(function (number) {
    warnings.push({ code: 'QUIZ_QUESTION_MISSING', severity: 'WARNING', number: number });
  });
  return { items: items, warnings: warnings };
}

function parseNumberedGroups_(text) {
  var groups = [];
  var current = null;
  normalizeCellText_(text).split('\n').forEach(function (line) {
    var match = line.match(/^\s*(\d+)[.)]\s*(.*)$/);
    if (match) {
      current = { number: match[1], text: match[2].trim() };
      groups.push(current);
    } else if (current && line.trim()) {
      current.text += (current.text ? '\n' : '') + line.trim();
    }
  });
  return groups;
}

function parseQuizOptions_(text) {
  return normalizeCellText_(text).split(/\s*\|\s*|\n/).filter(function (part) {
    return part.trim();
  }).map(function (part, index) {
    var match = part.trim().match(/^([A-Z])[.)]\s*(.*)$/i);
    return {
      label: match ? match[1].toUpperCase() : String.fromCharCode(65 + index),
      text: match ? match[2].trim() : part.trim()
    };
  });
}

function splitRichTextLines_(model) {
  var lines = [];
  var start = 0;
  for (var index = 0; index <= model.text.length; index += 1) {
    if (index === model.text.length || model.text.charAt(index) === '\n') {
      lines.push({
        text: model.text.slice(start, index),
        contentStart: start,
        contentEnd: index
      });
      start = index + 1;
    }
  }
  return lines;
}

function uniqueWarnings_(warnings) {
  var seen = {};
  return warnings.filter(function (warning) {
    var key = [warning.code, warning.marker || '', warning.number || '', warning.session || ''].join('|');
    if (seen[key]) {
      return false;
    }
    seen[key] = true;
    return true;
  });
}
