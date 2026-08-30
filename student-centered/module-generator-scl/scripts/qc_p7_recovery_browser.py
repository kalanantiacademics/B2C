import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/private/tmp/kalananti-scl-p7-recovery-qc')
PREVIEW = Path('/private/tmp/kalananti-scl-phase2-preview/index.html')
sys.path.insert(0, str(ROOT / 'scripts'))

from qc_phase2_browser import (  # noqa: E402
    SyntheticPhase2Server,
    attach_rpc,
    build_preview,
    login_and_open_level,
)


EDIT_STORAGE_KEY = 'kalananti.scl.editorLease.v1'
TRANSIENT_FLAG = 'kalananti.scl.test.resumeFailure'


def stored_edit_access(page):
    return page.evaluate(
        "key => JSON.parse(sessionStorage.getItem(key) || 'null')",
        EDIT_STORAGE_KEY,
    )


def wait_for_editor(page):
    page.wait_for_selector('#sessionEditorPanel:not([hidden])')
    page.wait_for_selector('#leaseStatus.active')
    assert page.locator('#sessionTopicInput').is_editable() is True


def main():
    build_preview()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = SyntheticPhase2Server()
    console_errors = []
    page_errors = []
    dialogs = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        context.add_init_script(f"""
          if (sessionStorage.getItem('{TRANSIENT_FLAG}') === '1') {{
            window.__phase2RpcFailures = {{ resumeSessionLease: true }};
          }}
        """)
        attach_rpc(context, server, 'P7')
        page = context.new_page()
        page.set_default_timeout(15000)
        page.on('console', lambda message: console_errors.append(message.text)
                if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))

        def accept_dialog(dialog):
            dialogs.append(dialog.type)
            dialog.accept()

        page.on('dialog', accept_dialog)
        login_and_open_level(page)
        page.locator('.session-card').nth(0).click()
        wait_for_editor(page)
        first_access = stored_edit_access(page)
        assert first_access and first_access['leaseToken']
        assert first_access['tabInstanceId'] and first_access['editSessionId']
        initial_acquires = server.rpc_counts.get('acquireSessionLease', 0)

        # Immediate refresh inside the five-second autosave window must restore
        # the same route/token and offer the local draft explicitly.
        immediate_value = 'P7 immediate refresh draft'
        page.fill('#sessionTopicInput', immediate_value)
        assert page.evaluate(
            "value => Object.keys(localStorage).some(key => localStorage.getItem(key).includes(value))",
            immediate_value,
        )
        page.reload(wait_until='domcontentloaded')
        wait_for_editor(page)
        immediate_access = stored_edit_access(page)
        assert immediate_access['leaseToken'] == first_access['leaseToken']
        assert immediate_access['editSessionId'] == first_access['editSessionId']
        assert immediate_access['tabInstanceId'] == first_access['tabInstanceId']
        assert server.rpc_counts.get('acquireSessionLease', 0) == initial_acquires
        assert page.locator('#reacquireEditButton').is_hidden()
        assert page.locator('#recoveryBanner').is_visible()
        assert page.input_value('#sessionTopicInput') != immediate_value
        page.click('#useDraftButton')
        page.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Tersimpan')")
        assert server.topics['1'] == immediate_value

        # If the server commits while the response is still delayed, reload
        # reuses the persisted request ID; recovery must not add history twice.
        inflight_value = 'P7 save in flight refresh'
        page.evaluate("window.__phase2RpcDelays = {saveSessionPatch: 8000}")
        page.fill('#sessionTopicInput', inflight_value)
        page.wait_for_timeout(5200)
        page.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Menyimpan')")
        page.wait_for_timeout(250)
        assert server.topics['1'] == inflight_value
        inflight_history_count = len(server.histories['1'])
        page.reload(wait_until='domcontentloaded')
        wait_for_editor(page)
        assert page.input_value('#sessionTopicInput') == inflight_value
        assert page.locator('#recoveryBanner').is_visible()
        page.click('#useDraftButton')
        page.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Tersimpan')")
        save_inflight_idempotent = len(server.histories['1']) == inflight_history_count
        assert save_inflight_idempotent

        # A transient connection failure during resume keeps the stored token,
        # stays read-only only while reconnecting, and never falls back to a new
        # acquire. Focus/online recovery retries the same idempotency identity.
        pre_transient_access = stored_edit_access(page)
        acquires_before_transient = server.rpc_counts.get('acquireSessionLease', 0)
        page.evaluate(f"sessionStorage.setItem('{TRANSIENT_FLAG}', '1')")
        page.reload(wait_until='domcontentloaded')
        page.wait_for_selector('#sessionEditorPanel:not([hidden])')
        page.wait_for_function(
            "document.querySelector('#leaseStatus').textContent === 'Menghubungkan kembali…'"
        )
        assert page.locator('#reacquireEditButton').is_hidden()
        transient_access = stored_edit_access(page)
        assert transient_access['leaseToken'] == pre_transient_access['leaseToken']
        page.evaluate(f"""
          sessionStorage.removeItem('{TRANSIENT_FLAG}');
          window.__phase2RpcFailures = {{}};
          window.dispatchEvent(new Event('focus'));
        """)
        wait_for_editor(page)
        assert server.rpc_counts.get('acquireSessionLease', 0) == acquires_before_transient

        # The same token may renew an expired record atomically if no other
        # editor has taken it.
        stale_access_before = stored_edit_access(page)
        acquires_before_stale = server.rpc_counts.get('acquireSessionLease', 0)
        server.advance(61_000)
        page.reload(wait_until='domcontentloaded')
        wait_for_editor(page)
        stale_access_after = stored_edit_access(page)
        assert stale_access_after['leaseToken'] == stale_access_before['leaseToken']
        assert server.rpc_counts.get('acquireSessionLease', 0) == acquires_before_stale

        # A direct source change is loaded first; the local dirty draft remains
        # an explicit choice and is never applied silently.
        changed_draft = 'P7 local draft before direct source edit'
        changed_source = 'P7 newer direct source revision'
        page.fill('#sessionTopicInput', changed_draft)
        server.direct_edit('1', changed_source)
        page.reload(wait_until='domcontentloaded')
        wait_for_editor(page)
        assert page.input_value('#sessionTopicInput') == changed_source
        assert page.locator('#recoveryBanner').is_visible()
        assert page.input_value('#sessionTopicInput') != changed_draft

        # Browser Back leaves the editor through the normal flush/release path;
        # Forward reconstructs the session rather than showing a blank shell.
        back_value = 'P7 browser Back protected draft'
        page.fill('#sessionTopicInput', back_value)
        page.go_back()
        page.wait_for_selector('#sessionEditorPanel', state='hidden')
        page.wait_for_selector('#projectPanel:not([hidden])')
        assert 'session=' not in page.url
        assert server.topics['1'] == back_value
        assert '1' not in server.locks
        page.go_forward()
        wait_for_editor(page)
        assert page.input_value('#sessionTopicInput') == back_value

        page.screenshot(path=str(OUTPUT / 'p7-recovered-editor.png'), full_page=True)
        result = {
            'sameTabRouteRestored': True,
            'sameLeaseTokenAfterImmediateRefresh': True,
            'stableTabAndEditSessionIdentity': True,
            'dirtyDraftExplicitlyRecovered': True,
            'saveInFlightIdempotent': save_inflight_idempotent,
            'transientResumeKeepsOwnership': True,
            'staleSameOwnerAtomicResume': True,
            'changedRevisionDraftNotAutoApplied': True,
            'browserBackFlushesAndReleases': True,
            'browserForwardReconstructsEditor': True,
            'uniqueResumeActivityCount': len(server.resume_events),
            'rpcCounts': server.rpc_counts,
            'beforeUnloadDialogs': dialogs,
            'horizontalOverflow': page.evaluate(
                'document.documentElement.scrollWidth > document.documentElement.clientWidth'
            ),
            'consoleErrors': console_errors,
            'pageErrors': page_errors,
            'artifacts': str(OUTPUT),
        }
        print(json.dumps(result, indent=2))
        assert result['horizontalOverflow'] is False
        assert result['consoleErrors'] == []
        assert result['pageErrors'] == []
        browser.close()


if __name__ == '__main__':
    main()
