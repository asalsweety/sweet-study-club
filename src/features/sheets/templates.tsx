import { BookOpen, CalendarDays, ChartColumn, CircleGauge, Coffee, Flame, Heart, Moon, Sparkles, Target, Timer, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SheetKind } from '../../shared/api/sheets'
import { Choice, Counter, Dot, fa, Line, NumberBox, Panel, Section, Stars, Tick, TickLine, useText } from './kit'

/**
 * Responsive table: a real grid with a header row on wide screens; on phones
 * every row becomes a small card and each cell shows its column name.
 */
function Grid({ columns, headers, tone = 'green', children, className }: { columns: string; headers: ReactNode[]; tone?: 'green' | 'pink'; children: ReactNode; className?: string }) {
  return (
    <div className={`sheet-grid ${className ?? ''}`} style={{ '--sheet-columns': columns } as React.CSSProperties} data-tone={tone}>
      <div className="sheet-grid-head" aria-hidden>{headers.map((header, index) => <span key={index}>{header}</span>)}</div>
      {children}
    </div>
  )
}
function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`sheet-grid-row ${className ?? ''}`}>{children}</div>
}
function Cell({ label, children, className }: { label: string; children?: ReactNode; className?: string }) {
  return <div className={`sheet-grid-cell ${className ?? ''}`} data-label={label}>{children}</div>
}

const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'] as const

/* ---------- 1. Identity & commitment ---------- */
function IdentitySheet() {
  return <>
    <Section number={1} title="شناسنامه و تعهدنامۀ من با خودم" motto="My Identity & Big Why" icon={Heart}>
      <Panel>
        <div className="sheet-form-grid">
          <Line k="name" label="نام و نام خانوادگی" />
          <Line k="field" label="پایه / رشته / دانشگاه" />
          <Line k="target" label="رتبه / معدل یا آزمون هدف" />
          <Line k="avgHours" label="میانگین ساعت مطالعۀ فعلی" placeholder="… ساعت در روز" />
          <Line k="monthGoal" label="هدف ساعت این ماه" placeholder="… ساعت" />
        </div>
        <Line k="why" label="«چرایی بزرگ من» (My Big Why)" placeholder="چرا دارم این همه تلاش می‌کنم؟ تصویر روزی که بهش می‌رسم…" multiline rows={3} />
      </Panel>
    </Section>
    <Section number={2} title="ویژن بورد و اهداف طلایی این دوره" english="Vision Board & Core Goals" icon={Target}>
      <div className="sheet-cards-3">
        {[['قاب ۱: دانشگاه / رشته / معدل رویایی من', 'عکس، استیکر یا هدفت را بنویس'], ['قاب ۲: استایل زندگی و عادت‌های جدیدم', 'روتین سالمی که می‌خواهی'], ['قاب ۳: بزرگ‌ترین ضعفی که شکستش می‌دهم', 'درس یا عادتی که این ماه نقطه‌قوتم می‌شود']].map(([title, hint], index) => (
          <Panel key={title} title={title} tone="green">
            <p className="sheet-hint">{hint}</p>
            <Line k={`vision${index}.1`} placeholder="۱." />
            <Line k={`vision${index}.2`} placeholder="۲." />
          </Panel>
        ))}
      </div>
    </Section>
    <Section number={3} title="منوی دوپامین و ریست مغز" english="Dopamine Reset Menu" motto="Neurology-Approved Breaks" icon={Coffee}>
      <div className="sheet-cards-2">
        <Panel title="ریست ۵ تا ۱۵ دقیقه‌ای بین پارت‌ها (بدون گوشی و اسکرول!)">
          <TickLine k="reset1" placeholder="نوشیدن یک لیوان آب یا دمنوش گرم کنار پنجره + ۳ نفس عمیق" />
          <TickLine k="reset2" placeholder="حرکات کششی گردن و کمر یا ۵ دقیقه راه رفتن" />
          <TickLine k="reset3" placeholder="ریست دلخواه من…" />
        </Panel>
        <Panel title="پاداش‌های من بعد از تیک زدن اهداف پایان هفته">
          <TickLine k="reward1" placeholder="۱." />
          <TickLine k="reward2" placeholder="۲." />
          <TickLine k="reward3" placeholder="۳." />
        </Panel>
      </div>
    </Section>
  </>
}

