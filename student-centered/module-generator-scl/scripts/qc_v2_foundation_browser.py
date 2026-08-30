import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

from qc_phase2_browser import SyntheticPhase2Server, attach_rpc


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/private/tmp/kalananti-scl-v2-foundation-qc')
PREVIEW = Path('/private/tmp/kalananti-scl-phase2-preview/index.html')
LOGO_URL = 'https://cdn-web-2.ruangguru.com/landing-pages/assets/828072b7-9198-4367-bce2-134b9fc8b486.png'
PORTRAIT_LOGO = b'''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="106" viewBox="0 0 80 106">
  <path d="M40 2a38 38 0 0 1 38 38c0 17-9 26-15 33-4 5-3 12-3 18H20c0-6 1-13-3-18C11 66 2 57 2 40A38 38 0 0 1 40 2z" fill="#2e65a1" stroke="#fff" stroke-width="5"/>
  <path d="M40 24c-7 8-10 17-10 25v7l-8 7 12-2 6 8 6-8 12 2-8-7v-7c0-8-3-17-10-25z" fill="#fff"/>
  <path d="M22 90h36v5c0 5-5 9-11 9H33c-6 0-11-4-11-9z" fill="#fbbf24" stroke="#fff" stroke-width="5"/>
</svg>'''


def build_preview():
    subprocess.run(
        ['node', 'scripts/build-phase2-preview.mjs'],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )


def login(page, client_id):
    page.goto(PREVIEW.as_uri(), wait_until='domcontentloaded')
    page.fill('#passcode', 'synthetic-success')
    page.fill('#editorLabel', f'Synthetic {client_id}')
    page.click('#loginButton')
    page.wait_for_selector('.course-card:not([disabled])')


def exercise(page, client_id, screenshot_name):
    console_errors = []
    page_errors = []
    page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    login(page, client_id)

    profile_name = page.locator('#topProfileName').inner_text()
    profile_role = page.locator('#topProfileRole').inner_text()
    nav_count = page.locator('.app-sidebar .sidebar-btn[data-nav]').count()
    logo = page.locator('#sidebarLogoImage')
    logo_metrics = logo.evaluate('''element => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      objectFit: getComputedStyle(element).objectFit,
      objectPosition: getComputedStyle(element).objectPosition
    })''')

    page.click('.app-sidebar [data-nav="activity"]')
    page.wait_for_selector('#activityView:not([hidden]) .record-item')
    activity_text = page.locator('#activityView').inner_text()
    activity_active = 'active' in (page.locator('.app-sidebar [data-nav="activity"]').get_attribute('class') or '')

    page.click('.app-sidebar [data-nav="published"]')
    page.wait_for_selector('#publishedView:not([hidden]) .record-item')
    page.wait_for_function("document.querySelector('#driveCapabilityBadge').textContent === 'Drive siap'")
    published_text = page.locator('#publishedView').inner_text()
    published_iframes = page.locator('#publishedView iframe').count()
    open_links = page.locator('#publishedView .record-open-link').count()

    page.click('.app-sidebar [data-nav="settings"]')
    page.wait_for_selector('#settingsView:not([hidden])')
    settings_identity = page.locator('#settingsEditorName').inner_text()

    page.click('#newModuleButton')
    page.wait_for_selector('#appView:not([hidden])')
    new_module_keeps_session = page.locator('#userProfilePill').is_visible() and page.locator('#loginView').is_hidden()
    horizontal_overflow = page.evaluate(
        'document.documentElement.scrollWidth > document.documentElement.clientWidth'
    )
    sidebar_position = page.locator('.app-sidebar').evaluate(
        'element => ({position: getComputedStyle(element).position, bottom: getComputedStyle(element).bottom})'
    )
    page.screenshot(path=str(OUTPUT / screenshot_name), full_page=True)

    page.click('#logoutButton')
    page.wait_for_selector('#loginView:not([hidden])')
    logout_hides_identity = page.locator('#userProfilePill').is_hidden()
    return {
        'profileName': profile_name,
        'profileRole': profile_role,
        'navCount': nav_count,
        'logo': logo_metrics,
        'activityText': activity_text,
        'activityActive': activity_active,
        'publishedText': published_text,
        'publishedIframes': published_iframes,
        'openLinks': open_links,
        'settingsIdentity': settings_identity,
        'newModuleKeepsSession': new_module_keeps_session,
        'logoutHidesIdentity': logout_hides_identity,
        'horizontalOverflow': horizontal_overflow,
        'sidebarPosition': sidebar_position,
        'consoleErrors': console_errors,
        'pageErrors': page_errors,
    }


def main():
    build_preview()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = SyntheticPhase2Server()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        desktop_context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        mobile_context = browser.new_context(viewport={'width': 390, 'height': 844})
        fallback_context = browser.new_context(viewport={'width': 900, 'height': 700})
        for context in (desktop_context, mobile_context):
            context.route(LOGO_URL, lambda route: route.fulfill(
                status=200, content_type='image/svg+xml', body=PORTRAIT_LOGO
            ))
        fallback_context.route(LOGO_URL, lambda route: route.abort())
        attach_rpc(desktop_context, server, 'V2D')
        attach_rpc(mobile_context, server, 'V2M')
        attach_rpc(fallback_context, server, 'V2F')

        desktop = exercise(desktop_context.new_page(), 'V2D', 'desktop.png')
        mobile = exercise(mobile_context.new_page(), 'V2M', 'mobile.png')
        fallback_page = fallback_context.new_page()
        login(fallback_page, 'V2F')
        fallback_page.wait_for_function(
            "document.querySelector('#sidebarLogoImage').classList.contains('logo-load-failed')"
        )
        fallback_visible = fallback_page.locator('.logo-fallback').is_visible()
        fallback_page.screenshot(path=str(OUTPUT / 'logo-fallback.png'), full_page=True)
        browser.close()

    result = {
        'desktop': desktop,
        'mobile': mobile,
        'logoFallbackVisible': fallback_visible,
        'artifacts': str(OUTPUT),
    }
    for viewport in (desktop, mobile):
        assert viewport['profileName'].startswith('Editor V2')
        assert 'input mandiri' in viewport['profileRole'].lower()
        assert viewport['navCount'] == 5
        assert viewport['logo']['objectFit'] == 'contain'
        assert viewport['logo']['objectPosition'] in ('50% 50%', 'center')
        assert viewport['logo']['naturalHeight'] > viewport['logo']['naturalWidth']
        assert 'Masuk ke aplikasi' in viewport['activityText']
        assert '2 percobaan' in viewport['activityText']
        assert viewport['activityActive'] is True
        assert 'latest' in viewport['publishedText'].lower()
        assert 'v002' in viewport['publishedText']
        assert viewport['publishedIframes'] == 0
        assert viewport['openLinks'] == 2
        assert viewport['settingsIdentity'].startswith('Editor V2')
        assert viewport['newModuleKeepsSession'] is True
        assert viewport['logoutHidesIdentity'] is True
        assert viewport['horizontalOverflow'] is False
        assert viewport['consoleErrors'] == []
        assert viewport['pageErrors'] == []
    assert desktop['logo']['width'] == 48
    assert desktop['logo']['height'] == 58
    assert mobile['sidebarPosition']['position'] == 'fixed'
    assert mobile['sidebarPosition']['bottom'] == '0px'
    assert fallback_visible is True
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
