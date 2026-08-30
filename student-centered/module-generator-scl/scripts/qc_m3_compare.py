import json
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GOLDEN = ROOT / 'docs/golden/m0/roblox-ordinary-left.png'
RUNTIME = Path('/private/tmp/kalananti-scl-m2-adapter/m3-runtime-ordinary.png')
OUTPUT = Path('/private/tmp/kalananti-scl-m3-comparison')

def main():
    assert GOLDEN.exists() and RUNTIME.exists()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1700, 'height': 1250})
        golden_uri = 'data:image/png;base64,' + base64.b64encode(GOLDEN.read_bytes()).decode()
        runtime_uri = 'data:image/png;base64,' + base64.b64encode(RUNTIME.read_bytes()).decode()
        page.set_content(f'''<style>body{{font-family:sans-serif;background:#dce4ed;margin:0;padding:24px}}main{{display:grid;grid-template-columns:1fr 1fr;gap:24px}}figure{{margin:0}}img{{display:block;width:100%;background:white}}figcaption{{font-weight:800;margin-bottom:8px}}</style><main><figure><figcaption>Legacy M0 authority</figcaption><img src="{golden_uri}"></figure><figure><figcaption>Apps Script M3 runtime</figcaption><img src="{runtime_uri}"></figure></main>''', wait_until='load')
        sizes = page.locator('img').evaluate_all('els => els.map(img => ({naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight}))')
        assert all(item['naturalWidth'] > 0 and item['naturalHeight'] > 0 for item in sizes)
        page.screenshot(path=OUTPUT / 'legacy-vs-runtime.png', full_page=True)
        browser.close()
    print(json.dumps({'output': str(OUTPUT), 'images': sizes}, indent=2))

if __name__ == '__main__':
    main()
