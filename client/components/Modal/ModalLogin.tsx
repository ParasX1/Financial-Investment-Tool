// components/Modal/ModalLogin.tsx
import React, { useState } from 'react'
import { Button } from '@nextui-org/react'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useRouter } from 'next/router'
import { useAuth } from '@/components/authContext'
import styles from '@/styles/login.module.css'

function ModalLogin({ show, onHide }: { show: boolean; onHide: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const { signIn, signInWithGoogle } = useAuth()

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
      router.push('/dashboardView')
    } catch (e: any) {
      setErr(e.message ?? 'Login failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} keyboard={false} centered className="text-center">
      <Modal.Body className={styles.loginModal}>
        <h2 className={styles.loginHeader}>FIT.</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputRow}>
            <input
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
            <input
              type="password"              
              className={styles.inputFull}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {err && <p style={{ color: '#ff6b6b', marginTop: 8 }}>{err}</p>}

          <div className={styles.buttonRowTwo}>
            <Button type="submit" className={styles.buttonSubmit} isDisabled={pending} isLoading={pending}>
              Log in
            </Button>
            <Button className={styles.buttonOutline} onPress={signInWithGoogle} isDisabled={pending}>
              Log in with Google
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  )
}
export default ModalLogin