/* ---------- 2. Monthly planner ---------- */
function MonthlySheet() {
  return <>
    <aside className="sheet-guide">
      <p className="font-bold">راهنمای طلایی استفاده از پلنر Sweet Study (تقلب‌نامۀ دکتر عسل):</p>
      <ol>
        <li>قانون «۳+۱» به‌جای لیست‌های ۲۰تایی: هر شب برای فردا فقط ۱ مبحث سنگین و اصلی (اول صبح) و ۳ تسک سبک‌تر یا مروری انتخاب کن.</li>
        <li>پومودورو و باکس زمانی به‌جای ساعت خشک: هر پارت مطالعه را بر اساس تعداد پومودورو (هر دایره = ۲۵ تا ۴۵ دقیقه تمرکز خالص) رنگ کن.</li>
        <li>هماهنگی با بیولوژی: در فاز فولیکولار مباحث جدید و سنگین را بخوان، و در فاز لوتئال سراغ مرور، خلاصه‌خوانی و تست‌های سبک‌تر برو؛ بدون عذاب وجدان.</li>
        <li>همزمان با سایت: هر شب برنامه‌ات را با خودکار یا همین‌جا بنویس؛ هر روز را اجرا کن و فقط ستون درصد تست، امتیاز تمرکز و تیک انجام را پر کن!</li>
      </ol>
    </aside>
    <Section number={1} title="تقویم نمای ماهانه" english="Monthly Calendar Grid" motto="Plan Big • Stay Consistent" icon={CalendarDays}>
      <div className="sheet-calendar" role="table" aria-label="تقویم ماهانه">
        {weekdays.map((day) => <span key={day} className="sheet-calendar-head" role="columnheader">{day}</span>)}
        {Array.from({ length: 35 }, (_, index) => (
          <div key={index} className="sheet-calendar-cell" role="cell">
            <Line k={`cal${index}.day`} placeholder="/" className="sheet-calendar-day" inputMode="numeric" label={undefined} />
            <Line k={`cal${index}.note`} placeholder="" multiline rows={2} />
          </div>
        ))}
      </div>
    </Section>
    <Section number={2} title="اولویت‌ها، روزشمار آزمون‌ها و بودجه‌بندی ماه" english="Monthly Breakdown & Deadlines" motto="Goals & Exam Countdown" icon={Target}>
      <div className="sheet-cards-2">
        <Panel title="۳ هدف طلایی این ماه (Top Monthly Goals)" tone="green">
          {[1, 2, 3].map((n) => <TickLine key={n} k={`goal${n}`} placeholder={`${fa(n)}.`} />)}
          <Line k="chapters" label="فصل‌ها/مباحثی که باید تا آخر ماه جمع شوند" multiline rows={3} />
        </Panel>
        <Grid columns="2fr 1fr 1fr" headers={['روزشمار آزمون‌ها و ددلاین‌ها', 'تاریخ', 'روز باقی‌مانده']}>
          {['آزمون / کوییز ۱', 'آزمون / کوییز ۲', 'آزمون / پروژه ۳', 'آزمون جامع / پایان ترم'].map((name, index) => (
            <Row key={name}>
              <Cell label="آزمون"><Line k={`exam${index}.name`} placeholder={name} /></Cell>
              <Cell label="تاریخ"><Line k={`exam${index}.date`} placeholder="… / …" /></Cell>
              <Cell label="روز باقی‌مانده"><Line k={`exam${index}.days`} placeholder="… روز" inputMode="numeric" /></Cell>
            </Row>
          ))}
        </Grid>
      </div>
    </Section>
  </>
}

