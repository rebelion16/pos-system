'use client'

import { useEffect, useState } from 'react'
import {
    Store,
    Palette,
    Printer,
    Calculator,
    Save,
    Check,
    Sun,
    Moon,
    Cloud,
    Trash2,
    AlertTriangle,
    CreditCard,
    QrCode,
    ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { firestoreService } from '@/lib/firebase/firestore'
import { setWebAppUrl, getWebAppUrl } from '@/lib/googleSheets'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import styles from './settings.module.css'

interface SettingsData {
    id: string
    store_name: string
    store_address: string | null
    store_phone: string | null
    store_logo: string | null
    store_code: string | null
    tax_rate: number
    currency: string
    theme: string
    printer_enabled: boolean
    printer_name: string | null
}

type ThemeMode = 'light' | 'dark'
type ThemeColor = 'blue' | 'green' | 'pink' | 'orange' | 'purple'

export default function SettingsPage() {
    const { storeCode, user } = useAuth()
    const [settings, setSettings] = useState<SettingsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showSaved, setShowSaved] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Form states
    const [storeName, setStoreName] = useState('')
    const [storeAddress, setStoreAddress] = useState('')
    const [storePhone, setStorePhone] = useState('')
    const [storeCodeInput, setStoreCodeInput] = useState('')  // Display/edit value
    const [originalStoreCode, setOriginalStoreCode] = useState('')  // Database path (read-only)
    const [taxRate, setTaxRate] = useState(0)
    const [themeMode, setThemeMode] = useState<ThemeMode>('light')
    const [themeColor, setThemeColor] = useState<ThemeColor>('blue')
    const [printerEnabled, setPrinterEnabled] = useState(false)
    const [printerName, setPrinterName] = useState('')
    const [webAppUrlInput, setWebAppUrlInput] = useState('')


    useEffect(() => {
        if (!user) return
        fetchSettings()
        // Load saved Web App URL
        setWebAppUrlInput(getWebAppUrl())
    }, [user])

    useEffect(() => {
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', themeMode)
        document.documentElement.setAttribute('data-theme-color', themeColor)
    }, [themeMode, themeColor])

    const fetchSettings = async () => {
        if (!user) return
        try {
            // First, fetch user data to get store_code
            const userData = await firestoreService.getUserById(user.id)
            const userStoreCode = userData?.store_code || ''

            // Set both display value and original (path) value
            setStoreCodeInput(userStoreCode)
            setOriginalStoreCode(userStoreCode)  // This is used as database path

            // If we have a store_code, fetch settings
            if (userStoreCode) {
                const data = await firestoreService.getSettings(userStoreCode)

                if (data) {
                    setSettings(data)
                    setStoreName(data.store_name)
                    setStoreAddress(data.store_address || '')
                    setStorePhone(data.store_phone || '')
                    // Keep store_code from user document (already set above)
                    setTaxRate(data.tax_rate)
                    setPrinterEnabled(data.printer_enabled)
                    setPrinterName(data.printer_name || '')

                    // Parse theme
                    const themeParts = data.theme?.split('-') || ['light', 'blue']
                    setThemeMode(themeParts[0] as ThemeMode)
                    setThemeColor((themeParts[1] || 'blue') as ThemeColor)
                }
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async () => {
        if (!originalStoreCode) {
            console.error('No store code available')
            return
        }

        setSaving(true)
        try {
            const themeValue = `${themeMode}-${themeColor}`
            const settingsData = {
                store_name: storeName,
                store_address: storeAddress || null,
                store_phone: storePhone || null,
                store_code: originalStoreCode,  // Keep original store_code (path = store_code)
                tax_rate: taxRate,
                theme: themeValue,
                printer_enabled: printerEnabled,
                printer_name: printerName || null,
            }

            // Use originalStoreCode as the database path
            await firestoreService.updateSettings(originalStoreCode, settingsData)

            setShowSaved(true)
            setTimeout(() => setShowSaved(false), 3000)
            fetchSettings() // Refresh
        } catch (error) {
            console.error('Error saving settings:', error)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat pengaturan...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Pengaturan</h1>
                <p className={styles.subtitle}>
                    Kelola pengaturan toko dan aplikasi Anda
                </p>
            </div>

            {/* Store Information */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Store size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Informasi Toko</h3>
                        <p className={styles.sectionDesc}>
                            Pengaturan dasar toko Anda
                        </p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nama Toko</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Nama usaha Anda"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>No. Telepon</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={storePhone}
                                onChange={(e) => setStorePhone(e.target.value)}
                                placeholder="08xx-xxxx-xxxx"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Kode Toko
                                <span className={styles.labelHint}> (untuk login kasir)</span>
                            </label>
                            <input
                                type="text"
                                className={styles.input}
                                value={storeCodeInput}
                                readOnly
                                style={{ textTransform: 'uppercase', backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                Kode ini dibuat otomatis saat registrasi. Kasir menggunakan kode ini untuk login.
                            </p>
                        </div>
                        <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                            <label className={styles.label}>Alamat</label>
                            <textarea
                                className={styles.textarea}
                                value={storeAddress}
                                onChange={(e) => setStoreAddress(e.target.value)}
                                placeholder="Alamat lengkap toko"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Theme Settings */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Palette size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Tampilan</h3>
                        <p className={styles.sectionDesc}>
                            Sesuaikan tampilan aplikasi
                        </p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Mode Tema</label>
                        <div className={styles.themeGrid}>
                            <div
                                className={`${styles.themeCard} ${themeMode === 'light' ? styles.themeCardActive : ''}`}
                                onClick={() => setThemeMode('light')}
                            >
                                <div className={`${styles.themePreview} ${styles.themePreviewLight}`}>
                                    <Sun size={16} style={{ margin: 'auto', color: '#f59e0b' }} />
                                </div>
                                <span className={styles.themeLabel}>Terang</span>
                            </div>
                            <div
                                className={`${styles.themeCard} ${themeMode === 'dark' ? styles.themeCardActive : ''}`}
                                onClick={() => setThemeMode('dark')}
                            >
                                <div className={`${styles.themePreview} ${styles.themePreviewDark}`}>
                                    <Moon size={16} style={{ margin: 'auto', color: '#60a5fa' }} />
                                </div>
                                <span className={styles.themeLabel}>Gelap</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
                        <label className={styles.label}>
                            Warna Tema
                            <span className={styles.labelHint}> (primary color)</span>
                        </label>
                        <div className={styles.colorGrid}>
                            {(['blue', 'green', 'pink', 'orange', 'purple'] as ThemeColor[]).map((color) => (
                                <div
                                    key={color}
                                    className={`${styles.colorOption} ${styles[`color${color.charAt(0).toUpperCase() + color.slice(1)}`]} ${themeColor === color ? styles.colorOptionActive : ''
                                        }`}
                                    onClick={() => setThemeColor(color)}
                                >
                                    {themeColor === color && <Check size={20} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tax Settings */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Calculator size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Pajak & Harga</h3>
                        <p className={styles.sectionDesc}>
                            Pengaturan pajak penjualan
                        </p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Tarif Pajak (PPN)</label>
                        <div className={styles.taxInput}>
                            <input
                                type="number"
                                className={styles.input}
                                value={taxRate}
                                onChange={(e) => setTaxRate(Number(e.target.value))}
                                min={0}
                                max={100}
                                step={0.5}
                            />
                            <span className={styles.taxSuffix}>%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Printer Settings */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Printer size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Printer Struk</h3>
                        <p className={styles.sectionDesc}>
                            Konfigurasi printer thermal
                        </p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <div className={styles.printerStatus}>
                        <div className={`${styles.statusDot} ${printerEnabled ? styles.statusDotActive : ''}`} />
                        <span className={styles.statusText}>
                            {printerEnabled ? 'Printer aktif' : 'Printer tidak aktif'}
                        </span>
                    </div>

                    <div className={styles.toggleRow}>
                        <div className={styles.toggleInfo}>
                            <span className={styles.toggleLabel}>Aktifkan Printer</span>
                            <p className={styles.toggleDesc}>
                                Cetak struk otomatis setelah transaksi selesai
                            </p>
                        </div>
                        <div
                            className={`${styles.toggle} ${printerEnabled ? styles.toggleActive : ''}`}
                            onClick={() => setPrinterEnabled(!printerEnabled)}
                        />
                    </div>

                    {printerEnabled && (
                        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                            <label className={styles.label}>Nama Printer</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={printerName}
                                onChange={(e) => setPrinterName(e.target.value)}
                                placeholder="Contoh: POS-58, XP-58"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Google Sheets Integration */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Cloud size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Google Sheets Sync</h3>
                        <p className={styles.sectionDesc}>
                            Hubungkan data transaksi ke Google Sheets
                        </p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Web App URL</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={webAppUrlInput}
                            onChange={(e) => {
                                setWebAppUrlInput(e.target.value)
                                setWebAppUrl(e.target.value)
                            }}
                            placeholder="https://script.google.com/macros/s/xxxx/exec"
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                            Deploy Google Apps Script sebagai Web App dan paste URL-nya di sini.
                            Setelah diatur, tombol &quot;Sync ke Sheets&quot; akan muncul di halaman Laporan.
                        </p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className={styles.actions}>
                <Button variant="primary" onClick={saveSettings} disabled={saving}>
                    {saving ? (
                        <>
                            <div className="spinner" style={{ width: '16px', height: '16px' }} />
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Simpan Pengaturan
                        </>
                    )}
                </Button>
            </div>

            {/* Payment Settings Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon} style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
                        <CreditCard size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Pengaturan Pembayaran</h3>
                        <p className={styles.sectionDesc}>
                            Kelola rekening bank dan konfigurasi QRIS
                        </p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <Link href="/payment" className={styles.paymentLink}>
                        <div className={styles.paymentLinkContent}>
                            <CreditCard size={20} />
                            <div>
                                <strong>Rekening Bank</strong>
                                <span>Kelola daftar rekening bank untuk transfer</span>
                            </div>
                        </div>
                        <ChevronRight size={20} />
                    </Link>
                    <Link href="/payment" className={styles.paymentLink}>
                        <div className={styles.paymentLinkContent}>
                            <QrCode size={20} />
                            <div>
                                <strong>Konfigurasi QRIS</strong>
                                <span>Atur QRIS statis dan dinamis</span>
                            </div>
                        </div>
                        <ChevronRight size={20} />
                    </Link>
                </div>
            </div>

            {/* Receipt Settings Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <Printer size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Pengaturan Struk</h3>
                        <p className={styles.sectionDesc}>
                            Kustomisasi tampilan struk pembayaran
                        </p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <Link href="/receipt" className={styles.paymentLink}>
                        <div className={styles.paymentLinkContent}>
                            <Printer size={20} />
                            <div>
                                <strong>Template Struk</strong>
                                <span>Logo, header, footer, dan elemen struk</span>
                            </div>
                        </div>
                        <ChevronRight size={20} />
                    </Link>
                </div>
            </div>

            {/* Reset Data Section */}
            <div className={styles.section} style={{ borderColor: 'var(--danger-200)' }}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon} style={{ background: 'var(--danger-100)', color: 'var(--danger-600)' }}>
                        <Trash2 size={20} />
                    </div>
                    <div>
                        <h3 className={styles.sectionTitle}>Hapus Data Penjualan</h3>
                        <p className={styles.sectionDesc}>
                            Hapus semua data produk dan transaksi dari database
                        </p>
                    </div>
                </div>
                <div className={styles.sectionBody}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--danger-50)', borderRadius: 'var(--radius)', border: '1px solid var(--danger-200)' }}>
                        <AlertTriangle size={24} style={{ color: 'var(--danger-600)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500, color: 'var(--danger-700)', marginBottom: '0.25rem' }}>Peringatan!</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--danger-600)' }}>
                                Tindakan ini akan menghapus SEMUA data produk, transaksi, dan riwayat stok dari database online. Data tidak dapat dikembalikan.
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            style={{ background: 'var(--danger-600)', color: 'white', border: 'none' }}
                            disabled={deleting}
                            onClick={async () => {
                                if (confirm('Apakah Anda yakin ingin menghapus SEMUA data produk dan transaksi dari database?')) {
                                    if (confirm('Konfirmasi sekali lagi: Data akan DIHAPUS PERMANEN dan tidak bisa dikembalikan!')) {
                                        setDeleting(true)
                                        try {
                                            const result = await firestoreService.deleteAllProductsAndTransactions(storeCode!)
                                            alert(`Berhasil menghapus ${result.productsDeleted} produk dan ${result.transactionsDeleted} transaksi.`)
                                            window.location.reload()
                                        } catch (error) {
                                            console.error('Error deleting data:', error)
                                            alert('Gagal menghapus data. Silakan coba lagi.')
                                        } finally {
                                            setDeleting(false)
                                        }
                                    }
                                }
                            }}
                        >
                            {deleting ? (
                                <>
                                    <div className="spinner" style={{ width: 16, height: 16 }} />
                                    Menghapus...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    Hapus Data Penjualan
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Saved Toast */}
            {showSaved && (
                <div className={styles.toast}>
                    <Check size={20} />
                    Pengaturan berhasil disimpan!
                </div>
            )}
        </div>
    )
}
