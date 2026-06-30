/**
 * Web app Google Apps Script untuk export HTML editor -> Google Slides.
 *
 * Deploy sebagai Web App, lalu endpoint POST-nya akan dipanggil oleh Flask.
 * Script ini:
 * 1. Membuat copy baru dari deck template.
 * 2. Menjadikan beberapa slide awal di template sebagai "master source".
 * 3. Menduplikasi slide template sesuai payload.
 * 4. Menghapus slide master dari deck hasil agar user hanya melihat hasil export.
 * 5. Mengembalikan JSON berisi presentationId + presentationUrl.
 *
 * Catatan:
 * - Jika script ini dipakai dalam web app yang sama dengan endpoint sheet kamu,
 *   gabungkan `doPost(e)` ini ke project Apps Script yang sekarang aktif.
 * - `doGet(e)` di bawah sengaja ringan agar tidak mengganggu endpoint GET lama.
 */

const TEMPLATE_PRESENTATION_ID = '1gXYGOL37shUPT7MNHD9LJqRbHV4KEV5VEhDWtrCa43Y';
const EXPORT_FOLDER_ID = ''; // Opsional: isi folder Drive tujuan. Kosong = folder yang sama dengan template.

const CM_TO_PT = 28.3465;
const PIXEL_TO_PT = 0.75;

const X_MARGIN_PT = 0.74 * CM_TO_PT;
const Y_START_PT = 3.32 * CM_TO_PT;
const CONTENT_WIDTH_PT = 19.55 * CM_TO_PT;
const MAX_CONTENT_HEIGHT_PT = 23.93 * CM_TO_PT;
const DEFAULT_ELEMENT_GAP_PT = 10 * PIXEL_TO_PT;
const PAGE_IMAGE_BLEED_PT = 0; // No bleed — image must sit exactly within content area

const HEADER_X_PT = 1.09 * CM_TO_PT;
const HEADER_Y_PT = 1.14 * CM_TO_PT;
const HEADER_WIDTH_PT = 7.87 * CM_TO_PT;
const HEADER_HEIGHT_PT = 1.54 * CM_TO_PT;

const TPL_COVER = 0;
const TPL_GUIDE = 1;         // Slide 2: Panduan Penggunaan Buku
const TPL_TOC = 2;           // Slide 3: Daftar Modul
const TPL_PLAIN_RIGHT = 3;   // Slide 4: Halaman konten (kanan/ganjil)
const TPL_PLAIN_LEFT = 4;    // Slide 5: Halaman konten (kiri/genap)
const TPL_PLAIN_FALLBACK = 4;

function doPost(e) {
  try {
    const body = parseRequestBody_(e);
    const action = body.action || 'export_slides';
    if (action !== 'export_slides') {
      return jsonResponse_({
        success: false,
        error: 'Unsupported action: ' + action,
      });
    }

    const payload = normalizeExportPayload_(body);
    const result = exportSlides_(payload);
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : '',
    });
  }
}

function doGet(e) {
  return jsonResponse_({
    success: true,
    message: 'Slides export web app is running.',
    note: 'Jika project ini juga dipakai untuk endpoint sheet, pertahankan doGet lama milikmu.',
    params: e && e.parameter ? e.parameter : {},
  });
}

function main() {
  const sample = {
    course: 'roblox',
    level: '1',
    elements: [
      { type: 'session_header', level: '1', topic: 'Contoh Session' },
      { type: 'text', height: 60, text: 'Halo dari export manual.' },
    ],
  };
  Logger.log(exportSlides_(sample));
}