/* ---------- 3. Habits & priorities ---------- */
const habitDefaults = ['بیداری در ساعت ثابت (بدون چک کردن گوشی)', 'قانون قهوه (۹۰ دقیقه بعد بیداری + ۱ لیوان آب)', 'حذف قند مصنوعی قبل از پارت مطالعۀ سنگین', 'اجرای مرور شبانه و چرخۀ ۷-۵-۳-۲', '۱۵ دقیقه حرکت بدنی / پیاده‌روی / کشش', 'تخلیۀ مغز روی کاغذ (Brain Dump) قبل از خواب', 'ویتامین‌ها + ۸ لیوان آب روزانه', 'عادت شخصی ۱', 'عادت شخصی ۲']

function HabitsSheet() {
  return <>
    <Section number={1} title="ردیاب عادت‌های ماهانه و روتین سلامتی" english="31-Day Cherry Habit Tracker" motto="Our habits shape who we are" icon={Flame}>
      <div className="sheet-habits">
        {habitDefaults.map((habit, row) => <HabitRow key={row} row={row} placeholder={habit} />)}
      </div>
    </Section>
    <Section number={2} title="ماتریس تفکیک اولویت‌ها" english="Priority Breakdown Matrix" motto="Stop Overthinking • Start Executing" icon={Target}>
      <Grid columns="1.1fr 1fr 1fr 1fr" headers={['سطح اولویت', 'همین امروز / اول صبح (Do First)', 'برنامه‌ریزی برای فردا / این هفته', 'کارهای سبک / موقع خستگی']}>
        {[['high', 'اولویت بسیار بالا', 'مباحث امتحانی و ضرایب بالا'], ['mid', 'اولویت متوسط', 'تکالیف، تست‌های تکمیلی و مرور'], ['low', 'کارهای جانبی و شخصی', 'مرتب‌سازی جزوه و روتین‌ها']].map(([key, title, hint]) => (
          <Row key={key}>
            <Cell label="سطح اولویت" className="sheet-priority" ><b>{title}</b><small>{hint}</small></Cell>
            {['now', 'plan', 'light'].map((column) => (
              <Cell key={column} label={column === 'now' ? 'همین امروز' : column === 'plan' ? 'برای فردا / این هفته' : 'کارهای سبک'}>
                {[1, 2, 3].map((n) => <TickLine key={n} k={`m.${key}.${column}.${n}`} />)}
              </Cell>
            ))}
          </Row>
        ))}
      </Grid>
    </Section>
  </>
}

function HabitRow({ row, placeholder }: { row: number; placeholder: string }) {
  const [name] = useText(`habit${row}.name`)
  return (
    <div className="sheet-habit">
      <Line k={`habit${row}.name`} placeholder={placeholder} />
      <div className="sheet-habit-days">
        {Array.from({ length: 31 }, (_, day) => <span key={day} className="sheet-habit-day"><small aria-hidden>{fa(day + 1)}</small><Dot k={`habit${row}.d${day + 1}`} label={`${name || placeholder}، روز ${fa(day + 1)}`} /></span>)}
      </div>
    </div>
  )
}

