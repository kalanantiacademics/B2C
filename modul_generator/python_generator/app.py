import os
import json
import urllib.request
import re
import ssl
import time
import logging
import threading

# Fix SSL Cert Error for macOS di awal import agar urllib pakai config ini
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

from flask import Flask, render_template, jsonify

app = Flask(__name__)

WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwvNSa3hUMNqhNOINDeG3cPUdlQM-dGfl-dDX5WejhESjHRALipqhwJ_-3HXOJehtWbWw/exec'
CSV_EXPORT_URL = 'https://docs.google.com/spreadsheets/d/1nGihCZS3S9moNY2dt7GIzmBESIQ72Jh5J7d90nhZvX0/gviz/tq?tqx=out:csv&sheet=B2C_RobloxStudio_Modul'

logger = logging.getLogger("python_generator")
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

DATA_CACHE_TTL_SECONDS = int(os.environ.get("MODULE_CACHE_TTL_SECONDS", "180"))
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

_CACHE_LOCK = threading.Lock()
# Cache sekarang menyimpan data per-course (roblox atau scratch)
_CACHE = {
    "roblox": {
        "rows": [], "fetched_at": 0.0, "last_fetch_ms": None,
        "last_error": None, "schema_warnings": [], "hits": 0, "misses": 0, "source": "unknown"
    },
    "scratch": {
        "rows": [], "fetched_at": 0.0, "last_fetch_ms": None,
        "last_error": None, "schema_warnings": [], "hits": 0, "misses": 0, "source": "unknown"
    }
}

def _timed_ms(start_perf):
    return round((time.perf_counter() - start_perf) * 1000, 2)

def _normalize_raw_data(raw_data):
    if not isinstance(raw_data, list):
        return []

    # Format keys jika kembaliannya berupa col_0, col_1, dst
    if len(raw_data) > 0 and isinstance(raw_data[0], dict) and (
        'col_0' in raw_data[0] or 'Level' in raw_data[0].values()
    ):
        headers = list(raw_data[0].values()) if 'col_0' in raw_data[0] else list(raw_data[0].keys())
        keys = list(raw_data[0].keys())
        start_idx = 1 if 'col_0' in raw_data[0] else 0
        formatted = []
        for i in range(start_idx, len(raw_data)):
            row = raw_data[i]
            if not isinstance(row, dict):
                continue
            obj = {}
            for idx, key in enumerate(keys):
                header_name = str(headers[idx]).strip() if idx < len(headers) else key
                obj[header_name] = row.get(key, "")
            formatted.append(obj)
        return formatted

    return [r for r in raw_data if isinstance(r, dict)]

def _attach_row_ids(rows):
    enriched = []
    for idx, row in enumerate(rows):
        row_id = f"r{idx + 1:04d}"
        obj = dict(row)
        obj["row_id"] = row_id
        enriched.append(obj)
    return enriched

def _validate_schema(rows):
    warnings = []
    if not rows:
        warnings.append("Dataset kosong atau gagal dibaca.")
        return warnings

    available_cols = set()
    for row in rows:
        available_cols.update(row.keys())

    missing_cols = [c for c in REQUIRED_COLUMNS if c not in available_cols]
    if missing_cols:
        warnings.append("Kolom wajib tidak ditemukan: " + ", ".join(missing_cols))

    missing_level_session = sum(
        1 for row in rows
        if not str(row.get("Level", "")).strip() or not str(row.get("Session", "")).strip()
    )
    if missing_level_session > 0:
        warnings.append(f"Ada {missing_level_session} baris tanpa Level/Session.")

    return warnings

def _fetch_data_uncached(course="roblox"):
    start = time.perf_counter()
    sheet_name = "B2C_RobloxStudio_Modul" if course == "roblox" else ("B2C_Scratch_Modul" if course == "scratch" else "B2C_RobloxStudio_Modul")
    url = f"{WEB_APP_URL}?sheet={sheet_name}"
    
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        raw_data = json.loads(response.read().decode())
    rows = _attach_row_ids(_normalize_raw_data(raw_data))
    fetch_ms = _timed_ms(start)
    return rows, fetch_ms

