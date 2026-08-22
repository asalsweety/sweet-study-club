import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('حساب ساخته شد. وارد شوید.')
        setIsSignup(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      }
    }

    setLoading(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">
          Sweet Study Club
        </h1>

        <p className="auth-subtitle">
          {isSignup
            ? 'حساب خودت را بساز و مطالعه را شروع کن.'
            : 'وارد مسیر مطالعه خودت شو.'}
        </p>

        <form
          className="auth-form"
          onSubmit={submit}
        >
          <input
            className="auth-input"
            type="email"
            placeholder="ایمیل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="auth-input"
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'لطفاً صبر کنید...'
              : isSignup
                ? 'ثبت نام'
                : 'ورود'}
          </button>

          <button
            className="auth-secondary-button"
            type="button"
            onClick={() => {
              setIsSignup(!isSignup)
              setMessage('')
            }}
          >
            {isSignup
              ? 'قبلاً حساب دارم'
              : 'ساخت حساب جدید'}
          </button>
        </form>

        {message && (
          <p className="auth-message">
            {message}
          </p>
        )}
      </section>
    </main>
  )
}
