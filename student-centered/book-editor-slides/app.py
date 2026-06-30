import json
import logging
import os
import re
import socket
import ssl
import subprocess
import threading
import time
import html
import urllib.parse
import urllib.request
import urllib.error
import base64

from flask import Flask, Response, jsonify, render_template, request, send_from_directory

try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

app = Flask(__name__)

DATA_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwvNSa3hUMNqhNOINDeG3cPUdlQM-dGfl-dDX5WejhESjHRALipqhwJ_-3HXOJehtWbWw/exec"
SLIDES_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyeuYgPBo7ZpBy5MFG1M6ulEhu3uqoAUA2RHKJ6wkW1jlnOleqfs629mU2EduZpANoybA/exec"
DATA_CACHE_TTL_SECONDS = int(os.environ.get("BOOK_CACHE_TTL_SECONDS", "180"))
REQUIRED_COLUMNS = [
    "Level",
    "Session",
    "objectives",
    "materials",
    "must_do",
    "should_do",
    "aspire_to_do",
    "quiz_questions",
    "quiz_options",
]


def _saved_books_dir():
    path = os.path.join(app.root_path, "saved_books")
    os.makedirs(path, exist_ok=True)
    return path


def _drafts_dir():
    path = os.path.join(_saved_books_dir(), "drafts")
    os.makedirs(path, exist_ok=True)
    return path


def _safe_slug(value, default="draft"):
    cleaned = re.sub(r"[^a-zA-Z0-9_.-]+", "_", str(value or "").strip())
    cleaned = cleaned.strip("._")
    return cleaned or default


def _draft_filename(course, level):
    return f"{_safe_slug(course, 'course')}_level_{_safe_slug(level, 'all')}.json"


def _read_draft_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize_legacy_quiz_options_html(html_content):
    if not html_content or "quiz-bullet" not in html_content:
        return html_content

    quiz_options_pattern = re.compile(
        r'(<div class="quiz-options"[^>]*>)\s*'
        r'<p class="quiz-option"[^>]*>\s*'
        r'<span class="quiz-bullet"[^>]*>.*?</span>\s*'
        r'<span[^>]*>(.*?)</span>\s*'
        r'</p>\s*(</div>)',
        re.IGNORECASE | re.DOTALL,
    )

    def repl(match):
        raw_text = re.sub(r"<br\s*/?>", " ", match.group(2), flags=re.IGNORECASE)
        raw_text = re.sub(r"<[^>]+>", "", raw_text)
        raw_text = html.unescape(raw_text)
        opts = _parse_quiz_option_items(raw_text)
        if not opts:
            return match.group(0)

        rendered_options = []
        for letter, desc in opts:
            desc_formatted = format_basic_markdown(desc)
            rendered_options.append(
                '<p class="quiz-option">'
                f'<span class="quiz-option-badge">{letter}</span>'
                f"<span>{desc_formatted}</span>"
                "</p>"
            )
        return match.group(1) + "".join(rendered_options) + match.group(3)

    return quiz_options_pattern.sub(repl, html_content)


def _normalize_empty_checklist_html(html_content):
    return html_content


def _normalize_saved_html(html_content):
    html_content = _normalize_legacy_quiz_options_html(html_content)
    html_content = _normalize_empty_checklist_html(html_content)
    return html_content


def _normalize_draft_payload(payload):
    if not isinstance(payload, dict):
        return payload
    elements = payload.get("elements")
    if not isinstance(elements, list):
        return payload
    normalized_elements = []
    changed = False
    for item in elements:
        if isinstance(item, str):
            normalized = _normalize_saved_html(item)
            changed = changed or normalized != item
            normalized_elements.append(normalized)
        elif isinstance(item, dict):
            normalized_item = dict(item)
            if isinstance(normalized_item.get("html"), str):
                normalized = _normalize_saved_html(normalized_item["html"])
                changed = changed or normalized != normalized_item["html"]
                normalized_item["html"] = normalized
            normalized_elements.append(normalized_item)
        else:
            normalized_elements.append(item)
    if changed:
        payload = dict(payload)
        payload["elements"] = normalized_elements
        payload["normalizedLegacyHtml"] = True
    return payload

logger = logging.getLogger("book_generator")
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

_CACHE_LOCK = threading.Lock()
_CACHE = {
    "roblox": {
        "rows": [],
        "fetched_at": 0.0,
        "last_fetch_ms": None,
        "last_error": None,
        "schema_warnings": [],
        "hits": 0,
        "misses": 0,
        "source": "unknown",
    },
    "scratch": {
        "rows": [],
        "fetched_at": 0.0,
        "last_fetch_ms": None,
        "last_error": None,
        "schema_warnings": [],
        "hits": 0,
        "misses": 0,
        "source": "unknown",
    },
    "python": {
        "rows": [],
        "fetched_at": 0.0,
        "last_fetch_ms": None,
        "last_error": None,
        "schema_warnings": [],
        "hits": 0,
        "misses": 0,
        "source": "unknown",
    },
}

MEDIA_CACHE_TTL_SECONDS = int(os.environ.get("BOOK_MEDIA_CACHE_TTL_SECONDS", "86400"))
_MEDIA_CACHE_LOCK = threading.Lock()
_MEDIA_CACHE = {}


def _timed_ms(start_perf):
    return round((time.perf_counter() - start_perf) * 1000, 2)


def _extract_slides_url(payload):
    if not isinstance(payload, dict):
        return None

    candidates = [
        payload.get("presentationUrl"),
        payload.get("slidesUrl"),
        payload.get("slideUrl"),
        payload.get("url"),
        payload.get("link"),
    ]
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    presentation_id = payload.get("presentationId") or payload.get("id")
    if isinstance(presentation_id, str) and presentation_id.strip():
        return f"https://docs.google.com/presentation/d/{presentation_id.strip()}/edit"

    return None


