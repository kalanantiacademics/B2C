import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path("/private/tmp/kalananti-scl-phase1-qc")
PREVIEW = Path("/private/tmp/kalananti-scl-phase1-preview/index.html")


def build_preview():
    subprocess.run(
        ["node", "scripts/build-local-preview.mjs"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )


def exercise(page, screenshot_name):
    console_errors = []
    page_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(PREVIEW.as_uri(), wait_until="domcontentloaded")
    page.wait_for_function("document.querySelector('#configurationStatus').textContent === 'Konfigurasi server siap'")
    identity_field_visible = page.locator("#editorLabelField").is_visible()
    identity_field_required = page.locator("#editorLabel").get_attribute("required") is not None
    page.screenshot(path=str(OUTPUT / screenshot_name.replace(".png", "-login.png")), full_page=True)
    page.fill("#passcode", "synthetic-success")
    login_disabled_without_identity = page.locator("#loginButton").is_disabled()
    disabled_button_opacity = float(page.locator("#loginButton").evaluate("element => getComputedStyle(element).opacity"))
    page.fill("#editorLabel", "Synthetic Editor")
    login_enabled_with_complete_form = page.locator("#loginButton").is_enabled()
    page.click("#loginButton")
    page.wait_for_selector(".course-card:not([disabled])")
    page.click(".course-card")
    page.wait_for_selector(".level-card")
    page.click(".level-card")
    page.wait_for_selector(".session-card")
    page.screenshot(path=str(OUTPUT / screenshot_name), full_page=True)
    return {
        "courseCards": page.locator(".course-card").count(),
        "levelCards": page.locator(".level-card").count(),
        "sessionCards": page.locator(".session-card").count(),
        "loadLevelRpcCount": page.evaluate("window.__phase1RpcCounts.loadLevelProject"),
        "listCatalogRpcCount": page.evaluate("window.__phase1RpcCounts.listCoursesAndLevels"),
        "horizontalOverflow": page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"),
        "identityFieldVisibleInitially": identity_field_visible,
        "identityFieldRequired": identity_field_required,
        "loginDisabledWithoutIdentity": login_disabled_without_identity,
        "disabledButtonOpacity": disabled_button_opacity,
        "loginEnabledWithCompleteForm": login_enabled_with_complete_form,
        "workspaceVisible": page.locator("#appView").is_visible(),
        "projectVisible": page.locator("#projectPanel").is_visible(),
        "consoleErrors": console_errors,
        "pageErrors": page_errors,
    }


def main():
    build_preview()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        desktop = exercise(
            browser.new_page(viewport={"width": 1440, "height": 1000}),
            "desktop.png",
        )
        mobile = exercise(
            browser.new_page(viewport={"width": 390, "height": 844}),
            "mobile.png",
        )
        browser.close()

    result = {"desktop": desktop, "mobile": mobile, "artifacts": str(OUTPUT)}
    for viewport in (desktop, mobile):
        assert viewport["courseCards"] == 3
        assert viewport["levelCards"] == 1
        assert viewport["sessionCards"] == 12
        assert viewport["loadLevelRpcCount"] == 1
        assert viewport["listCatalogRpcCount"] == 1
        assert viewport["horizontalOverflow"] is False
        assert viewport["identityFieldVisibleInitially"] is True
        assert viewport["identityFieldRequired"] is True
        assert viewport["loginDisabledWithoutIdentity"] is True
        assert viewport["disabledButtonOpacity"] < 1
        assert viewport["loginEnabledWithCompleteForm"] is True
        assert viewport["workspaceVisible"] is True
        assert viewport["projectVisible"] is True
        assert viewport["consoleErrors"] == []
        assert viewport["pageErrors"] == []
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
