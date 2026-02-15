from pathlib import Path

output = Path('/Users/pyprashant/Projects/CodexPractice/NativeApp/NativeApp_Use_Case.pdf')

lines = [
    'NativeApp Use Case Overview',
    '',
    '1. App Purpose',
    'NativeApp helps users translate copied English text into Marathi while reading',
    'content in apps like X, Kindle, Safari, and Notes. Users can paste text or',
    'share selected text through the iOS Share Extension and get fast Marathi meaning.',
    '',
    '2. Core User Flow',
    'Copy text in any app -> Open NativeApp -> Paste from Clipboard -> Translate to Marathi',
    'Or: Select text -> Share -> NativeAppShareExtension -> Translate',
    '',
    '3. Primary Use Cases',
    '- Students reading articles and improving understanding of difficult words.',
    '- Professionals reading English content and learning Marathi equivalents.',
    '- Daily readers building bilingual comprehension during normal reading habits.',
    '',
    '4. How English Vocabulary Improves',
    '- Repeated exposure to difficult English words in real reading context.',
    '- Better retention through immediate meaning lookup while reading.',
    '- Stronger contextual understanding instead of isolated word memorization.',
    '- Spelling awareness improves via UITextChecker-based correction before translation.',
    '',
    '5. How Marathi Vocabulary Improves',
    '- Users see accurate Marathi meaning for new English words instantly.',
    '- Frequent translation creates Marathi synonym familiarity over time.',
    '- Practical bilingual mapping strengthens Marathi word recall in daily conversation.',
    '- Re-reading translated outputs helps users internalize Marathi usage patterns.',
    '',
    '6. Expected Learning Outcome',
    'With consistent daily use, users steadily improve both English reading comprehension',
    'and Marathi vocabulary depth, making bilingual communication faster and more confident.',
]

# Basic PDF primitives
objects = []

def add_obj(data: bytes):
    objects.append(data)

# Font object
add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

# Build content stream
content = [b"BT", b"/F1 12 Tf", b"72 790 Td", b"14 TL"]
for line in lines:
    safe = line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    content.append(f"({safe}) Tj".encode('latin-1', 'replace'))
    content.append(b"T*")
content.append(b"ET")
stream = b"\n".join(content)
add_obj(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")

# Page object (references font obj 1 and content obj 2, parent pages obj 4)
add_obj(b"<< /Type /Page /Parent 4 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 1 0 R >> >> /Contents 2 0 R >>")

# Pages object
add_obj(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")

# Catalog object
add_obj(b"<< /Type /Catalog /Pages 4 0 R >>")

# Write xref
pdf = bytearray()
pdf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
offsets = [0]
for i, obj in enumerate(objects, start=1):
    offsets.append(len(pdf))
    pdf.extend(f"{i} 0 obj\n".encode())
    pdf.extend(obj)
    pdf.extend(b"\nendobj\n")

xref_start = len(pdf)
pdf.extend(f"xref\n0 {len(objects)+1}\n".encode())
pdf.extend(b"0000000000 65535 f \n")
for off in offsets[1:]:
    pdf.extend(f"{off:010d} 00000 n \n".encode())

pdf.extend(
    f"trailer\n<< /Size {len(objects)+1} /Root 5 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode()
)

output.write_bytes(pdf)
print(output)
