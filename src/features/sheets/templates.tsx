import { BookOpen, CalendarDays, ChartColumn, CircleGauge, Clock, Coffee, Flame, Heart, Moon, Sparkles, Target, Timer, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import AsalMood from '../../components/AsalMood'
import type { SheetKind } from '../../shared/api/sheets'
import { cn } from '../../shared/lib/utils'
import { Counter, Dot, fa, HeartTick, Line, NumberBox, Panel, Section, Stars, Sticker, Tick, TickLine, useIsPhone, useText } from './kit'

/**
 * Responsive table: a real grid with a header row on wide screens; on phones
 * every row becomes a small card whose first cell is the card's title strip.
 */
function Grid({ columns, headers, tone = 'green', children, className }: { columns: string; headers: ReactNode[]; tone?: 'green' | 'pink'; children: ReactNode; className?: string }) {
  return (
    <div className={cn('sheet-grid', className)} style={{ '--sheet-columns': columns } as React.CSSProperties} data-tone={tone}>
      <div className="sheet-grid-head" aria-hidden>{headers.map((header, index) => <span key={index}>{header}</span>)}</div>
      {children}
    </div>
  )
}
function Row({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return <div className={cn('sheet-grid-row', className)}>{children}</div>
}
function Cell({ label, children, className }: { label: string; children?: ReactNode; className?: string }) {
  return <div className={cn('sheet-grid-cell', className)} data-label={label}>{children}</div>
}

const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'] as const
const weekdaysEnglish = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

/** Phone-only pill row for picking one day, part or item at a time. */
function Pager({ items, active, onChange, label }: { items: readonly string[]; active: number; onChange: (index: number) => void; label: string }) {
  return (
    <div className="sheet-pager" role="tablist" aria-label={label}>
      {items.map((item, index) => <button key={item} type="button" role="tab" aria-selected={index === active} onClick={() => onChange(index)}>{item}</button>)}
    </div>
  )
}

/* ---------- 1. Identity & commitment ---------- */
function IdentitySheet() {
  return <>
    <Section number={1} title="شناسنامه و تعهدنامۀ من با خودم" motto="My Identity & Big Why" icon={Heart}>
      <div className="sheet-idtable">
        <span className="sheet-idlabel">نام و نام خانوادگی:</span><Line k="name" placeholder="…………………" />
        <span className="sheet-idlabel">پایه / رشته / دانشگاه:</span><Line k="field" placeholder="…………………" />
        <span className="sheet-idlabel">رتبه / معدل یا آزمون هدف:</span><Line k="target" placeholder="…………………" />
        <span className="sheet-idlabel">میانگین ساعت مطالعۀ فعلی:</span>
        <span className="sheet-idpair"><Line k="avgHours" placeholder="… ساعت در روز" /><Line k="monthGoal" placeholder="هدف این ماه: … ساعت" /></span>
        <span className="sheet-idlabel">«چرایی بزرگ من» <small dir="ltr">(My Big Why)</small></span>
        <span className="sheet-idwide"><Line k="why" placeholder="چرا دارم این همه تلاش می‌کنم؟ (تصویر روزی که بهش می‌رسم):" multiline rows={2} /><Sticker name="cute-bee-1" className="sheet-corner-sticker" /></span>
      </div>
    </Section>
    <Section number={2} title="ویژن بورد و اهداف طلایی این دوره" english="Vision Board & Core Goals" icon={Target}>
      <div className="sheet-cards-3">
        {([['قاب ۱: دانشگاه / رشته / معدل رویایی من', '(محل چسباندن عکس پولاروید، استیکر یا نوشتن هدف!)', 'cute-bee-12', 'cute-heart-1'], ['قاب ۲: استایل زندگی و عادت‌های جدیدم', '(محل چسباندن عکس یا نوشتن روتین سالم)', 'cute-bee-5', 'cute-heart-5'], ['قاب ۳: بزرگ‌ترین ضعفی که شکستش میدم', '(درس یا عادتی که این ماه قراره نقطه‌قوتم بشه)', 'cute-bee-3', 'cute-heart-3']] as const).map(([title, hint, bee, heart], index) => (
          <Panel key={title} title={<><Sticker name={bee} size={24} />{title}</>} tone="green">
            <p className="sheet-hint sheet-hint-sticker"><Sticker name={heart} size={26} />{hint}</p>
            <Line k={`vision${index}.1`} placeholder="۱." />
            <Line k={`vision${index}.2`} placeholder="۲." />
          </Panel>
        ))}
      </div>
    </Section>
    <Section number={3} title="منوی دوپامین و ریست مغز" english="Dopamine Reset Menu" motto="Neurology-Approved Breaks" icon={Coffee}>
      <div className="sheet-cards-2 is-wide-first">
        <Panel title={<><Coffee size={15} />ریست ۵ تا ۱۵ دقیقه‌ای بین پارت‌ها (بدون گوشی و اسکرول!)</>}>
          <TickLine k="reset1" fallback="نوشیدن یک لیوان آب یا دمنوش گرم کنار پنجره + ۳ نفس عمیق شکمی" />
          <TickLine k="reset2" fallback="حرکات کششی گردن و کمر یا ۵ دقیقه راه رفتن در اتاق" />
          <TickLine k="reset3" placeholder="…………………" />
        </Panel>
        <Panel title={<><Trophy size={15} />پاداش‌های من بعد از تیک زدن اهداف پایان هفته</>}>
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
  const phone = useIsPhone()
  return <>
    <aside className="sheet-guide">
      <p className="font-bold">راهنمای طلایی استفاده از پلنر Sweet Study (تقلب‌نامۀ دکتر عسل):</p>
      <ol>
        <li>قانون «۳+۱» به‌جای لیست‌های ۲۰تایی: مغز کمال‌گرا از لیست‌های شلوغ می‌ترسد! هر شب برای فردایت فقط ۱ مبحث سنگین و اصلی (اول صبح) و ۳ تسک سبک‌تر یا مروری انتخاب کن.</li>
        <li>پومودورو و باکس زمانی به‌جای ساعت خشک: هرگز ننویس «ساعت ۸:۰۰ تا ۱۰:۰۰» که اگر ۸:۱۵ بیدار شدی کل روزت بسوزد! هر پارت مطالعه را بر اساس تعداد پومودورو (هر دایره = ۲۵ تا ۴۵ دقیقه تمرکز خالص) رنگ کن.</li>
        <li>هماهنگی با بیولوژی و چرخۀ ۲۸ روزه: در فاز فولیکولار و تخمک‌گذاری مباحث جدید و سنگین را بخوان، و در فاز لوتئال و قاعدگی سراغ مرور، خلاصه‌خوانی و تست‌های سبک‌تر برو بدون اینکه به خودت عذاب وجدان بدهی.</li>
        <li>استفادۀ همزمان در سایت و نسخۀ چاپی: اگر نسخۀ خام را داری، هر شب برنامه‌ات را با خودکار بنویس؛ اگر نسخۀ برنامه‌ریزی‌شده (VIP) را سفارش داده‌ای، مباحث هر روز را اجرا کن و فقط ستون درصد تست، امتیاز تمرکز و تیک انجام را پر کن!</li>
      </ol>
    </aside>
    <Section number={1} title="تقویم نمای ماهانه" english="Monthly Calendar Grid" motto="Plan Big • Stay Consistent" icon={CalendarDays}>
      {phone ? <PhoneCalendar /> : (
        <div className="sheet-calendar" role="table" aria-label="تقویم ماهانه">
          {weekdays.map((day, index) => <span key={day} className="sheet-calendar-head" role="columnheader">{day} <span dir="ltr">({weekdaysEnglish[index]})</span></span>)}
          {Array.from({ length: 35 }, (_, index) => (
            <div key={index} className="sheet-calendar-cell" role="cell">
              <Line k={`cal${index}.day`} placeholder="/" className="sheet-calendar-day" inputMode="numeric" />
              <Line k={`cal${index}.note`} multiline rows={2} label={undefined} placeholder="" />
            </div>
          ))}
        </div>
      )}
    </Section>
    <Section number={2} title="اولویت‌ها، روزشمار آزمون‌ها و بودجه‌بندی ماه" english="Monthly Breakdown & Deadlines" motto="Goals & Exam Countdown" icon={Target}>
      <Grid columns="1.6fr 1.5fr 0.8fr 0.8fr" headers={['۳ هدف طلایی این ماه (Top Monthly Goals)', 'روزشمار آزمون‌ها و ددلاین‌ها (Exam Countdown)', 'تاریخ', 'روز باقی‌مانده']}>
        {['آزمون / کوییز ۱:', 'آزمون / کوییز ۲:', 'آزمون / پروژه ۳:', 'آزمون جامع / پایان ترم:'].map((exam, index) => (
          <Row key={exam} className={index === 3 ? 'is-tall' : undefined}>
            <Cell label="هدف طلایی">
              {index < 3
                ? <span className="sheet-goal"><span className="sheet-goal-number">{fa(index + 1)}.</span><Line k={`goal${index + 1}.text`} placeholder="…………………" /><HeartTick k={`goal${index + 1}.done`} label={`هدف ${fa(index + 1)} انجام شد`} tone={index === 1 ? 'green' : 'pink'} /></span>
                : <Line k="chapters" label="فصل‌ها/مباحثی که باید تا آخر ماه جمع شوند:" multiline rows={3} />}
            </Cell>
            <Cell label="آزمون / ددلاین"><Line k={`exam${index}.name`} label={exam} placeholder="…………" /></Cell>
            <Cell label="تاریخ"><Line k={`exam${index}.date`} placeholder="… / …" /></Cell>
            <Cell label="روز باقی‌مانده"><Line k={`exam${index}.days`} placeholder="…… روز" inputMode="numeric" /></Cell>
          </Row>
        ))}
      </Grid>
    </Section>
  </>
}

/** Phones: a compact month of day squares, with the picked day's note below. */
function PhoneCalendar() {
  const [active, setActive] = useState(0)
  return (
    <div className="sheet-phone-calendar">
      <div className="sheet-calendar is-compact" role="grid" aria-label="تقویم ماهانه">
        {weekdays.map((day) => <span key={day} className="sheet-calendar-head" role="columnheader">{day.slice(0, 1)}</span>)}
        {Array.from({ length: 35 }, (_, index) => <CalendarSquare key={index} index={index} active={index === active} onPick={() => setActive(index)} />)}
      </div>
      <Panel title={<>{weekdays[active % 7]} · خانۀ {fa(active + 1)}</>} className="sheet-calendar-editor">
        <Line k={`cal${active}.day`} label="تاریخ" placeholder="/" inputMode="numeric" />
        <Line k={`cal${active}.note`} label="برنامه یا یادداشت این روز" multiline rows={3} />
      </Panel>
    </div>
  )
}
function CalendarSquare({ index, active, onPick }: { index: number; active: boolean; onPick: () => void }) {
  const [day] = useText(`cal${index}.day`)
  const [note] = useText(`cal${index}.note`)
  return (
    <button type="button" role="gridcell" aria-selected={active} aria-label={`خانۀ ${fa(index + 1)}${day ? `، تاریخ ${day}` : ''}${note ? '، یادداشت دارد' : ''}`} className={cn('sheet-calendar-square', active && 'is-active', note && 'has-note')} onClick={onPick}>
      {day || '/'}
    </button>
  )
}

/* ---------- 3. Habits & priorities ---------- */
const habitDefaults = ['بیداری در ساعت ثابت (بدون چک کردن گوشی)', 'قانون قهوه (۹۰ دقیقه بعد بیداری + ۱ لیوان آب)', 'حذف قند مصنوعی قبل از پارت مطالعۀ سنگین', 'اجرای مرور شبانه و چرخۀ ۷-۵-۳-۲', '۱۵ دقیقه حرکت بدنی / پیاده‌روی / کشش', 'تخلیۀ مغز روی کاغذ (Brain Dump قبل از خواب)', 'ویتامین‌ها + ۸ لیوان آب روزانه', '', '']
const firstHalf = Array.from({ length: 15 }, (_, i) => i + 1)
const secondHalf = Array.from({ length: 16 }, (_, i) => i + 16)

function HabitsSheet() {
  return <>
    <Section number={1} title="ردیاب عادت‌های ماهانه و روتین سلامتی" english="31-Day Cherry Habit Tracker" motto={'"Our habits shape who we are"'} icon={Flame}>
      <div className="sheet-habits">
        <div className="sheet-habits-head" aria-hidden>
          <span>عادت روزانه / روتین علمی من</span><span>نیمۀ اول ماه (روز ۱ تا ۱۵)</span><span>نیمۀ دوم ماه (روز ۱۶ تا ۳۱)</span>
        </div>
        <div className="sheet-habits-numbers" aria-hidden>
          <span />
          <span>{firstHalf.map((day) => <b key={day}>{fa(day)}</b>)}</span>
          <span>{secondHalf.map((day) => <b key={day}>{fa(day)}</b>)}</span>
        </div>
        {habitDefaults.map((habit, row) => <HabitRow key={row} row={row} fallback={habit} />)}
      </div>
    </Section>
    <Section number={2} title="ماتریس تفکیک اولویت‌ها" english="Priority Breakdown Matrix" motto="Stop Overthinking • Start Executing" icon={Target}>
      <Grid columns="1.1fr 1fr 1fr 1fr" headers={['سطح اولویت', 'همین امروز / اول صبح (Do First)', 'برنامه‌ریزی برای فردا / این هفته (Schedule)', 'کارهای سبک / موقع خستگی (Low Energy)']}>
        {([['high', 'اولویت بسیار بالا', '(مباحث امتحانی و ضرایب بالا)', 3], ['mid', 'اولویت متوسط', '(تکالیف، تست‌های تکمیلی و مرور)', 3], ['low', 'کارهای جانبی و شخصی', '(مرتب‌سازی جزوه و روتین‌ها)', 2]] as const).map(([key, title, hint, count]) => (
          <Row key={key}>
            <Cell label="سطح اولویت" className="sheet-priority" ><span className="sheet-priority-dot" data-level={key} aria-hidden /><span><b>{title}</b><small>{hint}</small></span></Cell>
            {(['now', 'plan', 'light'] as const).map((column) => (
              <Cell key={column} label={column === 'now' ? 'همین امروز (Do First)' : column === 'plan' ? 'برای فردا / این هفته' : 'کارهای سبک / موقع خستگی'}>
                {Array.from({ length: count }, (_, n) => <TickLine key={n} k={`m.${key}.${column}.${n + 1}`} />)}
              </Cell>
            ))}
          </Row>
        ))}
      </Grid>
    </Section>
  </>
}

function HabitRow({ row, fallback }: { row: number; fallback: string }) {
  const [name] = useText(`habit${row}.name`)
  const label = name || fallback || `عادت شخصی ${fa(row - 6)}`
  return (
    <div className="sheet-habit">
      <Line k={`habit${row}.name`} fallback={fallback} placeholder={`عادت شخصی ${fa(row - 6)}: …………`} />
      {[firstHalf, secondHalf].map((days, half) => (
        <div key={half} className="sheet-habit-days" data-half={half === 0 ? '۱ تا ۱۵' : '۱۶ تا ۳۱'}>
          {days.map((day) => <span key={day} className="sheet-habit-day"><small aria-hidden>{fa(day)}</small><Dot k={`habit${row}.d${day}`} label={`${label}، روز ${fa(day)}`} /></span>)}
        </div>
      ))}
    </div>
  )
}

/* ---------- 4. Weekly ---------- */
function WeekDayRow({ index }: { index: number }) {
  const day = weekdays[index]!
  const friday = index === 6
  return (
    <Row>
      <Cell label="روز هفته" className="sheet-day"><b>{day}{friday && <small> (جبرانی/آزمون)</small>}</b><Line k={`w${index}.date`} placeholder="…. / …." /></Cell>
      <Cell label="۱ کار اصلی و سنگین (Must Do #1)" className="sheet-mustdo"><TickLine k={`w${index}.main`} placeholder="کار اصلی و سنگین امروز" /></Cell>
      <Cell label="۳ کار فرعی، مروری یا تستی">{[1, 2, 3].map((n) => <TickLine key={n} k={`w${index}.t${n}`} {...(friday ? { fallback: ['تحلیل آزمون', 'جبران عقب‌ماندگی', 'استراحت بدون عذاب وجدان'][n - 1]! } : { placeholder: `${fa(n)}. …………` })} />)}</Cell>
      <Cell label="ساعت / تست" className="sheet-stack"><Line k={`w${index}.hours`} placeholder="….. ساعت" inputMode="decimal" /><Line k={`w${index}.tests`} placeholder="….. تست" inputMode="numeric" /></Cell>
    </Row>
  )
}

function WeeklySheet() {
  const phone = useIsPhone()
  const today = (new Date().getDay() + 1) % 7
  const [day, setDay] = useState(today)
  return <>
    <Section number={1} title="جدول برنامۀ ۷ روز هفته" english="Must-Do Focus + Secondary Tasks" motto="Main Focus + 3 Sub-Tasks Daily" icon={CalendarDays}>
      {phone && <Pager items={weekdays} active={day} onChange={setDay} label="روز هفته" />}
      <Grid columns="0.8fr 1.3fr 2.1fr 0.8fr" tone="pink" className="sheet-weekly" headers={['روز هفته', '۱ کار اصلی و سنگین (Must Do #1)', '۳ کار فرعی، مروری یا تستی (To Do List)', 'ساعت / تست']}>
        {phone ? <WeekDayRow index={day} /> : weekdays.map((name, index) => <WeekDayRow key={name} index={index} />)}
      </Grid>
    </Section>
    <Section number={2} title="ردیاب دروس هفته و چک‌لیست استراحت آخر هفته" english="Weekly Reset & Wins" motto="Small progress each day adds up to big results" icon={Trophy}>
      <div className="sheet-cards-3">
        <Panel title="چک‌لیست ریست جمعه (Weekly Reset)" tone="green">
          {['مرتب کردن میز تحریر و جزوه‌ها', 'بررسی مباحث عقب‌افتادۀ هفته', 'چیدن برنامۀ ۳+۱ برای هفتۀ آینده', 'زمان استراحت و مراقبت از خود (Self-care)'].map((item, index) => <Tick key={item} k={`reset${index}`}>{item}</Tick>)}
        </Panel>
        <Panel title="۳ برد و افتخار من در این هفته (Weekly Wins)" tone="green">
          {[1, 2, 3].map((n) => <span key={n} className="sheet-win"><b aria-hidden>★ {fa(n)}.</b><Line k={`win${n}`} placeholder="…………" /></span>)}
        </Panel>
        <Panel title="تخلیۀ ذهن و آمادگی هفتۀ بعد (Next Week Prep)" tone="green">
          <Line k="nextExam" label="• مهم‌ترین امتحان/کار هفتۀ بعد:" />
          <Line k="change" label="• تغییری که هفتۀ بعد در روتینم می‌دهم:" />
          <Sticker name="cute-bee-7" size={34} className="sheet-corner-sticker" />
        </Panel>
      </div>
    </Section>
  </>
}

/* ---------- 5. Daily ---------- */
const parts = ['پارت ۱ (صبح ۱)', 'پارت ۲ (صبح ۲)', 'پارت ۳ (ظهر)', 'پارت ۴ (عصر ۱)', 'پارت ۵ (عصر ۲)', 'پارت ۶ (شب ۱)', 'پارت ۷ (مرور شب)']
const moods = [{ value: 'great', label: 'عالی', rating: 5 }, { value: 'good', label: 'خوب', rating: 4 }, { value: 'ok', label: 'معمولی', rating: 3 }, { value: 'tired', label: 'خسته', rating: 1 }] as const

function PartRow({ index }: { index: number }) {
  const part = parts[index]!
  return (
    <Row>
      <Cell label="پارت درسی" className="sheet-day"><b>{part}</b></Cell>
      <Cell label="درس و مبحث (Subject & Topic)"><Line k={`p${index}.topic`} placeholder="درس / مبحث" /></Cell>
      <Cell label="پومودوروها (هر دایره = ۲۵ تا ۴۵د)" className="sheet-pomo"><Counter k={`p${index}.pomo`} count={4} label={`پومودوروهای ${part}`} /><Line k={`p${index}.hours`} placeholder="(….. ساعت)" className="sheet-tiny" /></Cell>
      <Cell label="تعداد تست"><NumberBox k={`p${index}.tests`} label={`تعداد تست ${part}`} /></Cell>
      <Cell label="درصد (%)"><NumberBox k={`p${index}.pct`} label={`درصد ${part}`} max={100} /></Cell>
      <Cell label="تمرکز (۱-۵)"><Stars k={`p${index}.focus`} label={`تمرکز ${part}`} /></Cell>
    </Row>
  )
}

function DailySheet() {
  const phone = useIsPhone()
  const [part, setPart] = useState(0)
  const [mood, setMood] = useText('mood')
  return <>
    <Section number={1} title="فرمول طلایی «۳+۱» امروز من" english="Today's 1+3 Rule" motto="Beat Perfection Paralysis" icon={Flame}>
      <div className="sheet-cards-2">
        <Panel title={<><Flame size={15} />۱ مبحث سنگین و اصلی امروز (اول صبح / اوج انرژی)</>}>
          <TickLine k="main" placeholder="مبحث اصلی: …………" />
          <p className="sheet-goal-line">
            <span>هدف:</span><NumberBox k="main.pomodoro" label="هدف پومودورو" /><span>پومودورو |</span><NumberBox k="main.tests" label="هدف تست" /><span>تست |</span>
            <Line k="main.reward" label="پاداش بعد از اتمام:" placeholder="…………" />
          </p>
        </Panel>
        <Panel title={<><Sparkles size={15} />۳ تسک سبک‌تر، مروری یا تستی (Secondary Priorities)</>}>
          {[1, 2, 3].map((n) => <TickLine key={n} k={`side${n}`} placeholder={`${fa(n)}. …………`} />)}
        </Panel>
      </div>
    </Section>
    <Section number={2} title="جدول پارت‌بندی منعطف، پومودورو و ثبت تست" english="Flexible Study Blocks" icon={Timer}>
      {phone && <Pager items={parts.map((name) => name.replace(/ \(.*\)/, ''))} active={part} onChange={setPart} label="پارت درسی" />}
      <Grid columns="0.95fr 1.5fr 1.4fr 0.65fr 0.6fr 1fr" headers={['پارت درسی', 'درس و مبحث (Subject & Topic)', 'پومودوروها (هر دایره = ۲۵ تا ۴۵د)', 'تعداد تست', 'درصد (%)', 'تمرکز (۱-۵)']}>
        {phone ? <PartRow index={part} /> : parts.map((name, index) => <PartRow key={name} index={index} />)}
      </Grid>
    </Section>
    <Section number={3} title="ردیاب ساعت مطالعه، سلامت بدن و تخلیۀ مغز" english="Daily Ring, Self-Care & Mood" motto="Don't stop until you're proud" icon={Heart}>
      <div className="sheet-cards-2">
        <Panel title="نوار هدف مطالعۀ روزانه (Study Goal Tracker: رنگ کن!)">
          <Counter k="ring" count={10} label="ساعت مطالعۀ امروز" className="sheet-ring" renderLabel={(n) => (n === 10 ? '+۱۰h' : `${fa(n)}h`)} />
          <p className="sheet-goal-line"><span>جمع ساعت مطالعۀ امروز:</span><NumberBox k="totalHours" label="جمع ساعت مطالعۀ امروز" max={24} /><span>ساعت | جمع کل تست:</span><NumberBox k="totalTests" label="جمع کل تست" /><span>تست</span></p>
        </Panel>
        <Panel title="آب، کافئین و مود امروز (Water, Caffeine & Mood)">
          <div className="sheet-inline-row"><span className="sheet-label">۸ لیوان آب:</span><Counter k="water" count={8} shape="square" label="لیوان آب" /></div>
          <div className="sheet-inline-row"><span className="sheet-label">شات قهوه:</span><Counter k="coffee" count={2} shape="cup" label="شات قهوه" renderLabel={() => <Coffee size={15} />} /></div>
          <div className="sheet-inline-row">
            <span className="sheet-label">حال روحی:</span>
            <span className="sheet-moods" role="radiogroup" aria-label="حال روحی">
              {moods.map((option) => (
                <button key={option.value} type="button" role="radio" aria-checked={mood === option.value} className={cn(mood === option.value && 'is-on')} onClick={() => setMood(mood === option.value ? '' : option.value)}>
                  <AsalMood rating={option.rating} label={false} className="sheet-mood-face" />{option.label}
                </button>
              ))}
            </span>
          </div>
        </Panel>
      </div>
    </Section>
  </>
}

/* ---------- 6. Spaced repetition & exams ---------- */
const toNumber = (value: string) => Number(value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))) || 0

