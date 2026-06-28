import React, { useEffect, useState } from 'react'
import { Button } from '@nextui-org/react'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useRouter } from 'next/router'
import { useAuth } from '@/components/authContext'
import styles from '@/styles/login.module.css'

function ModalLogin({
  redirectTo = '/dashboardView',
  show,
  onHide,
}: {
  redirectTo?: string
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

  return (
    <Modal show={show} onHide={onHide} centered className="text-center">
      <Modal.Body className={styles.loginModal}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close login dialog"
          onClick={onHide}
        >
          ×
        </button>
        <h2 className={styles.loginHeader}>FIT.</h2>

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

          <div className={styles.buttonRowTwo}>
            <Button type="submit" className={styles.buttonSubmit} isDisabled={pending} isLoading={pending}>
              Log in
            </Button>
            <Button
              className={styles.buttonOutline}
              onPress={() => signInWithGoogle(redirectTo)}
              isDisabled={pending}
            >
              Log in with Google
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  )
}
export default ModalLogin
