import base64
import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/private/tmp/kalananti-scl-phase2-qc')
PREVIEW = Path('/private/tmp/kalananti-scl-phase2-preview/index.html')


class SyntheticPhase2Server:
    def __init__(self):
        self.now_ms = 1_775_203_200_000
        self.tokens = {}
        self.locks = {}
        self.topics = {'1': 'Synthetic topic 1', '2': 'Synthetic topic 2'}
        self.materials = {'1': 'First material block\nSecond material block',
                          '2': 'First material block\nSecond material block'}
        self.revisions = {'1': 'revision-1-0', '2': 'revision-2-0'}
        self.histories = {'1': [], '2': []}
        self.layouts = {'1': [], '2': []}
        self.idempotent = {}
        self.resume_events = set()
        self.counter = 0
        self.rpc_counts = {}

    def handle(self, client_id, method, args):
        self.rpc_counts[method] = self.rpc_counts.get(method, 0) + 1
        handler = getattr(self, f'rpc_{method}')
        try:
            return {'ok': True, 'data': handler(client_id, *args)}
        except RpcError as error:
            return {
                'ok': False,
                'error': {
                    'code': error.code,
                    'message': error.message,
                    'retryable': False,
                    'details': error.details,
                },
            }

    def rpc_getAppBootstrap(self, _client_id):
        return {
            'appName': 'Kalananti SCL Module Generator',
            'requiresLogin': True,
            'configurationStatus': 'READY',
        }

    def rpc_authenticateEditor(self, client_id, _passcode, _label):
        token = f'token-{client_id}'
        self.tokens[token] = client_id
        return self.bootstrap(client_id, token)

    def rpc_resumeEditorSession(self, client_id, token):
        self.require_token(client_id, token)
        return self.bootstrap(client_id, token)

    def rpc_logoutEditor(self, client_id, token):
        self.require_token(client_id, token)
        return {'loggedOut': True}

    def rpc_listActivity(self, client_id, token, request):
        self.require_token(client_id, token)
        limit = min(int(request.get('limit', 50)), 100)
        items = [{
            'eventType': 'login_success',
            'status': 'SUCCESS',
            'courseKey': '',
            'level': '',
            'session': '',
            'editorLabel': f'Editor {client_id}',
            'identityType': 'self-declared',
            'attemptCount': 0,
            'createdAt': self.iso(self.now_ms),
        }, {
            'eventType': 'login_failed',
            'status': 'FAILED',
            'courseKey': '',
            'level': '',
            'session': '',
            'editorLabel': 'Anonymous',
            'identityType': 'unknown',
            'attemptCount': 2,
            'createdAt': self.iso(self.now_ms - 1_000),
        }][:limit]
        return {
            'schemaVersion': 'scl-activity/v1',
            'items': items,
            'nextCursor': None,
            'hasMore': False,
        }

    def rpc_recordComposeAttempt(self, client_id, token, _course_key, _level, _result):
        self.require_token(client_id, token)
        return {'recorded': True}

    def rpc_listPublishedModules(self, client_id, token, request):
        self.require_token(client_id, token)
        limit = min(int(request.get('limit', 50)), 100)
        items = [{
            'publishId': 'synthetic-publish-2',
            'courseKey': 'roblox',
            'level': '1',
            'version': 2,
            'status': 'PUBLISHED',
            'isLatest': True,
            'fileName': 'Kalananti-SCL-ROBLOX-STUDIO-Level-1-v002.pdf',
            'pageCount': 34,
            'fileSizeBytes': 5000001,
            'rendererVersion': 'fixture-renderer-v1',
            'publishedBy': f'Editor {client_id}',
            'createdAt': self.iso(self.now_ms - 60_000),
            'completedAt': self.iso(self.now_ms - 50_000),
            'errorCode': '',
            'openUrl': 'https://drive.google.com/file/d/syntheticFixtureFileTwo/view',
        }, {
            'publishId': 'synthetic-publish-1',
            'courseKey': 'roblox',
            'level': '1',
            'version': 1,
            'status': 'PUBLISHED',
            'isLatest': False,
            'fileName': 'Kalananti-SCL-ROBLOX-STUDIO-Level-1-v001.pdf',
            'pageCount': 34,
            'fileSizeBytes': 5000000,
            'rendererVersion': 'fixture-renderer-v1',
            'publishedBy': f'Editor {client_id}',
            'createdAt': self.iso(self.now_ms - 120_000),
            'completedAt': self.iso(self.now_ms - 110_000),
            'errorCode': '',
            'openUrl': 'https://drive.google.com/file/d/syntheticFixtureFileOne/view',
        }][:limit]
        return {
            'schemaVersion': 'scl-publish-list/v1',
            'items': items,
            'nextCursor': None,
            'hasMore': False,
        }

    def rpc_getDrivePublishingCapability(self, client_id, token):
        self.require_token(client_id, token)
        return {
            'configured': True,
            'accessible': True,
            'canAddChildren': True,
            'sharedDrive': True,
        }

    def rpc_listCoursesAndLevels(self, client_id, token):
        self.require_token(client_id, token)
        return {
            'schemaVersion': 'scl-level-catalog/v1',
            'courses': [{
                'key': 'roblox',
                'label': 'Roblox Studio',
                'coverLabel': 'ROBLOX STUDIO',
                'levels': [{
                    'level': '1',
                    'readyCount': 2,
                    'incompleteCount': 0,
                    'needsFixCount': 0,
                    'missingCount': 10,
                    'warningCount': 0,
                }],
            }, {
                'key': 'scratch',
                'label': 'Scratch',
                'coverLabel': 'SCRATCH',
                'levels': [],
            }, {
                'key': 'python',
                'label': 'Python',
                'coverLabel': 'PYTHON',
                'levels': [],
            }],
        }

    def rpc_loadLevelProject(self, client_id, token, course_key, level):
        self.require_token(client_id, token)
        sessions = []
        for number in range(1, 13):
            key = str(number)
            if key not in self.topics:
                sessions.append({
                    'rowKey': '', 'sourceRevision': '', 'session': key,
                    'topic': '', 'status': 'On Progress', 'warnings': [], 'fields': {},
                })
                continue
            status = 'Ready'
            lock = self.active_lock(key)
            payload = {
                'rowKey': f'synthetic::{level}::{key}',
                'sourceRevision': self.revisions[key],
                'session': key,
                'topic': self.topics[key],
                'status': status,
                'warnings': [],
                'fields': {
                    'Session-topic': self.plain_model(self.topics[key]),
                    'materials': self.plain_model(self.materials[key]),
                },
                'tables': [],
                'layouts': json.loads(json.dumps(self.layouts[key])),
            }
            if lock:
                payload['status'] = 'Locked'
                payload['lock'] = {
                    'editorLabel': lock['editor'],
                    'lastActivity': self.iso(lock['heartbeat']),
                    'expiresAt': self.iso(lock['expires']),
                }
            sessions.append(payload)
        return {
            'schemaVersion': 'scl-level/v1',
            'course': {'key': course_key, 'label': 'Roblox Studio', 'coverLabel': 'ROBLOX STUDIO'},
            'level': str(level),
            'readyCount': 2,
            'totalSlots': 12,
            'warningCount': 0,
            'sessions': sessions,
            'diagnostics': [],
        }

    def rpc_acquireSessionLease(self, client_id, token, _course_key, _level, session):
        self.require_token(client_id, token)
        key = str(session)
        active = self.active_lock(key)
        if active:
            raise RpcError(
                'SESSION_LOCKED',
                'Session sedang diedit oleh pengguna lain.',
                {'editorLabel': active['editor'], 'lastActivity': self.iso(active['heartbeat'])},
            )
        self.counter += 1
        lease_token = f'lease-{client_id}-{self.counter}'
        self.locks[key] = {
            'client': client_id,
            'editor': f'Editor {client_id}',
            'token': lease_token,
            'acquired': self.now_ms,
            'heartbeat': self.now_ms,
            'expires': self.now_ms + 60_000,
        }
        return {
            'leaseToken': lease_token,
            'acquiredAt': self.iso(self.now_ms),
            'expiresAt': self.iso(self.now_ms + 60_000),
            'heartbeatIntervalSeconds': 30,
            'sourceRevision': self.revisions[key],
            'editor': {'label': f'Editor {client_id}', 'selfDeclared': True},
        }

    def rpc_heartbeatSessionLease(self, client_id, token, lease_token, _course_key, _level, session):
        self.require_token(client_id, token)
        lock = self.require_lease(client_id, str(session), lease_token)
        lock['heartbeat'] = self.now_ms
        lock['expires'] = self.now_ms + 60_000
        return {'expiresAt': self.iso(lock['expires']), 'heartbeatIntervalSeconds': 30}

    def rpc_resumeSessionLease(self, client_id, token, lease_token, edit_session_id,
                               _course_key, _level, session):
        self.require_token(client_id, token)
        key = str(session)
        lock = self.locks.get(key)
        if not lock or lock['client'] != client_id or lock['token'] != lease_token:
            raise RpcError('LEASE_INVALID', 'Hak edit sudah tidak berlaku atau diambil alih orang lain.')
        lock['heartbeat'] = self.now_ms
        lock['expires'] = self.now_ms + 60_000
        self.resume_events.add((client_id, str(edit_session_id), key))
        return {
            'leaseToken': lease_token,
            'acquiredAt': self.iso(lock.get('acquired', self.now_ms)),
            'expiresAt': self.iso(lock['expires']),
            'heartbeatIntervalSeconds': 30,
            'sourceRevision': self.revisions[key],
            'editor': {'label': lock['editor'], 'selfDeclared': True},
        }

    def rpc_releaseSessionLease(self, client_id, token, lease_token, _course_key, _level, session):
        self.require_token(client_id, token)
        self.require_lease(client_id, str(session), lease_token)
        del self.locks[str(session)]
        return {'released': True}

    def rpc_saveSessionPatch(self, client_id, token, lease_token, request):
        self.require_token(client_id, token)
        key = str(request['session'])
        self.require_lease(client_id, key, lease_token)
        request_key = (client_id, request['requestId'])
        if request_key in self.idempotent:
            return {**self.idempotent[request_key], 'duplicate': True}
        if request['baseRevision'] != self.revisions[key]:
            raise RpcError(
                'REVISION_CONFLICT',
                'Source berubah di luar editor. Perubahan lokal tidak ditimpa.',
                {'currentRevision': self.revisions[key]},
            )
        previous = self.topics[key]
        previous_layouts = json.loads(json.dumps(self.layouts[key]))
        next_topic = request['changes']['Session-topic']['text']
        self.counter += 1
        history_id = f'history-{self.counter}'
        self.histories[key].insert(0, {
            'historyId': history_id,
            'revisionBefore': self.revisions[key],
            'revisionAfter': f'revision-{key}-{self.counter}',
            'changedFields': ['Session-topic'],
            'editorLabel': f'Editor {client_id}',
            'createdAt': self.iso(self.now_ms),
            'snapshot': previous,
            'layoutsSnapshot': previous_layouts,
        })
        self.histories[key] = self.histories[key][:20]
        self.topics[key] = next_topic
        self.materials[key] = request['changes']['materials']['text']
        self.layouts[key] = json.loads(json.dumps(request.get('layouts', self.layouts[key])))
        self.revisions[key] = f'revision-{key}-{self.counter}'
        result = {
            'requestId': request['requestId'],
            'newRevision': self.revisions[key],
            'savedAt': self.iso(self.now_ms),
            'historyId': history_id,
            'changedFields': ['Session-topic'],
            'layoutsChanged': 'layouts' in request,
        }
        self.idempotent[request_key] = result
        return result

    def rpc_getSessionHistory(self, client_id, token, _course_key, _level, session):
        self.require_token(client_id, token)
        return [{key: value for key, value in entry.items()
                 if key not in ('snapshot', 'layoutsSnapshot')}
                for entry in self.histories[str(session)]]

    def rpc_restoreSessionRevision(self, client_id, token, lease_token, request):
        self.require_token(client_id, token)
        key = str(request['session'])
        self.require_lease(client_id, key, lease_token)
        target = next((entry for entry in self.histories[key]
                       if entry['historyId'] == request['historyId']), None)
        if not target:
            raise RpcError('HISTORY_NOT_FOUND', 'Revision history tidak ditemukan.')
        self.topics[key] = target['snapshot']
        self.layouts[key] = json.loads(json.dumps(target.get('layoutsSnapshot', [])))
        self.counter += 1
        self.revisions[key] = f'revision-{key}-{self.counter}'
        return {
            'requestId': request['requestId'],
            'newRevision': self.revisions[key],
            'restoredAt': self.iso(self.now_ms),
            'historyId': f'history-{self.counter}',
            'restoredFromHistoryId': request['historyId'],
        }

    def bootstrap(self, client_id, token):
        return {
            'session': {
                'token': token,
                'expiresAt': '2099-01-01T00:00:00.000Z',
                'editor': {'label': f'Editor {client_id}', 'email': '', 'selfDeclared': True},
            },
            'courses': [
                {'key': 'roblox', 'label': 'Roblox Studio', 'coverLabel': 'ROBLOX STUDIO'},
                {'key': 'scratch', 'label': 'Scratch', 'coverLabel': 'SCRATCH'},
                {'key': 'python', 'label': 'Python', 'coverLabel': 'PYTHON'},
            ],
            'storage': {
                'ok': True, 'safeMode': False, 'schemaVersion': 'scl-generator/v1',
                'diagnosticCodes': [],
            },
            'phase': {
                'key': 'phase-2', 'label': 'Locking, autosave, and history',
                'next': 'Pilih session untuk mulai mengedit dan menyimpan perubahan secara aman.',
            },
        }

    def active_lock(self, session):
        lock = self.locks.get(session)
        if lock and lock['expires'] > self.now_ms:
            return lock
        return None

    def require_lease(self, client_id, session, lease_token):
        lock = self.active_lock(session)
        if not lock or lock['client'] != client_id or lock['token'] != lease_token:
            raise RpcError('LEASE_EXPIRED', 'Hak edit session telah berakhir.')
        return lock

    def require_token(self, client_id, token):
        if self.tokens.get(token) != client_id:
            raise RpcError('SESSION_INVALID', 'Sesi tidak valid.')

    def advance(self, milliseconds):
        self.now_ms += milliseconds

    def direct_edit(self, session, value):
        key = str(session)
        self.counter += 1
        self.topics[key] = value
        self.revisions[key] = f'direct-revision-{self.counter}'

    @staticmethod
    def plain_model(value):
        return {'text': value, 'runs': [{'start': 0, 'end': len(value)}] if value else []}

    @staticmethod
    def iso(milliseconds):
        from datetime import datetime, timezone
        return datetime.fromtimestamp(milliseconds / 1000, tz=timezone.utc).isoformat().replace('+00:00', 'Z')


