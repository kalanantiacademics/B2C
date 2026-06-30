import json
import logging
import os
import re
import ssl
import subprocess
import threading
import time
import html
import urllib.parse
import urllib.request
import urllib.error

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


def _export_slides_via_apps_script(payload):
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
    req = urllib.request.Request(
        SLIDES_WEB_APP_URL,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            raw_body = resp.read().decode("utf-8", errors="replace")
            final_url = resp.geturl()
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Apps Script HTTP {exc.code}: {error_body}") from exc
    except urllib.error.URLError as exc:
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
    sheet_name = "B2C_RobloxStudio_Modul" if course == "roblox" else "B2C_Scratch_Modul"
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
    text = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.*?)\*", r"<em>\1</em>", text)
    text = re.sub(r"__(.*?)__", r"<u>\1</u>", text)
    return text


def format_inline_urls(text):
    if not text:
        return ""

    def repl_url(match):
        url = match.group(0)
        if "image" in url.lower() or re.search(r"\.(jpeg|jpg|png|gif|webp)(\?|#|$)", url, re.IGNORECASE):
            return (
                '<span class="inline-image">'
                f'<img src="{proxied_media_url(url)}" alt="Ilustrasi" loading="eager" decoding="sync">'
                "</span>"
            )
        return f'<a href="{url}" target="_blank" rel="noopener">{url}</a>'

    return re.sub(r'https?://[^\s<"]+', repl_url, text)


def is_image_url(value):
    if not value:
        return False
    return re.match(r'^https?://[^\s<"]+$', value) and (
        "image" in value.lower()
        or re.search(r"\.(jpeg|jpg|png|gif|webp)(\?|#|$)", value, re.IGNORECASE)
    )


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

    lines = text.strip().split("\n")
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
    lines = text.strip().split("\n")
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
    out += '<div class="quiz-header" style="text-align:center; font-family:var(--font-display); font-weight:900; font-size:16pt; color:var(--theme-primary); margin-bottom: 20px; border-bottom: 3px dashed var(--theme-secondary); padding-bottom: 12px; letter-spacing: 1px;">MINI QUIZ</div>'
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

    lines = text.split("\n")
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
        step_match = re.match(r"^(Tahap|Bagian|Langkah)\s*(\d+):?(.*)", text_clean, re.IGNORECASE)

        def process_normal_text(body_text):
            nonlocal last_context
            formatted = format_basic_markdown(body_text)

            def repl_url(match):
                url = match.group(0)
                if "image" in url.lower() or re.search(r"\.(jpeg|jpg|png|gif|webp)(\?|#|$)", url, re.IGNORECASE):
                    return f'<span class="inline-image"><img src="{proxied_media_url(url)}" alt="Ilustrasi" loading="eager" decoding="sync"></span>'
                return f'<a href="{url}" target="_blank" rel="noopener">{url}</a>'

            formatted = re.sub(r'https?://[^\s<"]+', repl_url, format_list_items(formatted))
            if formatted.startswith("•"):
                append_item(f'<ul class="list-objective compact"><li>{formatted[1:].strip()}</li></ul>')
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
            continue

        is_image_url = re.match(r"^https?://[^\s]+$", line) and (
            "image" in line or re.search(r"\.(jpeg|jpg|png|gif|webp)(\?|#|$)", line, re.IGNORECASE)
        )
        if is_image_url:
            flush_text()
            wrapper_class = "shot-card intro-shot" if is_intro else "shot-card"
            shot_id = next_shot_id()
            img_html = f'<div class="{wrapper_class}" data-shot-id="{shot_id}"><img src="{proxied_media_url(line)}" alt="Panduan Visual" loading="eager" decoding="sync"></div>'
            current_images.append(img_html)
            last_context = ""
            continue

        flush_images()

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
        token = token.replace("scratch", "").replace("roblox", "").replace("studio", "")
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
        "title": "Scratch Creator Play" if course == "scratch" else "Roblox Studio Play",
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
        html_content = _normalize_saved_html(data.get("html", ""))
        
        if not html_content:
            return jsonify({"error": "Konten HTML kosong"}), 400
            
        save_dir = os.path.join(app.root_path, "saved_books")
        os.makedirs(save_dir, exist_ok=True)
        
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

@app.route("/saved")
def saved_list_page():
    return render_template("saved.html")

@app.route("/api/saved_list")
def api_saved_list():
    save_dir = os.path.join(app.root_path, "saved_books")
    if not os.path.exists(save_dir):
        return jsonify({"files": []})
    
    files = []
    for f in os.listdir(save_dir):
        if f.endswith(".html"):
            path = os.path.join(save_dir, f)
            mtime = os.path.getmtime(path)
            files.append({"name": f, "mtime": mtime})
    files.sort(key=lambda x: x["mtime"], reverse=True)
    return jsonify({"files": files})

@app.route("/saved_books/<filename>")
def serve_saved_book(filename):
    filepath = os.path.join(app.root_path, "saved_books", filename)
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
            
        filepath = os.path.join(app.root_path, "saved_books", filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        return jsonify({"success": True})
    except Exception as e:
        logger.error("Error resaving book: %s", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("Membuka Book Editor (Print Version)...")
    app.run(debug=True, port=5009)
