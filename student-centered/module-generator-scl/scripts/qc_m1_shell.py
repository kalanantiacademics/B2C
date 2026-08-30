import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/private/tmp/kalananti-scl-m1-shell')
PREVIEW = Path('/private/tmp/kalananti-scl-phase1-preview/index.html')


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
        page.wait_for_selector('.legacy-editor-shell:not([hidden])')
        page.wait_for_selector('#sessionA4Preview .a4-page')
        page.wait_for_timeout(500)
        result = page.evaluate('''() => ({
          shell: document.querySelector('.legacy-editor-shell')?.dataset.editorShell,
          lease: document.querySelector('#leaseStatus')?.textContent,
          pages: document.querySelectorAll('#sessionA4Preview .a4-page').length,
          history: document.querySelectorAll('#historyList .history-entry').length,
          unresolvedIncludes: document.documentElement.innerHTML.includes("<?!= include_"),
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          shellOverflow: (() => { const node = document.querySelector('.legacy-editor-shell'); return node.scrollWidth > node.clientWidth; })()
        })''')
        assert result['shell'] == 'legacy-paged-v1'
        assert result['lease'] == 'Bisa diedit'
        assert result['pages'] >= 1
        assert result['history'] == 1
        assert result['unresolvedIncludes'] is False
        assert result['horizontalOverflow'] is False
        assert result['shellOverflow'] is False
        assert console_errors == [], console_errors
        assert page_errors == [], page_errors
        page.locator('.legacy-editor-shell').screenshot(path=OUTPUT / 'm1-shell-session-1.png')
        browser.close()
    print(json.dumps({'output': str(OUTPUT), 'result': result, 'consoleErrors': 0, 'pageErrors': 0}, indent=2), flush=True)


if __name__ == '__main__':
    main()