function exportSlides_(data) {
  const hasPages = data && Array.isArray(data.pages) && data.pages.length > 0;
  const hasElements = data && Array.isArray(data.elements) && data.elements.length > 0;
  if (!hasPages && !hasElements) {
    throw new Error('Payload kosong atau tidak memiliki pages/elements.');
  }

  const isAppendMode = Boolean(data && data.presentationId);
  const finalizeExport = data && data.finalizeExport !== false;
  let templateFile;
  let copiedFile;
  let presentation;
  const exportName = buildPresentationName_(data);

  if (isAppendMode) {
    try {
      copiedFile = withDriveRetry_(function() {
        return DriveApp.getFileById(String(data.presentationId));
      }, 'membuka presentasi batch sebelumnya ' + String(data.presentationId));
    } catch (err) {
      throw new Error('Gagal membuka presentasi batch sebelumnya: ' + err.message);
    }
  } else {
    try {
      templateFile = withDriveRetry_(function() {
        return DriveApp.getFileById(TEMPLATE_PRESENTATION_ID);
      }, 'mengakses file template di Drive');
    } catch (err) {
      throw new Error('Gagal mengakses file template di Drive: ' + err.message);
    }

    try {
      copiedFile = withDriveRetry_(function() {
        return EXPORT_FOLDER_ID
          ? templateFile.makeCopy(exportName, DriveApp.getFolderById(EXPORT_FOLDER_ID))
          : templateFile.makeCopy(exportName);
      }, 'membuat copy template di Drive');
      Utilities.sleep(4500);
    } catch (err) {
      throw new Error('Gagal membuat copy template di Drive: ' + err.message);
    }
  }

  if (isAppendMode) {
    Utilities.sleep(3000);
  }

  try {
    presentation = withSlidesRetry_(function() {
      return SlidesApp.openById(copiedFile.getId());
    }, 'membuka presentasi ' + copiedFile.getId());
  } catch (err) {
    throw new Error('Gagal membuka copy presentasi: ' + err.message);
  }

  const allSlides = presentation.getSlides();

  if (allSlides.length < 5) {
    throw new Error('Template slide tidak lengkap. Minimal butuh 5 slide sumber.');
  }

  // ALWAYS reference the first 5 slides as master templates.
  // In append mode allSlides contains template slides + previously generated pages,
  // but indices 0-4 are always the original template slides (never removed until finalize).
  const templateSlides = allSlides.slice(0, 5);

  const masterSlides = {
    cover:         templateSlides[TPL_COVER],
    guide:         templateSlides[TPL_GUIDE],
    toc:           templateSlides[TPL_TOC],
    plainRight:    templateSlides[TPL_PLAIN_RIGHT] || templateSlides[TPL_PLAIN_FALLBACK],
    plainLeft:     templateSlides[TPL_PLAIN_LEFT]  || templateSlides[TPL_PLAIN_FALLBACK],
    plainFallback: templateSlides[TPL_PLAIN_FALLBACK] || templateSlides[TPL_PLAIN_RIGHT] || templateSlides[TPL_PLAIN_LEFT],
    // Session-open pages must always use the left chapter opener template.
    sessionOpenRight: templateSlides[TPL_GUIDE] || templateSlides[TPL_PLAIN_RIGHT] || templateSlides[TPL_PLAIN_FALLBACK],
    sessionOpenLeft:  templateSlides[TPL_TOC]   || templateSlides[TPL_PLAIN_LEFT]  || templateSlides[TPL_PLAIN_FALLBACK],
  };

  let pageNumber = resolveInitialPageNumber_(data);
  let generatedCount = 0;

  if (hasPages) {
    data.pages.forEach(function(page, index) {
      if (!page || !page.imageBase64) {
        return;
      }

      const pageRole = String(page.role || '').toLowerCase();
      const headerText = cleanText_(page.headerText || page.title || 'Kalananti');
      const displayPageNumber = resolveDisplayPageNumber_(page, pageNumber);
      const layoutPageNumber = Number(displayPageNumber) || pageNumber;
      const masterSlide = pickPageMasterSlide_(masterSlides, layoutPageNumber, pageRole, index);
      const slide = duplicateTemplateSlide_(presentation, masterSlide, 'page_' + pageRole + '_' + (index + 1));
      if (pageRole === 'blank') {
        makeSlideBlank_(slide);
      }
      const imageInserted = insertPageImageSafely_(presentation, slide, page, index + 1);

      if (pageRole !== 'blank' && pageRole !== 'cover' && imageInserted) {
        updateHeaderAndFooter_(slide, headerText || 'Kalananti', displayPageNumber);
      }

      generatedCount += 1;
      pageNumber += 1;

      if ((index + 1) % 2 === 0) {
        Utilities.sleep(800);
      }
    });

    try {
      if (finalizeExport) {
        removeTemplateSlides_(presentation, templateSlides);
      }
      Utilities.sleep(1000);
      presentation.saveAndClose();
      Utilities.sleep(1200);
    } catch (err) {
      throw new Error('Gagal menyimpan presentasi hasil export: ' + err.message);
    }

    const presentationId = copiedFile.getId();
    const presentationUrl = 'https://docs.google.com/presentation/d/' + presentationId + '/edit';
    return {
      success: true,
      presentationId: presentationId,
      presentationUrl: presentationUrl,
      title: copiedFile.getName(),
      slideCount: generatedCount,
      finalized: finalizeExport,
    };
  }

  let currentSlide = null;
  let currentY = Y_START_PT;
  let currentHeader = 'Kalananti';

  data.elements.forEach(function(el, index) {
    if (!el || !el.type) {
      return;
    }

    if (el.type === 'session_header') {
      currentHeader = buildSessionHeader_(el);
      currentSlide = duplicateTemplateSlide_(
        presentation,
        masterSlides.sessionOpenLeft || masterSlides.plainLeft || masterSlides.sessionOpenRight || masterSlides.plainFallback,
        'session_header'
      );
      generatedCount += 1;
      currentY = Y_START_PT;
      updateHeaderAndFooter_(currentSlide, currentHeader, pageNumber);
      pageNumber += 1;
      return;
    }

    const elementHeightPt = Math.max((Number(el.height) || 50) * PIXEL_TO_PT, 24);

    if (!currentSlide) {
      currentSlide = duplicateTemplateSlide_(
        presentation,
        pickContentMasterSlide_(masterSlides, pageNumber),
        'content_initial'
      );
      generatedCount += 1;
      currentY = Y_START_PT;
      updateHeaderAndFooter_(currentSlide, currentHeader, pageNumber);
      pageNumber += 1;
    }

    if (currentY + elementHeightPt > Y_START_PT + MAX_CONTENT_HEIGHT_PT) {
      currentSlide = duplicateTemplateSlide_(
        presentation,
        pickContentMasterSlide_(masterSlides, pageNumber),
        'content_overflow'
      );
      generatedCount += 1;
      currentY = Y_START_PT;
      updateHeaderAndFooter_(currentSlide, currentHeader, pageNumber);
      pageNumber += 1;
    }

    insertElement_(currentSlide, el, currentY, elementHeightPt, index);
    currentY += elementHeightPt + DEFAULT_ELEMENT_GAP_PT;
  });

  if (finalizeExport) {
    removeTemplateSlides_(presentation, templateSlides);
  }
  presentation.saveAndClose();

  const presentationId = copiedFile.getId();
  const presentationUrl = 'https://docs.google.com/presentation/d/' + presentationId + '/edit';
  return {
    success: true,
    presentationId: presentationId,
    presentationUrl: presentationUrl,
    title: copiedFile.getName(),
    slideCount: generatedCount,
    finalized: finalizeExport,
  };
}

