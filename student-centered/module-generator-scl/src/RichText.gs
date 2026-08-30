function normalizeCellText_(value) {
  return normalizeTextAndOffsets_(value).text;
}

function normalizeRichTextValue_(richTextValue, fallbackValue) {
  var fallbackText = normalizeCellText_(fallbackValue);
  var rawText = richTextValue && typeof richTextValue.getText === 'function'
    ? richTextValue.getText()
    : fallbackText;
  var normalizedText = normalizeTextAndOffsets_(rawText);
  var text = normalizedText.text;
  var rawRuns = richTextValue && typeof richTextValue.getRuns === 'function'
    ? richTextValue.getRuns()
    : [];
  var runs = rawRuns.map(function (run) {
    var style = run && typeof run.getTextStyle === 'function' ? run.getTextStyle() : null;
    return {
      start: mapRichTextOffset_(
        normalizedText.offsetMap,
        readRichTextOffset_(run, 'getStartIndex', 0),
        text.length
      ),
      end: mapRichTextOffset_(
        normalizedText.offsetMap,
        readRichTextOffset_(run, 'getEndIndex', String(rawText).length),
        text.length
      ),
      bold: readTextStyleBoolean_(style, 'isBold'),
      italic: readTextStyleBoolean_(style, 'isItalic'),
      underline: readTextStyleBoolean_(style, 'isUnderline'),
      strikethrough: readTextStyleBoolean_(style, 'isStrikethrough'),
      link: run && typeof run.getLinkUrl === 'function' ? String(run.getLinkUrl() || '') : ''
    };
  }).filter(function (run) {
    return run.end > run.start;
  });

  if (text && runs.length === 0) {
    runs.push(defaultRichTextRun_(0, text.length));
  }

  var normalizedModel = {
    text: text,
    runs: mergeRichTextRuns_(runs)
  };
  return parseLegacyMarkdownRichText_(normalizedModel);
}

/**
 * Compatibility reader for the Markdown-like syntax historically used in
 * SSOT cells. Native Sheets runs remain authoritative where they exist, while
 * legacy delimiters are removed and represented as additional style overlays.
 * This lets a cell contain both native rich text and old `**bold**`/`*italic*`
 * fragments without leaking the delimiters into the editor or PDF.
 */
