import base64
import json
import struct
import subprocess
import zlib
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PREVIEW = Path('/private/tmp/kalananti-scl-phase1-preview/index.html')
FIXTURE = ROOT / 'fixtures' / 'm2' / 'adapter-golden.json'
OUTPUT = Path('/private/tmp/kalananti-scl-m2-adapter')
def fixture_png(width=620, height=190):
    raw = b''.join(b'\x00' + bytes((217, 243, 255, 255)) * width for _ in range(height))
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

PIXEL_PNG = fixture_png()


def main():
    subprocess.run(['node', 'scripts/build-local-preview.mjs'], cwd=ROOT, check=True)
    golden = json.loads(FIXTURE.read_text())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.route('https://fonts.googleapis.com/**', lambda route: route.fulfill(
            status=200, content_type='text/css', body=''
        ))
        page.route('https://fonts.gstatic.com/**', lambda route: route.fulfill(
            status=200, content_type='font/woff2', body=b''
        ))
        page.route('https://fixture.example/**', lambda route: route.fulfill(
            status=200, content_type='image/png', body=PIXEL_PNG
        ))
        console_errors = []
        page_errors = []
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        page.goto(PREVIEW.resolve().as_uri(), wait_until='domcontentloaded')
        result = page.evaluate('''golden => {
          document.body.innerHTML = '<main id="m2Golden"></main>';
          return golden.courses.map(course => {
            const host = document.createElement('section'); host.dataset.course = course.key;
            host.innerHTML = '<h2></h2><div class="diagnostics"></div><div class="publisher-canvas"></div>';
            host.querySelector('h2').textContent = course.key.toUpperCase();
            document.querySelector('#m2Golden').appendChild(host);
            const adapted = SclLegacyAdapter.adaptSession(course.session);
            const project = {course: {key: course.key, label: course.key, coverLabel: course.key.toUpperCase()}, level: '1'};
            const rendered = SclPublisher.renderSessionPreview(project, course.session, {
              canvas: host.querySelector('.publisher-canvas'), diagnostics: host.querySelector('.diagnostics')
            });
            return {
              key: course.key,
              schemaVersion: adapted.schemaVersion,
              types: adapted.components.map(component => component.type),
              sourceKeys: adapted.components.map(component => component.source.blockKey),
              pageCount: rendered.pageCount,
              answerLeak: /quiz_answers|M2_(?:ROBLOX|SCRATCH|PYTHON)_ANSWER_SENTINEL/.test(host.outerHTML)
            };
          });
        }''', golden)
        for course, rendered in zip(golden['courses'], result):
            assert rendered['schemaVersion'] == 'scl-legacy-component/v1'
            assert rendered['types'] == course['expected']['types']
            assert len(rendered['sourceKeys']) == len(course['expected']['types'])
            assert all(key for key in rendered['sourceKeys'])
            assert rendered['pageCount'] >= 1
            assert rendered['answerLeak'] is False
        python_ide = page.evaluate('''() => {
          const plain = text => ({text, runs: []});
          const session = {
            session: '1', topic: 'Python IDE', fields: {objectives: plain(''), materials: plain('')},
            materialBlocks: [
              {type:'paragraph', text:'```python'},
              {type:'paragraph', text:'print("hello")'},
              {type:'paragraph', text:'<img src=x onerror=alert(1)>'},
              {type:'paragraph', text:'```'},
              {type:'paragraph', text:'```tezt```'}
            ]
          };
          const host = document.createElement('section'); host.id = 'pythonIdeFixture';
          host.innerHTML = '<div class="diagnostics"></div><div class="publisher-canvas"></div>';
          document.querySelector('#m2Golden').appendChild(host);
          const rendered = SclPublisher.renderSessionPreview(
            {course:{key:'python',label:'Python',coverLabel:'PYTHON'},level:'1'}, session,
            {canvas:host.querySelector('.publisher-canvas'),diagnostics:host.querySelector('.diagnostics')}
          );
          const blocks = [...host.querySelectorAll('.code-ide')];
          const overflow = [...host.querySelectorAll('.a4-page-body')].some(body =>
            body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1
          );
          return {count: blocks.length, code: blocks.map(block => block.querySelector('code').textContent),
            visibleText: host.innerText, imageCount: host.querySelectorAll('.code-ide img').length,
            overflow, blocking: rendered.blocking};
        }''')
        assert python_ide['count'] == 2, python_ide
        assert python_ide['code'] == ['print("hello")\n<img src=x onerror=alert(1)>', 'tezt'], python_ide
        assert '```' not in python_ide['visibleText'], python_ide
        assert python_ide['imageCount'] == 0, python_ide
        assert python_ide['overflow'] is False and python_ide['blocking'] is False, python_ide
        layout_correction = page.evaluate('''() => {
          const plain = text => ({text, runs: []});
          const objectiveLines = Array.from({length: 5}, (_, index) => `OBJECTIVE_ONLY_${index + 1}`);
          const materialLines = ['Halo teman-teman!', 'Bullet designed', 'Number designed']
            .concat(Array.from({length:35}, (_, index) => `Continuation material ${index + 1}`));
          const session = {
            session:'5', topic:'Turtle Graphics: Nested Loop Part 1',
            fields:{objectives:plain(objectiveLines.join('\\n')), materials:plain(materialLines.join('\\n'))},
            layouts:[
              {blockKey:'materials:line-1',orderIndex:1,attributes:{textStyle:'bullet'}},
              {blockKey:'materials:line-2',orderIndex:2,attributes:{textStyle:'numbered'}}
            ]
          };
          const host = document.createElement('section'); host.id = 'layoutCorrectionFixture';
          host.innerHTML = '<div class="diagnostics"></div><div class="publisher-canvas"></div>';
          document.querySelector('#m2Golden').appendChild(host);
          const rendered = SclPublisher.renderSessionPreview(
            {course:{key:'python',label:'Python',coverLabel:'PYTHON'},level:'1'}, session,
            {canvas:host.querySelector('.publisher-canvas'),diagnostics:host.querySelector('.diagnostics')}
          );
          const opener = host.querySelector('.a4-role-opener');
          const content = host.querySelector('.a4-role-content-right, .a4-role-content-left');
          const header = content.querySelector('.a4-session-header strong');
          const bullet = host.querySelector('.text-list-bullet > li');
          const numbered = host.querySelector('.text-list-numbered > li');
          return {
            objectiveCount: opener.querySelectorAll('.a4-opener-objectives li').length,
            objectivesRepeated: Boolean(content.querySelector('.legacy-objectives')),
            haloOnOpener: opener.querySelector('.a4-opener-flow').innerText.includes('Halo teman-teman!'),
            header: header.textContent, headerTopic: content.querySelector('.a4-session-header span').textContent,
            headerTitle: content.querySelector('.a4-session-header').title,
            bulletMarker: getComputedStyle(bullet, '::before').content,
            numberedMarker: getComputedStyle(numbered, '::before').content,
            overflow: [...host.querySelectorAll('.a4-page-body')].some(body => body.scrollHeight > body.clientHeight + 1),
            blocking: rendered.blocking
          };
        }''')
        assert layout_correction['objectiveCount'] == 5, layout_correction
        assert layout_correction['objectivesRepeated'] is False, layout_correction
        assert layout_correction['haloOnOpener'] is True, layout_correction
        assert layout_correction['header'] == 'Session 5', layout_correction
        assert layout_correction['headerTopic'] == 'Turtle Graphics: Nested Loop Part 1', layout_correction
        assert layout_correction['headerTitle'] == 'Session 5 · Turtle Graphics: Nested Loop Part 1', layout_correction
        assert '✦' in layout_correction['bulletMarker'], layout_correction
        assert layout_correction['numberedMarker'] != 'none', layout_correction
        assert layout_correction['overflow'] is False and layout_correction['blocking'] is False, layout_correction
        stress = page.evaluate('''source => {
          const session = structuredClone(source);
          const lines = Array.from({length: 42}, (_, index) =>
            `M3_UNIT_${String(index + 1).padStart(2, '0')} — Jelaskan hasil pengamatan dengan kalimat lengkap.`
          );
          session.fields.must_do = {text: lines.join('\\n'), runs: []};
          const host = document.createElement('section');
          host.id = 'm3PaginationStress';
          host.innerHTML = '<h2>M3 STRUCTURED PAGINATION</h2><div class="diagnostics"></div><div class="publisher-canvas"></div>';
          document.querySelector('#m2Golden').appendChild(host);
          const rendered = SclPublisher.renderSessionPreview(
            {course: {key: 'roblox', label: 'Roblox', coverLabel: 'ROBLOX'}, level: '1'},
            session,
            {canvas: host.querySelector('.publisher-canvas'), diagnostics: host.querySelector('.diagnostics')}
          );
          const html = host.innerHTML;
          const counts = lines.map(line => (html.match(new RegExp(line.slice(0, 10), 'g')) || []).length);
          const overflow = [...host.querySelectorAll('.a4-page-body')].some(body =>
            body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1
          );
          return {
            pageCount: rendered.pageCount,
            continuationCount: host.querySelectorAll('[data-continuation-index]').length,
            counts,
            overflow,
            blocking: rendered.blocking
          };
        }''', golden['courses'][0]['session'])
        assert stress['pageCount'] > 2, stress
        assert stress['continuationCount'] > 0, stress
        assert stress['counts'] == [1] * 42, stress
        assert stress['overflow'] is False, stress
        assert stress['blocking'] is False, stress
        m0 = page.evaluate('''() => {
          const plain = text => ({text, runs: text ? [{start: 0, end: text.length, link: ''}] : []});
          const image = 'https://fixture.example/m0.png';
          const session = {
            session: '1', topic: 'Membangun Dunia Pertama', rowKey: 'm0', status: 'Ready',
            fields: {
              objectives: plain('- Menjelaskan konsep utama dengan kata-kata sendiri.\\n- Membuat proyek kecil dan memeriksa hasilnya.'),
              materials: {text: `Ikuti petunjuk secara berurutan. Catat perubahan yang dibuat agar proses dapat dijelaskan kembali.\\nTahap 1: Bangun dan periksa proyek\\n${image}\\nkc1*`, runs: [{start: 0, end: 173, link: ''}, {start: 174, end: 210, link: `${image}#scl-width=62`}]},
              kamus_coder: plain('kc1: Gunakan nama yang jelas untuk setiap objek agar proyek mudah diperiksa.'),
              for_your_knowledge: plain(''), must_do: plain(''), should_do: plain(''), aspire_to_do: plain(''), self_check: plain(''), quiz_questions: plain(''), quiz_options: plain('')
            }
          };
          const host = document.createElement('section'); host.id = 'm3MatchedFixture';
          host.innerHTML = '<h2>M3 MATCHED M0 FIXTURE</h2><div class="diagnostics"></div><div class="publisher-canvas"></div>';
          document.querySelector('#m2Golden').appendChild(host);
          const rendered = SclPublisher.renderSessionPreview({course:{key:'roblox',label:'ROBLOX STUDIO',coverLabel:'ROBLOX STUDIO'},level:'1'}, session, {canvas:host.querySelector('.publisher-canvas'),diagnostics:host.querySelector('.diagnostics')});
          const page = host.querySelector('.a4-role-opener'); const body = page.querySelector('.a4-opener-flow');
          const pageRect = page.getBoundingClientRect(); const rect = body.getBoundingClientRect();
          return {pageCount: rendered.pageCount, blocking: rendered.blocking, text: host.innerText,
            geometry: {left: rect.left-pageRect.left, top: rect.top-pageRect.top, width: rect.width, height: rect.height},
            bodyText: body.innerText};
        }''')
        assert m0['blocking'] is False, m0
        assert 'Bangun dan periksa proyek' in m0['text'] and 'Gunakan nama yang jelas' in m0['text'], m0
        assert m0['geometry']['width'] > 500 and m0['geometry']['height'] > 1, m0
        assert 'Menjelaskan konsep utama' not in m0['bodyText'] and 'Membuat proyek kecil' not in m0['bodyText'], m0
        ordered = ['Ikuti petunjuk', 'Bangun dan periksa proyek', 'Gunakan nama yang jelas']
        positions = [m0['bodyText'].find(value) for value in ordered]
        assert all(position >= 0 for position in positions) and positions == sorted(positions), m0
        font_check = page.evaluate('''async () => {
          await document.fonts.ready;
          const body = document.querySelector('.a4-page-body');
          return {
            loaded: document.fonts.check('14pt Poppins'),
            family: getComputedStyle(body).fontFamily,
            size: getComputedStyle(body).fontSize
          };
        }''')
        assert font_check['loaded'] is True, font_check
        assert 'Poppins' in font_check['family'], font_check
        assert font_check['size'] == '18.6667px', font_check
        assert page.locator('#m2Golden').evaluate(
            "node => !/quiz_answers|M2_(?:ROBLOX|SCRATCH|PYTHON)_ANSWER_SENTINEL/.test(node.outerHTML)"
        ) is True
        assert console_errors == [], console_errors
        assert page_errors == [], page_errors
        page.locator('#m2Golden').screenshot(path=OUTPUT / 'm2-three-course-render.png')
        page.locator('#m3MatchedFixture .a4-role-opener').screenshot(
            path=OUTPUT / 'm3-runtime-ordinary.png'
        )
        page.locator('#pythonIdeFixture .a4-role-opener').screenshot(
            path=OUTPUT / 'python-ide.png'
        )
        page.locator('#layoutCorrectionFixture .a4-role-opener').screenshot(
            path=OUTPUT / 'objectives-opener.png'
        )
        page.locator('#layoutCorrectionFixture .a4-page').nth(1).screenshot(
            path=OUTPUT / 'header-list-content.png'
        )
        browser.close()
    summary = {
        'output': str(OUTPUT),
        'courses': [{
            'key': item['key'],
            'schemaVersion': item['schemaVersion'],
            'components': len(item['types']),
            'pages': item['pageCount'],
            'answerLeak': item['answerLeak'],
        } for item in result],
        'consoleErrors': 0,
        'pageErrors': 0,
        'structuredPagination': stress,
        'font': font_check,
        'matchedFixture': m0,
        'pythonIde': python_ide,
        'layoutCorrection': layout_correction,
    }
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == '__main__':
    main()
