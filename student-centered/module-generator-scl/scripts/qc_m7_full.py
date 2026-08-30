import json
import subprocess
import time
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/private/tmp/kalananti-scl-phase7-qc')
PHASE6_OUTPUT = Path('/private/tmp/kalananti-scl-phase6-qc')
COURSES = ('roblox', 'scratch', 'python')
COMMANDS = (
    ('static-unit-integration', ('npm', 'run', 'check')),
    ('phase1-browser', ('npm', 'run', 'qc:phase1:browser')),
    ('phase2-two-context', ('npm', 'run', 'qc:phase2:browser')),
    ('v2-p7-route-recovery', ('npm', 'run', 'qc:v2:recovery')),
    ('phase3-editor', ('npm', 'run', 'qc:phase3:browser')),
    ('phase4-tables', ('npm', 'run', 'qc:phase4:browser')),
    ('m1-direct-edit', ('npm', 'run', 'qc:m1:direct-edit')),
    ('m1-image-reflow', ('npm', 'run', 'qc:m1:image-reflow')),
    ('m2-three-course-adapter', ('npm', 'run', 'qc:m2:adapter')),
    ('m3-legacy-comparison', ('npm', 'run', 'qc:m3:compare')),
    ('phase5-pagination-stress', ('npm', 'run', 'qc:phase5:browser')),
    ('phase6-three-golden-pdf', ('npm', 'run', 'qc:phase6:pdf')),
)


def run_checks():
    results = []
    for label, command in COMMANDS:
        started = time.perf_counter()
        print(f'\n[M7] {label}: {" ".join(command)}', flush=True)
        completed = subprocess.run(command, cwd=ROOT, check=False)
        result = {
            'label': label,
            'command': ' '.join(command),
            'exitCode': completed.returncode,
            'seconds': round(time.perf_counter() - started, 2),
        }
        results.append(result)
        if completed.returncode:
            raise subprocess.CalledProcessError(completed.returncode, command)
    return results


def render_actual_pdf_contact_sheets():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    pdf_results = {}
    for course in COURSES:
        pdf_path = PHASE6_OUTPUT / f'golden-{course}.pdf'
        contact_sheet = OUTPUT / f'{course}-actual-pdf-contact-sheet.png'
        subprocess.run(
            ('swift', 'scripts/render_pdf_contact_sheet.swift', str(pdf_path), str(contact_sheet)),
            cwd=ROOT,
            check=True,
        )
        reader = PdfReader(str(pdf_path))
        text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        first_page = reader.pages[0]
        pdf_results[course] = {
            'pdf': str(pdf_path),
            'actualPdfContactSheet': str(contact_sheet),
            'pages': len(reader.pages),
            'mediaBoxPt': [round(float(first_page.mediabox.width), 2), round(float(first_page.mediabox.height), 2)],
            'selectableTextCharacters': len(text),
        }
    return pdf_results


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    commands = run_checks()
    pdfs = render_actual_pdf_contact_sheets()
    summary = {
        'schemaVersion': 'scl-m7-qa/v1',
        'fixtureBoundary': 'synthetic/local; no Spreadsheet, Apps Script HEAD, or production mutation',
        'commands': commands,
        'pdfs': pdfs,
        'totalSeconds': round(time.perf_counter() - started, 2),
    }
    summary_path = OUTPUT / 'summary.json'
    summary_path.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, indent=2))
    print(f'[M7] summary: {summary_path}')


if __name__ == '__main__':
    main()