/* ---------- 4. Weekly ---------- */
function WeeklySheet() {
  return <>
    <Section number={1} title="جدول برنامۀ ۷ روز هفته" english="Must-Do Focus + Secondary Tasks" motto="Main Focus + 3 Sub-Tasks Daily" icon={CalendarDays}>
      <Grid columns="0.8fr 1.4fr 2fr 0.8fr" tone="pink" headers={['روز هفته', '۱ کار اصلی و سنگین (Must Do #1)', '۳ کار فرعی، مروری یا تستی (To Do List)', 'ساعت / تست']}>
        {weekdays.map((day, index) => (
          <Row key={day}>
            <Cell label="روز" className="sheet-day"><b>{day}{index === 6 && ' (جبرانی/آزمون)'}</b><Line k={`w${index}.date`} placeholder="… / …" /></Cell>
            <Cell label="کار اصلی"><TickLine k={`w${index}.main`} placeholder="مهم‌ترین کار امروز" /></Cell>
            <Cell label="۳ کار فرعی">{[1, 2, 3].map((n) => <TickLine key={n} k={`w${index}.t${n}`} placeholder={index === 6 ? ['تحلیل آزمون', 'جبران عقب‌ماندگی', 'استراحت بدون عذاب وجدان'][n - 1] : `${fa(n)}.`} />)}</Cell>
            <Cell label="ساعت / تست" className="sheet-stack"><Line k={`w${index}.hours`} placeholder="… ساعت" inputMode="decimal" /><Line k={`w${index}.tests`} placeholder="… تست" inputMode="numeric" /></Cell>
          </Row>
        ))}
      </Grid>
    </Section>
    <Section number={2} title="ردیاب دروس هفته و چک‌لیست استراحت آخر هفته" english="Weekly Reset & Wins" motto="Small progress each day adds up to big results" icon={Trophy}>
      <div className="sheet-cards-3">
        <Panel title="چک‌لیست ریست جمعه (Weekly Reset)" tone="green">
          {['مرتب کردن میز تحریر و جزوه‌ها', 'بررسی مباحث عقب‌افتادۀ هفته', 'چیدن برنامۀ ۳+۱ برای هفتۀ آینده', 'زمان استراحت و مراقبت از خود (Self-care)'].map((item, index) => <Tick key={item} k={`reset${index}`}>{item}</Tick>)}
        </Panel>
        <Panel title="۳ برد و افتخار من در این هفته (Weekly Wins)" tone="green">
          {[1, 2, 3].map((n) => <Line key={n} k={`win${n}`} placeholder={`★ ${fa(n)}.`} />)}
        </Panel>
        <Panel title="تخلیۀ ذهن و آمادگی هفتۀ بعد (Next Week Prep)" tone="green">
          <Line k="nextExam" label="مهم‌ترین امتحان/کار هفتۀ بعد" />
          <Line k="change" label="تغییری که هفتۀ بعد در روتینم می‌دهم" />
        </Panel>
      </div>
    </Section>
  </>
}

/* ---------- 5. Daily ---------- */
const parts = ['پارت ۱ (صبح ۱)', 'پارت ۲ (صبح ۲)', 'پارت ۳ (ظهر)', 'پارت ۴ (عصر ۱)', 'پارت ۵ (عصر ۲)', 'پارت ۶ (شب ۱)', 'پارت ۷ (مرور شب)']

