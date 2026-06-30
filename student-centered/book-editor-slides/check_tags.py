import json
from html.parser import HTMLParser

class TagChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.void_elements = {"area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"}

    def handle_starttag(self, tag, attrs):
        if tag not in self.void_elements:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.void_elements:
            return
        if not self.stack:
            print(f"  Warning: Unmatched closing tag </{tag}>")
            return
        
        top = self.stack.pop()
        if top != tag:
            print(f"  Warning: Mismatched tags! Expected </{top}> but got </{tag}>")
            self.stack.append(top) # push back

with open("test_book.json") as f:
    d = json.load(f)

for m in d["modules"]:
    print(f"Checking Level {m['level']} Session {m['session']}")
    checker = TagChecker()
    html = m["objectives_html"] + m["materials_html"] + m["must_do_html"] + m["should_do_html"] + m["aspire_to_do_html"] + m["quiz_html"]
    checker.feed(html)
    if checker.stack:
        print(f"  Warning: Unclosed tags left in Session {m['session']}: {checker.stack}")