def fetch_data(course="roblox", force_refresh=False):
    now = time.time()
    # Default to roblox if an unknown course is provided
    if course not in _CACHE:
        course = "roblox"
        
    cache_entry = _CACHE[course]
    with _CACHE_LOCK:
        cache_valid = (now - cache_entry["fetched_at"]) < DATA_CACHE_TTL_SECONDS and len(cache_entry["rows"]) > 0
        if not force_refresh and cache_valid:
            cache_entry["hits"] += 1
            logger.info(
                "cache hit [%s] | rows=%s ttl_remaining=%.1fs",
                course,
                len(cache_entry["rows"]),
                max(0.0, DATA_CACHE_TTL_SECONDS - (now - cache_entry["fetched_at"]))
            )
            return list(cache_entry["rows"])
        cache_entry["misses"] += 1

    try:
        rows, fetch_ms = _fetch_data_uncached(course)
        schema_warnings = _validate_schema(rows)

        with _CACHE_LOCK:
            cache_entry["rows"] = rows
            cache_entry["fetched_at"] = time.time()
            cache_entry["last_fetch_ms"] = fetch_ms
            cache_entry["last_error"] = None
            cache_entry["schema_warnings"] = schema_warnings
            cache_entry["source"] = "apps-script"

        logger.info(
            "cache refresh [%s] | rows=%s fetch_ms=%s warnings=%s",
            course,
            len(rows),
            fetch_ms,
            len(schema_warnings)
        )
        if schema_warnings:
            logger.warning("schema warnings: %s", " | ".join(schema_warnings))

        return list(rows)
    except Exception as e:
        logger.exception("Error fetching data via Web App for %s: %s", course, e)
        with _CACHE_LOCK:
            cache_entry["last_error"] = str(e)
            if cache_entry["rows"]:
                logger.warning("using stale cache [%s] | rows=%s", course, len(cache_entry["rows"]))
                return list(cache_entry["rows"])
        return []

def format_list_items(text):
    if not text: return ""
    def repl_num(m):
        prefix = m.group(1)
        num = m.group(2)
        if m.start() == 0:
            return f'<strong>{num}</strong> '
        else:
            return f'{prefix}<br><br><strong>{num}</strong> '
            
    def repl_bullet(m):
        prefix = m.group(1)
        if m.start() == 0:
            return f'• '
        else:
            return f'{prefix}<br>• '
            
    text = re.sub(r'(^|\s)(\d+[\.\)])\s+', repl_num, text)
    text = re.sub(r'(^|\s)(•)\s+', repl_bullet, text)
    return text

def format_basic_markdown(text):
    if not text: return ""
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
    text = re.sub(r'__(.*?)__', r'<u>\1</u>', text)
    return text

def format_inline_urls(text):
    if not text: return ""
    def repl_url(m):
        url = m.group(0)
        if 'image' in url.lower() or re.search(r'\.(jpeg|jpg|png|gif|webp)(\?|#|$)', url, re.IGNORECASE):
            return f'<span style="display:block; margin: 15px auto; text-align:center;"><img src="{url}" alt="Ilustrasi" style="width: 100%; max-width: 86%; max-height: 350px; object-fit: contain; display: inline-block; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></span>'
        else:
            return f'<a href="{url}" class="text-kalananti-blue underline" target="_blank">{url}</a>'
            
    return re.sub(r'https?://[^\s<"]+', repl_url, text)

def format_check(text):
    if not text: return ""
    lines = text.strip().split('\n')
    out = '<ul class="list-none p-0 m-0 space-y-2">'
    for line in lines:
        clean_line = re.sub(r'^[•\-\*]\s*', '', line).strip()
        clean_line = re.sub(r'^\[.*\]\s*', '', clean_line).strip()
        if clean_line:
            clean_line = format_basic_markdown(clean_line)
            clean_line = format_list_items(clean_line)
            clean_line = format_inline_urls(clean_line)
            out += f'<li class="flex items-start"><span class="mr-2 text-kalananti-orange font-bold text-lg leading-none" style="margin-top:0px">☑</span> <span class="leading-snug">{clean_line}</span></li>'
    out += '</ul>'
    return out

def format_objectives(text):
    if not text: return ""
    lines = text.strip().split('\n')
    out = '<ul class="list-objective">'
    for line in lines:
        clean_line = re.sub(r'^[•\-\*]\s*', '', line).strip()
        if clean_line:
            clean_line = format_basic_markdown(clean_line)
            clean_line = format_list_items(clean_line)
            clean_line = format_inline_urls(clean_line)
            out += f'<li>{clean_line}</li>'
    out += '</ul>'
    return out

