'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, Mail, Lock, User, ArrowRight, Building, Key } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import styles from './register.module.css'

type RegistrationType = 'owner' | 'staff'

export default function RegisterPage() {
    const [registrationType, setRegistrationType] = useState<RegistrationType>('owner')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [storeCode, setStoreCode] = useState('')
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

        // Staff needs store code
        if (registrationType === 'staff' && !storeCode.trim()) {
            setError('Kode toko wajib diisi untuk bergabung sebagai staff')
            setLoading(false)
            return
        }

        try {
            const { error: signUpError, needsVerification } = await signUp(
                email,
                password,
                name,
                registrationType === 'staff' ? storeCode.trim().toUpperCase() : undefined
            )

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Email sudah terdaftar')
                } else if (signUpError.message.includes('store code not found')) {
                    setError('Kode toko tidak ditemukan')
                } else {
                    setError(signUpError.message)
                }
                return
            }

            if (needsVerification) {
                setSuccess(true)
            } else {
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

                {/* Registration Type Selector */}
                <div className={styles.typeSelector}>
                    <button
                        type="button"
                        className={`${styles.typeBtn} ${registrationType === 'owner' ? styles.typeBtnActive : ''}`}
                        onClick={() => setRegistrationType('owner')}
                    >
                        <Building size={18} />
                        Pemilik Toko
                    </button>
                    <button
                        type="button"
                        className={`${styles.typeBtn} ${registrationType === 'staff' ? styles.typeBtnActive : ''}`}
                        onClick={() => setRegistrationType('staff')}
                    >
                        <User size={18} />
                        Staff / Kasir
                    </button>
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

                    {registrationType === 'staff' && (
                        <div className={styles.inputWrapper}>
                            <Key className={styles.inputIcon} size={18} />
                            <Input
                                type="text"
                                placeholder="Kode Toko (dari pemilik)"
                                value={storeCode}
                                onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
                                required
                                className={styles.inputWithIcon}
                            />
                        </div>
                    )}

                    {registrationType === 'owner' && (
                        <p className={styles.infoText}>
                            Sebagai pemilik, Anda akan mendapat kode toko untuk mengundang staff.
                        </p>
                    )}

                    <Button type="submit" loading={loading} className={styles.submitButton}>
                        {registrationType === 'owner' ? 'Daftar sebagai Pemilik' : 'Gabung sebagai Staff'}
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