function ExamRow({ index }: { index: number }) {
  const [total] = useText(`e${index}.total`)
  const [correct] = useText(`e${index}.correct`)
  const [wrong] = useText(`e${index}.wrong`)
  const all = toNumber(total)
  const percent = all > 0 ? Math.round(((3 * toNumber(correct) - toNumber(wrong)) / (3 * all)) * 1000) / 10 : null
  return (
    <Row>
      <Cell label="تاریخ"><Line k={`e${index}.date`} placeholder="… / …" /></Cell>
      <Cell label="نام آزمون / درس و مبحث تستی"><Line k={`e${index}.name`} placeholder="نام آزمون / درس و مبحث" /></Cell>
      <Cell label="کل"><NumberBox k={`e${index}.total`} label="تعداد کل" /></Cell>
      <Cell label="درست"><NumberBox k={`e${index}.correct`} label="درست" /></Cell>
      <Cell label="غلط"><NumberBox k={`e${index}.wrong`} label="غلط" /></Cell>
      <Cell label="نزده"><NumberBox k={`e${index}.blank`} label="نزده" /></Cell>
      <Cell label="درصد نهایی"><output className="sheet-percent" data-sign={percent === null ? undefined : percent < 0 ? 'neg' : 'pos'}>{percent === null ? '%' : `٪${fa(percent)}`}</output></Cell>
      <Cell label="علت اصلی غلط‌ها (تحلیل)" className="sheet-reasons">
        <Tick k={`e${index}.why.science`}>علمی</Tick><Tick k={`e${index}.why.time`}>زمان</Tick><Tick k={`e${index}.why.careless`}>بی‌دقتی</Tick>
      </Cell>
    </Row>
  )
}

