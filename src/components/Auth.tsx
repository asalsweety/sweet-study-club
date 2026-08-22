import { useState } from 'react'
import { supabase } from '../lib/supabase'

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

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setMessage(error.message)
        } else {
          setMessage('حساب ساخته شد. حالا وارد شوید.')
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="loading-screen">
      <section
        className="profile-card"
        style={{
          width: '90%',
          maxWidth: 420,
          textAlign: 'center',
          padding: '32px 24px',
        }}
      >
        <h1 style={{ marginBottom: 8 }}>
          Sweet Study Club
        </h1>

        <p style={{ marginBottom: 24 }}>
          {isSignup
            ? 'حساب خودت را بساز و مسیر مطالعه را شروع کن.'
            : 'به برنامه مطالعه خودت وارد شو.'}
        </p>

        <form
          onSubmit={submit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <input
            type="email"
            placeholder="ایمیل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'در حال بررسی...'
              : isSignup
                ? 'ساخت حساب'
                : 'ورود'}
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setIsSignup(!isSignup)
              setMessage('')
            }}
          >
            {isSignup
              ? 'ورود به حساب موجود'
              : 'ساخت حساب جدید'}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: 18 }}>
            {message}
          </p>
        )}
      </section>
    </main>
  )
}
