import React, { useEffect, useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import ModalBody from 'react-bootstrap/ModalBody'
import { useRouter } from 'next/router'
import { useAuth } from '@/components/authContext'
import { FitLogo } from '@/components/shared/FitLogo'
import styles from '@/styles/login.module.css'

type ModalSignUpProps = {
  redirectTo?: string
  show: boolean
  onHide: () => void
  setLogin?: (v: boolean) => void
}

function ModalSignUp({
  redirectTo = '/dashboardView',
  show,
  onHide,
  setLogin,
}: ModalSignUpProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fname, setFname] = useState('')
  const [lname, setLname] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const { signUp, signInWithGoogle } = useAuth()

  useEffect(() => {
    if (!show) {
      setEmail('')
      setPassword('')
      setFname('')
      setLname('')
      setErr(null)
      setInfo(null)
      setPending(false)
    }
  }, [show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setInfo(null)
    if (!email || !password || !fname || !lname) {
      setErr('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      setErr('Password must be at least 6 characters')
      return
    }
    setPending(true)
    try {
      const status = await signUp(email, password, {
        first_name: fname,
        last_name: lname,
      })
      if (status === 'verify-email') {
        setInfo(
          'We sent you a confirmation email. Please verify to complete sign-in.',
        )
        setPassword('')
        return
      } else {
        onHide?.()
        router.push(redirectTo)
      }
    } catch (e: any) {
      setErr(e.message ?? 'Sign up failed')
    } finally {
      setPending(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErr(null)
    setInfo(null)
    setPending(true)
    try {
      await signInWithGoogle(redirectTo)
    } catch (e: any) {
      setErr(e.message ?? 'Google sign-up failed')
      setPending(false)
    }
  }

  const handleShowLogin = () => {
    onHide()
    setLogin?.(true)
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
          aria-label="Close sign up dialog"
          onClick={onHide}
        >
          X
        </button>
        <div className={styles.authBrandRow}>
          <FitLogo className={styles.authLogo} showWordmark size="small" />
        </div>
        <div className={styles.authIntro}>
          <p className={styles.authEyebrow}>Start with FIT</p>
          <h2 className={styles.loginHeader}>Create your account</h2>
          <p className={styles.authSubtitle}>
            Set up a profile for saved watchlists, community activity, and
            account recovery.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputTwo}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="signup-first-name">
                First name
              </label>
              <input
                id="signup-first-name"
                className={styles.inputFull}
                placeholder="First Name"
                value={fname}
                onChange={(e) => setFname(e.target.value)}
                autoComplete="given-name"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="signup-last-name">
                Last name
              </label>
              <input
                id="signup-last-name"
                className={styles.inputFull}
                placeholder="Last Name"
                value={lname}
                onChange={(e) => setLname(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>
          </div>
          <div className={styles.inputRow}>
            <label className={styles.inputLabel} htmlFor="signup-email">
              Email address
            </label>
            <input
              id="signup-email"
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
            <label className={styles.inputLabel} htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              className={styles.inputFull}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {err && (
            <p className={styles.errorText} role="alert">
              {err}
            </p>
          )}
          {info && (
            <p className={styles.successText} role="status">
              {info}
            </p>
          )}

          <div className={styles.buttonStack}>
            <button
              type="submit"
              className={styles.buttonSubmit}
              disabled={pending}
            >
              {pending ? 'Creating account...' : 'Create account'}
            </button>
            <button
              type="button"
              className={styles.buttonOutline}
              disabled={pending}
              onClick={handleGoogleSignIn}
            >
              Sign up with Google
            </button>
          </div>

          {setLogin ? (
            <p className={styles.switchText}>
              Already have an account?{' '}
              <button
                type="button"
                className={styles.switchButton}
                onClick={handleShowLogin}
              >
                Sign in
              </button>
            </p>
          ) : null}
        </form>
      </ModalBody>
    </Modal>
  )
}
export default ModalSignUp