def parse_quiz(questions_text, options_text):
    if not questions_text or not options_text: return ""
    
    # Parse questions
    q_lines = [q.strip() for q in questions_text.split('\n') if q.strip()]
    questions = {}
    for q in q_lines:
        match = re.search(r'^(\d+)\.\s*(.*)', q)
        if match:
            questions[match.group(1)] = match.group(2)
    
    # Parse options (format: "1. A. Part B. Script C. LocalScript")
    o_lines = [o.strip() for o in options_text.split('\n') if o.strip()]
    options = {}
    for line in o_lines:
        match_num = re.search(r'^(\d+)\.\s*(.*)', line)
        if match_num:
            num = match_num.group(1)
            the_rest = match_num.group(2)
            # Find all options A. B. C. D.
            opts = re.findall(r'([A-Z])\.\s*(.*?)(?=(?:[A-Z]\.|$))', the_rest)
            if opts:
                options[num] = []
                for (letter, text) in opts:
                    cleaned_text = re.sub(r'\|\s*$', '', text.strip()).strip()
                    options[num].append((letter, cleaned_text))
            else:
                options[num] = [('', the_rest.strip())]
            
    # Combine HTML
    out = '<div class="space-y-6">'
    for num, q_text in questions.items():
        out += f'<div class="keep-together" style="break-inside: avoid; page-break-inside: avoid;">'
        q_clean = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', q_text)
        out += f'<p class="text-[10pt] font-semibold text-kalananti-navy leading-snug mb-3 flex items-start"><span class="mr-2">{num}.</span> <span style="flex:1">{q_clean}</span></p>'
        
        if num in options:
            out += '<div class="space-y-2 pl-[18px]">'
            for opt in options[num]:
                letter, desc = opt
                if letter:
                    formatted_opt = f'<span class="inline-block bg-white border border-gray-300 shadow-sm text-kalananti-blue font-bold rounded-full text-[9pt] mr-2 text-center" style="width:18px; line-height:18px; height:18px; margin-top:2px; flex-shrink:0;">{letter}</span><span style="flex:1">{desc}</span>'
                    out += f'<p class="text-[10pt] leading-snug m-0 flex items-start">{formatted_opt}</p>'
                else:
                    out += f'<p class="text-[10pt] leading-snug m-0 flex items-start"><span class="mr-2">•</span> <span style="flex:1">{desc}</span></p>'
            out += '</div>'
        out += '</div>'
    out += '</div>'
    return out