function DailySheet() {
  return <>
    <Section number={1} title="فرمول طلایی «۳+۱» امروز من" english="Today's 1+3 Rule" motto="Beat Perfection Paralysis" icon={Flame}>
      <div className="sheet-cards-2">
        <Panel title="۱ مبحث سنگین و اصلی امروز (اول صبح / اوج انرژی)">
          <TickLine k="main" placeholder="مبحث اصلی…" />
          <div className="sheet-inline">
            <Line k="main.pomodoro" label="هدف پومودورو" inputMode="numeric" />
            <Line k="main.tests" label="تست" inputMode="numeric" />
            <Line k="main.reward" label="پاداش بعد از اتمام" />
          </div>
        </Panel>
        <Panel title="۳ تسک سبک‌تر، مروری یا تستی (Secondary Priorities)">
          {[1, 2, 3].map((n) => <TickLine key={n} k={`side${n}`} placeholder={`${fa(n)}.`} />)}
        </Panel>
      </div>
    </Section>
    <Section number={2} title="جدول پارت‌بندی منعطف، پومودورو و ثبت تست" english="Flexible Study Blocks" icon={Timer}>
      <Grid columns="0.9fr 1.5fr 1.4fr 0.7fr 0.6fr 1fr" headers={['پارت درسی', 'درس و مبحث (Subject & Topic)', 'پومودوروها (هر دایره = ۲۵ تا ۴۵د)', 'تعداد تست', 'درصد (%)', 'تمرکز (۱-۵)']}>
        {parts.map((part, index) => (
          <Row key={part}>
            <Cell label="پارت" className="sheet-day"><b>{part}</b></Cell>
            <Cell label="درس و مبحث"><Line k={`p${index}.topic`} placeholder="درس / مبحث" /></Cell>
            <Cell label="پومودوروها"><Counter k={`p${index}.pomo`} count={4} label={`پومودوروهای ${part}`} /><Line k={`p${index}.hours`} placeholder="(… ساعت)" className="sheet-tiny" /></Cell>
            <Cell label="تعداد تست"><NumberBox k={`p${index}.tests`} label={`تعداد تست ${part}`} /></Cell>
            <Cell label="درصد"><NumberBox k={`p${index}.pct`} label={`درصد ${part}`} max={100} /></Cell>
            <Cell label="تمرکز"><Stars k={`p${index}.focus`} label={`تمرکز ${part}`} /></Cell>
          </Row>
        ))}
      </Grid>
    </Section>
    <Section number={3} title="ردیاب ساعت مطالعه، سلامت بدن و تخلیۀ مغز" english="Daily Ring, Self-Care & Mood" motto="Don't stop until you're proud" icon={Heart}>
      <div className="sheet-cards-2">
        <Panel title="نوار هدف مطالعۀ روزانه (Study Goal Tracker: رنگ کن!)">
          <Counter k="ring" count={10} label="ساعت مطالعۀ امروز" className="sheet-ring" renderLabel={(n) => (n === 10 ? '+۱۰h' : `${fa(n)}h`)} />
          <div className="sheet-inline">
            <Line k="totalHours" label="جمع ساعت مطالعۀ امروز" inputMode="decimal" />
            <Line k="totalTests" label="جمع کل تست" inputMode="numeric" />
          </div>
        </Panel>
        <Panel title="آب، کافئین و مود امروز (Water, Caffeine & Mood)">
          <div className="sheet-inline-row"><span className="sheet-label">۸ لیوان آب:</span><Counter k="water" count={8} shape="square" label="لیوان آب" /></div>
          <div className="sheet-inline-row"><span className="sheet-label">شات قهوه:</span><Counter k="coffee" count={3} shape="cup" label="شات قهوه" renderLabel={() => <Coffee size={14} />} /></div>
          <div className="sheet-inline-row"><span className="sheet-label">حال روحی:</span><Choice k="mood" label="حال روحی" options={[{ value: 'great', label: 'عالی 🤩' }, { value: 'good', label: 'خوب 🙂' }, { value: 'ok', label: 'معمولی 😐' }, { value: 'tired', label: 'خسته 😴' }]} /></div>
        </Panel>
      </div>
    </Section>
  </>
}

/* ---------- 6. Spaced repetition & exams ---------- */
function ExamRow({ index }: { index: number }) {
  const [total] = useNumberText(`e${index}.total`)
  const [correct] = useNumberText(`e${index}.correct`)
  const [wrong] = useNumberText(`e${index}.wrong`)
  const percent = total > 0 ? Math.round(((3 * correct - wrong) / (3 * total)) * 1000) / 10 : null
  return (
    <Row>
      <Cell label="تاریخ"><Line k={`e${index}.date`} placeholder="… / …" /></Cell>
      <Cell label="نام آزمون / درس"><Line k={`e${index}.name`} placeholder="نام آزمون / درس و مبحث" /></Cell>
      <Cell label="کل"><NumberBox k={`e${index}.total`} label="تعداد کل" /></Cell>
      <Cell label="درست"><NumberBox k={`e${index}.correct`} label="درست" /></Cell>
      <Cell label="غلط"><NumberBox k={`e${index}.wrong`} label="غلط" /></Cell>
      <Cell label="نزده"><NumberBox k={`e${index}.blank`} label="نزده" /></Cell>
      <Cell label="درصد نهایی"><output className="sheet-percent" data-sign={percent === null ? undefined : percent < 0 ? 'neg' : 'pos'}>{percent === null ? '٪ —' : `٪${fa(percent)}`}</output></Cell>
      <Cell label="علت اصلی غلط‌ها" className="sheet-reasons">
        <Tick k={`e${index}.why.science`}>علمی</Tick><Tick k={`e${index}.why.time`}>زمان</Tick><Tick k={`e${index}.why.careless`}>بی‌دقتی</Tick>
      </Cell>
    </Row>
  )
}
function useNumberText(key: string) {
  const [value] = useText(key)
  return [Number(value) || 0] as const
}

