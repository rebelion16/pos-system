'use client'

import { useEffect, useState } from 'react'
import {
    Users,
    Plus,
    Edit2,
    Trash2,
    User as UserIcon,
    X,
    Eye,
    EyeOff,
    Check,
    AlertCircle
} from 'lucide-react'
import { firestoreService } from '@/lib/firebase/firestore'
import { Button } from '@/components/ui'
import { Cashier } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import styles from './users.module.css'

type FormCashier = {
    id?: string
    username: string
    name: string
    password: string
    confirmPassword: string
}

export default function UsersPage() {
    const { storeCode } = useAuth()
    const [cashiers, setCashiers] = useState<Cashier[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingCashier, setEditingCashier] = useState<Cashier | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Form states
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        if (!storeCode) return
        fetchData()
    }, [storeCode])

    const fetchData = async () => {
        if (!storeCode) return
        try {
            // Get cashiers for this store using storeCode from context
            const data = await firestoreService.getCashiers(storeCode)
            setCashiers(data)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const openModal = (cashier?: Cashier) => {
        setError('')
        if (cashier) {
            setEditingCashier(cashier)
            setName(cashier.name)
            setUsername(cashier.username)
            setPassword('')
            setConfirmPassword('')
        } else {
            setEditingCashier(null)
            setName('')
            setUsername('')
            setPassword('')
            setConfirmPassword('')
        }
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingCashier(null)
        setName('')
        setUsername('')
        setPassword('')
        setConfirmPassword('')
        setError('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !username.trim()) {
            setError('Nama dan username harus diisi')
            return
        }

        if (!editingCashier && !password) {
            setError('Password harus diisi untuk kasir baru')
            return
        }

        if (password && password !== confirmPassword) {
            setError('Password dan konfirmasi password tidak cocok')
            return
        }

        if (password && password.length < 4) {
            setError('Password minimal 4 karakter')
            return
        }

        if (!storeCode) {
            setError('Kode toko belum diatur. Silakan atur di halaman Pengaturan.')
            return
        }

        setSaving(true)
        setError('')
        try {
            if (editingCashier?.id) {
                await firestoreService.updateCashier(storeCode, editingCashier.id, {
                    name: name.trim(),
                    username: username.trim(),
                    ...(password ? { password } : {}),
                })
            } else {
                await firestoreService.createCashier(storeCode, {
                    username: username.trim(),
                    password,
                    name: name.trim(),
                })
            }

            await fetchData()
            closeModal()
        } catch (error) {
            const err = error as Error
            setError(err.message || 'Gagal menyimpan kasir')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus kasir ini?')) return

        try {
            await firestoreService.deleteCashier(storeCode!, id)
            setCashiers(cashiers.filter(c => c.id !== id))
        } catch (error) {
            console.error('Error deleting cashier:', error)
        }
    }

    const toggleActive = async (cashier: Cashier) => {
        try {
            await firestoreService.updateCashier(storeCode!, cashier.id, {
                is_active: !cashier.is_active
            })
            setCashiers(cashiers.map(c =>
                c.id === cashier.id ? { ...c, is_active: !c.is_active } : c
            ))
        } catch (error) {
            console.error('Error toggling active status:', error)
        }
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat data kasir...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Manajemen Kasir</h1>
                    <p className={styles.subtitle}>Kelola akun kasir untuk toko Anda</p>
                </div>
                <Button variant="primary" onClick={() => openModal()} disabled={!storeCode}>
                    <Plus size={18} />
                    Tambah Kasir
                </Button>
            </div>

            {/* Store Code Warning */}
            {!storeCode && (
                <div className={styles.warning}>
                    <AlertCircle size={20} />
                    <div>
                        <strong>Kode Toko Belum Diatur</strong>
                        <p>Silakan atur kode toko di halaman <a href="/settings">Pengaturan</a> terlebih dahulu sebelum menambahkan kasir.</p>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
                        <UserIcon size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{cashiers.length}</div>
                        <div className={styles.statLabel}>Total Kasir</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <Check size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{cashiers.filter(c => c.is_active).length}</div>
                        <div className={styles.statLabel}>Kasir Aktif</div>
                    </div>
                </div>
            </div>

            {/* Cashier List */}
            {cashiers.length === 0 ? (
                <div className={styles.emptyState}>
                    <Users size={64} className={styles.emptyIcon} />
                    <h3>Belum Ada Kasir</h3>
                    <p>
                        {storeCode
                            ? 'Tambahkan kasir pertama untuk mulai menggunakan POS'
                            : 'Atur kode toko terlebih dahulu di halaman Pengaturan'}
                    </p>
                </div>
            ) : (
                <div className={styles.userList}>
                    {cashiers.map((cashier) => (
                        <div key={cashier.id} className={`${styles.userCard} ${!cashier.is_active ? styles.userCardInactive : ''}`}>
                            <div className={`${styles.avatar} ${styles.avatarCashier}`}>
                                {getInitials(cashier.name)}
                            </div>
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>{cashier.name}</div>
                                <div className={styles.userEmail}>@{cashier.username}</div>
                            </div>
                            <div className={styles.userMeta}>
                                <span className={`${styles.roleBadge} ${cashier.is_active ? styles.roleActive : styles.roleInactive}`}>
                                    {cashier.is_active ? 'Aktif' : 'Tidak Aktif'}
                                </span>
                                <div className={styles.userActions}>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => toggleActive(cashier)}
                                        title={cashier.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                    >
                                        {cashier.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => openModal(cashier)}
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                        onClick={() => handleDelete(cashier.id)}
                                        title="Hapus"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingCashier ? 'Edit Kasir' : 'Tambah Kasir'}
                            </h2>
                            <button className={styles.closeBtn} onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalBody}>
                                {error && (
                                    <div className={styles.errorAlert}>
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Nama Lengkap</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nama kasir"
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Username</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                        placeholder="username (tanpa spasi)"
                                        required
                                    />
                                    <p className={styles.inputHint}>Username digunakan untuk login kasir</p>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>
                                        Password
                                        {editingCashier && <span className={styles.labelHint}> (kosongkan jika tidak ingin mengubah)</span>}
                                    </label>
                                    <div className={styles.passwordInput}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className={styles.input}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={editingCashier ? '••••••••' : 'Minimal 4 karakter'}
                                            required={!editingCashier}
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {password && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Konfirmasi Password</label>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className={styles.input}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Ketik ulang password"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={closeModal}>
                                    Batal
                                </Button>
                                <Button type="submit" variant="primary" disabled={saving}>
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
