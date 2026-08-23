import ChibiSweet from "../ChibiSweet/ChibiSweet"
import "./onboarding.css"

type Props = {
  onStart: () => void
}

export default function Welcome({ onStart }: Props) {
  return (
    <main className="welcome-page">

      <section className="welcome-content">

        <ChibiSweet />

        <h1>
          Sweet Study Club 🍓
        </h1>

        <p>
          یک همراه شیرین برای ساختن
          عادت‌های مطالعه بهتر
        </p>

        <button onClick={onStart}>
          شروع کنیم ✨
        </button>

      </section>

    </main>
  )
}
