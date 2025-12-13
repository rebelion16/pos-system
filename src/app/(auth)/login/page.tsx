'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, Mail, Lock, ArrowRight } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import styles from './login.module.css'

// Google Icon SVG
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
)

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const router = useRouter()
    const { user, loading: authLoading, signIn, signInWithGoogle } = useAuth()

    // Redirect to dashboard if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            router.push('/dashboard')
        }
    }, [user, authLoading, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error: signInError } = await signIn(email, password)

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    setError('Email atau password salah')
                } else if (signInError.message.includes('Email not confirmed')) {
                    setError('Email belum diverifikasi. Cek inbox email Anda.')
                } else {
                    setError(signInError.message)
                }
                return
            }

            router.push('/dashboard')
        } catch {
            setError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true)
        setError('')

        try {
            const { error: googleError } = await signInWithGoogle()
            if (googleError) {
                setError(googleError.message)
            }
            // Redirect will happen automatically via useEffect when user state updates
        } catch {
            setError('Gagal login dengan Google')
        } finally {
            setGoogleLoading(false)
        }
    }

    // Show loading while checking auth state
    if (authLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loginBox}>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <div className="spinner spinner-lg"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.loginBox}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <Store size={32} />
                    </div>
                    <h1 className={styles.title}>Selamat Datang</h1>
                    <p className={styles.subtitle}>Masuk ke sistem POS Anda</p>
                </div>

                {/* Google Sign In */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className={styles.googleButton}
                >
                    {googleLoading ? (
                        <div className="spinner" style={{ width: '18px', height: '18px' }} />
                    ) : (
                        <GoogleIcon />
                    )}
                    Masuk dengan Google
                </button>

                <div className={styles.divider}>
                    <span>atau</span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.inputWrapper}>
                        <Mail className={styles.inputIcon} size={18} />
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.inputWithIcon}
                        />
                    </div>

                    <div className={styles.inputWrapper}>
                        <Lock className={styles.inputIcon} size={18} />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.inputWithIcon}
                        />
                    </div>

                    <Button type="submit" loading={loading} className={styles.submitButton}>
                        Masuk
                        <ArrowRight size={16} />
                    </Button>
                </form>

                {/* Footer */}
                <div className={styles.footer}>
                    <p>
                        Belum punya akun?{' '}
                        <Link href="/register" className={styles.link}>
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