def parse_materials(text, row_data):
    if not text:
        return ""

    lines = text.split('\n')
    blocks = []
    current_step_items = []
    current_text = ""
    last_context = ""
    is_intro = True

    def render_step(items):
        if not items:
            return ""

        if 'class="step-card"' not in items[0]:
            return "\n".join(items)

        remaining = items[1:]
        step_parts = []

        if remaining:
            head_items = [items[0]]
            for r in remaining:
                head_items.append(r)
                if 'shot-card' in r or 'think-bubble' in r:
                    break
            
            tail_items = remaining[len(head_items)-1:]
            content = "\n".join(head_items)
            step_parts.append(f'<div class="step-headpack keep-together" style="break-inside: avoid; page-break-inside: avoid;">\n{content}\n</div>')
            remaining = tail_items
        else:
            step_parts.append(f'<div class="step-headpack keep-together" style="break-inside: avoid; page-break-inside: avoid;">\n{items[0]}\n</div>')

        for item in remaining:
            keep_cls = " keep-together" if ('shot-card' in item or 'think-bubble' in item) else ""
            step_parts.append(f'<div class="step-content-item{keep_cls}">{item}</div>')

        return '<div class="step-container" style="break-inside: auto; page-break-inside: auto;">\n' + "\n".join(step_parts) + '\n</div>'

    def append_item(item_html):
        if is_intro:
            blocks.append(item_html)
        else:
            current_step_items.append(item_html)

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
        step_match = re.match(r'^Tahap (\d+):?(.*)', text_clean, re.IGNORECASE)

        if step_match:
            flush_step()
            is_intro = False
            num = step_match.group(1)
            title = step_match.group(2).strip()
            current_step_items.append(
                f'''
                <div class="step-card">
                    <span class="step-badge">Tahap {num}</span>
                    <h4 class="font-display font-bold text-lg text-camp-navy m-0 ml-1">{title}</h4>
                </div>'''
            )
            last_context = title.lower()
        else:
            formatted = format_basic_markdown(text_clean)
            
            def repl_url(m):
                url = m.group(0)
                if 'image' in url.lower() or re.search(r'\.(jpeg|jpg|png|gif|webp)(\?|#|$)', url, re.IGNORECASE):
                    return f'<span style="display:block; margin: 15px auto; text-align:center;"><img src="{url}" alt="Ilustrasi" style="width: 100%; max-width: 86%; max-height: 350px; object-fit: contain; display: inline-block; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></span>'
                else:
                    return f'<a href="{url}" class="text-kalananti-blue underline" target="_blank">{url}</a>'
            
            formatted = format_list_items(formatted)
            formatted = re.sub(r'https?://[^\s<"]+', repl_url, formatted)
            
            if formatted.startswith('•'):
                append_item(f'<ul class="list-objective" style="margin-top:0; padding-left:1.5rem;"><li>{formatted[1:].strip()}</li></ul>')
            else:
                append_item(f'<p class="text-reading">{formatted}</p>')
            last_context = (last_context + " " + formatted.lower()).strip()

        current_text = ""

    for line in lines:
        line = line.strip()
        if not line:
            continue

        is_image_url = re.match(r'^https?://[^\s]+$', line) and (
            'image' in line or re.search(r'\.(jpeg|jpg|png|gif|webp)(\?|#|$)', line, re.IGNORECASE)
        )

        if is_image_url:
            flush_text()

            if is_intro:
                img_style = "width: 100%; max-width: 75%; max-height: 190px;"
                wrapper_class = "shot-card intro-shot keep-together"
            else:
                img_style = "width: 100%; max-width: 100%; max-height: 480px;"
                if (
                    "workspace" in last_context
                    or "tampilan" in last_context
                    or "roblox studio" in last_context
                    or "game editor" in last_context
                ):
                    img_style = "width: 100%; max-width: 100%; max-height: 520px;"
                elif (
                    "ikon" in last_context
                    or "tombol" in last_context
                    or "part" in last_context
                    or "alat" in last_context
                ):
                    img_style = "width: 100%; max-width: 86%; max-height: 300px;"
                wrapper_class = "shot-card keep-together"

            append_item(
                f'''
                <div class="{wrapper_class}" style="page-break-inside: avoid; break-inside: avoid;">
                    <img src="{line}" alt="Panduan Visual" style="{img_style} object-fit: contain; display: block; margin: 0 auto; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                </div>'''
            )
            last_context = ""
            continue

        kc_match = re.match(r'^kc(\d+)\*$', line, re.IGNORECASE)
        fyk_match = re.match(r'^fyk(\d+)\*$', line, re.IGNORECASE)

        if kc_match or fyk_match:
            flush_text()
            marker = 'kc' if kc_match else 'fyk'
            idx = kc_match.group(1) if kc_match else fyk_match.group(1)
            raw_text = str(row_data.get('kamus_coder', '') or '') if kc_match else str(row_data.get('for_your_knowledge', '') or '')

            regex_str = marker + idx + r':\s*([\s\S]*?)(?=(?:kc|fyk)\d+:|$)'
            match = re.search(regex_str, raw_text, re.IGNORECASE)

            if match:
                if kc_match:
                    content = format_objectives(match.group(1).strip())
                    bubble_html = f'''
                    <div class="think-bubble mt-4 mb-4">
                        <span class="think-title">Tutor says...</span>
                        <div class="text-[10pt] font-semibold">{content}</div>
                    </div>'''
                else:
                    content = format_basic_markdown(match.group(1).strip())
                    content = format_list_items(content)
                    content = format_inline_urls(content)
                    # Convert explicit \n inside cells to <br> if any remain
                    content = content.replace('\n', '<br>')
                    bubble_html = f'''
                    <div class="think-bubble !border-kalananti-orange !bg-orange-50 font-bold mt-4 mb-4" style="box-shadow: 3px 3px 0 #F07D49">
                        <span class="think-title !bg-kalananti-orange !text-white">Did You Know?</span>
                        <div class="text-[10pt]">{content}</div>
                    </div>'''
                append_item(bubble_html)
            continue

        current_text += ("<br>" if current_text else "") + line
        if line.endswith('.') or line.endswith('?') or line.endswith('!') or line.endswith(':'):
            flush_text()

    flush_text()
    flush_step()

    return "\n".join(blocks)


@app.route('/')
def index():
    # Cuma serve HTML kerangkanya, JS di dalam akan hit endpoint API
    return render_template('index.html')

@app.route('/modern')
def modern():
    # Serve skeleton Paged.js untuk desain Neo-Brutalist
    return render_template('modern.html')

def extract_modules_in_order(rows):
    modules = []
    for idx, row in enumerate(rows):
        lvl = row.get('Level')
        ses = row.get('Session')
        if lvl is None or ses is None:
            continue

        level = str(lvl).strip()
        session = str(ses).strip()
        if not level or not session:
            continue

        modules.append({
            "row_id": row.get("row_id", f"r{idx + 1:04d}"),
            "level": level,
            "session": session,
            "index": idx,
            "label": f"Level {level} - Session {session}"
        })
    return modules

