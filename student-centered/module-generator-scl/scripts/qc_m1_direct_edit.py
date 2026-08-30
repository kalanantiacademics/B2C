import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PREVIEW = Path('/private/tmp/kalananti-scl-phase1-preview/index.html')
OUTPUT = Path('/private/tmp/kalananti-scl-m1-direct-edit')


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
        console_errors = []
        page_errors = []
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        open_session(page)
        continuous_contract = page.evaluate('''() => {
          const root = document.querySelector('#blockEditor .document-flow-editor');
          const paragraph = root.querySelector('.document-paragraph');
          const style = getComputedStyle(paragraph);
          return {
            editableRoots: document.querySelectorAll('#blockEditor [contenteditable="true"]').length,
            childEditables: root.querySelectorAll('.document-paragraph[contenteditable]').length,
            borderWidth: style.borderWidth,
            backgroundColor: style.backgroundColor,
            boxShadow: style.boxShadow
          };
        }''')
        assert continuous_contract == {
            'editableRoots': 1,
            'childEditables': 0,
            'borderWidth': '0px',
            'backgroundColor': 'rgba(0, 0, 0, 0)',
            'boxShadow': 'none',
        }, continuous_contract
        editable = page.locator('#blockEditor .document-paragraph').first
        editable.click()
        editable.press('End')
        editable.type(' — hasil edit langsung')
        paragraph_count_before = page.locator('#blockEditor .document-flow-editor > .document-paragraph').count()
        page.keyboard.press('Enter')
        page.keyboard.type('Paragraf baru continuous')
        page.wait_for_timeout(400)
        serialized_materials = page.evaluate('SclVisualEditor.serialize().materials.text')
        assert 'hasil edit langsung\nParagraf baru continuous' in serialized_materials, {
            'serialized': serialized_materials,
            'html': page.locator('#blockEditor .document-flow-editor').inner_html(),
            'active': page.evaluate('document.activeElement && document.activeElement.className'),
        }
        assert page.locator('#blockEditor .document-flow-editor > .document-paragraph').count() == paragraph_count_before + 1
        assert page.evaluate('document.activeElement.classList.contains("document-flow-editor")') is True

        exact_caret = page.evaluate('''() => {
          const root = document.querySelector('#blockEditor .document-paragraph');
          const text = document.createTreeWalker(root, NodeFilter.SHOW_TEXT).nextNode();
          const range = document.createRange();
          range.setStart(text, Math.min(4, text.textContent.length)); range.collapse(true);
          const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
          SclVisualEditor.setReadOnly(false);
          const restored = getSelection().getRangeAt(0);
          const current = document.querySelector('#blockEditor .document-flow-editor');
          const prefix = restored.cloneRange();
          prefix.selectNodeContents(current);
          prefix.setEnd(restored.startContainer, restored.startOffset);
          return {
            offset: prefix.toString().length,
            active: document.activeElement === current,
            collapsed: restored.collapsed
          };
        }''')
        assert exact_caret == {'offset': 4, 'active': True, 'collapsed': True}, exact_caret
        editable = page.locator('#blockEditor .document-paragraph').first

        page.evaluate('''() => {
          const node = document.querySelector('#blockEditor .document-paragraph');
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          const text = walker.nextNode();
          const range = document.createRange();
          range.setStart(text, 0); range.setEnd(text, Math.min(5, text.textContent.length));
          const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        }''')
        page.click('[data-editor-command="bold"]')
        page.wait_for_timeout(250)
        bold_after_format = editable.evaluate(
            'node => Math.max(...[node, ...node.querySelectorAll("*")].map(item => Number(getComputedStyle(item).fontWeight) || 400))'
        )
        assert bold_after_format >= 600

        page.click('#undoEditorButton')
        page.wait_for_timeout(150)
        editable = page.locator('#blockEditor .document-paragraph').first
        bold_after_undo = editable.evaluate(
            'node => Math.max(...[node, ...node.querySelectorAll("*")].map(item => Number(getComputedStyle(item).fontWeight) || 400))'
        )
        assert bold_after_undo < 600
        page.click('#redoEditorButton')
        page.wait_for_timeout(150)
        editable = page.locator('#blockEditor .document-paragraph').first
        bold_after_redo = editable.evaluate(
            'node => Math.max(...[node, ...node.querySelectorAll("*")].map(item => Number(getComputedStyle(item).fontWeight) || 400))'
        )
        assert bold_after_redo >= 600

        page.evaluate('window.scrollTo(0, 420)')
        before_scroll = page.evaluate('window.scrollY')
        page.evaluate('document.querySelector("#editorFieldTabs button[data-field=objectives]").click()')
        page.wait_for_timeout(150)
        after_scroll = page.evaluate('window.scrollY')
        assert abs(after_scroll - before_scroll) <= 2
        preview_text = page.locator('#sessionA4Preview').inner_text()
        assert 'hasil edit langsung' in preview_text
        assert 'Paragraf baru continuous' in preview_text
        assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth') is True
        assert console_errors == [], console_errors
        assert page_errors == [], page_errors
        page.locator('.legacy-editor-shell').screenshot(path=OUTPUT / 'm1-direct-edit.png')
        result = {
            'typed': True,
            'singleEditableRoot': True,
            'enterCreatesParagraph': True,
            'boxChromeAbsent': True,
            'caretRetained': True,
            'caretOffset': exact_caret['offset'],
            'bold': True,
            'undoRedo': True,
            'scrollAnchorDelta': after_scroll - before_scroll,
            'previewUpdated': True,
            'consoleErrors': 0,
            'pageErrors': 0,
        }
        browser.close()
    print(json.dumps({'output': str(OUTPUT), 'result': result}, indent=2), flush=True)


if __name__ == '__main__':
    main()
