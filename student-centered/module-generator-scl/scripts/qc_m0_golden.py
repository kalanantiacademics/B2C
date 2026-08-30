import hashlib
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT.parent / 'book-editor-rework' / 'templates' / 'modern.html'
FIXTURE = ROOT / 'fixtures' / 'm0' / 'legacy-golden.json'
TARGET = ROOT / 'fixtures' / 'm0' / 'approved-target.json'
OUTPUT = ROOT / 'docs' / 'golden' / 'm0'
STYLE_SELECTORS = [
    '.page-sheet', '.page-content', '.page-num', '.list-objective > li',
    '.text-reading', '.think-bubble', '.think-title', '.knowledge-bubble.warm',
    '.activity-card', '.activity-label', '.challenge-card', '.challenge-label',
    '.step-card', '.step-badge', '.shot-card', '.quiz-item', '.quiz-header',
    '.quiz-option-badge'
]
STYLE_PROPERTIES = [
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color',
    'backgroundColor', 'borderTopWidth', 'borderTopColor', 'borderRadius',
    'boxShadow', 'marginTop', 'marginBottom', 'paddingTop', 'paddingRight',
    'paddingBottom', 'paddingLeft', 'top', 'left', 'right', 'transform'
]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def page(inner, number, role, extra=''):
    return (
        f'<section class="page-sheet" data-page-role="{role}" {extra}>'
        f'<div class="page-content">{inner}</div><div class="page-num">{number}</div></section>'
    )


def fixture_pages(course, content):
    esc = lambda value: html.escape(str(value))
    placeholder = (
        '<div class="shot-card" style="width:62%;height:190px">'
        '<div style="height:100%;display:grid;place-items:center;background:#D9F3FF;'
        'color:#2A4365;font-weight:900">SANITIZED IMAGE FIXTURE</div></div>'
    )
    cover = f'''<div class="cover-page" style="height:100%;box-sizing:border-box;border:4px solid #E2E8F0;
      border-radius:18px;padding:42px;background:linear-gradient(180deg,#fffdf3,#fff);display:grid;place-items:center;text-align:center">
      <div><div style="font:800 12pt var(--font-display);color:#F07D49">SANITIZED LEGACY GOLDEN</div>
      <h1 style="font:900 32pt/1.05 var(--font-display);color:#2A4365;margin:22px 0 8px">{esc(course['label'])}</h1>
      <p style="font:700 16pt var(--font-body);color:#475569">LEVEL {esc(course['level'])}</p></div></div>'''
    ordinary = f'''<h2 style="font-family:var(--font-display);color:#2A4365">Session 1 · {esc(course['earlyTopic'])}</h2>
      <ul class="list-objective">{''.join(f'<li>{esc(item)}</li>' for item in content['objectives'])}</ul>
      <p class="text-reading">{esc(content['paragraph'])}</p>
      <div class="step-card"><span class="step-badge">Tahap 1</span><h4>Bangun dan periksa proyek</h4></div>
      {placeholder}
      <div class="think-bubble knowledge-bubble"><span class="think-title">Tutor Says</span><p class="text-reading">{esc(content['tutor'])}</p></div>'''
    semantic = f'''<h2 style="font-family:var(--font-display);color:#2A4365">Komponen Semantik</h2>
      <div class="think-bubble knowledge-bubble warm"><span class="think-title">Did You Know?</span><p class="text-reading">{esc(content['knowledge'])}</p></div>
      <div class="activity-card"><span class="activity-label">MUST DO</span><div class="check-content">{esc(content['must'])}</div></div>
      <div class="challenge-card"><span class="challenge-label">SHOULD DO</span><div class="check-content">{esc(content['should'])}</div></div>
      <div class="challenge-card"><span class="challenge-label">ASPIRE TO DO</span><div class="check-content">{esc(content['aspire'])}</div></div>
      <div class="quiz-item quiz-stack"><div class="quiz-header">MINI QUIZ</div><p class="quiz-question"><span class="quiz-number">1.</span><span>{esc(content['quiz'])}</span></p><div class="quiz-options"><p class="quiz-option"><span class="quiz-option-badge">A</span><span>Untuk menemukan bagian yang perlu diperbaiki.</span></p></div></div>'''
    late = f'''<h2 style="font-family:var(--font-display);color:#2A4365">Session 12 · {esc(course['lateTopic'])}</h2>
      <p class="text-reading">{esc(content['paragraph'])}</p>{placeholder}
      <div class="activity-card"><span class="activity-label">SELF CHECK</span><div class="check-content">Saya dapat menjelaskan proses, hasil, dan perbaikan proyek.</div></div>'''
    back = '''<div style="height:100%;display:grid;place-items:center;background:#2A4365;color:white;border-radius:18px;text-align:center"><div><strong style="font:900 25pt var(--font-display)">KALANANTI</strong><p>Back cover · sanitized fixture</p></div></div>'''
    return ''.join([
        page(cover, '', 'cover'), page(ordinary, '1', 'ordinary-left'),
        page(semantic, '2', 'semantic-right'), page(late, '24', 'late-session-left'),
        page(back, '', 'back-cover')
    ])


