from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs' / 'golden' / 'm0'
OUTPUT = ROOT / 'prototypes' / 'assets' / 'guide-reference'

CROPS = {
    'objectives.png': ('roblox-ordinary-left.png', (30, 82, 710, 143)),
    'step.png': ('roblox-ordinary-left.png', (30, 185, 713, 327)),
    'image.png': ('roblox-ordinary-left.png', (135, 335, 608, 570)),
    'tutor-says.png': ('roblox-ordinary-left.png', (30, 575, 713, 713)),
    'did-you-know.png': ('roblox-semantic-right.png', (30, 95, 713, 225)),
    'must-do.png': ('roblox-semantic-right.png', (30, 225, 713, 342)),
    'should-do.png': ('roblox-semantic-right.png', (30, 350, 713, 455)),
    'aspire-to-do.png': ('roblox-semantic-right.png', (30, 465, 713, 570)),
    'quiz.png': ('roblox-semantic-right.png', (30, 578, 713, 720)),
    'self-check.png': ('roblox-late-session-left.png', (30, 405, 713, 518)),
}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for output_name, (source_name, box) in CROPS.items():
        source = Image.open(SOURCE / source_name).convert('RGB')
        crop = source.crop(box)
        crop.save(OUTPUT / output_name, optimize=True)
    print(f'guide-reference-crops: {len(CROPS)} real rendered crops -> {OUTPUT}')


if __name__ == '__main__':
    main()
