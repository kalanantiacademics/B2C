import base64
import json
import subprocess
import time
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = Path('/private/tmp/kalananti-scl-phase5-preview/index.html')
APP_PREVIEW = Path('/private/tmp/kalananti-scl-phase1-preview/index.html')
OUTPUT = Path('/private/tmp/kalananti-scl-phase6-qc')
ANSWER_SENTINEL = 'SYNTHETIC_ANSWER_MUST_NOT_APPEAR'
COURSES = (
    ('roblox', 'Roblox Studio', 'ROBLOX STUDIO'),
    ('scratch', 'Scratch', 'SCRATCH'),
    ('python', 'Python', 'PYTHON'),
)


def fixture_png():
    image = Image.new('RGB', (2400, 1200), '#dbeafe')
    draw = ImageDraw.Draw(image)
    draw.rectangle((40, 40, 2360, 1160), outline='#2a4365', width=24)
    draw.text((110, 510), 'SYNTHETIC COURSE IMAGE - HIGH RESOLUTION', fill='#2a4365')
    target = OUTPUT / 'fixture-image.png'
    image.save(target, format='PNG')
    return target.read_bytes()


def fixture_portrait_png():
    image = Image.new('RGB', (1200, 2400), '#fff7d6')
    draw = ImageDraw.Draw(image)
    draw.rectangle((30, 30, 1170, 2370), outline='#2a4365', width=24)
    draw.line((30, 30, 1170, 2370), fill='#f07d49', width=20)
    draw.line((1170, 30, 30, 2370), fill='#4caae4', width=20)
    draw.text((110, 1160), 'FULL PORTRAIT IMAGE', fill='#2a4365')
    target = OUTPUT / 'fixture-portrait-image.png'
    image.save(target, format='PNG')
    return target.read_bytes()


def project_script(label, cover_label, image_url):
    return """({label, coverLabel, imageUrl, sentinel}) => {
      const paragraph = 'Eksperimen terarah, refleksi, dan penjelasan keputusan desain.';
      const sessions = Array.from({length: 12}, (_, index) => ({
        rowKey: 'fixture::1::' + (index + 1), session: String(index + 1), status: 'Ready',
        topic: 'Golden QA session ' + (index + 1),
        fields: {
          objectives: {text: 'Memahami konsep dan menjelaskan hasil.'},
          materials: {text: index === 0 ? paragraph + '\\n' + imageUrl : paragraph},
          must_do: {text: 'Selesaikan target utama.'},
          should_do: {text: 'Tambahkan pengayaan.'},
          aspire_to_do: {text: 'Coba tantangan lanjutan.'},
          'self-check': {text: 'Saya dapat menjelaskan proses.'},
          quiz_questions: {text: '1. Mengapa pengujian diperlukan?'},
          quiz_options: {text: 'A. Menemukan perbaikan|B. Menghapus proses'}
        },
        materialBlocks: index === 0
          ? [{type: 'paragraph', text: paragraph}, {type: 'image', text: imageUrl}]
          : [{type: 'paragraph', text: paragraph}],
        tables: index === 5 ? [{tableId: 'golden-table', table: {
          caption: 'Golden QA table', headers: ['Case', 'Expected'],
          rows: Array.from({length: 7}, (_, row) => ['Case ' + (row + 1), 'Preserved'])
        }}] : []
      }));
      return {course: {label, coverLabel}, level: '1', sessions, serverOnly: {answer: sentinel}};
    }""", {'label': label, 'coverLabel': cover_label, 'imageUrl': image_url, 'sentinel': ANSWER_SENTINEL}