function insertElement_(slide, el, currentY, elementHeightPt, index) {
  if (el.type === 'text') {
    const shape = slide.insertShape(
      SlidesApp.ShapeType.TEXT_BOX,
      X_MARGIN_PT,
      currentY,
      CONTENT_WIDTH_PT,
      elementHeightPt
    );
    const textValue = cleanText_(el.text || el.html || '');
    shape.getText().setText(textValue);
    tryApplyBasicTextStyle_(shape, el);
    return;
  }

  if (el.type === 'hybrid_component') {
    insertHybridComponent_(slide, el, currentY, elementHeightPt);
    return;
  }

  if (el.type === 'image') {
    insertImage_(slide, el, currentY, elementHeightPt, index);
    return;
  }

  const fallback = slide.insertShape(
    SlidesApp.ShapeType.TEXT_BOX,
    X_MARGIN_PT,
    currentY,
    CONTENT_WIDTH_PT,
    elementHeightPt
  );
  fallback.getText().setText(cleanText_(el.text || JSON.stringify(el)));
}

function insertHybridComponent_(slide, el, currentY, elementHeightPt) {
  const base64Value = String(el.shellBase64 || '');
  if (base64Value.indexOf('base64,') === -1) {
    throw new Error('shellBase64 tidak valid pada hybrid_component.');
  }

  const mimeMatch = base64Value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mimeType = mimeMatch && mimeMatch[1] ? mimeMatch[1] : 'image/png';
  const rawBase64 = base64Value.split('base64,')[1];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(rawBase64),
    mimeType,
    mimeType === 'image/jpeg' ? 'component-shell.jpg' : 'component-shell.png'
  );
  slide.insertImage(blob, X_MARGIN_PT, currentY, CONTENT_WIDTH_PT, elementHeightPt);

  const textPadding = 20;
  const textShape = slide.insertShape(
    SlidesApp.ShapeType.TEXT_BOX,
    X_MARGIN_PT + textPadding,
    currentY + textPadding,
    CONTENT_WIDTH_PT - (textPadding * 2),
    Math.max(elementHeightPt - (textPadding * 2), 24)
  );
  textShape.getText().setText(cleanText_(el.textContent || ''));
  tryApplyBasicTextStyle_(textShape, el);
}

