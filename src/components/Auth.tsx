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
    <main className="loading-screen">
      <form
        onSubmit={submit}
        style={{
          width: '90%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h1>
          {isSignup ? 'ساخت حساب' : 'ورود به Sweet Study Club'}
        </h1>

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

        <button type="submit" disabled={loading}>
          {loading
            ? 'لطفاً صبر کنید...'
            : isSignup
            ? 'ثبت نام'
            : 'ورود'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup
            ? 'قبلاً حساب دارم'
            : 'ساخت حساب جدید'}
        </button>

        {message && <p>{message}</p>}
      </form>
    </main>
  )
}
