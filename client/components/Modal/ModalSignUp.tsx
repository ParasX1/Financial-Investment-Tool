import React, { useState } from 'react'
import { Button } from '@nextui-org/react'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useRouter } from 'next/router'
import { useAuth } from '@/components/authContext'
import styles from '@/styles/login.module.css'

function ModalSignUp({ show, onHide, setLogin }: { show: boolean; onHide: () => void; setLogin?: (v: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fname, setFname] = useState('')
  const [lname, setLname] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const { signUp, signInWithGoogle } = useAuth()

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
        setLogin?.(true)
        onHide?.()
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
    <Modal show={show} onHide={onHide} keyboard={false} centered className="text-center">
      <Modal.Body className={styles.loginModal}>
        <h2 className={styles.loginHeader}>FIT.</h2>
        <h3 className={styles.loginSubheader}>Create new account</h3>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputTwo}>
            <input className={styles.inputFull} placeholder="First Name" value={fname} onChange={(e) => setFname(e.target.value)} />
            <input className={styles.inputFull} placeholder="Last Name" value={lname} onChange={(e) => setLname(e.target.value)} />
          </div>
          <div className={styles.inputRow}>
            <input type="email" className={styles.inputFull} placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.inputRow}>
            <input type="password" className={styles.inputFull} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {err && <p style={{ color: '#ff6b6b', marginTop: 8 }}>{err}</p>}
          {info && <p style={{ color: '#3ad29f', marginTop: 8 }}>{info}</p>}

          <div className={styles.buttonRowTwo}>
            <Button type="submit" className={styles.buttonSubmit} isDisabled={pending} isLoading={pending}>
              Sign up
            </Button>
            <Button className={styles.buttonOutline} onPress={signInWithGoogle} isDisabled={pending}>
              Sign up with Google
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  )
}
export default ModalSignUp
