from pathlib import Path
import sys
import unittest
import json
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app as app_module


def fresh_cache_state():
    return {
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


def sample_rows():
    return [
        {
            "row_id": "r0001",
            "Level": "1",
            "Session": "1",
            "objectives": "Bikin base map",
            "materials": "Tahap 1: Kenalan Workspace\nBuka Roblox Studio.\nhttps://example.com/image_step.png",
            "must_do": "Bangun map pertama",
            "should_do": "Tambahkan dekorasi",
            "aspire_to_do": "Buat versi lebih rapi",
            "quiz_questions": "1. Fungsi toolbar apa?",
            "quiz_options": "1. A. Edit B. Insert",
            "kamus_coder": "",
            "for_your_knowledge": "",
        },
        {
            "row_id": "r0002",
            "Level": "1",
            "Session": "2",
            "objectives": "Tambah obstacle",
            "materials": "Tahap 1: Bangun tantangan\nAtur posisi objek.",
            "must_do": "Buat rintangan",
            "should_do": "Atur warna",
            "aspire_to_do": "Tambahkan efek",
            "quiz_questions": "1. Apa fungsi Anchor?",
            "quiz_options": "1. A. Mengunci objek B. Mengubah warna",
            "kamus_coder": "",
            "for_your_knowledge": "",
        },
    ]


class TestBookGenerator(unittest.TestCase):
    def setUp(self):
        with app_module._CACHE_LOCK:
            app_module._CACHE.clear()
            app_module._CACHE.update(fresh_cache_state())

    def tearDown(self):
        with app_module._CACHE_LOCK:
            app_module._CACHE.clear()
            app_module._CACHE.update(fresh_cache_state())

    def test_extract_modules_in_order_preserves_rows(self):
        modules = app_module.extract_modules_in_order(sample_rows())
        self.assertEqual([module["row_id"] for module in modules], ["r0001", "r0002"])
        self.assertEqual(modules[1]["label"], "Level 1 - Session 2")

    def test_serialize_module_contains_all_print_blocks(self):
        payload = app_module.serialize_module(sample_rows()[0])
        self.assertIn("objectives_html", payload)
        self.assertIn("materials_html", payload)
        self.assertIn("must_do_html", payload)
        self.assertIn("quiz_html", payload)
        self.assertIn("Kenalan Workspace", payload["materials_html"])

    def test_checklist_image_stays_with_previous_text(self):
        html = app_module.format_check(
            "Jelaskan hasil project\nhttps://example.com/image_result.png\n- Tambahkan catatan",
            {},
            "must_do",
        )

        self.assertIn('class="todo-group keep-together has-images"', html)
        self.assertIn("Jelaskan hasil project", html)
        self.assertIn("/media-proxy?src=https%3A%2F%2Fexample.com%2Fimage_result.png", html)
        self.assertEqual(html.count('class="todo-group keep-together'), 2)
        self.assertLess(html.index("Jelaskan hasil project"), html.index("todo-group-images"))

    def test_checklist_keeps_empty_marker_rows_as_editable_placeholders(self):
        empty_html = app_module.format_check("•", {}, "must_do")
        self.assertIn('class="check-row"', empty_html)
        self.assertIn('class="check-content"></td>', empty_html)

        html = app_module.format_check("-\n- Rapikan project", {}, "should_do")
        self.assertIn("Rapikan project", html)
        self.assertEqual(html.count('class="check-row"'), 2)

    def test_quiz_options_accept_pipe_and_bare_letter_format(self):
        html = app_module.parse_quiz(
            "1. Mengapa conditional dipakai?",
            "1. A untuk mengecek kondisi tertentu | B untuk menghapus map | C untuk memperbesar karakter",
        )

        self.assertIn('<span class="quiz-option-badge">A</span><span>untuk mengecek kondisi tertentu</span>', html)
        self.assertIn('<span class="quiz-option-badge">B</span><span>untuk menghapus map</span>', html)
        self.assertIn('<span class="quiz-option-badge">C</span><span>untuk memperbesar karakter</span>', html)

    def test_googleusercontent_url_renders_as_material_image(self):
        url = "https://yt3.googleusercontent.com/ytc/AIdro_lYmzcoX1XPwXFtlpprnzLgl_ChY0fULwGCA_kVvsXqiw=s900-c-k-c0x00ffffff-no-rj"
        html = app_module.parse_materials(
            f"Bagian 3: Mengenal Panggung Ajaib\nAyo Kenalan dengan Scratch!\n{url}\n1. Scratch Itu Apa, sih?",
            {"row_id": "r0001"},
            "scratch",
        )

        self.assertIn('class="shot-card"', html)
        self.assertIn("/media-proxy?src=https%3A%2F%2Fyt3.googleusercontent.com", html)
        self.assertNotIn(f'<a href="{url}"', html)

    def test_materials_fenced_code_with_language_renders_as_code_block(self):
        html = app_module.parse_materials(
            'Tahap 1: Import library\n'
            '```text\n'
            'import customtkinter as ctk\n\n'
            'app = ctk.CTk()\n'
            'app.title("Archius Profile Editor")\n'
            '```',
            {"row_id": "r0001"},
            "python",
        )

        self.assertIn('<pre class="syntax-block"><code>', html)
        self.assertIn("import customtkinter as ctk", html)
        self.assertNotIn("```text", html)
        self.assertNotIn("```", html)

    def test_api_book_returns_whole_book_payload(self):
        fake_meta = {
            "ttlSeconds": 180,
            "fetchedAtEpoch": 0,
            "ageSeconds": 0,
            "lastFetchMs": 10,
            "lastError": None,
            "schemaWarnings": [],
            "cacheHits": 0,
            "cacheMisses": 0,
            "source": "apps-script",
            "rowsCached": 2,
        }

        with patch.object(app_module, "fetch_data", return_value=sample_rows()):
            with patch.object(app_module, "get_cache_meta", return_value=fake_meta):
                client = app_module.app.test_client()
                response = client.get("/api/book?course=roblox")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["moduleCount"], 2)
        self.assertEqual(payload["modules"][0]["row_id"], "r0001")
        self.assertEqual(payload["title"], "Roblox Studio Play")

    def test_api_book_can_filter_by_level(self):
        rows = sample_rows() + [
            {
                "row_id": "r0003",
                "Level": "2",
                "Session": "1",
                "objectives": "Level dua",
                "materials": "Tahap 1: L2\nMateri.",
                "must_do": "A",
                "should_do": "B",
                "aspire_to_do": "C",
                "quiz_questions": "1. Q",
                "quiz_options": "1. A. X B. Y",
                "kamus_coder": "",
                "for_your_knowledge": "",
            }
        ]

        with patch.object(app_module, "fetch_data", return_value=rows):
            client = app_module.app.test_client()
            response = client.get("/api/book?course=roblox&level=1")

        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["moduleCount"], 2)
        self.assertTrue(all(module["level"] == "1" for module in payload["modules"]))

    def test_media_proxy_uses_cacheable_response(self):
        class FakeResponse:
            def __init__(self):
                self.headers = {"Content-Type": "image/png"}

            def read(self):
                return b"png-bytes"

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

        with patch.object(app_module.urllib.request, "urlopen", return_value=FakeResponse()):
            client = app_module.app.test_client()
            response = client.get("/media-proxy?src=https%3A%2F%2Fexample.com%2Fimage.png")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "image/png")
        self.assertEqual(response.data, b"png-bytes")

    def test_api_draft_round_trip_saves_editor_elements(self):
        client = app_module.app.test_client()
        payload = {
            "course": "scratch",
            "level": "Test Level",
            "title": "Draft Test",
            "elements": [{"index": 0, "html": '<p class="text-reading">Halo draft</p>'}],
            "pageCount": 1,
            "scrollY": 25,
        }

        response = client.post("/api/draft", json=payload)
        self.assertEqual(response.status_code, 200)
        saved = response.get_json()
        self.assertTrue(saved["success"])

        try:
            loaded_response = client.get("/api/draft?course=scratch&level=Test%20Level")
            self.assertEqual(loaded_response.status_code, 200)
            loaded = loaded_response.get_json()
            self.assertTrue(loaded["exists"])
            self.assertEqual(loaded["course"], "scratch")
            self.assertEqual(loaded["elements"][0]["html"], '<p class="text-reading">Halo draft</p>')
        finally:
            draft_path = Path(saved["filepath"])
            if draft_path.exists():
                draft_path.unlink()

    def test_api_export_slides_returns_google_slides_link(self):
        class FakeResponse:
            def __init__(self):
                self.headers = {"Content-Type": "application/json"}

            def read(self):
                return json.dumps(
                    {
                        "success": True,
                        "presentationUrl": "https://docs.google.com/presentation/d/abc123/edit",
                    }
                ).encode("utf-8")

            def geturl(self):
                return app_module.SLIDES_WEB_APP_URL

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

        with patch.object(app_module.urllib.request, "urlopen", return_value=FakeResponse()):
            client = app_module.app.test_client()
            response = client.post(
                "/api/export_slides",
                json={"course": "roblox", "level": "1", "elements": [{"type": "text", "text": "Halo"}]},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["slidesUrl"], "https://docs.google.com/presentation/d/abc123/edit")

    def test_extract_slides_url_can_build_from_presentation_id(self):
        self.assertEqual(
            app_module._extract_slides_url({"presentationId": "xyz789"}),
            "https://docs.google.com/presentation/d/xyz789/edit",
        )


if __name__ == "__main__":
    unittest.main()
