import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = Path('/private/tmp/kalananti-scl-phase5-preview/index.html')
OUTPUT = Path('/private/tmp/kalananti-scl-phase5-qc')


def main():
    subprocess.run(['node', 'scripts/build-phase5-preview.mjs'], cwd=ROOT, check=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    console_errors = []
    page_errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 1000})
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        page.goto(PREVIEW.as_uri(), wait_until='load')
        page.evaluate("() => document.fonts.ready")
        result = page.evaluate("""async () => {
          const longTopic = 'Membangun proyek kreatif dengan algoritma, kolaborasi, pengujian, refleksi, dan iterasi desain yang berkelanjutan';
          const paragraph = 'Pelajari konsep melalui eksperimen terarah, catat hasilnya, lalu jelaskan keputusan desain kepada teman satu tim.';
          const fields = {
            objectives: {text: Array(5).fill(paragraph).join('\\n')},
            materials: {text: Array(18).fill(paragraph).join('\\n')},
            must_do: {text: Array(4).fill('Selesaikan target utama dan verifikasi hasilnya.').join('\\n')},
            should_do: {text: 'Tambahkan satu pengayaan yang relevan.'},
            aspire_to_do: {text: 'Bangun tantangan lanjutan secara mandiri.'},
            'self-check': {text: 'Saya dapat menjelaskan proses dan hasil karya.'},
            kamus_coder: {text: 'Algorithm: urutan instruksi untuk menyelesaikan masalah.'},
            for_your_knowledge: {text: 'Iterasi membantu kita memperbaiki solusi berdasarkan bukti.'},
            quiz_questions: {text: '1. Mengapa kita perlu menguji proyek?'},
            quiz_options: {text: 'A. Untuk menemukan perbaikan|B. Untuk melewati proses|C. Untuk menghapus refleksi'}
          };
          const sessions = Array.from({length: 12}, (_, index) => ({
            rowKey: 'fixture::1::' + (index + 1), session: String(index + 1), status: 'Ready',
            topic: index === 0 ? 'Intro & Instance.new' : (index === 11 ? longTopic : 'Creative coding project part ' + (index + 1)),
            fields: JSON.parse(JSON.stringify(fields)), tables: index === 5 ? [{tableId: 'table-1', table: {caption: 'Test matrix', headers: ['Case', 'Expected'], rows: Array.from({length: 8}, (_, row) => ['Case ' + (row + 1), 'Pass without clipping'])}}] : []
          }));
          const project = {course: {label: 'Roblox Studio', coverLabel: 'ROBLOX STUDIO'}, level: '1', sessions};
          const forced = SclPublisher.render(project, {maxIterations: 5, forceTocInstability: true});
          await document.fonts.ready;
          const rendered = SclPublisher.render(project);
          const openers = [...document.querySelectorAll('.a4-role-opener')];
          const fillers = [...document.querySelectorAll('.a4-role-filler')];
          const leftNumber = document.querySelector('.a4-role-content-left .a4-page-number');
          const rightNumber = document.querySelector('.a4-role-content-right .a4-page-number');
          const sessionHeader = document.querySelector('.a4-role-content-left .a4-session-header');
          const shortWrappedTitle = document.querySelector('.a4-role-opener[data-session="1"] .a4-opener-topic');
          const plainContent = document.querySelector('.a4-role-content-right .a4-content-block:not(.a4-must-do):not(.a4-self-check):not(.a4-should-do):not(.a4-aspire):not(.a4-tutor-says):not(.a4-did-you-know):not(.a4-table-block)');
          const pages = [...document.querySelectorAll('.a4-page')];
          const frontPages = pages.slice(0, 7);
          const coordinateSlots = [...document.querySelectorAll('[data-coordinate-slot="true"]')];
          const sameBox = (left, right) => {
            const a = left.getBoundingClientRect(); const b = right.getBoundingClientRect();
            const aPage = left.closest('.a4-page').getBoundingClientRect();
            const bPage = right.closest('.a4-page').getBoundingClientRect();
            return Math.abs((a.x - aPage.x) - (b.x - bPage.x)) < 1
              && Math.abs((a.y - aPage.y) - (b.y - bPage.y)) < 1
              && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
          };
          return {
            pageCount: rendered.pageCount,
            stable: rendered.stable,
            iterations: rendered.iterations,
            openerCount: openers.length,
            allOpenersLeft: openers.every(node => node.dataset.side === 'left'),
            fillersRight: fillers.every(node => node.dataset.side === 'right'),
            fillersOnlyWhenRequired: fillers.every(node => {
              const index = pages.indexOf(node);
              return index > 0 && pages[index - 1].dataset.session
                && pages[index + 1]?.dataset.role === 'opener'
                && pages[index + 1]?.dataset.side === 'left';
            }),
            tocMatches: Object.keys(rendered.anchors).every(session => {
              const item = [...document.querySelectorAll('.a4-toc-list li')].find(node => node.textContent.startsWith('Session ' + session + ' ·'));
              return item && item.querySelector('em').textContent === String(rendered.anchors[session]);
            }),
            firstTocPage: rendered.anchors['1'],
            tableHeadersRepeated: document.querySelectorAll('.a4-table-block thead').length === 2,
            tableRowsPreserved: document.querySelectorAll('.a4-table-block tbody tr').length === 8,
            hasBackCover: document.querySelectorAll('.a4-role-back-cover').length === 1,
            longTopicPreserved: document.querySelector('.a4-role-opener[data-session="12"] .a4-opener-topic').title === longTopic,
            forcedLimit: forced.diagnostics.some(item => item.code === 'TOC_STABILIZATION_LIMIT' && item.blocking),
            headerUsesCanonicalSlot: Math.abs(parseFloat(getComputedStyle(sessionHeader).top) - (1.28 * 96 / 2.54)) < 0.2,
            shortWrappedTitleUnclipped: shortWrappedTitle.textContent === 'Intro & Instance.new'
              && shortWrappedTitle.scrollHeight <= shortWrappedTitle.clientHeight + 1,
            pageNumberCentered: [leftNumber, rightNumber].every(node => {
              const style = getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              const pageRect = node.closest('.a4-page').getBoundingClientRect();
              const left = node.closest('.a4-page').classList.contains('a4-role-content-left');
              const expectedCenter = (left ? 0.99 + 1.19 / 2 : 18.93 + 1.17 / 2) * 96 / 2.54;
              const expectedTop = (left ? 28 : 28.01) * 96 / 2.54;
              return style.display === 'flex' && style.alignItems === 'center' && style.justifyContent === 'center'
                && Math.abs(parseFloat(style.top) - expectedTop) < 0.2
                && Math.abs((rect.left + rect.width / 2 - pageRect.left) - expectedCenter) < 0.2;
            }),
            pageNumberUsesSvgSlot: [leftNumber, rightNumber].every(node => {
              const page = node.closest('.a4-page');
              return getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)' && Boolean(page.querySelector('.a4-page-asset svg'));
            }),
            continuousPrintFlow: (() => {
              const style = getComputedStyle(plainContent);
              return style.paddingTop === '0px' && style.borderTopWidth === '0px' && style.borderRadius === '0px' && style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.boxShadow === 'none';
            })(),
            frontMatterOrder: frontPages.map(node => node.dataset.role),
            frontMatterSides: frontPages.map(node => node.dataset.side),
            frontMatterAssets: frontPages.map(node => node.querySelector('.a4-page-asset')?.dataset.source || ''),
            blankVersoEmpty: frontPages[1].querySelector('.a4-page-overlay').childElementCount === 0
              && frontPages[1].querySelector('.a4-page-number').hidden,
            legalCards: document.querySelectorAll('.a4-legal-card').length,
            legalCloseInsideCard: (() => {
              const safe = document.querySelector('.a4-role-copyright .a4-legal-safe');
              const card = safe && safe.querySelector('.a4-legal-card');
              const close = card && card.querySelector('.a4-legal-close');
              if (!safe || !card || !close) return false;
              const safeRect = safe.getBoundingClientRect();
              const cardRect = card.getBoundingClientRect();
              const closeRect = close.getBoundingClientRect();
              return cardRect.top >= safeRect.top - 1 && cardRect.bottom <= safeRect.bottom + 1
                && closeRect.top >= cardRect.top - 1 && closeRect.bottom <= cardRect.bottom + 1;
            })(),
            guidePages: document.querySelectorAll('.a4-role-guide').length,
            guideMiniatures: document.querySelectorAll('.a4-guide-miniature').length,
            guideSharedTreatments: ['think-bubble', 'activity-card', 'challenge-card', 'step-card', 'quiz-item']
              .every(className => document.querySelector('.a4-guide-miniature.' + className)),
            insLinkSafe: (() => {
              const link = document.querySelector('.a4-ins-card a');
              return link && link.href === 'https://www.kalananti.id/scl-student'
                && link.target === '_blank' && link.rel === 'noopener noreferrer'
                && link.textContent === 'https://www.kalananti.id/scl-student';
            })(),
            coordinateSlotsNative: coordinateSlots.length > 20
              && coordinateSlots.every(node => !['IMG', 'SVG'].includes(node.tagName)),
            shortLongSlotGeometryStable: sameBox(
              document.querySelector('.a4-role-opener[data-session="1"] .a4-opener-copy'),
              document.querySelector('.a4-role-opener[data-session="12"] .a4-opener-copy')
            ) && sameBox(
              document.querySelector('.a4-role-content-left[data-session="1"] .a4-session-header'),
              document.querySelector('.a4-role-content-left[data-session="12"] .a4-session-header')
            ),
            longTextStepped: document.querySelector('.a4-role-opener[data-session="12"] .a4-opener-topic').dataset.fontStep !== '0',
            poppinsLoaded: document.fonts.check('14pt Poppins')
              && getComputedStyle(document.querySelector('.a4-page-body')).fontFamily.includes('Poppins'),
            poppinsCheck: document.fonts.check('14pt Poppins'),
            poppinsFamily: getComputedStyle(document.querySelector('.a4-page-body')).fontFamily,
            fontsStatus: document.fonts.status,
            hiddenOverflow: [...document.querySelectorAll('.a4-page-overlay, .a4-page-body, .a4-opener-flow')]
              .some(node => node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1
                || ((node.classList.contains('a4-page-body') || node.classList.contains('a4-opener-flow'))
                  && SclPublisher.__test.contentBoundsOverflow(node))),
            diagnostics: rendered.diagnostics
          };
        }""")
        page.screenshot(path=str(OUTPUT / 'phase5-stress-full.png'), full_page=True)
        page.locator('#publisherCanvas').evaluate("el => { el.style.maxHeight = 'none'; el.style.overflow = 'visible'; }")
        page.locator('.a4-role-cover').screenshot(path=str(OUTPUT / 'cover.png'))
        page.locator('.a4-role-blank').screenshot(path=str(OUTPUT / 'blank-verso.png'))
        page.locator('.a4-role-copyright').screenshot(path=str(OUTPUT / 'copyright.png'))
        page.locator('.a4-role-warning').screenshot(path=str(OUTPUT / 'warning.png'))
        page.locator('.a4-role-guide').nth(0).screenshot(path=str(OUTPUT / 'guide-1.png'))
        page.locator('.a4-role-guide').nth(1).screenshot(path=str(OUTPUT / 'guide-2.png'))
        page.locator('.a4-role-toc').screenshot(path=str(OUTPUT / 'toc.png'))
        page.locator('.a4-role-opener[data-session="12"]').screenshot(path=str(OUTPUT / 'session-12-opener.png'))
        page.locator('.a4-role-content-left').first.screenshot(path=str(OUTPUT / 'content-left-header-number.png'))
        page.locator('.a4-role-content-right').first.screenshot(path=str(OUTPUT / 'content-right-header-number.png'))
        page.locator('.a4-role-back-cover').screenshot(path=str(OUTPUT / 'back-cover.png'))
        page.locator('#publisherCanvas').evaluate("el => { el.style.display = 'grid'; el.style.gridTemplateColumns = 'repeat(4, max-content)'; el.style.alignItems = 'start'; el.style.justifyContent = 'center'; }")
        page.locator('.a4-page').evaluate_all("nodes => nodes.forEach(node => { node.style.zoom = '0.18'; })")
        page.locator('#publisherCanvas').screenshot(path=str(OUTPUT / 'all-pages-contact-sheet.png'))
        print(json.dumps(result, indent=2))
        assert result['pageCount'] > 30
        assert result['stable'] is True and result['iterations'] <= 5
        assert result['openerCount'] == 12 and result['allOpenersLeft'] is True
        assert result['fillersRight'] is True and result['fillersOnlyWhenRequired'] is True
        assert result['tocMatches'] is True
        assert result['firstTocPage'] == 1
        assert result['tableHeadersRepeated'] is True and result['tableRowsPreserved'] is True
        assert result['hasBackCover'] is True and result['longTopicPreserved'] is True
        assert result['forcedLimit'] is True
        assert result['headerUsesCanonicalSlot'] is True
        assert result['shortWrappedTitleUnclipped'] is True
        assert result['pageNumberCentered'] is True and result['pageNumberUsesSvgSlot'] is True
        assert result['frontMatterOrder'] == ['cover', 'blank', 'copyright', 'warning', 'guide', 'guide', 'toc']
        assert result['frontMatterSides'] == ['right', 'left', 'right', 'left', 'right', 'left', 'right']
        assert result['frontMatterAssets'] == [
            'back-module/cover-scl.svg', '', 'back-module/beginning-kanan-scl.svg',
            'back-module/beginning-kiri-scl.svg', 'back-module/beginning-kanan-scl.svg',
            'back-module/beginning-kiri-scl.svg', 'back-module/beginning-kanan-scl.svg'
        ]
        assert result['blankVersoEmpty'] is True and result['legalCards'] == 2
        assert result['legalCloseInsideCard'] is True
        assert result['guidePages'] == 2 and result['guideMiniatures'] == 12
        assert result['guideSharedTreatments'] is True and result['insLinkSafe'] is True
        assert result['coordinateSlotsNative'] is True and result['shortLongSlotGeometryStable'] is True
        assert result['longTextStepped'] is True
        assert result['poppinsLoaded'] is True
        assert result['hiddenOverflow'] is False
        assert not any(item['blocking'] for item in result['diagnostics'])
        assert console_errors == [] and page_errors == []
        browser.close()


if __name__ == '__main__':
    main()