function ReviewSheet() {
  return <>
    <div className="sheet-cards-2">
      <Panel title={<><Heart size={15} />امروز به خودم افتخار می‌کنم چون… (I Am Proud Of)</>}>
        {[1, 2, 3].map((n) => <Line key={n} k={`proud${n}`} placeholder="♡" />)}
      </Panel>
      <Panel title={<><Moon size={15} />تخلیۀ مغز قبل از خواب و برنامۀ فردا (Night Brain Dump)</>}>
        <Line k="dump" label="فکری که نباید امشب مغزم رو درگیر کنه" multiline rows={2} />
        <Line k="tomorrow" label="۱ کار اصلی فردا صبح" />
      </Panel>
    </div>
    <Section number={1} title="جدول پیگیری مرورهای علمی ۷-۵-۳-۲" english="Spaced Repetition Subject Summary" motto="Encode Into Long-Term Memory" icon={BookOpen}>
      <Grid columns="1.6fr 0.8fr repeat(5, 0.55fr) 1fr" headers={['نام درس و فصل / مبحث', 'خوانش اول (تاریخ)', 'مرور ۱ (روز ۲)', 'مرور ۲ (روز ۳+تست)', 'مرور ۳ (روز ۵)', 'مرور ۴ (روز ۷)', 'مرور ماهانه', 'سطح تسلط']}>
        {Array.from({ length: 7 }, (_, index) => (
          <Row key={index}>
            <Cell label="درس و مبحث"><Line k={`r${index}.topic`} placeholder={`${fa(index + 1)}. نام درس و فصل`} /></Cell>
            <Cell label="خوانش اول"><Line k={`r${index}.first`} placeholder="… / …" /></Cell>
            {['مرور ۱', 'مرور ۲', 'مرور ۳', 'مرور ۴', 'مرور ماهانه'].map((label, review) => <Cell key={label} label={label} className="sheet-center"><Tick k={`r${index}.rev${review + 1}`} label={label} /></Cell>)}
            <Cell label="سطح تسلط"><Stars k={`r${index}.mastery`} label="سطح تسلط" /></Cell>
          </Row>
        ))}
      </Grid>
    </Section>
    <Section number={2} title="بانک تحلیل آزمون و محاسبۀ درصد با نمرۀ منفی" english="Exam & Test Percentage Tracker" motto="Formula: [(3 × Correct) − Wrong] ÷ (3 × Total) × 100" icon={ChartColumn}>
      <Grid columns="0.7fr 1.6fr repeat(4, 0.5fr) 0.75fr 1.3fr" tone="pink" headers={['تاریخ', 'نام آزمون / درس و مبحث تستی', 'کل', 'درست', 'غلط', 'نزده', 'درصد نهایی', 'علت اصلی غلط‌ها (تحلیل)']}>
        {Array.from({ length: 6 }, (_, index) => <ExamRow key={index} index={index} />)}
      </Grid>
      <p className="sheet-hint">درصد به‌طور خودکار با نمرۀ منفی حساب می‌شود.</p>
    </Section>
    <aside className="sheet-guide is-tip"><Sparkles size={16} /> یادآوری مهندسی معکوس سر کلاس و مطالعه: قبل از شروع هر فصل جدید، ۵ دقیقه سؤالات پایان فصل یا تست‌های سال‌های قبل آن مبحث را نگاه کن تا مغزت بداند دنبال شکار کدام نکات کلیدی است!</aside>
  </>
}