function insertImage_(slide, el, currentY, elementHeightPt, index) {
  const imageUrl = resolveFetchableImageUrl_(el.src);
  if (!imageUrl) {
    throw new Error('URL gambar kosong pada element index ' + index);
  }

  try {
    if (imageUrl.indexOf('data:image/') === 0) {
      const base64Part = imageUrl.split('base64,')[1];
      if (!base64Part) {
        throw new Error('data URL gambar tidak valid');
      }
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Part), 'image/png', 'inline-image.png');
      slide.insertImage(blob, X_MARGIN_PT, currentY, CONTENT_WIDTH_PT, elementHeightPt);
      return;
    }

    const resp = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true, followRedirects: true });
    const code = resp.getResponseCode();
    if (code >= 400) {
      throw new Error('HTTP ' + code);
    }
    slide.insertImage(resp.getBlob(), X_MARGIN_PT, currentY, CONTENT_WIDTH_PT, elementHeightPt);
  } catch (err) {
    const notice = slide.insertShape(
      SlidesApp.ShapeType.TEXT_BOX,
      X_MARGIN_PT,
      currentY,
      CONTENT_WIDTH_PT,
      Math.max(elementHeightPt, 28)
    );
    notice.getText().setText('Gagal memuat gambar: ' + imageUrl);
    Logger.log('Gagal memuat gambar [' + index + ']: ' + imageUrl + ' | ' + err);
  }
}

function duplicateTemplateSlide_(presentation, templateSlide, label) {
  if (!templateSlide || typeof templateSlide.getObjectId !== 'function') {
    throw new Error('Master slide tidak valid untuk ' + (label || 'unknown'));
  }
  return withSlidesRetry_(function() {
    return presentation.appendSlide(templateSlide);
  }, 'duplikasi slide ' + (label || 'unknown'));
}

function makeSlideBlank_(slide) {
  try {
    slide.getPageElements().forEach(function(pageElement) {
      try {
        pageElement.remove();
      } catch (err) {
        Logger.log('Gagal menghapus elemen halaman blank: ' + err);
      }
    });
    slide.getBackground().setSolidFill('#FFFFFF');
  } catch (err) {
    Logger.log('Gagal menjadikan slide blank putih: ' + err);
  }
}

