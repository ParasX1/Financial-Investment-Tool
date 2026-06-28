import React, { useEffect, useState } from 'react'
import { Button } from '@nextui-org/react'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useRouter } from 'next/router'
import { useAuth } from '@/components/authContext'
import styles from '@/styles/login.module.css'

type ModalSignUpProps = {
  show: boolean
  onHide: () => void
  setLogin?: (v: boolean) => void
}

function ModalSignUp({ show, onHide }: ModalSignUpProps) {
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
    setErr(null); setInfo(null)
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
      const status = await signUp(email, password, { first_name: fname, last_name: lname })
      if (status === 'verify-email') {
        setInfo('We sent you a confirmation email. Please verify to complete sign-in.')
        setPassword('')
        return
      } else {
        onHide?.()
        router.push('/dashboardView')
      }
    } catch (e: any) {
      setErr(e.message ?? 'Sign up failed')
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
          aria-label="Close sign up dialog"
          onClick={onHide}
        >
          ×
        </button>
        <h2 className={styles.loginHeader}>FIT.</h2>
        <h3 className={styles.loginSubheader}>Create new account</h3>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputTwo}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="signup-first-name">
                First name
              </label>
              <input id="signup-first-name" className={styles.inputFull} placeholder="First Name" value={fname} onChange={(e) => setFname(e.target.value)} autoComplete="given-name" required />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="signup-last-name">
                Last name
              </label>
              <input id="signup-last-name" className={styles.inputFull} placeholder="Last Name" value={lname} onChange={(e) => setLname(e.target.value)} autoComplete="family-name" required />
            </div>
          </div>
          <div className={styles.inputRow}>
            <label className={styles.inputLabel} htmlFor="signup-email">
              Email address
            </label>
            <input id="signup-email" type="email" className={styles.inputFull} placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className={styles.inputRow}>
            <label className={styles.inputLabel} htmlFor="signup-password">
              Password
            </label>
            <input id="signup-password" type="password" className={styles.inputFull} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
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

          <div className={styles.buttonRowTwo}>
            <Button type="submit" className={styles.buttonSubmit} isDisabled={pending} isLoading={pending}>
              Sign up
            </Button>
            <Button
              className={styles.buttonOutline}
              onPress={() => signInWithGoogle()}
              isDisabled={pending}
            >
              Sign up with Google
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  )
}
export default ModalSignUp