/* ---------- 7. Chapter summary & closing ---------- */
function ChapterSheet() {
  return <>
    <Section number={1} title="قالب خلاصه‌نویسی فصل به روش مهندسی معکوس" english="Chapter Summary & Key Questions" motto="Active Recall & Cornell Synthesis" icon={BookOpen}>
      <div className="sheet-cornell">
        <Panel title="سؤالات پرتکرار، دام‌های تستی و کلیدواژه‌ها">
          <Line k="q1" label="سؤال کلیدی ۱" multiline rows={2} />
          <Line k="q2" label="سؤال کلیدی ۲" multiline rows={2} />
          <Line k="trap" label="دام پرتکرار آزمون" multiline rows={2} />
          <Line k="mnemonic" label="کد رمز / یادیار (Mnemonic)" multiline rows={2} />
        </Panel>
        <Panel title="نقشۀ ذهنی، فرمول‌ها و نکات طلایی استاد / رفرنس (Mind Map & Core Notes)">
          <Line k="notes" placeholder="نکته‌ها، فرمول‌ها و نقشۀ ذهنی این فصل را اینجا بنویس…" multiline rows={14} maxLength={1500} />
        </Panel>
      </div>
    </Section>
    <Section number={2} title="کارنامۀ پایانی دوره و Study DNA من" english="End-of-Cycle Reflection & Achievements" motto="Look how far you've come!" icon={Trophy}>
      <div className="sheet-stats">
        <Panel title={<><Timer size={14} />کل ساعت مطالعۀ این دوره</>} tone="green"><Line k="statHours" placeholder="… ساعت" inputMode="decimal" /></Panel>
        <Panel title={<><BookOpen size={14} />کل تست‌ها / نمونه‌سؤالات</>} tone="green"><Line k="statTests" placeholder="… تست" inputMode="numeric" /></Panel>
        <Panel title={<><Flame size={14} />طولانی‌ترین زنجیره (Streak)</>} tone="green"><Line k="statStreak" placeholder="… روز متوالی" inputMode="numeric" /></Panel>
        <Panel title={<><Sparkles size={14} />قوی‌ترین درس این ماه من</>} tone="green"><Line k="statBest" placeholder="…" /></Panel>
      </div>
      <div className="sheet-cards-2">
        <Panel title="نامه به خودِ آینده‌ام (Letter to Future Me)">
          <Line k="letter" placeholder="خودِ عزیزم که داری در پایان این دوره این متن رو می‌خونی، می‌خوام بهت بگم ممنونم که وسط روزهای خستگی و بارونی جا نزدی و ادامه دادی…" multiline rows={6} maxLength={1200} />
        </Panel>
        <Panel title="۳ درس بزرگی که در این دوره از خودم یاد گرفتم">
          <Line k="lesson1" label="۱. بهترین ساعت تمرکز مغز من" />
          <Line k="lesson2" label="۲. عاملی که بیشترین حواس‌پرتی رو داشت و حذفش کردم" />
          <Line k="lesson3" label="۳. جمله‌ای که برای ماه بعد به خودم هدیه می‌دم" />
        </Panel>
      </div>
    </Section>
    <aside className="sheet-guide is-closing">
      <img src="/images/asal-helper-greeting.webp" alt="" width={72} height={72} loading="lazy" />
      <div><p className="font-bold">پایان یک فصل، شروع یک موفقیت بزرگ‌تر در Sweet Study!</p><p>برای ورود به اتاق تمرکز، محاسبۀ آنلاین درصدها و دریافت برنامۀ دورۀ بعدی، همین‌جا در Sweet Study ادامه بده. بهت افتخار می‌کنم! — دکتر عسل</p></div>
    </aside>
  </>
}