function parseLegacyMarkdownRichText_(model) {
  if (!model || !model.text) {
    return model;
  }
  var source = String(model.text);
  var nativeRuns = Array.isArray(model.runs) ? model.runs.slice() : [];
  var output = '';
  var outputStyles = [];
  var changed = false;
  var fenceOpen = false;

  function styleAt_(index) {
    for (var runIndex = 0; runIndex < nativeRuns.length; runIndex += 1) {
      var run = nativeRuns[runIndex];
      if (index >= run.start && index < run.end) {
        return run;
      }
    }
    return defaultRichTextRun_(0, 0);
  }

  function emitRange_(start, end, overlay) {
    for (var index = start; index < end; index += 1) {
      var base = styleAt_(index);
      var style = {
        bold: Boolean(base.bold) || Boolean(overlay && overlay.bold),
        italic: Boolean(base.italic) || Boolean(overlay && overlay.italic),
        underline: Boolean(base.underline),
        strikethrough: Boolean(base.strikethrough),
        link: String(base.link || '')
      };
      output += source.charAt(index);
      outputStyles.push(style);
    }
  }

  function emitLine_(lineStart, lineEnd) {
    var line = source.slice(lineStart, lineEnd);
    var trimmed = line.trim();
    var isFence = /^```/.test(trimmed);
    if (fenceOpen || isFence) {
      emitRange_(lineStart, lineEnd, null);
      if (isFence && !/^```.*```\s*$/.test(trimmed)) {
        fenceOpen = !fenceOpen;
      } else if (fenceOpen && /^```\s*$/.test(trimmed)) {
        fenceOpen = false;
      }
      return;
    }

    var pattern = /(?<!\w)(\*\*\*|___)(?=\S)([\s\S]*?\S)\1(?!\w)|(?<!\w)(\*\*|__)(?=\S)([\s\S]*?\S)\3(?!\w)|(?<![\w*])([*_])(?=\S)([\s\S]*?\S)\5(?![\w*])/g;
    var cursor = 0;
    var match;
    while ((match = pattern.exec(line))) {
      var absoluteMatchStart = lineStart + match.index;
      var preceding = source.charAt(absoluteMatchStart - 1);
      var backtickCount = (line.slice(0, match.index).match(/`/g) || []).length;
      if (preceding === '\\' || backtickCount % 2 === 1) {
        continue;
      }
      emitRange_(lineStart + cursor, absoluteMatchStart, null);
      var value = match[2] || match[4] || match[6] || '';
      var valueStart = absoluteMatchStart + match[0].indexOf(value);
      emitRange_(valueStart, valueStart + value.length, {
        bold: Boolean(match[2] || match[4]),
        italic: Boolean(match[2] || match[6])
      });
      cursor = match.index + match[0].length;
      changed = true;
    }
    emitRange_(lineStart + cursor, lineEnd, null);
  }

  var lineStart = 0;
  for (var index = 0; index <= source.length; index += 1) {
    if (index !== source.length && source.charAt(index) !== '\n') {
      continue;
    }
    emitLine_(lineStart, index);
    if (index < source.length) {
      emitRange_(index, index + 1, null);
    }
    lineStart = index + 1;
  }
  if (!changed) {
    return model;
  }

  var outputRuns = [];
  outputStyles.forEach(function (style, index) {
    var previous = outputRuns[outputRuns.length - 1];
    var current = {
      start: index,
      end: index + 1,
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      strikethrough: style.strikethrough,
      link: style.link
    };
    if (previous && sameRichTextStyle_(previous, current)) {
      previous.end = current.end;
    } else {
      outputRuns.push(current);
    }
  });
  return {
    text: output,
    runs: mergeRichTextRuns_(outputRuns)
  };
}

function normalizeTextAndOffsets_(value) {
  var raw = String(value === null || value === undefined ? '' : value);
  var output = '';
  var offsetMap = [0];
  var rawIndex = 0;
  var outputIndex = 0;
  while (rawIndex < raw.length) {
    var character = raw.charAt(rawIndex);
    if (character === '\r') {
      output += '\n';
      outputIndex += 1;
      rawIndex += 1;
      offsetMap[rawIndex] = outputIndex;
      if (raw.charAt(rawIndex) === '\n') {
        rawIndex += 1;
        offsetMap[rawIndex] = outputIndex;
      }
      continue;
    }
    output += character;
    outputIndex += 1;
    rawIndex += 1;
    offsetMap[rawIndex] = outputIndex;
  }
  return { text: output, offsetMap: offsetMap };
}

function mapRichTextOffset_(offsetMap, rawOffset, textLength) {
  var index = Math.max(0, Math.min(offsetMap.length - 1, Math.floor(rawOffset)));
  var mapped = offsetMap[index];
  return clampRichTextOffset_(mapped === undefined ? index : mapped, textLength);
}

function readRichTextOffset_(run, method, fallback) {
  if (!run || typeof run[method] !== 'function') {
    return fallback;
  }
  var value = Number(run[method]());
  return Number.isFinite(value) ? value : fallback;
}

function clampRichTextOffset_(value, textLength) {
  return Math.max(0, Math.min(textLength, Math.floor(value)));
}

function readTextStyleBoolean_(style, method) {
  if (!style || typeof style[method] !== 'function') {
    return false;
  }
  return style[method]() === true;
}

function defaultRichTextRun_(start, end) {
  return {
    start: start,
    end: end,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    link: ''
  };
}

function mergeRichTextRuns_(runs) {
  var sorted = runs.slice().sort(function (left, right) {
    return left.start - right.start || left.end - right.end;
  });
  var merged = [];
  sorted.forEach(function (run) {
    var previous = merged[merged.length - 1];
    if (previous && previous.end === run.start && sameRichTextStyle_(previous, run)) {
      previous.end = run.end;
    } else {
      merged.push(Object.assign({}, run));
    }
  });
  return merged;
}

function sameRichTextStyle_(left, right) {
  return left.bold === right.bold &&
    left.italic === right.italic &&
    left.underline === right.underline &&
    left.strikethrough === right.strikethrough &&
    left.link === right.link;
}

function sliceRichTextModel_(model, start, end) {
  var safeStart = clampRichTextOffset_(start, model.text.length);
  var safeEnd = clampRichTextOffset_(end, model.text.length);
  var text = model.text.slice(safeStart, safeEnd);
  var runs = model.runs.map(function (run) {
    return Object.assign({}, run, {
      start: Math.max(run.start, safeStart) - safeStart,
      end: Math.min(run.end, safeEnd) - safeStart
    });
  }).filter(function (run) {
    return run.end > run.start;
  });
  if (text && runs.length === 0) {
    runs.push(defaultRichTextRun_(0, text.length));
  }
  return { text: text, runs: mergeRichTextRuns_(runs) };
}

function computeSourceRevision_(normalizedFields) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(normalizedFields),
    Utilities.Charset.UTF_8
  );
  return 'sha256:' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function buildRichTextValue_(model) {
  var builder = SpreadsheetApp.newRichTextValue().setText(model.text);
  model.runs.forEach(function (run) {
    if (run.end <= run.start) {
      return;
    }
    var style = SpreadsheetApp.newTextStyle()
      .setBold(Boolean(run.bold))
      .setItalic(Boolean(run.italic))
      .setUnderline(Boolean(run.underline))
      .setStrikethrough(Boolean(run.strikethrough))
      .build();
    builder.setTextStyle(run.start, run.end, style);
    if (run.link) {
      builder.setLinkUrl(run.start, run.end, run.link);
    }
  });
  return builder.build();
}