function resolveInitialPageNumber_(data) {
  const explicitStart = Number(data && data.pageNumberStart);
  if (explicitStart && explicitStart > 0) {
    return explicitStart;
  }

  if (data && Array.isArray(data.pages) && data.pages.length > 0) {
    const firstPage = data.pages[0];
    const explicitPageNumber = Number(firstPage && firstPage.pageNumber);
    if (explicitPageNumber && explicitPageNumber > 0) {
      return explicitPageNumber;
    }
    const indexedPageNumber = Number(firstPage && firstPage.index) + 1;
    if (indexedPageNumber > 0) {
      return indexedPageNumber;
    }
  }

  return 1;
}

function resolveDisplayPageNumber_(page, fallbackPageNumber) {
  if (!page) {
    return fallbackPageNumber;
  }

  const explicit = page.pageNumber;
  if (explicit !== null && typeof explicit !== 'undefined' && String(explicit).trim() !== '') {
    return String(explicit).trim();
  }

  const title = page.title;
  if (title !== null && typeof title !== 'undefined' && String(title).trim() !== '') {
    return String(title).trim();
  }

  return fallbackPageNumber;
}

function pickContentMasterSlide_(masterSlides, pageNumber) {
  if (pageNumber % 2 === 0) {
    return masterSlides.plainLeft || masterSlides.plainRight || masterSlides.plainFallback;
  }
  return masterSlides.plainRight || masterSlides.plainLeft || masterSlides.plainFallback;
}

function pickPageMasterSlide_(masterSlides, pageNumber, pageRole, index) {
  if (pageRole === 'cover'  && masterSlides.cover) return masterSlides.cover;
  if (pageRole === 'copyright' && masterSlides.guide) return masterSlides.guide;
  if (pageRole === 'ownership_notice' && masterSlides.toc) return masterSlides.toc;
  if (pageRole === 'guide'  && masterSlides.guide) return masterSlides.guide;
  if (pageRole === 'toc'    && masterSlides.toc)   return masterSlides.toc;
  if (pageRole === 'session_open') {
    return masterSlides.sessionOpenLeft || masterSlides.plainLeft || masterSlides.sessionOpenRight || masterSlides.plainFallback;
  }
  return pickContentMasterSlide_(masterSlides, pageNumber || (index + 1));
}

function insertPageImageSafely_(presentation, slide, page, pageIndex) {
  try {
    return insertPageImage_(presentation, slide, page);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    Logger.log('Gagal menaruh gambar pada halaman ' + pageIndex + ', export tetap dilanjutkan: ' + message);
    tryInsertImageFailureNotice_(slide, pageIndex, message);
    return false;
  }
}

function insertPageImage_(presentation, slide, page) {
  const base64Value = String(page.imageBase64 || '');
  if (base64Value.indexOf('base64,') === -1) {
    throw new Error('imageBase64 tidak valid pada page export.');
  }

  const mimeMatch = base64Value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mimeType = mimeMatch && mimeMatch[1] ? mimeMatch[1] : 'image/png';
  const rawBase64 = base64Value.split('base64,')[1];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(rawBase64),
    mimeType,
    mimeType === 'image/jpeg' ? 'page-export.jpg' : 'page-export.png'
  );

  const pageRole = String(page.role || '').toLowerCase();
  if (pageRole === 'blank') {
    Logger.log('Blank page image dilewati; template kosong dipakai.');
    return false;
  }

  const isFullBleed = pageRole === 'cover';

  if (isFullBleed) {
    // Cover can be edited manually from the template if image insertion is flaky.
    // Skipping it avoids failing the whole export on page 1.
    Logger.log('Cover image dilewati; template cover dibiarkan untuk edit manual.');
    return false;
  }

  withSlidesRetry_(function() {
    slide.insertImage(blob, X_MARGIN_PT, Y_START_PT, CONTENT_WIDTH_PT, MAX_CONTENT_HEIGHT_PT);
  }, 'insert gambar halaman');
  return true;
}