function ReviewRow({ index }: { index: number }) {
  return (
    <Row>
      <Cell label="نام درس و فصل / مبحث"><span className="sheet-goal"><span className="sheet-goal-number">{fa(index + 1)}.</span><Line k={`r${index}.topic`} placeholder="…………" /></span></Cell>
      <Cell label="خوانش اول (تاریخ)"><Line k={`r${index}.first`} placeholder="/" /></Cell>
      {['مرور ۱ (روز ۲)', 'مرور ۲ (روز ۳+تست)', 'مرور ۳ (روز ۵)', 'مرور ۴ (روز ۷)', 'مرور ماهانه'].map((label, review) => <Cell key={label} label={label} className="sheet-center"><Tick k={`r${index}.rev${review + 1}`} label={label} /></Cell>)}
      <Cell label="سطح تسلط"><Stars k={`r${index}.mastery`} label="سطح تسلط" /></Cell>
    </Row>
  )
}

function ReviewSheet() {
  return <>
    <div className="sheet-cards-2">
      <Panel title={<><Heart size={15} />امروز به خودم افتخار می‌کنم چون… <span dir="ltr">(I Am Proud Of)</span></>}>
        {[1, 2, 3].map((n) => <span key={n} className="sheet-win"><b aria-hidden className="text-[var(--sheet-accent)]">♡</b><Line k={`proud${n}`} placeholder="…………" /></span>)}
      </Panel>
      <Panel title={<><Moon size={15} />تخلیۀ مغز قبل از خواب و برنامۀ فردا <span dir="ltr">(Night Brain Dump)</span></>}>
        <Line k="dump" label="• فکری که نباید امشب مغزم رو درگیر کنه:" multiline rows={2} />
        <Line k="tomorrow" label="• ۱ کار اصلی فردا صبح:" placeholder="…………" />
      </Panel>
    </div>
    <Section number={1} title="جدول پیگیری مرورهای علمی ۷-۵-۳-۲" english="Spaced Repetition Subject Summary" motto="Encode Into Long-Term Memory" icon={BookOpen}>
      <Grid columns="1.7fr 0.8fr repeat(5, 0.6fr) 1fr" headers={['نام درس و فصل / مبحث', 'خوانش اول (تاریخ)', 'مرور ۱ (روز ۲)', 'مرور ۲ (روز ۳+تست)', 'مرور ۳ (روز ۵)', 'مرور ۴ (روز ۷)', 'مرور ماهانه', 'سطح تسلط']}>
        {Array.from({ length: 7 }, (_, index) => <ReviewRow key={index} index={index} />)}
      </Grid>
    </Section>
    <Section number={2} title="بانک تحلیل آزمون و محاسبۀ درصد با نمرۀ منفی" english="Exam & Test Percentage Tracker" motto="Formula: [(3 × Correct) - Wrong] ÷ (3 × Total) × 100" icon={ChartColumn}>
      <Grid columns="0.7fr 1.6fr repeat(4, 0.5fr) 0.75fr 1.3fr" tone="pink" headers={['تاریخ', 'نام آزمون / درس و مبحث تستی', 'کل', 'درست', 'غلط', 'نزده', 'درصد نهایی', 'علت اصلی غلط‌ها (تحلیل)']}>
        {Array.from({ length: 6 }, (_, index) => <ExamRow key={index} index={index} />)}
      </Grid>
      <p className="sheet-hint">درصد نهایی خودکار و با نمرۀ منفی حساب می‌شود.</p>
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
          <Line k="q1" label="• سؤال کلیدی ۱:" multiline rows={2} />
          <Line k="q2" label="• سؤال کلیدی ۲:" multiline rows={2} />
          <Line k="trap" label="• دام پرتکرار آزمون:" multiline rows={2} />
          <Line k="mnemonic" label="• کد رمز / یادیار (Mnemonic):" multiline rows={2} />
        </Panel>
        <Panel title="نقشۀ ذهنی، فرمول‌ها و نکات طلایی استاد / رفرنس (Mind Map & Core Notes)" className="sheet-notes">
          <Line k="notes" placeholder="نکته‌ها، فرمول‌ها و نقشۀ ذهنی این فصل را اینجا بنویس…" multiline rows={14} maxLength={1500} />
          <Sticker name="cute-flower-5" size={40} className="sheet-corner-sticker" />
        </Panel>
      </div>
    </Section>
    <Section number={2} title="کارنامۀ پایانی دوره و Study DNA من" english="End-of-Cycle Reflection & Achievements" motto="Look how far you've come!" icon={Trophy}>
      <div className="sheet-stats">
        <Panel title={<><Clock size={14} />کل ساعت مطالعۀ این دوره</>} tone="green"><Line k="statHours" placeholder="…………… ساعت" inputMode="decimal" /></Panel>
        <Panel title={<><BookOpen size={14} />کل تست‌ها / نمونه‌سؤالات</>} tone="green"><Line k="statTests" placeholder="…………… تست" inputMode="numeric" /></Panel>
        <Panel title={<><Flame size={14} />طولانی‌ترین زنجیره (Streak)</>} tone="green"><Line k="statStreak" placeholder="…………… روز متوالی" inputMode="numeric" /></Panel>
        <Panel title={<><Sparkles size={14} />قوی‌ترین درس این ماه من</>} tone="green"><Line k="statBest" placeholder="……………" /></Panel>
      </div>
      <div className="sheet-cards-2">
        <Panel title="نامه به خودِ آینده‌ام (Letter to Future Me)">
          <Line k="letter" fallback="خودِ عزیزم که داری در پایان این دوره این متن رو می‌خونی، می‌خوام بهت بگم ممنونم که وسط روزهای خستگی و بارونی جا نزدی و ادامه دادی…" multiline rows={6} maxLength={1200} />
        </Panel>
        <Panel title="۳ درس بزرگی که در این دوره از خودم یاد گرفتم">
          <Line k="lesson1" label="۱. بهترین ساعت تمرکز مغز من:" />
          <Line k="lesson2" label="۲. عاملی که بیشترین حواس‌پرتی رو داشت و حذفش کردم:" />
          <Line k="lesson3" label="۳. جمله‌ای که برای ماه بعد به خودم هدیه می‌دم:" />
        </Panel>
      </div>
    </Section>
    <aside className="sheet-guide is-closing">
      <div><p className="font-bold">پایان یک فصل، شروع یک موفقیت بزرگ‌تر در Sweet Study!</p><p>برای ورود به اتاق تمرکز (Focus Room)، محاسبۀ آنلاین درصدها و دریافت برنامۀ دورۀ بعدی، وارد وب‌اپلیکیشن Sweet Study شو. بهت افتخار می‌کنم! — دکتر عسل</p></div>
      <img src="/images/asal-helper-greeting.webp" alt="" width={72} height={72} loading="lazy" />
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
  identity: { english: 'SWEET STUDY × DR. ASAL', subtitle: 'سیستم برنامه‌ریزی علمی و استراتژیک', description: 'چرایی بزرگ، ویژن بورد و منوی ریست مغز', meta: [{ key: 'start', label: 'شروع دوره:' }, { key: 'goal', label: 'هدف اصلی:' }], Body: IdentitySheet, icon: Heart },
  monthly: { english: 'SWEET STUDY PLANNER', subtitle: 'نمای کلی ماه و بودجه‌بندی', description: 'تقویم ماه، اهداف طلایی و روزشمار آزمون‌ها', meta: [{ key: 'month', label: 'ماه:' }, { key: 'year', label: 'سال:' }], Body: MonthlySheet, icon: CalendarDays },
  habits: { english: 'CHERRY HABITS & PRIORITIES', subtitle: 'زنجیرۀ استمرار و اولویت‌بندی', description: 'ردیاب ۳۱ روزۀ عادت‌ها و ماتریس اولویت‌ها', meta: [{ key: 'month', label: 'ماه:' }, { key: 'chain', label: 'زنجیرۀ هدف:', placeholder: '……… روز' }], Body: HabitsSheet, icon: Flame },
  weekly: { english: 'SWEET STUDY WEEKLY', subtitle: 'Plan it. Perfect it. Do it.', description: 'کار اصلی و ۳ کار فرعی هر روز، بردها و ریست هفته', meta: [{ key: 'from', label: 'هفته از تاریخ:', placeholder: '…. / ….' }, { key: 'to', label: 'تا تاریخ:', placeholder: '…. / ….' }], Body: WeeklySheet, icon: CalendarDays },
  daily: { english: 'DAILY SWEET STUDY', subtitle: 'Small progress is still progress ♡', description: 'قانون ۳+۱، پارت‌ها و پومودورو، آب و مود امروز', meta: [{ key: 'date', label: 'تاریخ:', placeholder: '…. / …. / ۱۴۰۵' }, { key: 'weekday', label: 'روز:', placeholder: 'ش ی د س چ پ ج' }], Body: DailySheet, icon: CircleGauge },
  review: { english: 'SPACED REPETITION & EXAMS', subtitle: 'حافظۀ بلندمدت و مهندسی تست', description: 'مرورهای ۷-۵-۳-۲ و تحلیل آزمون با درصد خودکار', meta: [{ key: 'subject', label: 'درس / ترم:' }, { key: 'mastery', label: 'هدف تسلط:', placeholder: '٪۱۰۰' }], Body: ReviewSheet, icon: ChartColumn },
  chapter: { english: 'CHAPTER SUMMARY & CLOSING', subtitle: 'خلاصه‌نویسی و کارنامۀ افتخارات', description: 'خلاصۀ فصل، کارنامۀ دوره و نامه به خودِ آینده', meta: [{ key: 'chapter', label: 'فصل / دوره:' }], rating: true, Body: ChapterSheet, icon: BookOpen },
}

/** Header card shared by every sheet, so all pages look like one set. */
export function SheetHeader({ kind }: { kind: SheetKind }) {
  const template = templates[kind]
  return (
    <header className="sheet-header">
      <div className="sheet-brand">
        <img src="/icons/icon-192.png" alt="" width={52} height={52} />
        <div><p className="sheet-brand-title" dir="ltr">{template.english}</p><p className="sheet-brand-sub">{template.subtitle}</p></div>
      </div>
      <div className="sheet-meta">
        {template.meta.map((field) => <Line key={field.key} k={`meta.${field.key}`} label={field.label} placeholder={field.placeholder ?? '…………………'} />)}
        {template.rating && <div className="sheet-field sheet-field-labelled"><span className="sheet-label">امتیاز کلی:</span><Stars k="meta.rating" label="امتیاز کلی" /></div>}
      </div>
    </header>
  )
}