def extract_pdf_metrics(pdf_path, expected_pages, required_text='Golden QA session 12'):
    reader = PdfReader(str(pdf_path))
    assert len(reader.pages) == expected_pages
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    first = reader.pages[0].mediabox
    width = float(first.width)
    height = float(first.height)
    assert abs(width - 595.28) < 1.0 and abs(height - 841.89) < 1.0
    assert ANSWER_SENTINEL not in text
    assert required_text in text
    assert len(text.strip()) > 500
    legal_close_positions = []

    def record_legal_close(text_value, _cm, tm, _font, _font_size):
        if 'Hak cipta buku ini dilindungi' in ' '.join(text_value.split()):
            legal_close_positions.append(float(tm[5]))

    reader.pages[2].extract_text(visitor_text=record_legal_close)
    assert legal_close_positions and min(legal_close_positions) >= 80
    assert 'Hak cipta buku ini dilindungi' not in (reader.pages[3].extract_text() or '')
    return {'pages': len(reader.pages), 'mediaBoxPt': [round(width, 2), round(height, 2)],
            'textCharacters': len(text), 'legalCloseMinY': round(min(legal_close_positions), 2)}


def main():
    subprocess.run(['node', 'scripts/build-phase5-preview.mjs'], cwd=ROOT, check=True)
    subprocess.run(['node', 'scripts/build-local-preview.mjs'], cwd=ROOT, check=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    image_bytes = fixture_png()
    portrait_image_bytes = fixture_portrait_png()
    results = {}
    console_errors = []
    page_errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 1000}, device_scale_factor=1)
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        page.route('https://fixture.invalid/golden.png', lambda route: route.fulfill(status=200, content_type='image/png', body=image_bytes))
        page.route('https://fixture.invalid/portrait.png', lambda route: route.fulfill(status=200, content_type='image/png', body=portrait_image_bytes))
        page.route('https://fixture.invalid/broken.png', lambda route: route.abort('failed'))
        page.goto(PREVIEW.as_uri(), wait_until='load')

        reported_layout = page.evaluate("""async () => {
          const paragraph = 'Halo Kreator! Selamat datang di Planet Koda dan ikuti langkah pembelajarannya.';
          const project = {course: {label: 'Roblox Studio', coverLabel: 'ROBLOX STUDIO'}, level: '1', sessions: [{
            rowKey: 'layout::1::1', session: '1', status: 'Ready', topic: 'Intro & Instance.new',
            fields: {
              objectives: {text: [
                'Review basic scripting di Roblox Studio.',
                'Membuat object baru menggunakan Instance.new().',
                'Mengatur Parent agar object muncul di Workspace.'
              ].join('\\n')},
              materials: {text: [
                paragraph,
                paragraph,
                'https://fixture.invalid/portrait.png',
                'Tahap 2: Membuat Script Pertama',
                '1. Buka Roblox Studio dan pilih Baseplate.',
                '2. Tambahkan script baru ke dalam Workspace.',
                '3. Jalankan project dan periksa hasilnya.',
                '4. Bayangkan Baseplate ini sebagai pulau pertama.',
                'https://fixture.invalid/golden.png',
                'Tahap 3: Lanjutkan Eksperimen',
                'Pastikan seluruh gambar dan langkah tetap terlihat.'
              ].join('\\n')}
            },
            materialBlocks: [
              {type: 'paragraph', text: paragraph},
              {type: 'paragraph', text: paragraph},
              {type: 'image', text: 'https://fixture.invalid/portrait.png', displayWidthPercent: 100},
              {type: 'section-heading', text: 'Tahap 2: Membuat Script Pertama'},
              {type: 'numbered-item', text: '1. Buka Roblox Studio dan pilih Baseplate.'},
              {type: 'numbered-item', text: '2. Tambahkan script baru ke dalam Workspace.'},
              {type: 'numbered-item', text: '3. Jalankan project dan periksa hasilnya.'},
              {type: 'numbered-item', text: '4. Bayangkan Baseplate ini sebagai pulau pertama.'},
              {type: 'image', text: 'https://fixture.invalid/golden.png'},
              {type: 'section-heading', text: 'Tahap 3: Lanjutkan Eksperimen'},
              {type: 'paragraph', text: 'Pastikan seluruh gambar dan langkah tetap terlihat.'}
            ], tables: []
          }]};
          const rendered = SclPublisher.render(project);
          const prepared = await SclPublisher.preparePrint(rendered, [{
            index: 0, ok: true, mime: 'image/png', bytes: 15000, width: 1200, height: 2400
          }, {
            index: 1, ok: true, mime: 'image/png', bytes: 15000, width: 2400, height: 1200
          }]);
          const title = document.querySelector('.a4-role-opener .a4-opener-topic');
          const header = document.querySelector('.a4-session-header');
          const images = [...document.querySelectorAll('.a4-image-block img')];
          const image = images[0];
          const block = image.closest('.a4-image-block');
          const defaultImage = images[1];
          const defaultBlock = defaultImage.closest('.a4-image-block');
          const body = image.closest('.a4-page-body, .a4-opener-flow');
          const imageRect = image.getBoundingClientRect();
          const bodyRect = body.getBoundingClientRect();
          const contentWithinSafeBounds = [...document.querySelectorAll('.a4-page-body, .a4-opener-flow')]
            .every(container => {
              const containerRect = container.getBoundingClientRect();
              const style = getComputedStyle(container);
              const safeBottom = containerRect.bottom - (parseFloat(style.paddingBottom) || 0) + 1;
              const safeRight = containerRect.right - (parseFloat(style.paddingRight) || 0) + 1;
              return [...container.querySelectorAll('.a4-content-block, .step-content-item, img, table, pre')]
                .every(node => {
                  if (node.hidden) return true;
                  const rect = node.getBoundingClientRect();
                  return !rect.width || !rect.height || (rect.bottom <= safeBottom && rect.right <= safeRight);
                });
            });
          return {
            pageCount: prepared.pageCount,
            ready: prepared.printReady,
            blocking: prepared.blocking,
            titleUnclipped: title.textContent === 'Intro & Instance.new'
              && title.scrollHeight <= title.clientHeight + 1,
            headerTopPx: parseFloat(getComputedStyle(header).top),
            headerCentered: getComputedStyle(header).alignContent === 'center'
              && Math.abs(parseFloat(getComputedStyle(header).top) - (1.28 * 96 / 2.54)) < 0.2,
            imageAutoFitted: block.dataset.requestedWidthPercent === '100'
              && block.dataset.renderWidthPercent === '45'
              && block.dataset.autoFitted === 'true',
            imageUncropped: getComputedStyle(image).objectFit === 'contain'
              && Math.abs((imageRect.width / imageRect.height) - 0.5) < 0.01
              && imageRect.top >= bodyRect.top - 1 && imageRect.bottom <= bodyRect.bottom + 1,
            defaultImageSixtyNine: defaultBlock.dataset.requestedWidthPercent === '69'
              && defaultBlock.dataset.renderWidthPercent === '69',
            defaultImageCentered: Math.abs(
              (defaultBlock.getBoundingClientRect().left + defaultBlock.getBoundingClientRect().width / 2) -
              (defaultBlock.closest('.a4-page-body, .a4-opener-flow').getBoundingClientRect().left +
                defaultBlock.closest('.a4-page-body, .a4-opener-flow').getBoundingClientRect().width / 2)
            ) <= 1,
            contentWithinSafeBounds,
            stepThreeVisible: document.body.innerText.includes('Tahap 3')
              && document.body.innerText.includes('Pastikan seluruh gambar dan langkah tetap terlihat.'),
            imagePage: image.closest('.a4-page').dataset.physicalPage,
            defaultImagePage: defaultImage.closest('.a4-page').dataset.physicalPage,
            hiddenOverflow: [...document.querySelectorAll('.a4-page-overlay, .a4-page-body, .a4-opener-flow')]
              .some(node => node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1
                || ((node.classList.contains('a4-page-body') || node.classList.contains('a4-opener-flow'))
                  && SclPublisher.__test.contentBoundsOverflow(node))),
            diagnostics: prepared.diagnostics
          };
        }""")
        assert reported_layout['ready'] and not reported_layout['blocking']
        assert reported_layout['titleUnclipped'] and reported_layout['headerCentered']
        assert reported_layout['imageAutoFitted'] and reported_layout['imageUncropped']
        assert reported_layout['defaultImageSixtyNine'] and reported_layout['defaultImageCentered']
        assert reported_layout['contentWithinSafeBounds']
        assert reported_layout['stepThreeVisible']
        assert reported_layout['hiddenOverflow'] is False
        page.locator('#publisherCanvas').evaluate("el => { el.style.maxHeight = 'none'; el.style.overflow = 'visible'; }")
        page.locator('.a4-role-opener').screenshot(path=str(OUTPUT / 'reported-opener-title.png'))
        page.locator(f'.a4-page[data-physical-page="{reported_layout["imagePage"]}"]').screenshot(
            path=str(OUTPUT / 'reported-auto-fit-image-page.png')
        )
        page.locator(f'.a4-page[data-physical-page="{reported_layout["defaultImagePage"]}"]').screenshot(
            path=str(OUTPUT / 'reported-default-69-image-page.png')
        )
        page.emulate_media(media='print')
        reported_pdf_path = OUTPUT / 'reported-layout-regression.pdf'
        page.pdf(path=str(reported_pdf_path), print_background=True, prefer_css_page_size=True)
        page.emulate_media(media='screen')
        reported_pdf_metrics = extract_pdf_metrics(
            reported_pdf_path, reported_layout['pageCount'], 'Intro & Instance.new'
        )
        subprocess.run([
            'swift', 'scripts/render_pdf_contact_sheet.swift', str(reported_pdf_path),
            str(OUTPUT / 'reported-pdf-contact-sheet.png')
        ], cwd=ROOT, check=True)

        broken = page.evaluate("""async () => {
          const project = {course: {label: 'Broken', coverLabel: 'BROKEN'}, level: '1', sessions: [{
            rowKey: 'broken::1::1', session: '1', status: 'Ready', topic: 'Broken image',
            fields: {materials: {text: 'https://fixture.invalid/broken.png'}},
            materialBlocks: [{type: 'image', text: 'https://fixture.invalid/broken.png', displayWidthPercent: 50}]
          }]};
          const rendered = SclPublisher.render(project);
          const prepared = await SclPublisher.preparePrint(rendered, [{index: 0, ok: false, code: 'IMAGE_FETCH_FAILED'}], {timeoutMs: 1000});
          return {ready: prepared.printReady, blocking: prepared.blocking,
            placeholder: !document.querySelector('.a4-image-placeholder').hidden,
            actionableDiagnostic: prepared.diagnostics.some(item => item.code === 'IMAGE_READINESS_COUNT_MISMATCH' && item.blocking)
              && document.querySelector('#publisherDiagnostics').innerText.includes('Preflight diblokir')};
        }""")
        assert broken == {'ready': False, 'blocking': True, 'placeholder': True, 'actionableDiagnostic': True}
        expected_failure_console = list(console_errors)
        console_errors.clear()

        permission_preflight = page.evaluate("""async () => {
          const project = {course: {label: 'Permission', coverLabel: 'PERMISSION'}, level: '1', sessions: [{
            rowKey: 'permission::1::1', session: '1', status: 'Ready', topic: 'Permission image',
            fields: {materials: {text: 'https://fixture.invalid/permission.png'}},
            materialBlocks: [{type: 'image', text: 'https://fixture.invalid/permission.png', displayWidthPercent: 69}]
          }]};
          const rendered = SclPublisher.render(project);
          const failures = Array.from({length: 3}, (_, index) => ({index, ok: false, code: 'IMAGE_FETCH_PERMISSION_REQUIRED'}));
          const prepared = await SclPublisher.preparePrint(rendered, failures, {timeoutMs: 1000});
          return {
            ready: prepared.printReady,
            permissionDiagnosticCount: prepared.diagnostics.filter(item => item.code === 'IMAGE_FETCH_PERMISSION_REQUIRED').length,
            actionable: document.querySelector('#publisherDiagnostics').innerText.includes('Deployment owner harus mengotorisasi scope external request')
          };
        }""")
        assert permission_preflight == {'ready': False, 'permissionDiagnosticCount': 1, 'actionable': True}
        expected_failure_console.extend(console_errors)
        console_errors.clear()

        for key, label, cover_label in COURSES:
            project_factory, args = project_script(label, cover_label, 'https://fixture.invalid/golden.png')
            started = time.perf_counter()
            rendered = page.evaluate(f"({project_factory})", args)
            # The factory result crosses the boundary; render and readiness remain in browser DOM.
            result = page.evaluate("""async project => {
              const rendered = SclPublisher.render(project);
              const prepared = await SclPublisher.preparePrint(rendered, [{index: 0, ok: true, mime: 'image/png', bytes: 15000, width: 2400, height: 1200}]);
              return {pageCount: prepared.pageCount, ready: prepared.printReady, expected: prepared.expectedImages,
                rendered: prepared.renderedImages, blocking: prepared.blocking, acknowledgement: Boolean(prepared.requiresAcknowledgement),
                diagnostics: prepared.diagnostics,
                openerLeft: [...document.querySelectorAll('.a4-role-opener')].every(node => node.dataset.side === 'left'),
                backCover: document.querySelectorAll('.a4-role-back-cover').length === 1,
                duplicateIds: [...document.querySelectorAll('[id]')].length !== new Set([...document.querySelectorAll('[id]')].map(node => node.id)).size,
                imageAlt: [...document.querySelectorAll('.a4-image-block img')].every(node => node.alt.trim().length > 0),
                defaultImageSixtyNine: [...document.querySelectorAll('.a4-image-block')]
                  .every(node => node.dataset.requestedWidthPercent === '69' && node.dataset.renderWidthPercent === '69'),
                contentBoundsOverflow: [...document.querySelectorAll('.a4-page-body, .a4-opener-flow')]
                  .filter(node => SclPublisher.__test.contentBoundsOverflow(node))
                  .map(node => node.closest('.a4-page').dataset.physicalPage),
                overflowNodes: [...document.querySelectorAll('.a4-page-overlay, .a4-page-body, .a4-opener-flow')]
                  .filter(node => node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1)
                  .map(node => ({page: node.closest('.a4-page').dataset.physicalPage, role: node.closest('.a4-page').dataset.role,
                    className: node.className, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight,
                    clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
                    children: [...node.children].map(child => ({className: child.className, height: child.getBoundingClientRect().height,
                      top: child.offsetTop, scrollHeight: child.scrollHeight})),
                    images: [...node.querySelectorAll('img')].map(image => ({width: image.getBoundingClientRect().width,
                      height: image.getBoundingClientRect().height, aspectRatio: getComputedStyle(image).aspectRatio,
                      complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight}))}))};
            }""", rendered)
            if not result['ready'] or result['blocking']:
                print(json.dumps({'course': key, 'printPreparation': result}, indent=2))
            assert result['ready'] and not result['blocking']
            assert result['expected'] == 1 and result['rendered'] == 1
            assert result['openerLeft'] and result['backCover'] and result['imageAlt'] and not result['duplicateIds']
            assert result['defaultImageSixtyNine'] and result['contentBoundsOverflow'] == [] and result['overflowNodes'] == []
            page.locator('#publisherCanvas').evaluate("el => { el.style.maxHeight = 'none'; el.style.overflow = 'visible'; }")
            page.locator('.a4-role-cover').screenshot(path=str(OUTPUT / f'{key}-cover.png'))
            page.locator('.a4-role-opener[data-session="12"]').screenshot(path=str(OUTPUT / f'{key}-session-12.png'))
            page.locator('.a4-role-back-cover').screenshot(path=str(OUTPUT / f'{key}-back-cover.png'))
            page.locator('.a4-page').evaluate_all("nodes => nodes.forEach(node => { node.style.zoom = '0.14'; })")
            page.locator('#publisherCanvas').screenshot(path=str(OUTPUT / f'{key}-all-pages-contact-sheet.png'))
            page.locator('.a4-page').evaluate_all("nodes => nodes.forEach(node => { node.style.zoom = ''; })")
            pdf_path = OUTPUT / f'golden-{key}.pdf'
            page.emulate_media(media='print')
            page.pdf(path=str(pdf_path), print_background=True, prefer_css_page_size=True)
            page.emulate_media(media='screen')
            metrics = extract_pdf_metrics(pdf_path, result['pageCount'])
            result.update(metrics)
            result['composeAndPdfSeconds'] = round(time.perf_counter() - started, 2)
            results[key] = result

        low_dpi = page.evaluate("""async () => {
          const project = {course: {label: 'DPI', coverLabel: 'DPI'}, level: '1', sessions: [{
            rowKey: 'dpi::1::1', session: '1', status: 'Ready', topic: 'DPI warning',
            fields: {materials: {text: 'https://fixture.invalid/golden.png'}},
            materialBlocks: [{type: 'image', text: 'https://fixture.invalid/golden.png', displayWidthPercent: 100}]
          }]};
          const rendered = SclPublisher.render(project);
          const prepared = await SclPublisher.preparePrint(rendered, [{index: 0, ok: true, mime: 'image/png', bytes: 1000, width: 200, height: 100}]);
          return {ready: prepared.printReady, acknowledgement: prepared.requiresAcknowledgement,
            warning: prepared.diagnostics.some(item => item.code === 'IMAGE_DPI_VERY_LOW' && !item.blocking)};
        }""")
        assert low_dpi == {'ready': True, 'acknowledgement': True, 'warning': True}

        app_console_errors = []
        app_page_errors = []
        app_page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        app_page.on('console', lambda message: app_console_errors.append(message.text) if message.type == 'error' else None)
        app_page.on('pageerror', lambda error: app_page_errors.append(str(error)))
        app_page.route('https://fixture.invalid/batch/**', lambda route: route.fulfill(
            status=200, content_type='image/png', body=image_bytes,
        ))
        app_page.goto(APP_PREVIEW.as_uri(), wait_until='domcontentloaded')
        app_page.fill('#passcode', 'synthetic-success')
        app_page.fill('#editorLabel', 'Synthetic Editor')
        app_page.click('#loginButton')
        app_page.wait_for_selector('.course-card:not([disabled])')
        app_page.click('.course-card')
        app_page.wait_for_selector('.level-card')
        app_page.click('.level-card')
        app_page.wait_for_selector('.session-card')
        app_page.click('.session-card')
        app_page.wait_for_selector('#sessionEditorPanel:not([hidden])')
        updated_topic = 'M6 SAVED DRAFT APPEARS IN FULL LEVEL PDF'
        app_page.fill('#sessionTopicInput', updated_topic)
        app_page.evaluate('window.__phase1PublishingFixtureReady = true')
        app_page.click('#closeSessionButton')
        app_page.wait_for_selector('#sessionEditorPanel', state='hidden')
        app_page.evaluate("""() => {
          const saved = window.__phase1SavedSessions['1'] || {};
          saved.materials = {
            text: Array.from({length: 101}, (_, index) =>
              'https://fixture.invalid/batch/image-' + String(index + 1) + '.png').join('\\n'),
            runs: []
          };
          window.__phase1SavedSessions['1'] = saved;
        }""")
        app_page.click('#composeModuleButton')
        app_page.wait_for_function(
            "document.getElementById('publisherCanvas').dataset.expectedImages === '101' || document.getElementById('printModuleButton').textContent.startsWith('Print diblokir')",
            timeout=180000,
        )
        app_flow = app_page.evaluate("""updatedTopic => ({
          rpcCounts: window.__phase1RpcCounts,
          rpcOrder: window.__phase1RpcOrder,
          topicInPublisher: [...document.querySelectorAll('.a4-role-opener[data-session="1"]')]
            .some(node => node.textContent.includes(updatedTopic)),
          filename: document.getElementById('publisherFilename').textContent,
          instructions: document.getElementById('publisherPrintHelp').textContent,
          printReady: document.getElementById('publisherCanvas').dataset.printReady,
          printButtonText: document.getElementById('printModuleButton').textContent,
          printButtonDisabled: document.getElementById('printModuleButton').disabled,
          preflightRpcCount: window.__phase1RpcCounts.preflightImages,
          maxPreflightBatch: window.__phase1RpcCounts.maxPreflightBatch,
          pageCount: document.querySelectorAll('#publisherCanvas .a4-page').length,
          expectedImages: Number(document.getElementById('publisherCanvas').dataset.expectedImages),
          renderedImages: Number(document.getElementById('publisherCanvas').dataset.renderedImages),
          diagnostics: document.getElementById('publisherDiagnostics').innerText
        })""", updated_topic)
        if app_flow['printReady'] != 'true':
            print(json.dumps({'batchedAppFlowFailure': app_flow}, indent=2))
        assert app_flow['rpcCounts']['saveSessionPatch'] == 1
        assert app_flow['rpcCounts']['loadLevelProject'] == 2
        assert app_flow['rpcOrder'][-2:] == ['save', 'load']
        assert app_flow['topicInPublisher'] and app_flow['printReady'] == 'true'
        assert app_flow['printButtonText'] == 'Print / Save as PDF' and app_flow['printButtonDisabled'] is False
        assert app_flow['preflightRpcCount'] == 6 and app_flow['maxPreflightBatch'] == 20
        assert app_flow['expectedImages'] == 101 and app_flow['renderedImages'] == 101
        assert app_flow['filename'] == 'Kalananti-SCL-ROBLOX-Level-1.pdf'
        assert 'Scale 100%' in app_flow['instructions'] and 'Headers and footers nonaktif' in app_flow['instructions']
        app_page.emulate_media(media='print')
        print_visibility = app_page.evaluate("""() => ({
          chromeHidden: getComputedStyle(document.getElementById('composeModuleButton')).visibility === 'hidden',
          canvasVisible: getComputedStyle(document.getElementById('publisherCanvas')).visibility === 'visible',
          pageVisible: getComputedStyle(document.querySelector('#publisherCanvas .a4-page')).visibility === 'visible'
        })""")
        assert all(print_visibility.values())
        batched_pdf_path = OUTPUT / 'batched-101-images.pdf'
        app_page.pdf(path=str(batched_pdf_path), print_background=True, prefer_css_page_size=True)
        batched_pdf_metrics = extract_pdf_metrics(batched_pdf_path, app_flow['pageCount'], updated_topic)
        app_page.close()
        assert app_console_errors == [] and app_page_errors == []
        if console_errors or page_errors:
            print(json.dumps({'consoleErrors': console_errors, 'pageErrors': page_errors}, indent=2))
        assert console_errors == [] and page_errors == []
        browser.close()

    summary = {'courses': results, 'reportedLayoutRegression': reported_layout,
               'reportedActualPdf': reported_pdf_metrics,
               'brokenImage': broken, 'permissionPreflight': permission_preflight, 'lowDpi': low_dpi,
               'savedDraftPublishing': app_flow, 'printVisibility': print_visibility,
               'batchedImagePdf': batched_pdf_metrics,
               'appConsoleErrors': app_console_errors, 'appPageErrors': app_page_errors,
               'expectedFailureConsoleCount': len(expected_failure_console),
               'consoleErrors': console_errors, 'pageErrors': page_errors}
    (OUTPUT / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