function tryInsertImageFailureNotice_(slide, pageIndex, message) {
  try {
    const notice = slide.insertShape(
      SlidesApp.ShapeType.TEXT_BOX,
      X_MARGIN_PT,
      Y_START_PT,
      CONTENT_WIDTH_PT,
      48
    );
    notice.getText().setText(
      'Gambar halaman ' + pageIndex + ' gagal dimasukkan otomatis.\n' +
      'Silakan edit manual. Detail: ' + String(message || '').slice(0, 160)
    );
  } catch (noticeErr) {
    Logger.log('Gagal menaruh notice halaman ' + pageIndex + ': ' + noticeErr);
  }
}

function withSlidesRetry_(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      const message = err && err.message ? err.message : String(err);
      Logger.log('Percobaan ' + attempt + ' gagal saat ' + label + ': ' + message);
      if (attempt < 4) {
        Utilities.sleep(900 * attempt);
      }
    }
  }
  throw new Error('Gagal saat ' + label + ' setelah retry: ' + (lastErr && lastErr.message ? lastErr.message : String(lastErr)));
}

function withDriveRetry_(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      const message = err && err.message ? err.message : String(err);
      Logger.log('Percobaan ' + attempt + ' gagal saat ' + label + ': ' + message);
      if (attempt < 5) {
        Utilities.sleep(1200 * attempt);
      }
    }
  }
  throw new Error('Gagal saat ' + label + ' setelah retry: ' + (lastErr && lastErr.message ? lastErr.message : String(lastErr)));
}

function removeTemplateSlides_(presentation, originalTemplateSlides) {
  // Only ever remove the first 5 slides (the original template masters).
  // In append-mode batches, originalTemplateSlides may contain previously generated
  // pages — passing a slice(0,5) ensures we never delete real content pages.
  const toRemove = originalTemplateSlides.slice(0, 5);
  for (let i = toRemove.length - 1; i >= 0; i -= 1) {
    toRemove[i].remove();
  }

  if (presentation.getSlides().length === 0) {
    presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  }
}

function isPageNumberShape_(shape, text) {
  const compactText = String(text || '').replace(/\s+/g, '');
  if (!compactText) {
    return false;
  }

  if (
    compactText.indexOf('{{PageNumber}}') > -1 ||
    compactText.indexOf('{{PageNum}}') > -1 ||
    compactText.indexOf('{{Page}}') > -1
  ) {
    return true;
  }

  // The template footer placeholders have historically been hard-coded sample
  // page numbers (for example 311). Treat short numeric-only footer shapes near
  // the bottom of the slide as page-number placeholders too.
  if (/^3\d{2}$/.test(compactText)) {
    return true;
  }

  if (/^\d{1,4}$/.test(compactText) || /^[ivxlcdm]{1,8}$/i.test(compactText)) {
    try {
      return shape.getTop() > 18 * CM_TO_PT;
    } catch (err) {
      return false;
    }
  }

  return false;
}

function updatePageNumberText_(textRange, pageNum) {
  const value = String(pageNum);
  const text = textRange.asString();
  const compactText = String(text || '').replace(/\s+/g, '');

  if (compactText.indexOf('{{PageNumber}}') > -1) textRange.replaceAllText('{{PageNumber}}', value);
  if (compactText.indexOf('{{PageNum}}') > -1) textRange.replaceAllText('{{PageNum}}', value);
  if (compactText.indexOf('{{Page}}') > -1) textRange.replaceAllText('{{Page}}', value);
  if (text.indexOf('311') > -1) textRange.replaceAllText('311', value);

  const afterReplace = textRange.asString();
  const afterCompact = String(afterReplace || '').replace(/\s+/g, '');
  if (
    afterCompact === compactText &&
    (/^3\d{2}$/.test(compactText) || /^\d{1,4}$/.test(compactText) || /^[ivxlcdm]{1,8}$/i.test(compactText))
  ) {
    textRange.setText(value);
  }
}

