import React, { useEffect, useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import ModalBody from 'react-bootstrap/ModalBody'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useRouter } from 'next/router'
import { useAuth } from '@/components/authContext'
import styles from '@/styles/login.module.css'

function ModalLogin({
  redirectTo = '/dashboardView',
  show,
  onShowSignUp,
  onHide,
}: {
  redirectTo?: string
  onShowSignUp?: () => void
  show: boolean
  onHide: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const { signIn, signInWithGoogle } = useAuth()

  useEffect(() => {
    if (!show) {
      setEmail('')
      setPassword('')
      setErr(null)
      setPending(false)
    }
  }, [show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!email || !password) {
      setErr('Please fill in email and password')
      return
    }
    setPending(true)
    try {
      await signIn(email, password)
      onHide?.()
      router.push(redirectTo)
    } catch (e: any) {
      setErr(e.message ?? 'Login failed')
    } finally {
      setPending(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErr(null)
    setPending(true)
    try {
      await signInWithGoogle(redirectTo)
    } catch (e: any) {
      setErr(e.message ?? 'Google sign-in failed')
      setPending(false)
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      dialogClassName={styles.authDialog}
      contentClassName={styles.authContent}
      backdropClassName={styles.authBackdrop}
      animation={false}
    >
      <ModalBody className={styles.loginModal}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close login dialog"
          onClick={onHide}
        >
          X
        </button>
        <div className={styles.authBrandRow}>
          <span className={styles.authMark}>F</span>
          <span>Financial Investment Tool</span>
        </div>
        <div className={styles.authIntro}>
          <p className={styles.authEyebrow}>Welcome back</p>
          <h2 className={styles.loginHeader}>Sign in to FIT</h2>
          <p className={styles.authSubtitle}>
            Access your profile, watchlist, and account settings.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputRow}>
            <label className={styles.inputLabel} htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className={styles.inputFull}
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.inputRow}>
            <label className={styles.inputLabel} htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className={styles.inputFull}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {err && (
            <p className={styles.errorText} role="alert">
              {err}
            </p>
          )}

          <div className={styles.buttonStack}>
            <button
              type="submit"
              className={styles.buttonSubmit}
              disabled={pending}
            >
              {pending ? 'Signing in...' : 'Sign in'}
            </button>
            <button
              type="button"
              className={styles.buttonOutline}
              disabled={pending}
              onClick={handleGoogleSignIn}
            >
              Log in with Google
            </button>
          </div>

          {onShowSignUp ? (
            <p className={styles.switchText}>
              New to FIT?{' '}
              <button
                type="button"
                className={styles.switchButton}
                onClick={onShowSignUp}
              >
                Create an account
              </button>
            </p>
          ) : null}
        </form>
      </ModalBody>
    </Modal>
  )
}
export default ModalLogin