def _export_slides_via_apps_script(payload, max_retries=2):
    body = json.dumps(
        {
            "action": "export_slides",
            "payload": payload,
            "course": payload.get("course"),
            "level": payload.get("level"),
            "presentationId": payload.get("presentationId"),
            "pageNumberStart": payload.get("pageNumberStart"),
            "finalizeExport": payload.get("finalizeExport"),
            "pages": payload.get("pages", []),
            "elements": payload.get("elements", []),
        },
        ensure_ascii=False,
    ).encode("utf-8")

    payload_size_mb = len(body) / (1024 * 1024)
    num_pages = len(payload.get("pages", []))
    logger.info(
        "Apps Script export | pages=%s payload=%.2fMB presentationId=%s",
        num_pages, payload_size_mb, payload.get("presentationId"),
    )

    # Timeout scales with payload size: minimum 300s, +60s per MB, capped at 540s
    timeout_seconds = min(540, max(300, int(180 + payload_size_mb * 60)))

    last_error = None
    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(
            SLIDES_WEB_APP_URL,
            data=body,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )

        try:
            # urllib follows the 302 redirect automatically (POST→GET).
            # This is correct: Apps Script processes doPost server-side,
            # then redirects to a googleusercontent.com URL that delivers
            # the response via GET.
            with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                raw_body = resp.read().decode("utf-8", errors="replace")
                final_url = resp.geturl()
            break  # success – exit retry loop
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Apps Script HTTP {exc.code}: {error_body}") from exc
        except (socket.timeout, TimeoutError) as exc:
            last_error = exc
            logger.warning(
                "Apps Script timeout (attempt %s/%s) | pages=%s payload=%.2fMB timeout=%ss",
                attempt, max_retries, num_pages, payload_size_mb, timeout_seconds,
            )
            if attempt < max_retries:
                time.sleep(3 * attempt)  # brief backoff before retry
                continue
            raise RuntimeError(
                f"Apps Script timeout setelah {max_retries} percobaan "
                f"(payload {payload_size_mb:.1f} MB, {num_pages} halaman). "
                f"Coba kurangi jumlah halaman per batch atau export ulang."
            ) from exc
        except urllib.error.URLError as exc:
            # URLError can wrap socket.timeout as its reason
            if isinstance(exc.reason, (socket.timeout, TimeoutError)):
                last_error = exc
                logger.warning(
                    "Apps Script URLError/timeout (attempt %s/%s) | reason=%s",
                    attempt, max_retries, exc.reason,
                )
                if attempt < max_retries:
                    time.sleep(3 * attempt)
                    continue
                raise RuntimeError(
                    f"Apps Script timeout setelah {max_retries} percobaan: {exc.reason}"
                ) from exc
            raise RuntimeError(f"Gagal menghubungi Apps Script: {exc.reason}") from exc

    try:
        parsed = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError:
        parsed = {"rawResponse": raw_body}

    slides_url = _extract_slides_url(parsed)
    if not slides_url and final_url and "docs.google.com/presentation" in final_url:
        slides_url = final_url

    if isinstance(parsed, dict) and parsed.get("success") is False:
        raise RuntimeError(parsed.get("error") or "Apps Script mengembalikan status gagal.")

    if not slides_url:
        raise RuntimeError(
            "Apps Script tidak mengembalikan link Google Slides. "
            f"Respons diterima: {raw_body[:300]}"
        )

    return {
        "slides_url": slides_url,
        "response": parsed,
    }


def proxied_media_url(url):
    if not url:
        return ""
    encoded = urllib.parse.quote(url, safe="")
    return f"/media-proxy?src={encoded}"


def _render_page_image_with_chromium(page_html, head_html, width_px, height_px, scale=2, image_type="png"):
    rendered_pages = _render_pages_images_with_chromium(
        [
            {
                "html": page_html,
                "widthPx": width_px,
                "heightPx": height_px,
            }
        ],
        head_html=head_html,
        scale=scale,
        image_type=image_type,
    )
    return rendered_pages[0]


