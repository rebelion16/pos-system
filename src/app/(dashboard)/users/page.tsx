'use client'

import { useEffect, useState } from 'react'
import {
    Users,
    Plus,
    Edit2,
    Trash2,
    Crown,
    Shield,
    User as UserIcon,
    X
} from 'lucide-react'
import { localStorageService } from '@/lib/localStorage'
import { Button } from '@/components/ui'
import { User, UserRole } from '@/types/database'
import styles from './users.module.css'

type FormUser = {
    id?: string
    email: string
    name: string
    role: UserRole
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState<FormUser | null>(null)
    const [saving, setSaving] = useState(false)

    // Form states
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<UserRole>('cashier')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const data = localStorageService.getUsers()
            setUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const openModal = (user?: User) => {
        if (user) {
            setEditingUser(user)
            setName(user.name)
            setEmail(user.email)
            setRole(user.role)
        } else {
            setEditingUser(null)
            setName('')
            setEmail('')
            setRole('cashier')
        }
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingUser(null)
        setName('')
        setEmail('')
        setRole('cashier')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !email.trim()) return

        setSaving(true)
        try {
            if (editingUser?.id) {
                // Update existing user in localStorage
                const allUsers = localStorageService.getUsers()
                const index = allUsers.findIndex(u => u.id === editingUser.id)
                if (index !== -1) {
                    allUsers[index] = {
                        ...allUsers[index],
                        name: name.trim(),
                        role,
                        updated_at: new Date().toISOString()
                    }
                    localStorage.setItem('pos_users', JSON.stringify(allUsers))
                }
            } else {
                // Create new user
                localStorageService.createUser({
                    email: email.trim(),
                    name: name.trim(),
                    role,
                    avatar_url: null
                })
            }

            await fetchUsers()
            closeModal()
        } catch (error) {
            console.error('Error saving user:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return

        try {
            const allUsers = localStorageService.getUsers()
            const filtered = allUsers.filter(u => u.id !== id)
            localStorage.setItem('pos_users', JSON.stringify(filtered))
            setUsers(filtered)
        } catch (error) {
            console.error('Error deleting user:', error)
        }
    }

    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case 'owner': return 'Owner'
            case 'admin': return 'Admin'
            case 'cashier': return 'Kasir'
        }
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }

    const countByRole = (role: UserRole) => users.filter(u => u.role === role).length

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat data pengguna...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Manajemen Pengguna</h1>
                    <p className={styles.subtitle}>Kelola akses pengguna dan hak akses</p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Tambah Pengguna
                </Button>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--warning-100)', color: 'var(--warning-600)' }}>
                        <Crown size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{countByRole('owner')}</div>
                        <div className={styles.statLabel}>Owner</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <Shield size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{countByRole('admin')}</div>
                        <div className={styles.statLabel}>Admin</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
                        <UserIcon size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{countByRole('cashier')}</div>
                        <div className={styles.statLabel}>Kasir</div>
                    </div>
                </div>
            </div>

            {/* User List */}
            {users.length === 0 ? (
                <div className={styles.emptyState}>
                    <Users size={64} className={styles.emptyIcon} />
                    <h3>Belum Ada Pengguna</h3>
                    <p>Tambahkan pengguna pertama untuk mulai mengelola akses</p>
                </div>
            ) : (
                <div className={styles.userList}>
                    {users.map((user) => (
                        <div key={user.id} className={styles.userCard}>
                            <div className={`${styles.avatar} ${styles[`avatar${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`]}`}>
                                {getInitials(user.name)}
                            </div>
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>{user.name}</div>
                                <div className={styles.userEmail}>{user.email}</div>
                            </div>
                            <div className={styles.userMeta}>
                                <span className={`${styles.roleBadge} ${styles[`role${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`]}`}>
                                    {getRoleLabel(user.role)}
                                </span>
                                <div className={styles.userActions}>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => openModal(user)}
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                        onClick={() => handleDelete(user.id)}
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
                                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
                            </h2>
                            <button className={styles.closeBtn} onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalBody}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Nama Lengkap</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nama pengguna"
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email</label>
                                    <input
                                        type="email"
                                        className={styles.input}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        disabled={!!editingUser}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Role / Peran</label>
                                    <div className={styles.roleOptions}>
                                        {(['owner', 'admin', 'cashier'] as UserRole[]).map((r) => (
                                            <div
                                                key={r}
                                                className={`${styles.roleOption} ${role === r ? styles.roleOptionActive : ''}`}
                                                onClick={() => setRole(r)}
                                            >
                                                <div className={`${styles.roleIcon} ${styles[`roleIcon${r.charAt(0).toUpperCase() + r.slice(1)}`]}`}>
                                                    {r === 'owner' && <Crown size={16} />}
                                                    {r === 'admin' && <Shield size={16} />}
                                                    {r === 'cashier' && <UserIcon size={16} />}
                                                </div>
                                                <span className={styles.roleName}>{getRoleLabel(r)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
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
