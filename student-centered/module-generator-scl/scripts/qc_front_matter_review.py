import json
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'prototypes' / 'front-matter-session-review.html'
OUTPUT = Path('/private/tmp/kalananti-scl-front-matter-review')


def main():
    import subprocess
    subprocess.run(['python3', 'scripts/generate_guide_reference_crops.py'], cwd=ROOT, check=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    console_errors = []
    page_errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1000, 'height': 1250}, device_scale_factor=1)
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        page.goto(SOURCE.as_uri(), wait_until='networkidle', timeout=60000)
        page.evaluate('document.fonts.ready')
        result = page.evaluate('''() => ({
          pages: [...document.querySelectorAll('.page')].map(page => {
            const safe = page.querySelector('.safe') || page;
            return {
              role: page.dataset.reviewPage,
              overflow: safe.scrollHeight > safe.clientHeight + 1 || safe.scrollWidth > safe.clientWidth + 1,
              width: safe.getBoundingClientRect().width,
              height: safe.getBoundingClientRect().height,
              font: getComputedStyle(safe).fontFamily
            };
          }),
          poppinsReady: document.fonts.check('14pt "Poppins"'),
          imagesReady: [...document.images].every(image => image.complete && image.naturalWidth > 0)
        })''')
        roles = ['blank', 'copyright', 'warning', 'guide-1', 'guide-2', 'toc', 'opener']
        for role in roles:
            page.locator(f'.page[data-review-page="{role}"]').screenshot(path=str(OUTPUT / f'{role}.png'))
        page.screenshot(path=str(OUTPUT / 'all-concepts.png'), full_page=True)
        assert len(result['pages']) == len(roles)
        assert not any(item['overflow'] for item in result['pages'])
        assert result['poppinsReady'] is True
        assert result['imagesReady'] is True
        assert console_errors == [] and page_errors == []
        browser.close()
    print(json.dumps({'output': str(OUTPUT), **result}, indent=2))


if __name__ == '__main__':
    main()
