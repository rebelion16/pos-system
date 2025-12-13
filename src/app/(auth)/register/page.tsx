'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, Mail, Lock, User, ArrowRight } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import styles from './register.module.css'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { signUp } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Validation
        if (password !== confirmPassword) {
            setError('Password tidak cocok')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Password minimal 6 karakter')
            setLoading(false)
            return
        }

        try {
            const { error: signUpError, needsVerification } = await signUp(email, password, name)

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Email sudah terdaftar')
                } else {
                    setError(signUpError.message)
                }
                return
            }

            if (needsVerification) {
                setSuccess(true)
                // Don't redirect - show verification message
            } else {
                // If no verification needed, redirect to dashboard
                router.push('/dashboard')
            }
        } catch {
            setError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.loginBox}>
                    <div className={styles.successBox}>
                        <div className={styles.successIcon}>✓</div>
                        <h2>Pendaftaran Berhasil!</h2>
                        <p>Silakan cek email Anda untuk verifikasi akun.</p>
                        <Link href="/login" className={styles.loginLink}>
                            Klik di sini untuk ke halaman Login
                        </Link>
                    </div>
                </div>
                <div className={styles.bgDecoration}>
                    <div className={styles.bgCircle1}></div>
                    <div className={styles.bgCircle2}></div>
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
                    <h1 className={styles.title}>Buat Akun Baru</h1>
                    <p className={styles.subtitle}>Daftar untuk mulai menggunakan POS</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.inputWrapper}>
                        <User className={styles.inputIcon} size={18} />
                        <Input
                            type="text"
                            placeholder="Nama Lengkap"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className={styles.inputWithIcon}
                        />
                    </div>

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

                    <div className={styles.inputWrapper}>
                        <Lock className={styles.inputIcon} size={18} />
                        <Input
                            type="password"
                            placeholder="Konfirmasi Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className={styles.inputWithIcon}
                        />
                    </div>

                    <Button type="submit" loading={loading} className={styles.submitButton}>
                        Daftar
                        <ArrowRight size={16} />
                    </Button>
                </form>

                {/* Footer */}
                <div className={styles.footer}>
                    <p>
                        Sudah punya akun?{' '}
                        <Link href="/login" className={styles.link}>
                            Masuk di sini
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
