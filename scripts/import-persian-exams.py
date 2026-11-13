"""Read public Persian exam sources; preserve original question images and final keys.

Inputs are downloaded to node_modules/.tmp/learning-data. PyMuPDF is required;
PyArrow is only needed for the public Konkur Parquet snapshot.
No gated datasets, login flows, or paid question banks are accessed.
"""
import collections
import hashlib
import json
import pathlib
import re
import sys

import fitz

sys.path.insert(0, 'node_modules/.tmp/content-python')
import pyarrow.parquet as pq

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMP = ROOT / 'node_modules/.tmp/learning-data'
MEDIA = ROOT / 'public/question-media'
MEDIA.mkdir(parents=True, exist_ok=True)
OUTPUT = ROOT / 'content/learning/persian-exams.json'
LETTERS = ['الف', 'ب', 'ج', 'د']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def key_from_marks(filename, x_start, x_step, option_step, top, bottom):
    """Read only dark, neutral pixels inside the published OMR answer sheet.

    Row positions are measured independently for each column. Ambiguous rows
    fail closed and are excluded instead of receiving a guessed answer.
    """
    pix = fitz.Pixmap(filename)
    result = {}
    for col in range(4):
        first = x_start + col * x_step
        rows = []
        segment = []
        for y in range(top, bottom):
            score = 0
            for x in range(round(first - 14), round(first + option_step * 3 + 14)):
                rgb = pix.pixel(x, y)[:3]
                score += max(rgb) - min(rgb) < 25 and sum(rgb) / 3 < 170
            if score >= 7:
                segment.append(y)
            elif segment:
                if len(segment) >= 3:
                    rows.append(round(sum(segment) / len(segment)))
                segment = []
        if segment and len(segment) >= 3:
            rows.append(round(sum(segment) / len(segment)))
        if len(rows) != 50:
            raise ValueError(f'Expected 50 answer rows, found {len(rows)} in column {col}')
        for index, y in enumerate(rows):
            scores = []
            for choice in range(4):
                x = round(first + choice * option_step)
                pixels = [pix.pixel(xx, yy)[:3] for xx in range(x - 8, x + 9) for yy in range(y - 4, y + 5)]
                scores.append(sum(max(v) - min(v) < 25 and sum(v) / 3 < 170 for v in pixels) / len(pixels))
            ranked = sorted(scores, reverse=True)
            if ranked[0] >= .3 and ranked[0] - ranked[1] >= .2:
                result[col * 50 + index + 1] = {'index': scores.index(ranked[0]), 'margin': round(ranked[0] - ranked[1], 4)}
    return result


base_key = key_from_marks(TEMP / 'olumpaye1402.pdf.key.png', 170, 169.2, 24.2, 315, 1620)
clinical_key = key_from_marks(TEMP / 'pishkarvarzi1402.pdf.key.png', 110, 172, 34, 420, 1615)
assert [base_key[i]['index'] for i in range(1, 6)] == [0, 2, 1, 3, 3]
assert [clinical_key[i]['index'] for i in range(1, 6)] == [1, 1, 1, 1, 1]

records = []
report = {'excluded': collections.Counter(), 'medicalKeyConfidence': {}, 'sources': {}}


def base_subject(n):
    for end, subject, chapter in [(34, 'physiology', 'فیزیولوژی'), (54, 'biochemistry', 'بیوشیمی'),
        (69, 'bacteriology', 'باکتری‌شناسی'), (78, 'parasitology', 'انگل‌شناسی'),
        (80, 'entomology', 'حشره‌شناسی'), (85, 'mycology', 'قارچ‌شناسی'),
        (90, 'virology', 'ویروس‌شناسی'), (142, 'anatomy', 'تشریح'),
        (154, 'health', 'اصول خدمات سلامت'), (162, 'epidemiology', 'اپیدمیولوژی'),
        (170, 'immunology', 'ایمنی‌شناسی'), (190, 'english', 'زبان انگلیسی'),
        (200, 'islamic', 'اندیشه و انقلاب اسلامی')]:
        if n <= end:
            return subject, chapter
    raise ValueError(n)