type Template = {
  english: string
  subtitle: string
  description: string
  meta: { key: string; label: string; placeholder?: string }[]
  rating?: boolean
  Body: () => ReactNode
  icon: typeof Heart
}

export const templates: Record<SheetKind, Template> = {
  identity: { english: 'SWEET STUDY × DR. ASAL', subtitle: 'سیستم برنامه‌ریزی علمی و استراتژیک', description: 'چرایی بزرگ، ویژن بورد و منوی ریست مغز', meta: [{ key: 'start', label: 'شروع دوره' }, { key: 'goal', label: 'هدف اصلی' }], Body: IdentitySheet, icon: Heart },
  monthly: { english: 'SWEET STUDY PLANNER', subtitle: 'نمای کلی ماه و بودجه‌بندی', description: 'تقویم ماه، اهداف طلایی و روزشمار آزمون‌ها', meta: [{ key: 'month', label: 'ماه' }, { key: 'year', label: 'سال' }], Body: MonthlySheet, icon: CalendarDays },
  habits: { english: 'CHERRY HABITS & PRIORITIES', subtitle: 'زنجیرۀ استمرار و اولویت‌بندی', description: 'ردیاب ۳۱ روزۀ عادت‌ها و ماتریس اولویت‌ها', meta: [{ key: 'month', label: 'ماه' }, { key: 'chain', label: 'زنجیرۀ هدف', placeholder: '… روز' }], Body: HabitsSheet, icon: Flame },
  weekly: { english: 'SWEET STUDY WEEKLY', subtitle: 'Plan it. Perfect it. Do it.', description: 'کار اصلی و ۳ کار فرعی هر روز، بردها و ریست هفته', meta: [{ key: 'from', label: 'هفته از تاریخ', placeholder: '… / …' }, { key: 'to', label: 'تا تاریخ', placeholder: '… / …' }], Body: WeeklySheet, icon: CalendarDays },
  daily: { english: 'DAILY SWEET STUDY', subtitle: 'Small progress is still progress ♡', description: 'قانون ۳+۱، پارت‌ها و پومودورو، آب و مود امروز', meta: [{ key: 'date', label: 'تاریخ', placeholder: '… / … / ۱۴۰۵' }, { key: 'weekday', label: 'روز' }], Body: DailySheet, icon: CircleGauge },
  review: { english: 'SPACED REPETITION & EXAMS', subtitle: 'حافظۀ بلندمدت و مهندسی تست', description: 'مرورهای ۷-۵-۳-۲ و تحلیل آزمون با درصد خودکار', meta: [{ key: 'subject', label: 'درس / ترم' }, { key: 'mastery', label: 'هدف تسلط', placeholder: '٪۱۰۰' }], Body: ReviewSheet, icon: ChartColumn },
  chapter: { english: 'CHAPTER SUMMARY & CLOSING', subtitle: 'خلاصه‌نویسی و کارنامۀ افتخارات', description: 'خلاصۀ فصل، کارنامۀ دوره و نامه به خودِ آینده', meta: [{ key: 'chapter', label: 'فصل / دوره' }], rating: true, Body: ChapterSheet, icon: BookOpen },
}

/** Header card shared by every sheet, so all pages look like one set. */
export function SheetHeader({ kind }: { kind: SheetKind }) {
  const template = templates[kind]
  return (
    <header className="sheet-header">
      <div className="sheet-brand">
        <img src="/icons/icon-192.png" alt="" width={48} height={48} />
        <div><p className="sheet-brand-title" dir="ltr">{template.english}</p><p className="sheet-brand-sub">{template.subtitle}</p></div>
      </div>
      <div className="sheet-meta">
        {template.meta.map((field) => <Line key={field.key} k={`meta.${field.key}`} label={field.label} placeholder={field.placeholder ?? '…………'} />)}
        {template.rating && <div className="sheet-field sheet-field-labelled"><span className="sheet-label">امتیاز کلی</span><Stars k="meta.rating" label="امتیاز کلی" /></div>}
      </div>
    </header>
  )
}