function updateHeaderAndFooterInShape_(shape, headerText, pageNum) {
  try {
    const textRange = shape.getText();
    const text = textRange.asString();
    const compactText = String(text || '').replace(/\s+/g, '');

    if (
      compactText.indexOf('{{Header}}') > -1 ||
      compactText.indexOf('{{Header') > -1 ||
      compactText.indexOf('Header}}') > -1
    ) {
      textRange.setText(headerText);
      shape.setLeft(HEADER_X_PT);
      shape.setTop(HEADER_Y_PT);
      shape.setWidth(HEADER_WIDTH_PT);
      shape.setHeight(HEADER_HEIGHT_PT);
      try {
        textRange.getTextStyle().setFontFamily('Poppins');
      } catch (err) {
        // Template style is still usable if Apps Script cannot apply this font.
      }
    }

    if (isPageNumberShape_(shape, text)) {
      updatePageNumberText_(textRange, pageNum);
    }
  } catch (err) {
    // Some page elements are decorative shapes without editable text.
  }
}

function updateHeaderAndFooterInElement_(pageElement, headerText, pageNum) {
  try {
    const elementType = pageElement.getPageElementType();
    if (elementType === SlidesApp.PageElementType.SHAPE) {
      updateHeaderAndFooterInShape_(pageElement.asShape(), headerText, pageNum);
      return;
    }

    if (elementType === SlidesApp.PageElementType.GROUP) {
      pageElement.asGroup().getChildren().forEach(function(child) {
        updateHeaderAndFooterInElement_(child, headerText, pageNum);
      });
    }
  } catch (err) {
    Logger.log('Lewati page element saat update header/footer: ' + err);
  }
}

function updateHeaderAndFooter_(slide, headerText, pageNum) {
  slide.getPageElements().forEach(function(pageElement) {
    updateHeaderAndFooterInElement_(pageElement, headerText, pageNum);
  });
}

function buildSessionHeader_(el) {
  const level = cleanText_(el.level || '').trim();
  const topic = cleanText_(el.topic || el.title || '').trim();

  if (level && topic) {
    return 'Session ' + level + ' - ' + topic;
  }
  if (topic) {
    return topic;
  }
  if (level) {
    return 'Session ' + level;
  }
  return 'Kalananti';
}

function buildPresentationName_(data) {
  const course = cleanSlugPart_(data.course || 'course');
  const level = cleanSlugPart_(data.level || 'all');
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  return course + '_level_' + level + '_slides_' + stamp;
}

function cleanSlugPart_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'untitled';
}

function cleanText_(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function tryApplyBasicTextStyle_(shape, el) {
  const textRange = shape.getText();
  const text = textRange.asString();
  if (!text) {
    return;
  }

  const style = textRange.getTextStyle();
  style.setFontFamily('Arial');
  style.setFontSize(12);

  if (String(el.html || '').indexOf('<strong>') > -1 || /^[0-9]+\./.test(text.trim())) {
    style.setBold(false);
  }
}

function resolveFetchableImageUrl_(src) {
  if (!src) {
    return '';
  }

  const raw = String(src).trim();
  if (!raw) {
    return '';
  }

  if (raw.indexOf('data:image/') === 0) {
    return raw;
  }

  const proxiedMatch = raw.match(/[?&]src=([^&]+)/);
  if (proxiedMatch && proxiedMatch[1]) {
    return decodeURIComponent(proxiedMatch[1]);
  }

  return raw;
}

function normalizeExportPayload_(body) {
  const payload = body && body.payload ? body.payload : body;
  return {
    course: payload && payload.course ? payload.course : body.course,
    level: payload && payload.level ? payload.level : body.level,
    presentationId: payload && payload.presentationId ? payload.presentationId : body.presentationId,
    pageNumberStart: payload && payload.pageNumberStart ? payload.pageNumberStart : body.pageNumberStart,
    finalizeExport: payload && typeof payload.finalizeExport !== 'undefined' ? payload.finalizeExport : body.finalizeExport,
    pages: Array.isArray(payload && payload.pages) ? payload.pages : (Array.isArray(body.pages) ? body.pages : []),
    elements: Array.isArray(payload && payload.elements) ? payload.elements : [],
  };
}

function parseRequestBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) {
    throw new Error('Body POST kosong.');
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('Body POST bukan JSON yang valid.');
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
