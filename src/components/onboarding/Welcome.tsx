import ChibiSweet from "../ChibiSweet/ChibiSweet"
import "./onboarding.css"

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

        <h1>Sweet Study Club</h1>

        <p>
          یک همراه شیرین برای ساختن
          عادت‌های مطالعه بهتر
        </p>

        <div className="welcome-actions">
          <button
            type="button"
            className="welcome-primary-button"
            onClick={onStart}
          >
            بزن بریم
          </button>

          <button
            type="button"
            className="welcome-login-button"
            onClick={onLogin}
          >
            قبلاً حساب دارم
          </button>
        </div>
      </section>
    </main>
  )
}