for exam, filename, keys, excluded in [
    ('medical-basics', 'olumpaye1402.pdf', base_key, {22, 103, 104, 110, 186}),
    ('preinternship', 'pishkarvarzi1402.pdf', clinical_key, {21, 32, 39, 88, 148, 184}),
]:
    doc = fitz.open(TEMP / filename)
    if doc.needs_pass:
        if not doc.authenticate('www.konkur.in'):
            raise ValueError('The public download password failed.')
    report['sources'][exam] = {'sha256': sha(TEMP / filename), 'pages': len(doc)}
    seen = set()
    for page_index, page in enumerate(doc):
        if page_index == 0 or page_index >= len(doc) - (1 if exam == 'medical-basics' else 2):
            continue
        spans = [s for b in page.get_text('dict')['blocks'] for line in b.get('lines', []) for s in line['spans']]
        anchors = []
        if exam == 'medical-basics':
            for s in spans:
                box = s['bbox']
                if box[0] > 500 and box[2] > 520 and re.fullmatch(r'[0-9]{1,3}', s['text'].strip()) and 'Bold' in s['font'] and 55 < box[1] < 770:
                    n = int(s['text'].strip())
                    anchors.append((n, box[1]))
        else:
            # This PDF's ToUnicode map corrupts digits. The embedded font's
            # digit glyphs 14..23 are 0..9, calibrated on visible questions 1..9.
            for trace in page.get_texttrace():
                text = ''.join(chr(c[0]) for c in trace['chars']).strip()
                box = trace['bbox']
                if box[0] > 500 and box[2] > 515 and 55 < box[1] < 770 and re.fullmatch(r'\d{1,3}\s*-', text):
                    glyphs = [c[1] for c in trace['chars'] if chr(c[0]).isdigit()]
                    n = int(''.join(str(g - 14) for g in glyphs)) if 'Nazanin' in trace['font'] and all(14 <= g <= 23 for g in glyphs) else 0
                    anchors.append((n, box[1]))
        anchors.sort(key=lambda item: item[1])
        for index, (n, top) in enumerate(anchors):
            if not 1 <= n <= 200 or n in seen:
                continue
            seen.add(n)
            if n in excluded or n not in keys:
                report['excluded']['medical_deleted_multiple_or_uncertain_key'] += 1
                continue
            if exam == 'medical-basics':
                subject, chapter = base_subject(n)
                if subject == 'english':
                    report['excluded']['english_language_section'] += 1
                    continue
            else:
                subject, chapter = 'clinical-comprehensive', 'جامع بالینی'
            lower = anchors[index + 1][1] - 5 if index + 1 < len(anchors) else page.rect.height - 55
            if lower - top < 50:
                report['excluded']['incomplete_crop'] += 1
                continue
            # Reject text-page gaps, which could otherwise combine two questions.
            if index + 1 < len(anchors) and anchors[index + 1][0] not in (n + 1, 0) and not (exam == 'medical-basics' and anchors[index + 1][0] == 1 and n == 170):
                report['excluded']['nonconsecutive_question_boundaries'] += 1
                continue
            path = MEDIA / f'{exam}-1402-{n}.jpg'
            clip = fitz.Rect(28, max(45, top - 5), page.rect.width - 22, lower)
            page.get_pixmap(matrix=fitz.Matrix(1.8, 1.8), clip=clip, alpha=False).save(path, jpg_quality=88)
            exam_title = 'علوم پایه پزشکی' if exam == 'medical-basics' else 'پیش‌کارورزی'
            key = keys[n]
            record = {
                'key': f'{exam}-1402-{n}', 'track': exam, 'subjectId': subject, 'chapter': chapter,
                'prompt': f'سؤال {n} آزمون {exam_title} اسفند ۱۴۰۲؛ متن و گزینه‌های اصلی در تصویر آمده‌اند.',
                'options': [f'گزینهٔ {letter}' for letter in LETTERS], 'correctIndex': key['index'],
                'explanation': f'طبق کلید منتشرشدهٔ آزمون {exam_title} اسفند ۱۴۰۲، پاسخ صحیح گزینهٔ {LETTERS[key["index"]]} است. سؤال‌های حذف‌شده و چندپاسخیِ اعلام‌شده در اصلاحیهٔ نهایی وارد این مجموعه نشده‌اند. این منبع پاسخ کلیدی دارد و توضیح تشریحی تأییدشده‌ای برای این سؤال منتشر نکرده است.',
                'difficulty': 'medium', 'topic': None, 'language': 'fa', 'images': ['/question-media/' + path.name],
                'source': {'name': f'آزمون جامع {exam_title} اسفند ۱۴۰۲ — مرکز سنجش آموزش پزشکی؛ آرشیو سایت کنکور',
                    'url': ('https://konkur.in/108753' if exam == 'medical-basics' else 'https://konkur.in/108745'),
                    'license': 'حقوق منبع آزمون محفوظ', 'questionId': f'۱۴۰۲-اسفند-{n}', 'revision': sha(TEMP / filename)},
                'year': 1402, 'period': 'اسفند', 'questionNumber': n, 'sourcePage': page_index + 1,
            }
            records.append(record)
            report['medicalKeyConfidence'][record['key']] = key['margin']