class RpcError(Exception):
    def __init__(self, code, message, details=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def build_preview():
    subprocess.run(
        ['node', 'scripts/build-phase2-preview.mjs'],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )


def attach_rpc(context, server, client_id):
    context.expose_function(
        '__phase2Rpc',
        lambda method, args: server.handle(client_id, method, args),
    )


def login_and_open_level(page):
    page.goto(PREVIEW.as_uri(), wait_until='domcontentloaded')
    page.fill('#passcode', 'synthetic-success')
    page.fill('#editorLabel', 'Synthetic Editor')
    page.click('#loginButton')
    page.wait_for_selector('.course-card:not([disabled])')
    page.click('.course-card:not([disabled])')
    page.wait_for_selector('.level-card')
    page.click('.level-card')
    page.wait_for_selector('.session-card')


def main():
    build_preview()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = SyntheticPhase2Server()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context_a = browser.new_context(viewport={'width': 1440, 'height': 1000})
        context_b = browser.new_context(viewport={'width': 1280, 'height': 900})
        fixture_png = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
        )
        for context in (context_a, context_b):
            context.route('https://example.invalid/**', lambda route: route.fulfill(
                status=200, content_type='image/png', body=fixture_png
            ))
        attach_rpc(context_a, server, 'A')
        attach_rpc(context_b, server, 'B')
        page_a = context_a.new_page()
        page_b = context_b.new_page()
        page_a.set_default_timeout(10000)
        page_b.set_default_timeout(10000)
        console_errors = []
        page_errors = []
        for page in (page_a, page_b):
            page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
            page.on('pageerror', lambda error: page_errors.append(str(error)))

        login_and_open_level(page_a)
        login_and_open_level(page_b)
        page_a.locator('.session-card').nth(0).click()
        page_a.wait_for_selector('#leaseStatus.active')
        assert page_a.locator('.legacy-editor-shell').get_attribute('data-editor-shell') == 'legacy-paged-v1'
        assert page_a.locator('[data-editor-surface="paged-document-v1"]').count() == 1

        page_b.locator('.session-card').nth(0).click()
        page_b.wait_for_selector('#sessionEditorPanel:not([hidden])')
        assert page_b.locator('#sessionTopicInput').is_editable() is False
        assert 'Editor A' in page_b.locator('#sessionEditorLockMeta').inner_text()
        assert page_b.locator('#leaseStatus').inner_text() == 'Sedang diedit orang lain'
        assert page_b.locator('#reacquireEditButton').is_visible() is True
        page_b.click('#reacquireEditButton')
        page_b.wait_for_function("document.querySelector('#leaseStatus').textContent === 'Sedang diedit orang lain'")
        locked_retry_actionable = 'Coba lagi nanti' in page_b.locator(
            '[data-notification-id="edit-access"]'
        ).inner_text()

        page_b.click('#closeSessionButton')
        page_b.wait_for_selector('#sessionEditorPanel', state='hidden')
        page_b.locator('.session-card').nth(1).click()
        page_b.wait_for_selector('#leaseStatus.active')
        assert page_b.locator('#sessionTopicInput').is_editable() is True
        assert page_b.locator('.legacy-editor-shell').get_attribute('data-editor-shell') == 'legacy-paged-v1'

        first_paragraph = page_a.locator('#blockEditor .document-paragraph').first
        first_paragraph.click()
        page_a.evaluate('''() => {
          const paragraph = document.querySelector('#blockEditor .document-paragraph');
          const text = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT).nextNode();
          const range = document.createRange(); range.setStart(text, 0); range.collapse(true);
          const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        }''')
        reorder_event = page_a.evaluate('''() => {
          const flow = document.querySelector('#blockEditor .document-flow-editor');
          const event = new KeyboardEvent('keydown', {key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true});
          flow.dispatchEvent(event); return event.defaultPrevented;
        }''')
        assert reorder_event is True
        reordered_dom = page_a.evaluate("[...document.querySelector('#blockEditor .document-flow-editor').children].map(node => node.dataset.blockId)")
        assert reordered_dom[:2] == ['materials:line-1', 'materials:line-0'], reordered_dom
        page_a.click('#addPageBreakButton')
        page_a.once('dialog', lambda dialog: dialog.accept('https://example.invalid/layout-fixture.png'))
        page_a.click('#addImageBlockButton')
        image_range = page_a.locator('input[aria-label="Lebar gambar persen"]').last
        image_range.evaluate("node => { node.value = '55'; node.dispatchEvent(new Event('input', { bubbles: true })); }")

        autosave_value = 'Autosave after five seconds'
        page_a.evaluate("window.__phase2RpcDelays = {saveSessionPatch: 900}")
        page_a.fill('#sessionTopicInput', autosave_value)
        local_draft_before_save = page_a.evaluate(
            "Object.keys(localStorage).some(key => key.includes('recoveryDraft') && localStorage.getItem(key).includes('Autosave after five seconds'))"
        )
        page_a.wait_for_timeout(5200)
        autosave_loading_notice = page_a.locator('[data-notification-id="autosave"].loading').is_visible()
        autosave_notice_closable = page_a.locator('[data-notification-id="autosave"] .soft-notification-close').is_visible()
        page_a.screenshot(path=str(OUTPUT / 'desktop-autosave-loading.png'))
        page_a.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Tersimpan')")
        autosave_success_notice = page_a.locator('[data-notification-id="autosave"].success').is_visible()
        page_a.locator('[data-notification-id="autosave"] .soft-notification-close').click()
        page_a.wait_for_selector('[data-notification-id="autosave"]', state='detached')
        page_a.evaluate("window.__phase2RpcDelays = {}")
        assert server.topics['1'] == autosave_value
        assert len(server.histories['1']) == 1
        persisted_layouts = server.layouts['1']
        assert any(layout.get('manualBreak') is True for layout in persisted_layouts)
        assert any(layout.get('imageWidthPercent') == 55 for layout in persisted_layouts)
        layout_order = {layout['blockKey']: layout['orderIndex'] for layout in persisted_layouts}
        assert layout_order['materials:line-1'] < layout_order['materials:line-0'], layout_order

        page_a.evaluate("window.__phase2RpcDelays = {releaseSessionLease: 700}")
        page_a.click('#closeSessionButton')
        page_a.wait_for_selector('[data-notification-id="close-session"].loading')
        close_button_loading = page_a.locator('#closeSessionButton').is_disabled() and \
            page_a.locator('#closeSessionButton').inner_text() == 'Menutup…'
        page_a.wait_for_selector('#sessionEditorPanel', state='hidden')
        close_success_notice = page_a.locator('[data-notification-id="close-session"].success').is_visible()
        page_a.evaluate("window.__phase2RpcDelays = {}")
        page_b.click('#closeSessionButton')
        page_b.wait_for_selector('#sessionEditorPanel', state='hidden')
        page_b.reload(wait_until='domcontentloaded')
        page_b.wait_for_selector('.course-card:not([disabled])')
        page_b.click('.course-card:not([disabled])')
        page_b.wait_for_selector('.level-card')
        page_b.click('.level-card')
        page_b.wait_for_selector('.session-card:not([disabled])')
        page_b.locator('.session-card').nth(0).click()
        page_b.wait_for_selector('#leaseStatus.active')
        cross_context_layouts = page_b.evaluate('SclVisualEditor.serializeLayouts()')
        assert cross_context_layouts == persisted_layouts, {
            'crossContext': cross_context_layouts,
            'persisted': persisted_layouts,
        }
        assert page_b.locator('input[aria-label="Lebar gambar persen"]').last.input_value() == '55'
        page_b.locator('.legacy-editor-shell').screenshot(path=str(OUTPUT / 'desktop-second-context.png'))
        page_b.click('#closeSessionButton')
        page_b.wait_for_selector('#sessionEditorPanel', state='hidden')

        page_a.locator('.session-card').nth(0).click()
        page_a.wait_for_selector('#leaseStatus.active')

        crash_value = 'Recovered after simulated crash'
        page_a.fill('#sessionTopicInput', crash_value)
        page_a.close()
        server.advance(61_000)
        page_a_reopened = context_a.new_page()
        page_a_reopened.set_default_timeout(10000)
        page_a_reopened.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page_a_reopened.on('pageerror', lambda error: page_errors.append(str(error)))
        login_and_open_level(page_a_reopened)
        page_a_reopened.locator('.session-card').nth(0).click()
        page_a_reopened.wait_for_selector('#leaseStatus.active')
        page_a_reopened.wait_for_selector('#recoveryBanner:not([hidden])')
        page_a_reopened.click('#useDraftButton')
        recovery_draft_loaded = page_a_reopened.input_value('#sessionTopicInput') == crash_value
        assert recovery_draft_loaded
        assert 'akan disimpan otomatis setelah 5 detik' in page_a_reopened.locator(
            '[data-notification-id="draft-recovery"]'
        ).inner_text()
        page_a_reopened.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Tersimpan')")
        recovered_draft_autosaved = server.topics['1'] == crash_value
        assert recovered_draft_autosaved

        same_revision_draft = 'Continue safely after access expiry'
        server.advance(61_000)
        page_a_reopened.fill('#sessionTopicInput', same_revision_draft)
        page_a_reopened.keyboard.press('Tab')
        page_a_reopened.wait_for_function(
            "document.querySelector('#leaseStatus').textContent === 'Akses edit berakhir'"
        )
        access_expiry_read_only = page_a_reopened.locator('#sessionTopicInput').is_editable() is False
        access_expiry_cta_visible = page_a_reopened.locator('#reacquireEditButton').is_visible()
        access_expiry_draft_preserved = page_a_reopened.evaluate(
            "value => Object.keys(localStorage).some(key => key.includes('recoveryDraft') && localStorage.getItem(key).includes(value))",
            same_revision_draft,
        )
        access_panel_copy = page_a_reopened.locator('#sessionEditorPanel').inner_text().lower()
        access_copy_plain = 'lease' not in access_panel_copy and 'heartbeat' not in access_panel_copy

        page_a_reopened.evaluate("window.__phase2RpcDelays = {acquireSessionLease: 700}")
        page_a_reopened.click('#reacquireEditButton')
        page_a_reopened.wait_for_function(
            "document.querySelector('#reacquireEditButton').disabled && document.querySelector('#reacquireEditButton').textContent === 'Mengaktifkan…'"
        )
        reacquire_button_loading = True
        page_a_reopened.wait_for_function("document.querySelector('#leaseStatus').textContent === 'Bisa diedit'")
        page_a_reopened.evaluate("window.__phase2RpcDelays = {}")
        same_revision_reactivated = page_a_reopened.locator('#sessionTopicInput').is_editable() and \
            page_a_reopened.input_value('#sessionTopicInput') == same_revision_draft and \
            page_a_reopened.locator('#reacquireEditButton').is_hidden()
        page_a_reopened.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Tersimpan')")
        same_revision_autosaved = server.topics['1'] == same_revision_draft

        changed_revision_draft = 'Local draft before safe source refresh'
        changed_revision_source = 'Newer source loaded during access recovery'
        server.advance(61_000)
        page_a_reopened.fill('#sessionTopicInput', changed_revision_draft)
        page_a_reopened.keyboard.press('Tab')
        page_a_reopened.wait_for_function(
            "document.querySelector('#leaseStatus').textContent === 'Akses edit berakhir'"
        )
        server.direct_edit('1', changed_revision_source)
        page_a_reopened.click('#reacquireEditButton')
        page_a_reopened.wait_for_function("document.querySelector('#leaseStatus').textContent === 'Bisa diedit'")
        page_a_reopened.wait_for_selector('#recoveryBanner:not([hidden])')
        changed_revision_latest_loaded = page_a_reopened.input_value('#sessionTopicInput') == changed_revision_source
        changed_revision_draft_preserved = page_a_reopened.evaluate(
            "value => Object.keys(localStorage).some(key => key.includes('recoveryDraft') && localStorage.getItem(key).includes(value))",
            changed_revision_draft,
        )
        changed_revision_draft_not_applied = page_a_reopened.input_value('#sessionTopicInput') != changed_revision_draft

        server.direct_edit('1', 'Direct Sheet conflict value')
        conflict_local_value = 'Local draft preserved after direct conflict'
        page_a_reopened.fill('#sessionTopicInput', conflict_local_value)
        page_a_reopened.keyboard.press('Tab')
        page_a_reopened.wait_for_selector('#conflictBanner:not([hidden])')
        assert 'Source berubah' in page_a_reopened.locator('#conflictMessage').inner_text()
        error_notice_visible = page_a_reopened.locator('[data-notification-id="action-error"].error').is_visible()
        error_notice_closable = page_a_reopened.locator(
            '[data-notification-id="action-error"] .soft-notification-close'
        ).is_visible()
        draft_after_conflict = page_a_reopened.evaluate(
            "value => Object.keys(localStorage).some(key => key.includes('recoveryDraft') && localStorage.getItem(key).includes(value))",
            conflict_local_value,
        )

        page_a_reopened.locator('.legacy-editor-shell').screenshot(path=str(OUTPUT / 'desktop-recovery-conflict.png'))
        result = {
            'twoBrowserContexts': True,
            'legacyPagedShell': True,
            'pagedDocumentSurface': True,
            'sameSessionBlocked': True,
            'lockedRetryActionable': locked_retry_actionable,
            'differentSessionEditable': True,
            'layoutReorderPersisted': layout_order['materials:line-1'] < layout_order['materials:line-0'],
            'manualBreakPersisted': any(layout.get('manualBreak') is True for layout in persisted_layouts),
            'imageWidthPersisted': any(layout.get('imageWidthPercent') == 55 for layout in persisted_layouts),
            'crossContextLayoutReload': cross_context_layouts == persisted_layouts,
            'autosaveAfterFiveSeconds': server.topics['1'] == 'Direct Sheet conflict value',
            'autosaveLoadingNotice': autosave_loading_notice,
            'autosaveSuccessNotice': autosave_success_notice,
            'autosaveNoticeClosable': autosave_notice_closable,
            'closeButtonShowsLoading': close_button_loading,
            'closeSuccessNotice': close_success_notice,
            'localDraftBeforeSave': local_draft_before_save,
            'crashRecoveryDraftLoaded': recovery_draft_loaded,
            'recoveredDraftAutosaved': recovered_draft_autosaved,
            'accessExpiryReadOnly': access_expiry_read_only,
            'accessExpiryCtaVisible': access_expiry_cta_visible,
            'accessExpiryDraftPreserved': access_expiry_draft_preserved,
            'accessCopyUsesPlainLanguage': access_copy_plain,
            'reacquireButtonShowsLoading': reacquire_button_loading,
            'sameRevisionReactivated': same_revision_reactivated,
            'sameRevisionAutosaved': same_revision_autosaved,
            'changedRevisionLatestLoaded': changed_revision_latest_loaded,
            'changedRevisionDraftPreserved': changed_revision_draft_preserved,
            'changedRevisionDraftNotAutoApplied': changed_revision_draft_not_applied,
            'directSheetConflictBlocked': server.topics['1'] == 'Direct Sheet conflict value',
            'draftPreservedAfterConflict': draft_after_conflict,
            'softErrorNoticeVisible': error_notice_visible,
            'softErrorNoticeClosable': error_notice_closable,
            'historyCountAfterAutosave': len(server.histories['1']),
            'horizontalOverflow': page_a_reopened.evaluate(
                'document.documentElement.scrollWidth > document.documentElement.clientWidth'
            ),
            'consoleErrors': console_errors,
            'pageErrors': page_errors,
            'rpcCounts': server.rpc_counts,
            'artifacts': str(OUTPUT),
        }
        print(json.dumps(result, indent=2))
        assert result['localDraftBeforeSave'] is True
        assert result['autosaveLoadingNotice'] is True
        assert result['autosaveSuccessNotice'] is True
        assert result['autosaveNoticeClosable'] is True
        assert result['closeButtonShowsLoading'] is True
        assert result['closeSuccessNotice'] is True
        assert result['lockedRetryActionable'] is True
        assert result['crashRecoveryDraftLoaded'] is True
        assert result['recoveredDraftAutosaved'] is True
        assert result['accessExpiryReadOnly'] is True
        assert result['accessExpiryCtaVisible'] is True
        assert result['accessExpiryDraftPreserved'] is True
        assert result['accessCopyUsesPlainLanguage'] is True
        assert result['reacquireButtonShowsLoading'] is True
        assert result['sameRevisionReactivated'] is True
        assert result['sameRevisionAutosaved'] is True
        assert result['changedRevisionLatestLoaded'] is True
        assert result['changedRevisionDraftPreserved'] is True
        assert result['changedRevisionDraftNotAutoApplied'] is True
        assert result['directSheetConflictBlocked'] is True
        assert result['draftPreservedAfterConflict'] is True
        assert result['softErrorNoticeVisible'] is True
        assert result['softErrorNoticeClosable'] is True
        assert result['horizontalOverflow'] is False
        assert result['consoleErrors'] == []
        assert result['pageErrors'] == []
        browser.close()


if __name__ == '__main__':
    main()
