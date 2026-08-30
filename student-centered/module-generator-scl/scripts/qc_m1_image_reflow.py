import base64
import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PREVIEW = Path('/private/tmp/kalananti-scl-phase1-preview/index.html')
OUTPUT = Path('/private/tmp/kalananti-scl-m1-image-reflow')
IMAGE_URL = 'https://fixture.example/module-step.png'
REPLACEMENT_URL = 'https://fixture.example/module-step-replaced.png'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')


def open_session(page):
    page.goto(PREVIEW.resolve().as_uri(), wait_until='domcontentloaded')
    page.fill('#passcode', 'synthetic-success')
    page.fill('#editorLabel', 'Synthetic Editor')
    page.click('#loginButton')
    page.wait_for_selector('.course-card:not([disabled])')
    page.click('.course-card:not([disabled])')
    page.wait_for_selector('.level-card')
    page.click('.level-card')
    page.wait_for_selector('.session-card:not([disabled])')
    page.click('.session-card:not([disabled])')
    page.wait_for_selector('[data-editing-model="continuous-rich-document-v1"] .document-flow-editor[contenteditable="true"]')


def main():
    subprocess.run(['node', 'scripts/build-local-preview.mjs'], cwd=ROOT, check=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.set_default_timeout(10000)
        page.route('https://fixture.example/**', lambda route: route.fulfill(status=200, content_type='image/png', body=PNG))
        console_errors = []
        page_errors = []
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        open_session(page)

        page.click('#addTextBlockButton')
        empty = page.locator('#blockEditor .document-paragraph').last
        assert empty.inner_text() == ''
        empty.click()
        paste_result = page.evaluate('''url => {
          const target = document.querySelector('#blockEditor .document-flow-editor');
          const event = new Event('paste', {bubbles: true, cancelable: true});
          Object.defineProperty(event, 'clipboardData', {value: {getData: () => url}});
          target.dispatchEvent(event);
          const parsed = new URL(url);
          return {defaultPrevented: event.defaultPrevented, pathname: parsed.pathname, supported: parsed.protocol === 'https:' && /\\.(?:png|jpe?g|webp)$/i.test(parsed.pathname)};
        }''', IMAGE_URL)
        page.wait_for_timeout(300)
        if page.locator('.image-block-controls[data-image-block-id]').count() == 0:
            debug = page.evaluate('''() => {
              const selection = getSelection();
              const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
              const flow = document.querySelector('#blockEditor .document-flow-editor');
              return {
                activeClass: document.activeElement && document.activeElement.className,
                startNode: range && range.startContainer.nodeName,
                startOffset: range && range.startOffset,
                children: [...flow.children].map(node => ({tag: node.tagName, id: node.dataset.blockId, text: node.innerText})),
                serializedTail: SclVisualEditor.serialize().materials.text.split('\\n').slice(-2)
              };
            }''')
            raise AssertionError({'paste': paste_result, 'dom': debug, 'consoleErrors': console_errors, 'pageErrors': page_errors})
        image_block = page.locator('.image-block-controls[data-image-block-id]').last
        assert image_block.locator('img').get_attribute('src') == IMAGE_URL
        assert image_block.locator('span').inner_text() == '69%'
        page.wait_for_function(
            "document.querySelector('#sessionA4Preview .a4-image-block').style.width === '69%'"
        )
        centered = page.evaluate('''() => {
          const editorImage = document.querySelector('.image-block-controls[data-image-block-id] img');
          const editorWrapper = editorImage.closest('.image-block-controls');
          const previewBlock = document.querySelector('#sessionA4Preview .a4-image-block');
          const previewContainer = previewBlock.parentElement;
          const center = rect => rect.left + rect.width / 2;
          return {
            editorDelta: Math.abs(center(editorImage.getBoundingClientRect()) - center(editorWrapper.getBoundingClientRect())),
            previewDelta: Math.abs(center(previewBlock.getBoundingClientRect()) - center(previewContainer.getBoundingClientRect())),
            previewClass: previewBlock.className,
            parentClass: previewContainer.className,
            parentDisplay: getComputedStyle(previewContainer).display,
            blockMarginLeft: getComputedStyle(previewBlock).marginLeft,
            blockMarginRight: getComputedStyle(previewBlock).marginRight,
            blockWidth: previewBlock.getBoundingClientRect().width,
            parentWidth: previewContainer.getBoundingClientRect().width
          };
        }''')
        assert centered['editorDelta'] <= 1, centered
        assert centered['previewDelta'] <= 1, centered

        text_block = page.locator('#blockEditor .document-paragraph').first
        text_block.focus()
        page.evaluate('''() => {
          const node = document.querySelector('#blockEditor .document-paragraph');
          const range = document.createRange(); range.selectNodeContents(node); range.collapse(false);
          const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
          window.scrollTo(0, 360);
        }''')
        before_scroll = page.evaluate('window.scrollY')
        reflow_ms = page.evaluate('''async () => {
          const canvas = document.querySelector('#sessionA4Preview');
          const range = document.querySelector('.image-block-controls input[type=range]');
          const start = performance.now();
          const changed = new Promise(resolve => {
            const observer = new MutationObserver(() => { observer.disconnect(); resolve(performance.now() - start); });
            observer.observe(canvas, {childList: true});
            setTimeout(() => { observer.disconnect(); resolve(9999); }, 1000);
          });
          range.value = '25'; range.dispatchEvent(new Event('input', {bubbles: true}));
          return await changed;
        }''')
        assert reflow_ms <= 300, reflow_ms
        assert image_block.locator('span').inner_text() == '25%'
        assert abs(page.evaluate('window.scrollY') - before_scroll) <= 2
        assert page.evaluate('document.activeElement.classList.contains("document-flow-editor")') is True

        page.evaluate('url => { window.prompt = () => url; }', REPLACEMENT_URL)
        image_block.locator('[data-image-action="replace"]').click()
        page.wait_for_timeout(250)
        image_block = page.locator('.image-block-controls[data-image-block-id]').last
        assert image_block.locator('img').get_attribute('src') == REPLACEMENT_URL
        assert image_block.locator('span').inner_text() == '25%'
        image_block.click()
        assert image_block.evaluate('node => node.classList.contains("selected")') is True
        page.locator('.legacy-editor-shell').screenshot(path=OUTPUT / 'm1-image-selected.png')

        before_delete = page.locator('.image-block-controls').count()
        image_block.locator('[data-image-action="delete"]').click()
        page.wait_for_timeout(200)
        assert page.locator('.image-block-controls').count() == before_delete - 1
        assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth') is True
        assert console_errors == [], console_errors
        assert page_errors == [], page_errors
        page.locator('.legacy-editor-shell').screenshot(path=OUTPUT / 'm1-image-deleted.png')
        result = {
            'pasteConverted': True,
            'defaultImageWidthPercent': 69,
            'centered': centered,
            'selectedControls': True,
            'resizePercent': 25,
            'reflowMs': round(reflow_ms, 2),
            'caretRetained': True,
            'scrollAnchorDelta': page.evaluate('window.scrollY') - before_scroll,
            'replace': True,
            'delete': True,
            'consoleErrors': 0,
            'pageErrors': 0,
        }
        browser.close()
    print(json.dumps({'output': str(OUTPUT), 'result': result}, indent=2), flush=True)


if __name__ == '__main__':
    main()
