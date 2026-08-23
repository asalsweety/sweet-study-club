import ChibiSweet from '../ChibiSweet/ChibiSweet'
import './onboarding.css'

type Props = {
  onStart: () => void
  onLogin: () => void
}

export default function Welcome({
  onStart,
  onLogin,
}: Props) {
  return (
    <main className="welcome-page">

      <section className="welcome-content">

        <ChibiSweet />

        <h1>
          Sweet Study Club
        </h1>

        <p>
          بیا با هم آروم‌تر، منظم‌تر و شیرین‌تر درس بخونیم ✨
        </p>

        <button
          type="button"
          className="welcome-primary-button"
          onClick={onStart}
        >
          بزن بریم 🌸
        </button>

        <button
          type="button"
          className="welcome-existing-account"
          onClick={onLogin}
        >
          قبلاً شروع کردم
        </button>

      </section>

    </main>
  )
}
