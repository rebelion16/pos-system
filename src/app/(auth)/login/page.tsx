'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, Mail, Lock, ArrowRight } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import styles from './login.module.css'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { signIn } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error: signInError } = await signIn(email, password)

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    setError('Email atau password salah')
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

            {/* Decorative Background */}
            <div className={styles.bgDecoration}>
                <div className={styles.bgCircle1}></div>
                <div className={styles.bgCircle2}></div>
            </div>
        </div>
    )
}
