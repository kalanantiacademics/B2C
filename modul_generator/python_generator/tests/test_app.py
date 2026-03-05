from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app as app_module


def fresh_cache_state():
    return {
        "rows": [],
        "fetched_at": 0.0,
        "last_fetch_ms": None,
        "last_error": None,
        "schema_warnings": [],
        "hits": 0,
        "misses": 0,
        "source": "unknown",
    }


def sample_rows():
    return [
        {
            "row_id": "r0001",
            "Level": "2",
            "Session": "1",
            "objectives": "Obj 1",
            "materials": "Tahap 1: Intro\\nBuka Studio.",
            "must_do": "A",
            "should_do": "B",
            "aspire_to_do": "C",
            "quiz_questions": "1. Q1",
            "quiz_options": "1. A. X B. Y",
            "kamus_coder": "",
            "for_your_knowledge": "",
        },
        {
            "row_id": "r0002",
            "Level": "1",
            "Session": "3",
            "objectives": "Obj 2",
            "materials": "Tahap 1: Lanjutan\\nKonten kedua.",
            "must_do": "A2",
            "should_do": "B2",
            "aspire_to_do": "C2",
            "quiz_questions": "1. Q2",
            "quiz_options": "1. A. X2 B. Y2",
            "kamus_coder": "",
            "for_your_knowledge": "",
        },
    ]


class TestPythonGenerator(unittest.TestCase):
    def setUp(self):
        with app_module._CACHE_LOCK:
            app_module._CACHE.clear()
            app_module._CACHE.update(fresh_cache_state())

    def tearDown(self):
        with app_module._CACHE_LOCK:
            app_module._CACHE.clear()
            app_module._CACHE.update(fresh_cache_state())

    def test_fetch_data_uses_cache(self):
        calls = {"count": 0}

        def fake_uncached():
            calls["count"] += 1
            return (sample_rows(), 12.34)

        with patch.object(app_module, "_fetch_data_uncached", side_effect=fake_uncached):
            first = app_module.fetch_data(force_refresh=False)
            second = app_module.fetch_data(force_refresh=False)

        self.assertEqual(len(first), 2)
        self.assertEqual(len(second), 2)
        self.assertEqual(calls["count"], 1)
        self.assertGreaterEqual(app_module._CACHE["hits"], 1)

    def test_extract_modules_preserves_source_order(self):
        modules = app_module.extract_modules_in_order(sample_rows())
        self.assertEqual([m["row_id"] for m in modules], ["r0001", "r0002"])
        self.assertEqual(
            [m["label"] for m in modules],
            ["Level 2 - Session 1", "Level 1 - Session 3"],
        )

    def test_parse_materials_builds_intro_and_step_headpack(self):
        row = {"kamus_coder": "", "for_your_knowledge": ""}
        text = (
            "Pembuka modul.\n"
            "https://example.com/image_intro.png\n"
            "Tahap 1: Mengenal Workspace\n"
            "Buka Roblox Studio.\n"
            "https://example.com/image_step.png"
        )

        html = app_module.parse_materials(text, row)
        self.assertIn("intro-shot", html)
        self.assertIn("step-headpack keep-together", html)
        self.assertIn("Mengenal Workspace", html)
        self.assertIn("step-container", html)

    def test_api_modules_shape(self):
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
                resp = client.get("/api/modules")

        self.assertEqual(resp.status_code, 200)
        payload = resp.get_json()
        self.assertIn("modules", payload)
        self.assertIn("meta", payload)
        self.assertEqual(payload["modules"][0]["row_id"], "r0001")

    def test_api_modul_by_row_id_prefers_exact_row(self):
        rows = [
            {
                "row_id": "r0001",
                "Level": "1",
                "Session": "1",
                "objectives": "Obj A",
                "materials": "Tahap 1: Satu\\nKonten pertama.",
                "must_do": "A",
                "should_do": "B",
                "aspire_to_do": "C",
                "quiz_questions": "1. QA",
                "quiz_options": "1. A. X B. Y",
                "kamus_coder": "",
                "for_your_knowledge": "",
            },
            {
                "row_id": "r0002",
                "Level": "1",
                "Session": "1",
                "objectives": "Obj B",
                "materials": "Tahap 1: Dua\\nKonten kedua yang unik.",
                "must_do": "A2",
                "should_do": "B2",
                "aspire_to_do": "C2",
                "quiz_questions": "1. QB",
                "quiz_options": "1. A. X2 B. Y2",
                "kamus_coder": "",
                "for_your_knowledge": "",
            },
        ]

        with patch.object(app_module, "fetch_data", return_value=rows):
            client = app_module.app.test_client()
            resp = client.get("/api/modul/id/r0002")

        self.assertEqual(resp.status_code, 200)
        payload = resp.get_json()
        self.assertEqual(payload["row_id"], "r0002")
        self.assertIn("Konten kedua yang unik", payload["materials_html"])


if __name__ == "__main__":
    unittest.main()