native = pq.read_table(TEMP / 'persian-konkur.parquet').to_pylist()
for exam in ['tajrobi_nobat1', 'tajrobi_nobat2']:
    for number, row in enumerate([r for r in native if r['exam_name'] == exam][:155], 1):
        if row['id'] != f'{exam}_{number}':
            report['excluded']['konkur_id_mismatch'] += 1
            continue
        prompt = row['question'].strip()
        options = [str(o).strip() for o in row['choices']]
        # Import only faithfully readable records. Formula-heavy OCR and items
        # with missing/duplicate options are excluded rather than repaired by guess.
        if not prompt or len(options) != 4 or len(set(options)) != 4 or not all(options) or row['answer_key'] not in [1, 2, 3, 4] or '$' in prompt + ''.join(options):
            report['excluded']['konkur_incomplete_or_formula_ocr'] += 1
            continue
        if not re.search(r'[آ-ی]', prompt):
            report['excluded']['non_persian_question'] += 1
            continue
        subject, chapter = ('biology', 'زیست‌شناسی') if number <= 45 else ('physics', 'فیزیک') if number <= 75 else ('chemistry', 'شیمی') if number <= 110 else ('math', 'ریاضی') if number <= 140 else ('geology', 'زمین‌شناسی')
        images = []
        figure = row.get('figure')
        if figure and figure.get('bytes'):
            path = MEDIA / f'{row["id"]}.jpg'
            fitz.Pixmap(figure['bytes']).save(path, jpg_quality=90)
            images.append('/question-media/' + path.name)
        elif re.search(r'شکل (زیر|روبه|مقابل)|نمودار (زیر|مقابل)', prompt):
            report['excluded']['konkur_missing_figure'] += 1
            continue
        period = 'نوبت اول' if exam.endswith('1') else 'نوبت دوم'
        records.append({'key': row['id'], 'track': 'konkur', 'subjectId': subject, 'chapter': f'{chapter} — کنکور ۱۴۰۴',
            'prompt': prompt, 'options': options, 'correctIndex': row['answer_key'] - 1,
            'explanation': f'طبق کلید همراه دادهٔ دفترچهٔ کنکور تجربی ۱۴۰۴ ({period})، پاسخ صحیح گزینهٔ {row["answer_key"]} است. این منبع پاسخ کلیدی ارائه می‌کند؛ توضیح تشریحی تأییدشده‌ای برای این سؤال در دادهٔ منبع وجود ندارد.',
            'difficulty': 'medium', 'topic': None, 'language': 'fa', 'images': images, 'year': 1404, 'period': period, 'questionNumber': number,
            'source': {'name': f'کنکور سراسری تجربی ۱۴۰۴، {period} — دادهٔ فارسی با کلید پاسخ',
                'url': 'https://huggingface.co/datasets/PersianML/persian-konkur-1404', 'license': 'MIT',
                'questionId': row['id'], 'revision': sha(TEMP / 'persian-konkur.parquet')}})

OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf8')
report['counts'] = dict(collections.Counter(r['track'] for r in records))
report['totalNativePersian'] = len(records)
report['excluded'] = dict(report['excluded'])
(ROOT / 'content/learning/persian-import-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({'counts': report['counts'], 'total': len(records), 'excluded': report['excluded'], 'minimumKeyMargin': min(report['medicalKeyConfidence'].values())}, ensure_ascii=True, indent=2))
