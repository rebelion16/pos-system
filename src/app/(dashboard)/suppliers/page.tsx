'use client'

import { useEffect, useState } from 'react'
import {
    Truck,
    Plus,
    Search,
    Edit2,
    Trash2,
    Phone,
    Mail,
    MapPin,
    X
} from 'lucide-react'
import { localStorageService } from '@/lib/localStorage'
import { Button } from '@/components/ui'
import { Supplier } from '@/types/database'
import styles from './suppliers.module.css'

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [saving, setSaving] = useState(false)

    // Form states
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [address, setAddress] = useState('')

    useEffect(() => {
        fetchSuppliers()
    }, [])

    const fetchSuppliers = async () => {
        try {
            const data = localStorageService.getSuppliers()
            // Sort by name
            data.sort((a, b) => a.name.localeCompare(b.name))
            setSuppliers(data)
        } catch (error) {
            console.error('Error fetching suppliers:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const openModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier)
            setName(supplier.name)
            setPhone(supplier.phone || '')
            setEmail(supplier.email || '')
            setAddress(supplier.address || '')
        } else {
            setEditingSupplier(null)
            setName('')
            setPhone('')
            setEmail('')
            setAddress('')
        }
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingSupplier(null)
        setName('')
        setPhone('')
        setEmail('')
        setAddress('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setSaving(true)
        try {
            const supplierData = {
                name: name.trim(),
                phone: phone.trim() || null,
                email: email.trim() || null,
                address: address.trim() || null,
            }

            if (editingSupplier) {
                // Update existing
                localStorageService.updateSupplier(editingSupplier.id, supplierData)
            } else {
                // Insert new
                localStorageService.createSupplier(supplierData)
            }

            await fetchSuppliers()
            closeModal()
        } catch (error) {
            console.error('Error saving supplier:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus supplier ini?')) return

        try {
            localStorageService.deleteSupplier(id)
            setSuppliers(suppliers.filter(s => s.id !== id))
        } catch (error) {
            console.error('Error deleting supplier:', error)
        }
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat data supplier...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Manajemen Supplier</h1>
                    <p className={styles.subtitle}>Kelola data supplier dan vendor</p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Tambah Supplier
                </Button>
            </div>

            {/* Search Bar */}
            <div className={styles.searchBar}>
                <div className={styles.searchInput}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Cari supplier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.statBadge}>
                    <Truck size={16} />
                    <strong>{suppliers.length}</strong> Supplier
                </div>
            </div>

            {/* Supplier Grid */}
            {filteredSuppliers.length === 0 ? (
                <div className={styles.emptyState}>
                    <Truck size={64} className={styles.emptyIcon} />
                    <h3>{searchQuery ? 'Tidak Ditemukan' : 'Belum Ada Supplier'}</h3>
                    <p>
                        {searchQuery
                            ? `Tidak ada supplier yang cocok dengan "${searchQuery}"`
                            : 'Tambahkan supplier pertama untuk mulai mengelola data'
                        }
                    </p>
                    {!searchQuery && (
                        <Button variant="primary" onClick={() => openModal()}>
                            <Plus size={18} />
                            Tambah Supplier
                        </Button>
                    )}
                </div>
            ) : (
                <div className={styles.supplierGrid}>
                    {filteredSuppliers.map((supplier) => (
                        <div key={supplier.id} className={styles.supplierCard}>
                            <div className={styles.supplierIcon}>
                                <Truck size={28} />
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.supplierName}>{supplier.name}</div>
                                <div className={styles.supplierDetails}>
                                    {supplier.phone && (
                                        <div className={styles.detailRow}>
                                            <Phone size={14} />
                                            <span>{supplier.phone}</span>
                                        </div>
                                    )}
                                    {supplier.email && (
                                        <div className={styles.detailRow}>
                                            <Mail size={14} />
                                            <span>{supplier.email}</span>
                                        </div>
                                    )}
                                    {supplier.address && (
                                        <div className={styles.detailRow}>
                                            <MapPin size={14} />
                                            <span>{supplier.address}</span>
                                        </div>
                                    )}
                                    {!supplier.phone && !supplier.email && !supplier.address && (
                                        <div className={styles.detailRow}>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                Belum ada detail kontak
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.cardActions}>
                                <button
                                    className={styles.actionBtn}
                                    onClick={() => openModal(supplier)}
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                    onClick={() => handleDelete(supplier.id)}
                                    title="Hapus"
                                >
                                    <Trash2 size={16} />
                                </button>
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
                                {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier'}
                            </h2>
                            <button className={styles.closeBtn} onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalBody}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                        <label className={styles.label}>Nama Supplier *</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Nama supplier / vendor"
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>No. Telepon</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="08xx-xxxx-xxxx"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Email</label>
                                        <input
                                            type="email"
                                            className={styles.input}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="email@supplier.com"
                                        />
                                    </div>

                                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                        <label className={styles.label}>Alamat</label>
                                        <textarea
                                            className={styles.textarea}
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Alamat lengkap supplier"
                                        />
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
