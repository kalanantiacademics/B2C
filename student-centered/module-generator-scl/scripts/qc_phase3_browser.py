import json
import subprocess
import base64
from pathlib import Path

from playwright.sync_api import sync_playwright

from qc_phase2_browser import SyntheticPhase2Server, attach_rpc, login_and_open_level


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/private/tmp/kalananti-scl-phase3-qc')


class SyntheticPhase3Server(SyntheticPhase2Server):
    def __init__(self):
        super().__init__()
        self.fields = {
            '1': self.default_fields(),
            '2': self.default_fields(),
        }

    @staticmethod
    def default_fields():
        image_url = 'https://example.invalid/lesson.png'
        materials = f'Intro paragraph\nfyk4*\n{image_url}\nkc1*'
        return {
            'objectives': SyntheticPhase2Server.plain_model('Build a playable project'),
            'materials': SyntheticPhase2Server.plain_model(materials),
            'must_do': SyntheticPhase2Server.plain_model('Create the main project'),
            'should_do': SyntheticPhase2Server.plain_model('Add one extension'),
            'aspire_to_do': SyntheticPhase2Server.plain_model('Publish a challenge'),
            'self-check': SyntheticPhase2Server.plain_model('Project can run'),
            'kamus_coder': SyntheticPhase2Server.plain_model('kc1: A coding definition'),
            'for_your_knowledge': SyntheticPhase2Server.plain_model('fyk4: A useful insight'),
            'quiz_questions': SyntheticPhase2Server.plain_model('1. What did you build?'),
            'quiz_options': SyntheticPhase2Server.plain_model('1. A. Game | B. Story'),
        }

    def rpc_loadLevelProject(self, client_id, token, course_key, level):
        project = super().rpc_loadLevelProject(client_id, token, course_key, level)
        for session in project['sessions']:
            key = str(session['session'])
            if key in self.fields:
                session['fields'].update(json.loads(json.dumps(self.fields[key])))
        return project

    def rpc_saveSessionPatch(self, client_id, token, lease_token, request):
        result = super().rpc_saveSessionPatch(client_id, token, lease_token, request)
        key = str(request['session'])
        for field, model in request['changes'].items():
            if field != 'Session-topic':
                self.fields[key][field] = json.loads(json.dumps(model))
        result['changedFields'] = list(request['changes'])
        return result