def main():
    if not REFERENCE.exists():
        raise SystemExit(f'Authoritative reference missing: {REFERENCE}')
    fixture = json.loads(FIXTURE.read_text())
    target = json.loads(TARGET.read_text())
    if fixture.get('sanitized') is not True or len(fixture.get('courses', [])) != 2:
        raise SystemExit('M0 fixture must be explicitly sanitized and contain Roblox + Scratch.')
    reference_source = REFERENCE.read_text()
    style_match = re.search(r'<style>(.*?)</style>', reference_source, re.S)
    if not style_match:
        raise SystemExit('Unable to extract authoritative legacy CSS.')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    harness = OUTPUT / 'legacy-reference.html'
    body = ''.join(
        f'<main class="golden-course" data-course="{course["key"]}">{fixture_pages(course, fixture["content"])}</main>'
        for course in fixture['courses']
    )
    harness.write_text(
        '<!doctype html><html lang="id"><head><meta charset="utf-8"><style>'
        + style_match.group(1)
        + '\nbody{padding:32px 0}.golden-course{display:flex;flex-direction:column;gap:20px;margin-bottom:60px}'
        + '</style></head><body>' + body + '</body></html>\n'
    )
    geometry = {'canonicalScaleCssPxPerInch': 96, 'courses': {}}
    styles = {'source': '../book-editor-rework/templates/modern.html', 'selectors': {}}
    screenshots = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        browser_version = browser.version
        page_obj = browser.new_page(viewport={'width': 1100, 'height': 1000}, device_scale_factor=1)
        errors = []
        page_obj.on('pageerror', lambda error: errors.append(str(error)))
        page_obj.goto(harness.as_uri(), wait_until='load')
        page_obj.evaluate('document.fonts.ready')
        styles['fontChecks'] = page_obj.evaluate('''() => ({
          fredoka: document.fonts.check('16px "Fredoka"'),
          nunito: document.fonts.check('16px "Nunito"')
        })''')
        for course in fixture['courses']:
            root = page_obj.locator(f'.golden-course[data-course="{course["key"]}"]')
            course_geometry = []
            for role in ['cover', 'ordinary-left', 'semantic-right', 'late-session-left', 'back-cover']:
                locator = root.locator(f'.page-sheet[data-page-role="{role}"]')
                name = f'{course["key"]}-{role}.png'
                locator.screenshot(path=str(OUTPUT / name))
                screenshots.append(name)
                course_geometry.append(locator.evaluate('''node => { const r=node.getBoundingClientRect(); const c=node.querySelector('.page-content').getBoundingClientRect(); return {role:node.dataset.pageRole,page:{x:r.x,y:r.y,width:r.width,height:r.height},content:{x:c.x-r.x,y:c.y-r.y,width:c.width,height:c.height},pageNumber:node.querySelector('.page-num')?.textContent||null}; }'''))
            geometry['courses'][course['key']] = course_geometry
        for selector in STYLE_SELECTORS:
            locator = page_obj.locator(selector).first
            if locator.count() == 0:
                raise AssertionError(f'Missing style selector: {selector}')
            styles['selectors'][selector] = locator.evaluate(
                '''(node, props) => { const s=getComputedStyle(node); const r=node.getBoundingClientRect(); const out={rect:{width:r.width,height:r.height}}; props.forEach(p=>out[p]=s[p]); return out; }''',
                STYLE_PROPERTIES
            )
        assert not errors, errors
        browser.close()
    (OUTPUT / 'computed-styles.json').write_text(json.dumps(styles, indent=2, ensure_ascii=False) + '\n')
    (OUTPUT / 'page-role-geometry.json').write_text(json.dumps(geometry, indent=2, ensure_ascii=False) + '\n')
    artifacts = ['legacy-reference.html', 'computed-styles.json', 'page-role-geometry.json', *screenshots]
    manifest = {
        'schemaVersion': 'scl-m0-golden-manifest/v1',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'fixture': {'path': 'fixtures/m0/legacy-golden.json', 'sha256': sha256(FIXTURE), 'sanitized': True, 'courses': ['roblox', 'scratch']},
        'approvedTarget': {'path': 'fixtures/m0/approved-target.json', 'sha256': sha256(TARGET), 'schemaVersion': target['schemaVersion']},
        'authority': {'path': '../book-editor-rework/templates/modern.html', 'sha256': sha256(REFERENCE)},
        'environment': {'engine': 'Playwright Chromium', 'browserVersion': browser_version, 'viewport': '1100x1000', 'deviceScaleFactor': 1},
        'coverage': ['cover-title', 'ordinary-flow', 'steps-images', 'semantic-cards', 'left-right-page', 'page-number', 'late-session', 'back-cover'],
        'artifacts': [{'path': name, 'sha256': sha256(OUTPUT / name)} for name in artifacts]
    }
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'output': str(OUTPUT), 'screenshots': len(screenshots), 'styles': len(STYLE_SELECTORS), 'artifacts': len(artifacts) + 1}, indent=2))


if __name__ == '__main__':
    main()