def _build_embedded_font_css():
    """Build @font-face CSS with base64-embedded Poppins woff2 files.

    This eliminates the Google Fonts network dependency during Playwright
    screenshot rendering, preventing the font from falling back to Arial
    when the network fetch races against the screenshot timing.
    """
    fonts_dir = os.path.join(app.root_path, "static", "fonts")
    weights = [400, 500, 600, 700, 800, 900]
    css_parts = []

    for weight in weights:
        for suffix, unicode_range in [
            ("", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"),
            ("-ext", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"),
        ]:
            font_path = os.path.join(fonts_dir, f"Poppins-{weight}{suffix}.woff2")
            if not os.path.exists(font_path):
                continue

            with open(font_path, "rb") as f:
                font_b64 = base64.b64encode(f.read()).decode("ascii")

            css_parts.append(f"""@font-face {{
  font-family: 'Poppins';
  font-style: normal;
  font-weight: {weight};
  font-display: block;
  src: url(data:font/woff2;base64,{font_b64}) format('woff2');
  unicode-range: {unicode_range};
}}""")

    return "\n".join(css_parts)


# Cache the embedded font CSS at module level (built once, reused for every render)
_EMBEDDED_FONT_CSS = None
_EMBEDDED_FONT_CSS_LOCK = threading.Lock()


def _get_embedded_font_css():
    global _EMBEDDED_FONT_CSS
    if _EMBEDDED_FONT_CSS is not None:
        return _EMBEDDED_FONT_CSS
    with _EMBEDDED_FONT_CSS_LOCK:
        if _EMBEDDED_FONT_CSS is not None:
            return _EMBEDDED_FONT_CSS
        css = _build_embedded_font_css()
        if css:
            _EMBEDDED_FONT_CSS = css
            logger.info("Embedded Poppins font CSS built | %d bytes, %d @font-face rules",
                        len(css), css.count("@font-face"))
        else:
            logger.warning("No local Poppins font files found in static/fonts — "
                           "screenshot rendering will fall back to Google Fonts (may be unreliable)")
            _EMBEDDED_FONT_CSS = ""
        return _EMBEDDED_FONT_CSS


def _strip_google_fonts_link(head_html_str):
    """Remove Google Fonts <link> tags from head HTML to prevent conflicting
    font-display:swap rules that race with the embedded base64 fonts."""
    if not head_html_str:
        return head_html_str
    return re.sub(
        r'<link[^>]+href="https://fonts\.googleapis\.com/[^"]*"[^>]*>',
        '',
        head_html_str,
        flags=re.IGNORECASE,
    )


# --- Font-wait JavaScript (shared across all renders) ---
_FONT_WAIT_JS = """async () => {
    const waitWithTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise(resolve => setTimeout(resolve, ms))
    ]);
    // Load all Poppins weights
    try {
        const fontLoads = [
            '400 16px "Poppins"', '500 16px "Poppins"',
            '600 16px "Poppins"', '700 16px "Poppins"',
            '800 16px "Poppins"', '900 16px "Poppins"'
        ].map(f => document.fonts.load(f).catch(() => []));
        await waitWithTimeout(Promise.all(fontLoads), 5000);
    } catch(e) {}
    if (document.fonts && document.fonts.ready) {
        await waitWithTimeout(document.fonts.ready.catch(() => {}), 3000);
    }
    // Verify Poppins loaded; retry once if not
    if (!document.fonts.check('600 16px "Poppins"')) {
        await new Promise(r => setTimeout(r, 300));
        await waitWithTimeout(Promise.all([
            document.fonts.load('400 16px "Poppins"').catch(() => []),
            document.fonts.load('700 16px "Poppins"').catch(() => []),
            document.fonts.load('900 16px "Poppins"').catch(() => []),
        ]), 3000);
        if (document.fonts.ready) {
            await waitWithTimeout(document.fonts.ready.catch(() => {}), 2000);
        }
    }
    // Let layout settle
    await new Promise(r => setTimeout(r, 100));
    // Wait for images
    const imgs = Array.from(document.images || []);
    await waitWithTimeout(Promise.all(imgs.map(async img => {
        if (!img.complete || img.naturalWidth === 0) {
            await new Promise(r => {
                img.addEventListener('load', r, {once:true});
                img.addEventListener('error', r, {once:true});
            });
        }
        if (img.decode) await img.decode().catch(() => {});
    })), 8000);
}"""


def _render_pages_images_with_chromium(pages, head_html, scale=2, image_type="png"):
    from playwright.sync_api import sync_playwright

    scale = max(1, min(int(scale or 2), 3))
    image_type = "png" if str(image_type).lower() == "png" else "jpeg"

    # Build embedded font CSS (cached) and strip Google Fonts link
    embedded_font_css = _get_embedded_font_css()
    clean_head_html = _strip_google_fonts_link(head_html) if embedded_font_css else (head_html or "")
    font_style_block = f"<style>{embedded_font_css}</style>" if embedded_font_css else ""

    def build_capture_html(page_item, width_px, height_px):
        return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <base href="http://127.0.0.1:5008/">
  {font_style_block}
  {clean_head_html}
  <style>
    html, body {{
      margin: 0;
      padding: 0;
      width: {width_px}px;
      min-width: {width_px}px;
      height: {height_px}px;
      min-height: {height_px}px;
      overflow: hidden;
      background: transparent;
    }}
    .capture-root {{
      width: {width_px}px;
      height: {height_px}px;
      overflow: hidden;
      background: transparent;
    }}
    .capture-root,
    .capture-root * {{
      font-family: var(--font-body, 'Poppins', Arial, sans-serif);
    }}
    .capture-root .syntax-block,
    .capture-root .syntax-block * {{
      font-family: "Courier New", Courier, monospace;
    }}
    .capture-root .page-content {{
      width: 100%;
      height: 100%;
      box-shadow: none !important;
      outline: none !important;
      background: transparent !important;
    }}
    .capture-root .cover-page,
    .capture-root .book-guide-page,
    .capture-root .toc-page {{
      background: transparent !important;
    }}
    .capture-root .page-sheet {{
      margin: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      background: transparent !important;
    }}
    .capture-root .page-num {{
      display: none !important;
    }}
    .resize-handle-tr {{
      display: none !important;
    }}
  </style>
</head>
<body>
  <div class="capture-root">{page_item.get("html", "") or ""}</div>
</body>
</html>"""

    rendered = []
    start_render = time.perf_counter()

    # Launch browser ONCE per batch, render all pages sequentially
    # (Playwright uses greenlet internally — not thread-safe)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            for page_item in pages:
                width_px = max(1, min(int(page_item.get("widthPx") or 739), 2400))
                height_px = max(1, min(int(page_item.get("heightPx") or 905), 3200))
                browser_page = browser.new_page(
                    viewport={"width": width_px, "height": height_px},
                    device_scale_factor=scale,
                )
                browser_page.set_default_timeout(20000)
                try:
                    browser_page.set_content(
                        build_capture_html(page_item, width_px, height_px),
                        wait_until="domcontentloaded",
                        timeout=20000,
                    )
                    browser_page.evaluate(_FONT_WAIT_JS)
                    screenshot_options = {
                        "type": image_type,
                        "animations": "disabled",
                        "timeout": 15000,
                    }
                    if image_type == "png":
                        screenshot_options["omit_background"] = True
                    else:
                        screenshot_options["quality"] = 82

                    image_bytes = browser_page.locator(".capture-root").screenshot(**screenshot_options)
                    mime_type = "image/png" if image_type == "png" else "image/jpeg"
                    rendered.append(
                        {
                            "imageBase64": f"data:{mime_type};base64,"
                            + base64.b64encode(image_bytes).decode("ascii"),
                            "width": width_px * scale,
                            "height": height_px * scale,
                            "mimeType": mime_type,
                        }
                    )
                finally:
                    browser_page.close()
        finally:
            browser.close()

    elapsed = _timed_ms(start_render)
    logger.info("Rendered %d pages in %.0fms (%.0fms/page)",
                len(pages), elapsed, elapsed / max(1, len(pages)))
    return rendered


def _normalize_course(course):
    return course if course in _CACHE else "roblox"


def _normalize_raw_data(raw_data):
    if not isinstance(raw_data, list):
        return []

    if len(raw_data) > 0 and isinstance(raw_data[0], dict) and (
        "col_0" in raw_data[0] or "Level" in raw_data[0].values()
    ):
        headers = list(raw_data[0].values()) if "col_0" in raw_data[0] else list(raw_data[0].keys())
        keys = list(raw_data[0].keys())
        start_idx = 1 if "col_0" in raw_data[0] else 0
        formatted = []
        for row in raw_data[start_idx:]:
            if not isinstance(row, dict):
                continue
            obj = {}
            for idx, key in enumerate(keys):
                header_name = str(headers[idx]).strip() if idx < len(headers) else key
                obj[header_name] = row.get(key, "")
            formatted.append(obj)
        return formatted

    return [row for row in raw_data if isinstance(row, dict)]


def _attach_row_ids(rows):
    enriched = []
    for idx, row in enumerate(rows):
        obj = dict(row)
        obj["row_id"] = f"r{idx + 1:04d}"
        enriched.append(obj)
    return enriched


def _validate_schema(rows):
    warnings = []
    if not rows:
        return ["Dataset kosong atau gagal dibaca."]

    available_cols = set()
    for row in rows:
        available_cols.update(row.keys())

    missing_cols = [col for col in REQUIRED_COLUMNS if col not in available_cols]
    if missing_cols:
        warnings.append("Kolom wajib tidak ditemukan: " + ", ".join(missing_cols))

    missing_level_session = sum(
        1
        for row in rows
        if not str(row.get("Level", "")).strip() or not str(row.get("Session", "")).strip()
    )
    if missing_level_session:
        warnings.append(f"Ada {missing_level_session} baris tanpa Level/Session.")

    return warnings


def _fetch_data_uncached(course="roblox"):
    start = time.perf_counter()
    sheet_names = {
        "roblox": "B2C_RobloxStudio_Modul",
        "scratch": "B2C_Scratch_Modul",
        "python": "B2C_Python_Modul",
    }
    sheet_name = sheet_names.get(course, "B2C_RobloxStudio_Modul")
    url = f"{DATA_WEB_APP_URL}?sheet={sheet_name}"

    try:
        result = subprocess.run(["curl", "-sL", url], capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            raise RuntimeError(f"curl error {result.returncode}: {result.stderr}")
        raw_data = json.loads(result.stdout)
    except Exception as exc:
        logger.error("_fetch_data_uncached error: %s", exc)
        raw_data = []

    rows = _attach_row_ids(_normalize_raw_data(raw_data))
    return rows, _timed_ms(start)


def fetch_data(course="roblox", force_refresh=False):
    course = _normalize_course(course)
    now = time.time()
    cache_entry = _CACHE[course]

    with _CACHE_LOCK:
        cache_valid = (now - cache_entry["fetched_at"]) < DATA_CACHE_TTL_SECONDS and bool(cache_entry["rows"])
        if not force_refresh and cache_valid:
            cache_entry["hits"] += 1
            return list(cache_entry["rows"])
        cache_entry["misses"] += 1

    rows, fetch_ms = _fetch_data_uncached(course)
    schema_warnings = _validate_schema(rows)

    with _CACHE_LOCK:
        cache_entry["rows"] = rows
        cache_entry["fetched_at"] = time.time()
        cache_entry["last_fetch_ms"] = fetch_ms
        cache_entry["last_error"] = None
        cache_entry["schema_warnings"] = schema_warnings
        cache_entry["source"] = "apps-script"

    return list(rows)


def get_cache_meta(course="roblox"):
    course = _normalize_course(course)
    with _CACHE_LOCK:
        entry = _CACHE[course]
        fetched_at = entry["fetched_at"]
        return {
            "ttlSeconds": DATA_CACHE_TTL_SECONDS,
            "fetchedAtEpoch": fetched_at,
            "ageSeconds": round(max(0.0, time.time() - fetched_at), 2) if fetched_at else None,
            "lastFetchMs": entry["last_fetch_ms"],
            "lastError": entry["last_error"],
            "schemaWarnings": list(entry["schema_warnings"]),
            "cacheHits": entry["hits"],
            "cacheMisses": entry["misses"],
            "source": entry["source"],
            "rowsCached": len(entry["rows"]),
        }


def format_list_items(text):
    if not text:
        return ""

    def repl_num(match):
        prefix = match.group(1)
        num = match.group(2)
        return f"<strong>{num}</strong> " if match.start() == 0 else f"{prefix}<br><br><strong>{num}</strong> "

    def repl_bullet(match):
        prefix = match.group(1)
        return "• " if match.start() == 0 else f"{prefix}<br>• "

    text = re.sub(r"(^|\s)(\d+[\.\)])\s+", repl_num, text)
    text = re.sub(r"(^|\s)(•)\s+", repl_bullet, text)
    return text


def format_basic_markdown(text):
    if not text:
        return ""

    def repl_code_block(match):
        code_text = match.group(1).strip()
        code_text = re.sub(r"<br\s*/?>", "\n", code_text, flags=re.IGNORECASE)
        escaped_code = html.escape(code_text)
        return f'<pre class="syntax-block"><code>{escaped_code}</code></pre>'

    # Match fenced code blocks in two forms:
    # 1. ```lang\ncontent\n``` (content starts on next line after language tag)
    # 2. ```lang content...\n...``` or ```lang content``` (content on same line as language tag)
    text = re.sub(
        r"```[ \t]*(?:[a-zA-Z0-9_.+-]+)?[ \t]*(?:(?:\r?\n)|(?:<br\s*/?>)|[ \t]+)?([\s\S]*?)```",
        repl_code_block,
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.*?)\*", r"<em>\1</em>", text)
    text = re.sub(r"__(.*?)__", r"<u>\1</u>", text)
    return text


def format_inline_urls(text):
    if not text:
        return ""

    def repl_url(match):
        url = match.group(0)
        if is_image_url(url):
            return (
                '<span class="inline-image">'
                f'<img src="{proxied_media_url(url)}" alt="Ilustrasi" loading="eager" decoding="sync">'
                "</span>"
            )
        return f'<a href="{url}" target="_blank" rel="noopener">{url}</a>'

    return re.sub(r'https?://[^\s<"]+', repl_url, text)


def split_preserving_code_fences(text):
    lines = str(text or "").split("\n")
    chunks = []
    buffer = []
    in_code = False

    for line in lines:
        if "```" in line:
            buffer.append(line)
            if line.count("```") % 2 == 1:
                in_code = not in_code
            if not in_code:
                chunks.append("\n".join(buffer))
                buffer = []
            continue

        if in_code:
            buffer.append(line)
        else:
            chunks.append(line)

    if buffer:
        # If it reached the end but code block wasn't closed, close it now
        if in_code:
            buffer.append("```")
        chunks.append("\n".join(buffer))

    return chunks


def is_image_url(value):
    if not value:
        return False
    if not re.match(r'^https?://[^\s<"]+$', value):
        return False

    lowered = value.lower()
    if "image" in lowered or re.search(r"\.(jpeg|jpg|png|gif|webp)(\?|#|$)", value, re.IGNORECASE):
        return True

    host = urllib.parse.urlparse(value).netloc.lower()
    image_cdn_hosts = (
        "googleusercontent.com",
        "ggpht.com",
    )
    return any(host == domain or host.endswith("." + domain) for domain in image_cdn_hosts)


def extract_standalone_image_url(line):
    if not line:
        return None

    clean_line = line.strip()
    candidates = [
        clean_line,
        re.sub(r"^(\[.*\]\s*|[•\-\*]\s*|\d+[\.\)]\s*)", "", clean_line).strip(),
    ]
    for candidate in candidates:
        if is_image_url(candidate):
            return candidate
    return None


def format_check(text, row_data, section_type=""):
    if not text:
        return ""

    lines = split_preserving_code_fences(text.strip())
    out = "<div>"
    has_content = False
    is_first_text = True
    current_group_text_html = ""
    current_group_images = []

    def flush_group():
        nonlocal current_group_text_html, current_group_images, out, has_content
        if current_group_text_html or current_group_images:
            image_count = len(current_group_images)
            image_layout_class = "todo-group-images"
            group_class = "todo-group keep-together"
            if image_count >= 2:
                image_layout_class += " is-grid"
            if image_count >= 3:
                image_layout_class += " is-grid-compact"
            if image_count:
                group_class += " has-images"

            images_html = ""
            if current_group_images:
                images_html = f'<div class="{image_layout_class}">' + "".join(current_group_images) + "</div>"

            out += (
                f'<div class="{group_class}">'
                f'<div class="todo-group-body">{current_group_text_html}{images_html}</div>'
                "</div>"
            )
            has_content = True
            current_group_text_html = ""
            current_group_images = []

    for line in lines:
        clean_line = line.strip()
        if not clean_line:
            continue

        image_url = extract_standalone_image_url(clean_line)
        if image_url:
            is_first_text = False
            current_group_images.append(
                '<div class="todo-group-image-item">'
                f'<img src="{proxied_media_url(image_url)}" alt="Ilustrasi" loading="eager" decoding="sync">'
                "</div>"
            )
            continue

        kc_match = re.match(r"^kc(\d+)\*$", clean_line, re.IGNORECASE)
        fyk_match = re.match(r"^fyk(\d+)\*$", clean_line, re.IGNORECASE)
        if kc_match or fyk_match:
            flush_group()
            marker = "kc" if kc_match else "fyk"
            idx = kc_match.group(1) if kc_match else fyk_match.group(1)
            
            def get_col_val(preferred_key):
                val = row_data.get(preferred_key)
                if val: return str(val)
                variations = [preferred_key.replace("_", " "), preferred_key.replace("_", "").lower()]
                for v in variations:
                    for rk, rv in row_data.items():
                        if str(rk).lower().strip() == v.lower():
                            return str(rv)
                return ""

            raw_text = get_col_val("kamus_coder") if kc_match else get_col_val("for_your_knowledge")
            regex_str = marker + idx + r":\s*([\s\S]*?)(?=(?:kc|fyk)\d+:|$)"
            match = re.search(regex_str, raw_text, re.IGNORECASE)
            if match:
                if kc_match:
                    content = format_objectives(match.group(1).strip())
                    bubble_html = (
                        '<div class="think-bubble knowledge-bubble">'
                        '<span class="think-title">Tutor Says</span>'
                        f'<div class="bubble-content">{content}</div>'
                        "</div>"
                    )
                else:
                    content = format_inline_urls(format_list_items(format_basic_markdown(match.group(1).strip()))).replace("\n", "<br>")
                    bubble_html = (
                        '<div class="think-bubble knowledge-bubble warm">'
                        '<span class="think-title">Did You Know?</span>'
                        f'<div class="bubble-content">{content}</div>'
                        "</div>"
                    )
                out += bubble_html
            continue

        match_todo = re.match(r"^(\[.*\]\s*|[•\-\*]\s*|\d+[\.\)]\s*)(.*)", clean_line)
        if match_todo:
            content = match_todo.group(2).strip()
        else:
            content = clean_line

        flush_group()
        
        use_fun_font = is_first_text and section_type == "must_do" and not match_todo and ":" not in content and not content.lower().startswith("opsi")
        
        if not use_fun_font and not content.lower().startswith("http") and ":" in content:
            content = re.sub(r"^([^:]+):", r"<strong>\1:</strong>", content)
            
        content = format_inline_urls(format_basic_markdown(content))
        
        if use_fun_font:
            current_group_text_html = f'<div class="lead-check-text">{content}</div>'
        else:
            current_group_text_html = (
                '<table class="check-row"><tr>'
                '<td class="check-cell"><div class="check-box"></div></td>'
                f'<td class="check-content">{content}</td>'
                "</tr></table>"
            )
            
        is_first_text = False

    flush_group()
    out += "</div>"
    return out if has_content else ""


def format_objectives(text):
    if not text:
        return ""
    lines = split_preserving_code_fences(text.strip())
    out = '<ul class="list-objective">'
    for line in lines:
        clean_line = re.sub(r"^[•\-\*]\s*", "", line).strip()
        if clean_line:
            clean_line = format_inline_urls(format_list_items(format_basic_markdown(clean_line)))
            out += f"<li>{clean_line}</li>"
    out += "</ul>"
    return out


def _parse_quiz_option_items(text):
    clean_text = str(text or "").strip()
    if not clean_text:
        return []

    marker_pattern = re.compile(r"(?:(?<=^)|(?<=[\s|;]))([A-Z])(?:[\.\):]|\s+)")
    matches = list(marker_pattern.finditer(clean_text))
    if not matches:
        return []

    items = []
    for idx, match in enumerate(matches):
        letter = match.group(1)
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(clean_text)
        desc = clean_text[start:end].strip()
        desc = re.sub(r"^[\s|;:-]+", "", desc).strip()
        desc = re.sub(r"[\s|;:-]+$", "", desc).strip()
        if desc:
            items.append((letter, desc))
    return items


def parse_quiz(questions_text, options_text):
    if not questions_text or not options_text:
        return ""

    q_lines = [line.strip() for line in questions_text.split("\n") if line.strip()]
    questions = {}
    for line in q_lines:
        match = re.search(r"^(\d+)\.\s*(.*)", line)
        if match:
            questions[match.group(1)] = match.group(2)

    o_lines = [line.strip() for line in options_text.split("\n") if line.strip()]
    options = {}
    for line in o_lines:
        match_num = re.search(r"^(\d+)\.\s*(.*)", line)
        if not match_num:
            continue
        num = match_num.group(1)
        the_rest = match_num.group(2)
        opts = _parse_quiz_option_items(the_rest)
        if opts:
            options[num] = []
            for letter, desc in opts:
                options[num].append((letter, re.sub(r"\|\s*$", "", desc.strip()).strip()))
        else:
            options[num] = [("", the_rest.strip())]

    out = '<div class="quiz-item quiz-stack">'
    out += '<div class="quiz-header" style="text-align:center; font-family:var(--font-display); font-weight:900; font-size: 16pt; color:var(--theme-primary); margin-bottom: 20px; border-bottom: 3px dashed var(--theme-secondary); padding-bottom: 12px; letter-spacing: 1px;">MINI QUIZ</div>'
    for num, q_text in questions.items():
        q_clean = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", q_text)
        out += '<div class="quiz-question-block keep-together" style="margin-bottom: 24px;">'
        out += f'<p class="quiz-question"><span class="quiz-number">{num}.</span><span>{q_clean}</span></p>'
        if num in options:
            out += '<div class="quiz-options">'
            for letter, desc in options[num]:
                desc_formatted = format_basic_markdown(desc)
                if letter:
                    out += (
                        '<p class="quiz-option">'
                        f'<span class="quiz-option-badge">{letter}</span>'
                        f"<span>{desc_formatted}</span>"
                        "</p>"
                    )
                else:
                    out += f'<p class="quiz-option"><span class="quiz-bullet">•</span><span>{desc_formatted}</span></p>'
            out += "</div>"
        out += "</div>"
    out += "</div>"
    return out


def parse_materials(text, row_data, course="roblox"):
    if not text:
        return ""

    lines = split_preserving_code_fences(text)
    blocks = []
    current_step_items = []
    current_text = ""
    last_context = ""
    is_intro = True
    shot_counter = 0
    current_images = []

    def next_shot_id():
        nonlocal shot_counter
        shot_counter += 1
        row_id = str(row_data.get("row_id", "row")).strip() or "row"
        return f"{row_id}-shot-{shot_counter}"

    def render_step(items):
        if not items:
            return ""
        if 'class="step-card"' not in items[0]:
            return "\n".join(items)

        remaining = items[1:]
        step_parts = []
        if remaining:
            head_items = [items[0]]
            consumed_count = 0
            for item in remaining:
                if "shot-card" in item or "think-bubble" in item:
                    break
                head_items.append(item)
                consumed_count += 1
            if consumed_count == 0 and remaining:
                head_items.append(remaining[0])
                consumed_count = 1
            tail_items = remaining[consumed_count:]
            content = "\n".join(head_items)
            step_parts.append(f'<div class="step-headpack">{content}</div>')
            remaining = tail_items
        else:
            step_parts.append(f'<div class="step-headpack">{items[0]}</div>')

        for item in remaining:
            keep_cls = " keep-together" if "shot-card" in item else ""
            step_parts.append(f'<div class="step-content-item{keep_cls}">{item}</div>')

        return '<div class="step-container">' + "\n".join(step_parts) + "</div>"

    def append_item(item_html):
        if "think-bubble" in item_html and "knowledge-bubble" not in item_html:
            item_html = f'<div class="knowledge-bubble keep-together">{item_html}</div>'
        if is_intro:
            blocks.append(item_html)
        else:
            current_step_items.append(item_html)

    def flush_images():
        nonlocal current_images
        if not current_images:
            return
        if len(current_images) == 1:
            append_item(current_images[0])
        else:
            group_html = '<div class="todo-group-images keep-together">' + "".join(current_images) + '</div>'
            append_item(group_html)
        current_images = []

    def flush_step():
        nonlocal current_step_items
        if current_step_items:
            blocks.append(render_step(current_step_items))
            current_step_items = []

    def flush_text():
        nonlocal current_text, last_context, is_intro
        if not current_text.strip():
            return

        text_clean = current_text.strip()
        step_match = re.match(r"^(Tahap|Bagian|Langkah)\s*(\d+):?(.*)", text_clean, re.IGNORECASE | re.DOTALL)

        def process_normal_text(body_text):
            nonlocal last_context
            formatted = format_basic_markdown(body_text)
            formatted = format_inline_urls(format_list_items(formatted))
            if formatted.startswith("•"):
                append_item(f'<ul class="list-objective compact"><li>{formatted[1:].strip()}</li></ul>')
            elif formatted.startswith('<pre class="syntax-block">'):
                append_item(formatted)
            else:
                append_item(f'<p class="text-reading">{formatted}</p>')
            last_context = (last_context + " " + formatted.lower()).strip()

        if step_match:
            flush_step()
            is_intro = False
            num = step_match.group(2)
            parts = re.split(r'<br>|\n', step_match.group(3), maxsplit=1)
            title = format_basic_markdown(parts[0].strip())
            badge_keyword = "Bagian" if course == "scratch" else "Tahap"
            current_step_items.append(
                '<div class="step-card">'
                f'<span class="step-badge">{badge_keyword} {num}</span>'
                f'<h4 class="step-title">{title}</h4>'
                "</div>"
            )
            last_context = title.lower()

            if len(parts) > 1 and parts[1].strip():
                process_normal_text(parts[1].strip())
        else:
            process_normal_text(text_clean)

        current_text = ""

    for line in lines:
        line = line.strip()
        if not line:
            flush_text()
            continue

        if is_image_url(line):
            flush_text()
            wrapper_class = "shot-card intro-shot" if is_intro else "shot-card"
            shot_id = next_shot_id()
            img_html = f'<div class="{wrapper_class}" data-shot-id="{shot_id}"><img src="{proxied_media_url(line)}" alt="Panduan Visual" loading="eager" decoding="sync"></div>'
            current_images.append(img_html)
            last_context = ""
            continue

        flush_images()

        if re.match(r"^(Tahap|Bagian|Langkah)\s*\d+", line, re.IGNORECASE):
            flush_text()

        kc_match = re.match(r"^kc(\d+)\*$", line, re.IGNORECASE)
        fyk_match = re.match(r"^fyk(\d+)\*$", line, re.IGNORECASE)
        if kc_match or fyk_match:
            flush_text()
            marker = "kc" if kc_match else "fyk"
            idx = kc_match.group(1) if kc_match else fyk_match.group(1)
            
            # Flexible column name matching
            def get_col_val(preferred_key):
                # Try preferred first
                val = row_data.get(preferred_key)
                if val: return str(val)
                # Try common variations
                variations = [preferred_key.replace("_", " "), preferred_key.replace("_", "").lower()]
                for v in variations:
                    for rk, rv in row_data.items():
                        if str(rk).lower().strip() == v.lower():
                            return str(rv)
                return ""

            raw_text = get_col_val("kamus_coder") if kc_match else get_col_val("for_your_knowledge")
            regex_str = marker + idx + r":\s*([\s\S]*?)(?=(?:kc|fyk)\d+:|$)"
            match = re.search(regex_str, raw_text, re.IGNORECASE)
            if match:
                if kc_match:
                    content = format_objectives(match.group(1).strip())
                    bubble_html = (
                        '<div class="think-bubble knowledge-bubble">'
                        '<span class="think-title">Tutor Says</span>'
                        f'<div class="bubble-content">{content}</div>'
                        "</div>"
                    )
                else:
                    content = format_inline_urls(format_list_items(format_basic_markdown(match.group(1).strip()))).replace("\n", "<br>")
                    bubble_html = (
                        '<div class="think-bubble knowledge-bubble warm">'
                        '<span class="think-title">Did You Know?</span>'
                        f'<div class="bubble-content">{content}</div>'
                        "</div>"
                    )
                append_item(bubble_html)
            continue

        current_text += ("<br>" if current_text else "") + line
        if line.endswith(".") or line.endswith("?") or line.endswith("!") or line.endswith(":"):
            flush_text()

    flush_text()
    flush_images()
    flush_step()
    return "\n".join(blocks)


def extract_modules_in_order(rows):
    modules = []
    for idx, row in enumerate(rows):
        level = str(row.get("Level", "")).strip()
        session = str(row.get("Session", "")).strip()
        if not level or not session:
            continue
        modules.append(
            {
                "row_id": row.get("row_id", f"r{idx + 1:04d}"),
                "level": level,
                "session": session,
                "index": idx,
                "label": f"Level {level} - Session {session}",
            }
        )
    return modules


def serialize_module(row, course="roblox"):
    # Coba baca kolom 'Session Topic' (case insensitive fallbacks)
    # Apps Script kadang mengirim kolom tanpa nama sebagai col_13 (kolom N = index 13)
    topic = str(row.get("Session Topic", "")).strip()
    if not topic:
        topic = str(row.get("session topic", "")).strip()
    if not topic:
        topic = str(row.get("col_13", "")).strip()
    if not topic:
        # Fallback: cari key apapun yang mengandung kata 'topic'
        for k, v in row.items():
            if 'topic' in str(k).lower() and v:
                topic = str(v).strip()
                break

    return {
        "row_id": row.get("row_id"),
        "level": str(row.get("Level", "")).strip(),
        "session": str(row.get("Session", "")).strip(),
        "topic": topic,
        "label": f"Level {str(row.get('Level', '')).strip()} - Session {str(row.get('Session', '')).strip()}",
        "objectives_html": format_objectives(row.get("objectives", "")),
        "materials_html": parse_materials(row.get("materials", ""), row, course),
        "must_do_html": format_check(row.get("must_do", ""), row, "must_do"),
        "should_do_html": format_check(row.get("should_do", ""), row, "should_do"),
        "aspire_to_do_html": format_check(row.get("aspire_to_do", ""), row, "aspire_to_do"),
        "quiz_html": parse_quiz(row.get("quiz_questions", ""), row.get("quiz_options", "")),
    }


def filter_rows_by_level(rows, level=None):
    if level is None:
        return list(rows)
    
    def normalize_level_token(value):
        token = str(value or "").strip().lower()
        token = token.replace("scratch", "").replace("roblox", "").replace("python", "").replace("studio", "")
        token = token.replace("creator", "").replace("play", "").replace("level", "")
        token = token.replace("_", " ").replace("-", " ")
        token = re.sub(r"\s+", " ", token).strip()
        if token.endswith(".0"):
            token = token[:-2]
        return token

    level_key = normalize_level_token(level)
    if not level_key:
        return list(rows)
        
    filtered = []
    for row in rows:
        val = normalize_level_token(row.get("Level", ""))
        
        if val == level_key:
            filtered.append(row)
    return filtered


@app.route("/")
def index():
    return render_template("modern.html")


@app.route("/modern")
def modern():
    return render_template("modern.html")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, "static"),
        "favicon.svg",
        mimetype="image/svg+xml",
    )


@app.route("/api/modules")
def api_modules():
    course = request.args.get("course", "roblox")
    level = request.args.get("level")
    data = filter_rows_by_level(fetch_data(course), level)
    return jsonify({"modules": extract_modules_in_order(data), "meta": get_cache_meta(course)})


@app.route("/api/book")
def api_book():
    start = time.perf_counter()
    course = request.args.get("course", "roblox")
    level = request.args.get("level")
    rows = filter_rows_by_level(fetch_data(course), level)
    modules = [serialize_module(row, course) for row in rows if str(row.get("Level", "")).strip() and str(row.get("Session", "")).strip()]
    payload = {
        "course": _normalize_course(course),
        "title": {
            "scratch": "Scratch Creator Play",
            "python": "Python Creator Play",
        }.get(_normalize_course(course), "Roblox Studio Play"),
        "level": str(level).strip() if level is not None else None,
        "modules": modules,
        "moduleCount": len(modules),
        "meta": get_cache_meta(course),
    }
    logger.info("/api/book [%s] | modules=%s ms=%s", course, len(modules), _timed_ms(start))
    return jsonify(payload)


@app.route("/api/status")
def api_status():
    course = request.args.get("course", "roblox")
    fetch_data(course=course, force_refresh=False)
    return jsonify(get_cache_meta(course))


@app.route("/api/export_slides", methods=["POST"])
def api_export_slides():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Payload JSON kosong"}), 400
            
        # Simpan payload JSON ini ke lokal (untuk dibaca oleh Apps Script nantinya)
        save_dir = os.path.join(app.root_path, "saved_books")
        os.makedirs(save_dir, exist_ok=True)
        
        filepath = os.path.join(save_dir, "latest_slides_export.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        export_result = _export_slides_via_apps_script(data)
        slides_url = export_result["slides_url"]
        logger.info("Berhasil export Google Slides | file=%s slides_url=%s", filepath, slides_url)
        return jsonify(
            {
                "success": True,
                "filepath": filepath,
                "slidesUrl": slides_url,
                "appsScriptResponse": export_result["response"],
            }
        )
    except Exception as e:
        logger.error("Error exporting slides: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/render_page_image", methods=["POST"])
def api_render_page_image():
    try:
        data = request.json or {}
        page_html = data.get("html", "")
        if not page_html:
            return jsonify({"error": "HTML halaman kosong"}), 400

        rendered = _render_page_image_with_chromium(
            page_html=page_html,
            head_html=data.get("headHtml", ""),
            width_px=data.get("widthPx"),
            height_px=data.get("heightPx"),
            scale=data.get("scale", 2),
            image_type=data.get("imageType", "png"),
        )
        return jsonify({"success": True, **rendered})
    except Exception as e:
        logger.error("Error rendering page image: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/render_page_images", methods=["POST"])
def api_render_page_images():
    try:
        data = request.json or {}
        pages = data.get("pages", [])
        if not isinstance(pages, list) or not pages:
            return jsonify({"error": "Daftar HTML halaman kosong"}), 400
        if len(pages) > 20:
            return jsonify({"error": "Maksimal 20 halaman per render batch"}), 400

        rendered = _render_pages_images_with_chromium(
            pages=pages,
            head_html=data.get("headHtml", ""),
            scale=data.get("scale", 2),
            image_type=data.get("imageType", "png"),
        )
        return jsonify({"success": True, "images": rendered})
    except Exception as e:
        logger.error("Error rendering page images: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/media-proxy")
def media_proxy():
    src = request.args.get("src", "").strip()
    if not src:
        return jsonify({"error": "src wajib diisi"}), 400

    decoded_src = urllib.parse.unquote(src)
    if not re.match(r"^https?://", decoded_src, re.IGNORECASE):
        return jsonify({"error": "src harus berupa URL http/https"}), 400

    now = time.time()
    with _MEDIA_CACHE_LOCK:
        cached = _MEDIA_CACHE.get(decoded_src)
        if cached and (now - cached["fetched_at"]) < MEDIA_CACHE_TTL_SECONDS:
            return Response(
                cached["content"],
                mimetype=cached["content_type"],
                headers={"Cache-Control": f"public, max-age={MEDIA_CACHE_TTL_SECONDS}"},
            )

    try:
        req = urllib.request.Request(
            decoded_src,
            headers={
                "User-Agent": "Mozilla/5.0 (BookGenerator Media Proxy)",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            content = resp.read()
            content_type = resp.headers.get("Content-Type", "image/png")
    except Exception as exc:
        logger.warning("media proxy fetch failed | url=%s error=%s", decoded_src, exc)
        return jsonify({"error": "Gagal mengambil gambar", "src": decoded_src}), 502

    with _MEDIA_CACHE_LOCK:
        _MEDIA_CACHE[decoded_src] = {
            "content": content,
            "content_type": content_type,
            "fetched_at": time.time(),
        }

    return Response(
        content,
        mimetype=content_type,
        headers={
            "Cache-Control": f"public, max-age={MEDIA_CACHE_TTL_SECONDS}",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.route("/api/save", methods=["POST"])
def api_save():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Payload JSON kosong"}), 400
            
        course = str(data.get("course", "unknown")).lower()
        level = str(data.get("level", "")).strip() or "all"
        html_content = data.get("html", "")
        
        if not html_content:
            return jsonify({"error": "Konten HTML kosong"}), 400
            
        save_dir = _saved_books_dir()
        
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{course}_level_{level}_{timestamp}.html"
        filepath = os.path.join(save_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        return jsonify({"success": True, "filename": filename, "filepath": filepath})
    except Exception as e:
        logger.error("Error saving book: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/draft", methods=["GET"])
def api_get_draft():
    course = request.args.get("course", "unknown")
    level = request.args.get("level", "all")
    filename = request.args.get("filename")

    if filename:
        safe_filename = _safe_slug(filename)
    else:
        safe_filename = _draft_filename(course, level)

    filepath = os.path.join(_drafts_dir(), safe_filename)
    if not os.path.exists(filepath):
        return jsonify({"exists": False}), 404

    try:
        payload = _read_draft_file(filepath)
        payload = _normalize_draft_payload(payload)
        payload["exists"] = True
        payload["filename"] = safe_filename
        return jsonify(payload)
    except Exception as e:
        logger.error("Error loading draft: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/draft", methods=["POST"])
def api_save_draft():
    try:
        data = request.json or {}
        course = str(data.get("course", "unknown")).lower()
        level = str(data.get("level", "")).strip() or "all"
        elements = data.get("elements", [])

        if not isinstance(elements, list) or not elements:
            return jsonify({"error": "Draft kosong"}), 400

        import datetime
        now = datetime.datetime.now().isoformat(timespec="seconds")
        filename = _draft_filename(course, level)
        filepath = os.path.join(_drafts_dir(), filename)
        payload = {
            "schemaVersion": 1,
            "course": course,
            "level": level,
            "title": data.get("title", ""),
            "elements": elements,
            "scrollY": data.get("scrollY", 0),
            "pageCount": data.get("pageCount", 0),
            "updatedAt": now,
        }
        payload = _normalize_draft_payload(payload)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        logger.info("Draft saved | file=%s elements=%s", filepath, len(elements))
        return jsonify({"success": True, "filename": filename, "filepath": filepath, "updatedAt": now})
    except Exception as e:
        logger.error("Error saving draft: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/draft", methods=["DELETE"])
def api_delete_draft():
    course = request.args.get("course", "unknown")
    level = request.args.get("level", "all")
    filename = request.args.get("filename")
    safe_filename = _safe_slug(filename) if filename else _draft_filename(course, level)
    filepath = os.path.join(_drafts_dir(), safe_filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    return jsonify({"success": True, "filename": safe_filename})

@app.route("/saved")
def saved_list_page():
    return render_template("saved.html")

@app.route("/api/saved_list")
def api_saved_list():
    save_dir = _saved_books_dir()
    if not os.path.exists(save_dir):
        return jsonify({"files": [], "drafts": []})
    
    files = []
    for f in os.listdir(save_dir):
        if f.endswith(".html"):
            path = os.path.join(save_dir, f)
            mtime = os.path.getmtime(path)
            files.append({"name": f, "mtime": mtime})
    files.sort(key=lambda x: x["mtime"], reverse=True)

    drafts = []
    draft_dir = _drafts_dir()
    for f in os.listdir(draft_dir):
        if not f.endswith(".json"):
            continue
        path = os.path.join(draft_dir, f)
        mtime = os.path.getmtime(path)
        try:
            draft = _read_draft_file(path)
        except Exception:
            draft = {}
        drafts.append({
            "name": f,
            "mtime": mtime,
            "course": draft.get("course", ""),
            "level": draft.get("level", ""),
            "pageCount": draft.get("pageCount", 0),
            "updatedAt": draft.get("updatedAt", ""),
        })
    drafts.sort(key=lambda x: x["mtime"], reverse=True)
    return jsonify({"files": files, "drafts": drafts})

@app.route("/saved_books/<filename>")
def serve_saved_book(filename):
    filepath = os.path.join(_saved_books_dir(), _safe_slug(filename))
    if not os.path.exists(filepath):
        return "Not found", 404
        
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()
    html = _normalize_saved_html(html)
        
    toolbar = """
    <div id="saved-toolbar" style="position:fixed; top:10px; right:10px; z-index:999999; display:flex; gap:10px; background:white; padding:10px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.1); border: 2px solid #319E67;">
        <button onclick="window.print()" style="background:#4CAAE4; color:white; border:none; padding:8px 16px; border-radius:4px; font-weight:bold; cursor:pointer;">🖨️ Print</button>
        <button onclick="resaveBook(this)" style="background:#F9C846; color:#2A4365; border:none; padding:8px 16px; border-radius:4px; font-weight:bold; cursor:pointer;">💾 Simpan Ulang</button>
        <a href="/saved" style="background:#E55A51; color:white; text-decoration:none; padding:8px 16px; border-radius:4px; font-weight:bold; line-height: 1.5;">Tutup</a>
    </div>
    <script>
        async function resaveBook(btn) {
            btn.innerHTML = '⏳ Menyimpan...';
            btn.disabled = true;
            try {
                const tb = document.getElementById('saved-toolbar');
                tb.style.display = 'none';
                
                const cloneDoc = document.documentElement.cloneNode(true);
                const cloneTb = cloneDoc.querySelector('#saved-toolbar');
                if (cloneTb) cloneTb.remove();
                
                // Hapus script ini agar tidak dobel jika dibuka lagi
                const scripts = cloneDoc.querySelectorAll('script');
                scripts.forEach(s => {
                    if (s.innerHTML.includes('resaveBook(btn)')) {
                        s.remove();
                    }
                });
                
                const htmlContent = "<!DOCTYPE html>\\n" + cloneDoc.outerHTML;
                
                const res = await fetch('/api/resave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: 'FILENAME_PLACEHOLDER', html: htmlContent })
                });
                
                const data = await res.json();
                if (data.success) {
                    alert('Hooray! Editanmu berhasil disimpan ulang.');
                } else {
                    alert('Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan'));
                }
                
                tb.style.display = 'flex';
            } catch (e) {
                alert('Terjadi kesalahan: ' + e);
            } finally {
                btn.innerHTML = '💾 Simpan Ulang';
                btn.disabled = false;
            }
        }
    </script>
    """
    toolbar = toolbar.replace("FILENAME_PLACEHOLDER", filename)
    
    if "</body>" in html:
        html = html.replace("</body>", toolbar + "</body>")
    else:
        html += toolbar
        
    return html

@app.route("/api/resave", methods=["POST"])
def api_resave():
    try:
        data = request.json
        filename = data.get("filename")
        html_content = _normalize_saved_html(data.get("html", ""))
        
        if not filename or not html_content:
            return jsonify({"error": "Data tidak lengkap"}), 400
            
        filepath = os.path.join(_saved_books_dir(), _safe_slug(filename))
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        return jsonify({"success": True})
    except Exception as e:
        logger.error("Error resaving book: %s", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("Membuka Book Editor...")
    app.run(debug=True, port=5008, threaded=True)