def main():
    subprocess.run(
        ['node', 'scripts/build-phase2-preview.mjs'], cwd=ROOT, check=True,
        capture_output=True, text=True,
    )
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = SyntheticPhase3Server()
    console_errors = []
    page_errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1100})
        attach_rpc(context, server, 'PHASE3')
        page = context.new_page()
        png = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
        )
        page.route('https://example.invalid/**', lambda route: route.fulfill(
            status=200, content_type='image/png', body=png,
        ))
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        login_and_open_level(page)
        page.locator('.session-card').nth(0).click()
        page.wait_for_selector('#leaseStatus.active')
        page.wait_for_selector('.document-flow-editor[contenteditable="true"]')
        page.wait_for_selector('#sessionA4Preview .a4-page')
        preview_height = page.locator('#sessionA4Preview').evaluate('el => el.clientHeight')
        page.click('#previewZoomIn')
        page.wait_for_function("getComputedStyle(document.querySelector('#sessionA4Preview .a4-page')).zoom === '0.51'")
        zoom_in = page.locator('#previewZoomValue').first.inner_text()
        page.click('#previewZoomOut')
        page.click('#previewZoomReset')
        zoom_reset = page.locator('#previewZoomValue').first.inner_text()
        assert preview_height >= 720
        assert zoom_in == '51%' and zoom_reset == '43%'
        page.wait_for_timeout(250)
        zoom_pagination = page.evaluate("""() => ({
          zoom: getComputedStyle(document.querySelector('#sessionA4Preview .a4-page')).zoom,
          pageCount: document.querySelectorAll('#sessionA4Preview .a4-page').length,
          pageOverflow: document.querySelector('#sessionPreviewDiagnostics').innerText.includes('PAGE_OVERFLOW'),
          structuredOversize: document.querySelector('#sessionPreviewDiagnostics').innerText.includes('STRUCTURED_UNIT_OVERSIZE'),
          boundsOverflow: [...document.querySelectorAll('#sessionA4Preview .a4-page-body, #sessionA4Preview .a4-opener-flow')]
            .some(node => SclPublisher.__test.contentBoundsOverflow(node))
        })""")
        assert zoom_pagination['zoom'] == '0.43'
        assert zoom_pagination['pageCount'] < 12
        assert zoom_pagination['pageOverflow'] is False
        assert zoom_pagination['structuredOversize'] is False
        assert zoom_pagination['boundsOverflow'] is False
        font_ready_repagination = page.evaluate("""async () => {
          const canvas = document.createElement('div');
          canvas.id = 'fontReadyQc';
          canvas.className = 'publisher-canvas live-a4-canvas';
          canvas.style.cssText = 'position:fixed;left:-2000px;top:0;width:900px;height:900px;max-height:none;overflow:visible';
          const diagnostics = document.createElement('div');
          document.body.append(canvas, diagnostics);
          let resolveFonts;
          const fontsReadyPromise = new Promise(resolve => { resolveFonts = resolve; });
          const materialBlocks = Array.from({length: 18}, (_, index) => ({
            type: 'paragraph',
            text: 'Delayed font paragraph ' + String(index + 1) + ' berisi materi panjang yang harus tetap utuh setelah Poppins selesai dimuat dan pagination dihitung ulang.'
          }));
          const session = {
            rowKey: 'font-ready::1::1', session: '1', status: 'Ready', topic: 'Delayed font pagination',
            fields: {objectives: {text: 'Memeriksa repagination font.'}, materials: {text: materialBlocks.map(item => item.text).join('\\n')}},
            materialBlocks, tables: []
          };
          const project = {course: {key: 'roblox', label: 'Roblox Studio', coverLabel: 'ROBLOX STUDIO'}, level: '1', sessions: [session]};
          const initial = SclPublisher.renderSessionPreview(project, session, {
            canvas, diagnostics, imagesReady: true, fontsReadyPromise
          });
          const style = document.createElement('style');
          style.textContent = '#fontReadyQc .text-reading{font-size:22pt!important;line-height:1.8!important}';
          document.head.appendChild(style);
          canvas.scrollTop = Math.min(220, canvas.scrollHeight - canvas.clientHeight);
          const scrollBefore = canvas.scrollTop;
          resolveFonts();
          await fontsReadyPromise;
          await new Promise(resolve => setTimeout(resolve, 250));
          const result = {
            beforePages: initial.pageCount,
            afterPages: canvas.querySelectorAll('.a4-page').length,
            paragraphCount: canvas.querySelectorAll('.text-reading').length,
            pageOverflow: diagnostics.innerText.includes('PAGE_OVERFLOW'),
            boundsOverflow: [...canvas.querySelectorAll('.a4-page-body, .a4-opener-flow')]
              .some(node => SclPublisher.__test.contentBoundsOverflow(node)),
            scrollDelta: Math.abs(canvas.scrollTop - scrollBefore)
          };
          style.remove(); canvas.remove(); diagnostics.remove();
          return result;
        }""")
        assert font_ready_repagination['afterPages'] > font_ready_repagination['beforePages']
        assert font_ready_repagination['paragraphCount'] == 18
        assert font_ready_repagination['pageOverflow'] is False
        assert font_ready_repagination['boundsOverflow'] is False
        assert font_ready_repagination['scrollDelta'] <= 2
        sticky_metrics = page.evaluate("""() => {
          const workspace = document.querySelector('.editor-workspace');
          const preview = document.querySelector('.live-a4-preview-panel');
          workspace.style.minHeight = '2400px';
          window.scrollTo(0, 900);
          const scrolledTop = preview.getBoundingClientRect().top;
          const position = getComputedStyle(preview).position;
          window.scrollTo(0, 0);
          workspace.style.minHeight = '';
          return {position, scrolledTop};
        }""")
        assert sticky_metrics['position'] == 'sticky'
        assert 11 <= sticky_metrics['scrolledTop'] <= 13

        assert page.locator('.editor-field-tabs button').count() == 10
        assert page.locator('#sessionA4Preview .a4-page-asset').count() >= 2
        assert page.locator('#sessionA4Preview .a4-role-opener').count() == 1
        assert page.locator('#sessionA4Preview .a4-content-block').count() >= 1
        continuous_surface = page.locator('#blockEditor').evaluate(
            "el => ({display: getComputedStyle(el).display, cardBorder: getComputedStyle(el.querySelector('.document-paragraph')).borderTopWidth, editableRoots: el.querySelectorAll('[contenteditable=true]').length})"
        )
        assert continuous_surface['display'] == 'block'
        assert continuous_surface['cardBorder'] == '0px'
        assert continuous_surface['editableRoots'] == 1
        assert page.locator('.task-preview').count() == 0
        initial_materials = page.evaluate('SclVisualEditor.serialize().materials.text')
        assert initial_materials.split('\n')[1] == 'fyk4*'
        assert initial_materials.split('\n')[3] == 'kc1*'

        first_editable = page.locator('.document-paragraph').nth(0)
        first_editable.click()
        first_editable.evaluate("el => { el.focus(); const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(el); selection.removeAllRanges(); selection.addRange(range); }")
        page.keyboard.type('Rich formatted introduction')
        first_editable.evaluate("el => { el.focus(); const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(el); selection.removeAllRanges(); selection.addRange(range); }")
        first_editable.evaluate("el => { const strong = document.createElement('strong'); strong.textContent = el.textContent; el.replaceChildren(strong); el.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'formatBold'})); el.blur(); }")
        page.wait_for_timeout(180)
        page.wait_for_function("document.querySelector('#sessionA4Preview').innerText.includes('Rich formatted introduction')")
        bold_model = page.evaluate('SclVisualEditor.serialize().materials')
        assert bold_model['runs'][0]['bold'] is True

        marker_before = page.locator('.document-paragraph').nth(1)
        marker_before.evaluate("el => { const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode(); const range = document.createRange(); range.setStart(text, 0); range.collapse(true); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); }")
        page.evaluate("() => { const flow = document.querySelector('.document-flow-editor'); flow.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true})); }")
        reordered = page.evaluate('SclVisualEditor.serialize().materials.text')
        assert reordered.count('fyk4*') == 1 and reordered.count('kc1*') == 1
        page.click('#undoEditorButton')
        undone = page.evaluate('SclVisualEditor.serialize().materials.text')
        assert undone.split('\n')[1] == 'fyk4*'
        page.click('#redoEditorButton')
        redone = page.evaluate('SclVisualEditor.serialize().materials.text')
        assert redone.count('fyk4*') == 1

        page.click('#addPageBreakButton')
        assert '[[SCL_PAGE_BREAK]]' in page.evaluate('SclVisualEditor.serialize().materials.text')

        preview_scroll_before_reflow = page.locator('#sessionA4Preview').evaluate(
            "el => { el.scrollTop = Math.min(300, el.scrollHeight - el.clientHeight); return el.scrollTop; }"
        )
        page.locator('.document-image-atom input[type="range"]').fill('55')
        page.wait_for_function("document.querySelector('#sessionA4Preview .a4-image-block').style.width === '55%' && document.querySelector('#sessionA4Preview .a4-image-block img').style.width === '100%'")
        preview_scroll_after_reflow = page.locator('#sessionA4Preview').evaluate('el => el.scrollTop')
        assert abs(preview_scroll_after_reflow - preview_scroll_before_reflow) <= 2
        page.locator('.document-image-atom input[type="range"]').fill('25')
        page.wait_for_function("document.querySelector('#sessionA4Preview .a4-image-block').style.width === '25%' && document.querySelector('#sessionA4Preview .a4-image-block img').style.width === '100%'")
        page.locator('.document-image-atom input[type="range"]').fill('55')
        page.wait_for_function("document.querySelector('#sessionA4Preview .a4-image-block').style.width === '55%' && document.querySelector('#sessionA4Preview .a4-image-block img').style.width === '100%'")
        image_model = page.evaluate('SclVisualEditor.serialize().materials')
        assert any(run.get('link', '').endswith('#scl-width=55') for run in image_model['runs'])

        page.locator('.editor-field-tabs button[data-field="must_do"]').click()
        assert page.locator('.task-preview.must-do').count() == 1
        assert page.locator('.task-preview.must-do input[type="checkbox"]').count() == 0
        task_visual = page.locator('.task-preview.must-do').evaluate(
            "el => ({border: getComputedStyle(el).borderTopWidth, shadow: getComputedStyle(el).boxShadow, label: getComputedStyle(el, '::before').content})"
        )
        assert task_visual['border'] == '3px'
        assert task_visual['shadow'] != 'none'
        assert 'MUST DO' in task_visual['label']
        page.locator('.editor-field-tabs button[data-field="self-check"]').click()
        assert page.locator('.task-preview.self-check').count() == 1
        assert page.locator('.task-preview.self-check input[type="checkbox"]').count() == 0

        page.once('dialog', lambda dialog: dialog.accept('http://example.invalid/not-image.txt'))
        page.click('#addImageBlockButton')
        assert 'Image ditolak' in page.locator('#editorDiagnostics').inner_text()

        page.fill('#sessionTopicInput', 'Phase 3 visual editor fixture')
        page.locator('.editor-field-tabs button[data-field="materials"]').click()
        page.click('#sessionTopicInput')
        page.keyboard.press('Tab')
        page.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Tersimpan')")
        assert '[[SCL_PAGE_BREAK]]' in server.fields['1']['materials']['text']
        assert any(run.get('link', '').endswith('#scl-width=55') for run in server.fields['1']['materials']['runs'])

        page.click('#closeSessionButton')
        page.wait_for_selector('#sessionEditorPanel', state='hidden')
        page.locator('.session-card').nth(0).click()
        page.wait_for_selector('#leaseStatus.active')
        reloaded_materials = page.evaluate('SclVisualEditor.serialize().materials')
        assert '[[SCL_PAGE_BREAK]]' in reloaded_materials['text']
        assert any(run.get('link', '').endswith('#scl-width=55') for run in reloaded_materials['runs'])

        page.screenshot(path=str(OUTPUT / 'phase3-editor-desktop.png'), full_page=True)
        page.locator('.editor-field-tabs button[data-field="must_do"]').click()
        page.screenshot(path=str(OUTPUT / 'phase3-task-preview.png'), full_page=True)
        result = {
            'richTextPersisted': any(run.get('bold') for run in server.fields['1']['materials']['runs']),
            'markerIdentityPreserved': server.fields['1']['materials']['text'].count('fyk4*') == 1 and server.fields['1']['materials']['text'].count('kc1*') == 1,
            'undoRedoNormalized': redone.count('fyk4*') == 1,
            'pageBreakPersisted': '[[SCL_PAGE_BREAK]]' in server.fields['1']['materials']['text'],
            'imageWidthPersisted': any(run.get('link', '').endswith('#scl-width=55') for run in server.fields['1']['materials']['runs']),
            'staticTaskIcons': page.locator('.task-preview input[type="checkbox"]').count() == 0,
            'approvedComponentVisual': task_visual['border'] == '3px' and task_visual['shadow'] != 'none' and 'MUST DO' in task_visual['label'],
            'continuousDocumentSurface': continuous_surface['display'] == 'block' and continuous_surface['cardBorder'] == '0px' and continuous_surface['editableRoots'] == 1,
            'canonicalA4LivePreview': page.locator('#sessionA4Preview .a4-page-asset').count() >= 2,
            'previewHeight': preview_height,
            'previewZoomIn': zoom_in,
            'previewZoomReset': zoom_reset,
            'zoomInvariantPagination': zoom_pagination,
            'fontReadyRepagination': font_ready_repagination,
            'stickyPreviewWhileEditingLowerContent': sticky_metrics,
            'draftReflowedToPreview': 'Rich formatted introduction' in page.locator('#sessionA4Preview').inner_text(),
            'imageResizeReflowedRealtime': page.locator('#sessionA4Preview .a4-image-block').evaluate("el => el.style.width") == '55%',
            'previewScrollAnchorPreserved': {
                'before': preview_scroll_before_reflow,
                'after': preview_scroll_after_reflow,
            },
            'horizontalOverflow': page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'),
            'consoleErrors': console_errors,
            'pageErrors': page_errors,
            'artifacts': str(OUTPUT),
        }
        print(json.dumps(result, indent=2))
        assert all(result[key] is True for key in ('richTextPersisted', 'markerIdentityPreserved', 'undoRedoNormalized', 'pageBreakPersisted', 'imageWidthPersisted', 'staticTaskIcons', 'approvedComponentVisual', 'continuousDocumentSurface', 'canonicalA4LivePreview', 'draftReflowedToPreview', 'imageResizeReflowedRealtime'))
        assert result['horizontalOverflow'] is False
        assert result['consoleErrors'] == []
        assert result['pageErrors'] == []
        browser.close()


if __name__ == '__main__':
    main()