def get_cache_meta(course="roblox"):
    if course not in _CACHE:
        course = "roblox"
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

from flask import request

@app.route('/api/levels')
def api_levels():
    start = time.perf_counter()
    course = request.args.get('course', 'roblox')
    # Legacy endpoint (dipertahankan agar backward-compatible)
    data = fetch_data(course)
    levels = {}
    for row in data:
        lvl = row.get('Level')
        ses = row.get('Session')
        if lvl and ses:
            if lvl not in levels:
                levels[lvl] = []
            if ses not in levels[lvl]:
                levels[lvl].append(ses)
    logger.info("/api/levels | levels=%s ms=%s", len(levels), _timed_ms(start))
    return jsonify(levels)

@app.route('/api/modules')
def api_modules():
    start = time.perf_counter()
    course = request.args.get('course', 'roblox')
    data = fetch_data(course)
    modules = extract_modules_in_order(data)
    meta = get_cache_meta(course)
    logger.info("/api/modules [%s] | modules=%s ms=%s", course, len(modules), _timed_ms(start))
    return jsonify({"modules": modules, "meta": meta})

@app.route('/api/status')
def api_status():
    start = time.perf_counter()
    course = request.args.get('course', 'roblox')
    # optional refresh cache on status call only if empty, to provide current diagnostics
    _ = fetch_data(course=course, force_refresh=False)
    meta = get_cache_meta(course)
    logger.info("/api/status [%s] | rowsCached=%s ms=%s", course, meta.get("rowsCached"), _timed_ms(start))
    return jsonify(meta)

def _find_row_by_row_id(rows, row_id):
    key = str(row_id).strip()
    for row in rows:
        if str(row.get("row_id", "")).strip() == key:
            return row
    return None

@app.route('/api/modul/<level>/<session>')
def api_modul(level, session):
    start = time.perf_counter()
    course = request.args.get('course', 'roblox')
    data = fetch_data(course)
    level_key = str(level).strip()
    session_key = str(session).strip()
    row = next(
        (
            r for r in data
            if str(r.get('Level', '')).strip() == level_key and str(r.get('Session', '')).strip() == session_key
        ),
        None
    )
    
    if not row:
        logger.warning("/api/modul/%s/%s | not found", level, session)
        return jsonify({"error": "Data tidak ditemukan"})
        
    # Backend Parser (AI-like Rules) Action!
    processed = {
        "row_id": row.get("row_id"),
        "Level": row.get('Level'),
        "Session": row.get('Session'),
        "objectives": format_objectives(row.get('objectives', '')),
        "materials_html": parse_materials(row.get('materials', ''), row),
        "must_do": format_check(row.get('must_do', '')),
        "should_do": format_check(row.get('should_do', '')),
        "aspire_to_do": format_check(row.get('aspire_to_do', '')),
        "quiz_html": parse_quiz(row.get('quiz_questions', ''), row.get('quiz_options', ''))
    }
    logger.info("/api/modul/%s/%s [%s] | ok ms=%s", level, session, course, _timed_ms(start))
    return jsonify(processed)

@app.route('/api/modul/id/<row_id>')
def api_modul_by_id(row_id):
    start = time.perf_counter()
    course = request.args.get('course', 'roblox')
    data = fetch_data(course)
    row = _find_row_by_row_id(data, row_id)
    if not row:
        logger.warning("/api/modul/id/%s | not found", row_id)
        return jsonify({"error": "Data tidak ditemukan"})

    processed = {
        "row_id": row.get("row_id"),
        "Level": row.get('Level'),
        "Session": row.get('Session'),
        "objectives": format_objectives(row.get('objectives', '')),
        "materials_html": parse_materials(row.get('materials', ''), row),
        "must_do": format_check(row.get('must_do', '')),
        "should_do": format_check(row.get('should_do', '')),
        "aspire_to_do": format_check(row.get('aspire_to_do', '')),
        "quiz_html": parse_quiz(row.get('quiz_questions', ''), row.get('quiz_options', ''))
    }
    logger.info("/api/modul/id/%s [%s] | ok ms=%s", row_id, course, _timed_ms(start))
    return jsonify(processed)

@app.route('/favicon.ico')
def favicon():
    from flask import send_from_directory
    return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.svg', mimetype='image/svg+xml')

if __name__ == '__main__':
    print("Membuka Portal Modul Generator...")
    app.run(debug=True, port=5001)
