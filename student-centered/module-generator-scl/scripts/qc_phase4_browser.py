import base64
import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

from qc_phase2_browser import attach_rpc, login_and_open_level
from qc_phase3_browser import SyntheticPhase3Server


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/private/tmp/kalananti-scl-phase4-qc')


class SyntheticPhase4Server(SyntheticPhase3Server):
    def __init__(self):
        super().__init__()
        self.tables = {'1': [], '2': []}

    def rpc_loadLevelProject(self, client_id, token, course_key, level):
        project = super().rpc_loadLevelProject(client_id, token, course_key, level)
        for session in project['sessions']:
            key = str(session['session'])
            if key in self.tables:
                session['tables'] = json.loads(json.dumps(self.tables[key]))
        return project

    def rpc_saveSessionPatch(self, client_id, token, lease_token, request):
        result = super().rpc_saveSessionPatch(client_id, token, lease_token, request)
        key = str(request['session'])
        self.tables[key] = json.loads(json.dumps(request.get('tables', [])))
        for table in self.tables[key]:
            table['anchorStatus'] = 'RESOLVED'
        result['tablesChanged'] = True
        return result


def main():
    subprocess.run(
        ['node', 'scripts/build-phase2-preview.mjs'], cwd=ROOT, check=True,
        capture_output=True, text=True,
    )
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = SyntheticPhase4Server()
    console_errors = []
    page_errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1100})
        attach_rpc(context, server, 'PHASE4')
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

        materials_before = page.evaluate('SclVisualEditor.serialize().materials.text')
        page.click('#addTableButton')
        table_editor = page.locator('.table-editor-block')
        assert table_editor.count() == 1
        assert table_editor.locator('table.semantic-table thead').count() == 1
        assert table_editor.locator('table.semantic-table tbody').count() == 1
        inputs = table_editor.locator('th input')
        inputs.nth(0).fill('Tool')
        inputs.nth(1).fill('Purpose')
        for _ in range(5):
            table_editor.get_by_role('button', name='Tambah row tabel').click()
        assert page.locator('.table-preview-page').count() >= 2
        assert page.locator('.table-preview-page thead').count() == page.locator('.table-preview-page').count()
        pagination = page.evaluate("SclVisualEditor.paginateTableRows({rows:[[1],[2],[3]]}, [60,60,300], 180, 40)")
        assert pagination['pages'] == [[[1], [2]]]
        assert pagination['oversizedRows'] == [2]

        page.locator('.table-editor-block td input').nth(0).fill('Move')
        page.locator('.table-editor-block td input').nth(1).fill('<script>literal only</script>')
        page.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Tersimpan')")
        assert server.tables['1'][0]['table']['headers'] == ['Tool', 'Purpose']
        assert '<table' not in server.fields['1']['materials']['text']
        assert server.fields['1']['materials']['text'] == materials_before

        page.click('#closeSessionButton')
        page.wait_for_selector('#sessionEditorPanel', state='hidden')
        page.locator('.session-card').nth(0).click()
        page.wait_for_selector('#leaseStatus.active')
        assert page.locator('.table-editor-block').count() == 1
        assert page.locator('.table-editor-block td input').nth(0).input_value() == 'Move'

        page.click('#closeSessionButton')
        page.wait_for_selector('#sessionEditorPanel', state='hidden')
        server.tables['1'][0]['anchorHash'] = 'fnv1a32:deadbeef'
        server.tables['1'][0]['anchorStatus'] = 'STALE'
        page.reload(wait_until='domcontentloaded')
        page.wait_for_selector('.course-card:not([disabled])')
        page.click('.course-card:not([disabled])')
        page.wait_for_selector('.level-card')
        page.click('.level-card')
        page.wait_for_selector('.session-card')
        page.locator('.session-card').nth(0).click()
        page.wait_for_selector('#leaseStatus.active')
        assert page.evaluate('SclVisualEditor.hasBlockingDiagnostics()') is True
        assert 'TABLE_ANCHOR_STALE' in page.locator('#editorDiagnostics').inner_text()
        page.get_by_role('button', name='Tempatkan ulang tabel').click()
        assert page.evaluate('SclVisualEditor.hasBlockingDiagnostics()') is False
        page.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Tersimpan')")

        page.screenshot(path=str(OUTPUT / 'phase4-table-editor.png'), full_page=True)
        result = {
            'semanticTable': page.locator('.table-editor-block table > thead').count() == 1,
            'hiddenStoreReload': len(server.tables['1']) == 1,
            'materialsUnchanged': server.fields['1']['materials']['text'] == materials_before,
            'repeatedHeader': page.locator('.table-preview-page thead').count() == page.locator('.table-preview-page').count(),
            'wholeRowPagination': pagination['oversizedRows'] == [2],
            'staleAnchorResolved': page.evaluate('SclVisualEditor.hasBlockingDiagnostics()') is False,
            'horizontalOverflow': page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'),
            'consoleErrors': console_errors,
            'pageErrors': page_errors,
            'artifacts': str(OUTPUT),
        }
        print(json.dumps(result, indent=2))
        assert all(result[key] is True for key in (
            'semanticTable', 'hiddenStoreReload', 'materialsUnchanged',
            'repeatedHeader', 'wholeRowPagination', 'staleAnchorResolved',
        ))
        assert result['horizontalOverflow'] is False
        assert result['consoleErrors'] == []
        assert result['pageErrors'] == []
        browser.close()


if __name__ == '__main__':
    main()
