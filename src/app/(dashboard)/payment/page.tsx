'use client'

import { useEffect, useState } from 'react'
import {
    CreditCard,
    QrCode,
    Plus,
    Edit,
    Trash2,
    Save,
    ArrowLeft,
    Check,
    Building2,
} from 'lucide-react'
import Link from 'next/link'
import { firestoreService } from '@/lib/firebase/firestore'
import { BankAccount, QRISConfig } from '@/types/database'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import styles from './payment.module.css'

const BANK_LIST = [
    { code: 'bca', name: 'BCA' },
    { code: 'bni', name: 'BNI' },
    { code: 'bri', name: 'BRI' },
    { code: 'mandiri', name: 'Mandiri' },
    { code: 'cimb', name: 'CIMB Niaga' },
    { code: 'danamon', name: 'Danamon' },
    { code: 'permata', name: 'Permata' },
    { code: 'bsi', name: 'BSI' },
    { code: 'btn', name: 'BTN' },
    { code: 'mega', name: 'Bank Mega' },
    { code: 'ocbc', name: 'OCBC NISP' },
    { code: 'panin', name: 'Panin' },
    { code: 'uob', name: 'UOB' },
    { code: 'other', name: 'Lainnya' },
]

export default function PaymentSettingsPage() {
    const { storeId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showSaved, setShowSaved] = useState(false)

    // Bank Accounts
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
    const [showBankModal, setShowBankModal] = useState(false)
    const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
    const [bankForm, setBankForm] = useState({
        bank_name: '',
        account_number: '',
        account_holder: '',
        is_active: true,
    })

    // QRIS Config
    const [qrisConfig, setQrisConfig] = useState<Omit<QRISConfig, 'store_id'>>({
        enabled: false,
        merchant_name: '',
        merchant_id: '',
        qris_static_code: null,
        qris_dynamic_enabled: false,
        nmid: null,
        api_key: null,
    })

    useEffect(() => {
        if (!storeId) return
        fetchData()
    }, [storeId])

    const fetchData = async () => {
        if (!storeId) return
        try {
            const [accounts, qris] = await Promise.all([
                firestoreService.getBankAccounts(storeId),
                firestoreService.getQRISConfig(storeId),
            ])
            setBankAccounts(accounts)
            if (qris) setQrisConfig(qris)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Bank Account Handlers
    const openAddBank = () => {
        setEditingBank(null)
        setBankForm({
            bank_name: '',
            account_number: '',
            account_holder: '',
            is_active: true,
        })
        setShowBankModal(true)
    }

    const openEditBank = (bank: BankAccount) => {
        setEditingBank(bank)
        setBankForm({
            bank_name: bank.bank_name,
            account_number: bank.account_number,
            account_holder: bank.account_holder,
            is_active: bank.is_active,
        })
        setShowBankModal(true)
    }

    const saveBank = async () => {
        if (!storeId) {
            alert('Sesi toko tidak ditemukan. Silakan refresh halaman.')
            return
        }

        if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_holder) {
            alert('Lengkapi semua field!')
            return
        }

        setSaving(true)
        try {
            if (editingBank) {
                await firestoreService.updateBankAccount(editingBank.id, bankForm)
            } else {
                await firestoreService.createBankAccount({
                    ...bankForm,
                    store_id: storeId
                })
            }
            await fetchData()
            setShowBankModal(false)
            showSavedToast()
        } catch (error) {
            console.error('Error saving bank:', error)
            alert('Gagal menyimpan rekening')
        } finally {
            setSaving(false)
        }
    }

    const deleteBank = async (id: string) => {
        if (!confirm('Hapus rekening bank ini?')) return
        try {
            await firestoreService.deleteBankAccount(id)
            await fetchData()
        } catch (error) {
            console.error('Error deleting bank:', error)
        }
    }

    // QRIS Handlers
    const saveQRIS = async () => {
        if (!storeId) {
            alert('Sesi toko tidak ditemukan. Silakan refresh halaman.')
            return
        }
        setSaving(true)
        try {
            await firestoreService.saveQRISConfig(storeId, qrisConfig)
            showSavedToast()
        } catch (error) {
            console.error('Error saving QRIS:', error)
            alert('Gagal menyimpan konfigurasi QRIS')
        } finally {
            setSaving(false)
        }
    }

    const showSavedToast = () => {
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 2000)
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg" />
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Link href="/settings" className={styles.backLink}>
                    <ArrowLeft size={20} />
                    Kembali ke Pengaturan
                </Link>
                <h1>Pengaturan Pembayaran</h1>
                <p>Kelola rekening bank dan konfigurasi QRIS untuk pembayaran</p>
            </div>

            {/* Bank Accounts Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Building2 size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Rekening Bank</h3>
                        <p className={styles.sectionDesc}>Daftar rekening bank untuk pembayaran transfer</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={openAddBank}>
                        <Plus size={16} /> Tambah Rekening
                    </Button>
                </div>
                <div className={styles.sectionBody}>
                    {bankAccounts.length === 0 ? (
                        <div className={styles.emptyState}>
                            <CreditCard size={48} />
                            <p>Belum ada rekening bank</p>
                            <span>Tambah rekening bank untuk menerima pembayaran transfer</span>
                        </div>
                    ) : (
                        <div className={styles.bankList}>
                            {bankAccounts.map((bank) => (
                                <div key={bank.id} className={`${styles.bankItem} ${!bank.is_active ? styles.bankInactive : ''}`}>
                                    <div className={styles.bankInfo}>
                                        <div className={styles.bankName}>{bank.bank_name}</div>
                                        <div className={styles.bankNumber}>{bank.account_number}</div>
                                        <div className={styles.bankHolder}>a.n. {bank.account_holder}</div>
                                    </div>
                                    <div className={styles.bankActions}>
                                        <button onClick={() => openEditBank(bank)} title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => deleteBank(bank.id)} title="Hapus">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* QRIS Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <QrCode size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Konfigurasi QRIS</h3>
                        <p className={styles.sectionDesc}>Pengaturan QRIS untuk pembayaran digital</p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.toggleLabel}>
                            <input
                                type="checkbox"
                                checked={qrisConfig.enabled}
                                onChange={(e) => setQrisConfig({ ...qrisConfig, enabled: e.target.checked })}
                            />
                            <span>Aktifkan Pembayaran QRIS</span>
                        </label>
                    </div>

                    {qrisConfig.enabled && (
                        <>
                            <div className={styles.formRow}>
                                <Input
                                    label="Nama Merchant"
                                    value={qrisConfig.merchant_name}
                                    onChange={(e) => setQrisConfig({ ...qrisConfig, merchant_name: e.target.value })}
                                    placeholder="Nama toko/usaha"
                                />
                                <Input
                                    label="Merchant ID"
                                    value={qrisConfig.merchant_id}
                                    onChange={(e) => setQrisConfig({ ...qrisConfig, merchant_id: e.target.value })}
                                    placeholder="ID Merchant"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <Input
                                    label="URL Gambar QRIS Statis"
                                    value={qrisConfig.qris_static_code || ''}
                                    onChange={(e) => setQrisConfig({ ...qrisConfig, qris_static_code: e.target.value })}
                                    placeholder="https://example.com/qris.png"
                                />
                                <span className={styles.hint}>Upload gambar QRIS ke hosting gambar dan paste URLnya di sini</span>
                            </div>

                            <div className={styles.divider} />

                            <h4 className={styles.subTitle}>QRIS Dinamis (Opsional)</h4>
                            <p className={styles.hint}>Untuk generate QRIS dengan nominal otomatis</p>

                            <div className={styles.formGroup}>
                                <label className={styles.toggleLabel}>
                                    <input
                                        type="checkbox"
                                        checked={qrisConfig.qris_dynamic_enabled}
                                        onChange={(e) => setQrisConfig({ ...qrisConfig, qris_dynamic_enabled: e.target.checked })}
                                    />
                                    <span>Aktifkan QRIS Dinamis</span>
                                </label>
                            </div>

                            {qrisConfig.qris_dynamic_enabled && (
                                <div className={styles.formRow}>
                                    <Input
                                        label="NMID (National Merchant ID)"
                                        value={qrisConfig.nmid || ''}
                                        onChange={(e) => setQrisConfig({ ...qrisConfig, nmid: e.target.value })}
                                        placeholder="ID12345678"
                                    />
                                    <Input
                                        label="API Key"
                                        type="password"
                                        value={qrisConfig.api_key || ''}
                                        onChange={(e) => setQrisConfig({ ...qrisConfig, api_key: e.target.value })}
                                        placeholder="API Key dari provider QRIS"
                                    />
                                </div>
                            )}

                            <Button variant="primary" onClick={saveQRIS} disabled={saving}>
                                {saving ? (
                                    <div className="spinner" style={{ width: 16, height: 16 }} />
                                ) : (
                                    <Save size={16} />
                                )}
                                Simpan Konfigurasi QRIS
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Bank Modal */}
            {showBankModal && (
                <div className="modal-overlay" onClick={() => setShowBankModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>{editingBank ? 'Edit' : 'Tambah'} Rekening Bank</h3>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Nama Bank</label>
                                <select
                                    value={bankForm.bank_name}
                                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                                >
                                    <option value="">Pilih Bank</option>
                                    {BANK_LIST.map((bank) => (
                                        <option key={bank.code} value={bank.name}>{bank.name}</option>
                                    ))}
                                </select>
                            </div>
                            <Input
                                label="Nomor Rekening"
                                value={bankForm.account_number}
                                onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                                placeholder="1234567890"
                            />
                            <Input
                                label="Nama Pemilik Rekening"
                                value={bankForm.account_holder}
                                onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })}
                                placeholder="Nama sesuai rekening"
                            />
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={bankForm.is_active}
                                    onChange={(e) => setBankForm({ ...bankForm, is_active: e.target.checked })}
                                />
                                <span>Aktif</span>
                            </label>
                        </div>
                        <div className={styles.modalFooter}>
                            <Button variant="secondary" onClick={() => setShowBankModal(false)}>Batal</Button>
                            <Button variant="primary" onClick={saveBank} disabled={saving}>
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Saved Toast */}
            {showSaved && (
                <div className={styles.toast}>
                    <Check size={20} />
                    Berhasil disimpan!
                </div>
            )}
        </div>
    )
}
