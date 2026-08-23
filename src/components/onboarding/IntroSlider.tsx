import { useState } from "react"
import IntroSlide from "./IntroSlide"
import "./onboarding.css"

type Props = {
  onFinish: () => void
}

const slides = [
  {
    title: "هر دقیقه مطالعه مهم است ⏱️",
    text: "زمان مطالعه‌ات را ثبت کن، جلسه‌هایت را ببین و مسیر پیشرفتت را بساز.",
    icon: "📚",
  },
  {
    title: "پیشرفتت را ببین 📊",
    text: "گزارش‌ها، نمودارها و عادت‌های مطالعه‌ات را تحلیل کن.",
    icon: "🌱",
  },
  {
    title: "Study DNA خودت را بشناس 🧬",
    text: "سبک یادگیری خودت را پیدا کن و بهتر برنامه‌ریزی کن.",
    icon: "✨",
  },
  {
    title: "هر قدم کوچک یک موفقیت است 🏆",
    text: "XP بگیر، Level بالا برو و Achievement باز کن.",
    icon: "⭐",
  },
  {
    title: "تنها درس نخوان 🤍",
    text: "در Study Circle کنار دوستانت مسیر مطالعه را ادامه بده.",
    icon: "👥",
  },
  {
    title: "Study AI کنار توست 🤖",
    text: "برنامه‌ریزی، فلش‌کارت، تحلیل عملکرد و کمک در یادگیری.",
    icon: "🧠",
  },
  {
    title: "برنامه و مشاوره واقعی 📚",
    text: "با تجربه کسی که کنکور ۱۴۰۰ را بدون سهمیه شرکت کرد، رتبه ۸۳۷ کشوری گرفت و امروز دانشجوی پزشکی است.",
    icon: "🎓",
  },
]

export default function IntroSlider({ onFinish }: Props) {
  const [index, setIndex] = useState(0)

  const slide = slides[index]

  const next = () => {
    if (index === slides.length - 1) {
      onFinish()
      return
    }

    setIndex(index + 1)
  }

  return (
    <main className="intro-page">

      <IntroSlide
        title={slide.title}
        text={slide.text}
        icon={slide.icon}
      />

      <div className="intro-dots">
        {slides.map((_, i) => (
          <span
            key={i}
            className={i === index ? "active" : ""}
          />
        ))}
      </div>

      <button
        className="intro-button"
        onClick={next}
      >
        {index === slides.length - 1
          ? "شروع کنیم ✨"
          : "بعدی"}
      </button>

    </main>
  )
}
