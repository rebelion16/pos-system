'use client'

import { useEffect, useState } from 'react'
import {
    ArrowLeft,
    FileText,
    Image,
    Eye,
    Save,
    Printer,
    Check,
    Upload,
    Trash2,
    Store,
    MapPin,
    Phone,
    Receipt,
    Clock,
    CreditCard,
    Coins,
    MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { firestoreService } from '@/lib/firebase/firestore'
import { ReceiptSettings, ReceiptPreset, Settings } from '@/types/database'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import styles from './receipt.module.css'

const DEFAULT_SETTINGS: Omit<ReceiptSettings, 'store_id'> = {
    show_logo: false,
    logo_url: null,
    show_store_name: true,
    show_store_address: true,
    show_store_phone: true,
    show_invoice_number: true,
    show_date_time: true,
    show_item_details: true,
    show_payment_method: true,
    show_change: true,
    footer_text: 'Terima kasih atas kunjungan Anda!',
    show_footer: true,
    template_preset: 'standard'
}

export default function ReceiptSettingsPage() {
    const { storeId } = useAuth()
    const [settings, setSettings] = useState<Omit<ReceiptSettings, 'store_id'>>(DEFAULT_SETTINGS)
    const [storeSettings, setStoreSettings] = useState<Settings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<string | null>(null)

    useEffect(() => {
        if (!storeId) return
        fetchSettings()
    }, [storeId])

    const fetchSettings = async () => {
        if (!storeId) return
        try {
            const [receiptData, storeData] = await Promise.all([
                firestoreService.getReceiptSettings(storeId),
                firestoreService.getSettings(storeId)
            ])
            if (receiptData) {
                setSettings(receiptData)
            }
            if (storeData) {
                setStoreSettings(storeData)
            }
        } catch (err) {
            console.error('Error fetching settings:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!storeId) return
        setSaving(true)
        try {
            await firestoreService.saveReceiptSettings(storeId, settings)
            showToast('Pengaturan struk berhasil disimpan!')
        } catch (err) {
            console.error('Error saving settings:', err)
            showToast('Gagal menyimpan pengaturan')
        } finally {
            setSaving(false)
        }
    }

    const showToast = (message: string) => {
        setToast(message)
        setTimeout(() => setToast(null), 3000)
    }

    const handlePresetChange = (preset: ReceiptPreset) => {
        let newSettings: Omit<ReceiptSettings, 'store_id'>

        switch (preset) {
            case 'simple':
                newSettings = {
                    ...settings,
                    template_preset: 'simple',
                    show_logo: false,
                    show_store_address: false,
                    show_store_phone: false,
                    show_item_details: false,
                    show_payment_method: false,
                    show_change: false,
                    show_footer: false
                }
                break
            case 'detailed':
                newSettings = {
                    ...settings,
                    template_preset: 'detailed',
                    show_logo: true,
                    show_store_name: true,
                    show_store_address: true,
                    show_store_phone: true,
                    show_invoice_number: true,
                    show_date_time: true,
                    show_item_details: true,
                    show_payment_method: true,
                    show_change: true,
                    show_footer: true
                }
                break
            default: // standard
                newSettings = {
                    ...settings,
                    template_preset: 'standard',
                    show_logo: false,
                    show_store_name: true,
                    show_store_address: true,
                    show_store_phone: true,
                    show_invoice_number: true,
                    show_date_time: true,
                    show_item_details: true,
                    show_payment_method: true,
                    show_change: true,
                    show_footer: true
                }
        }

        setSettings(newSettings)
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setSettings({
                    ...settings,
                    logo_url: reader.result as string,
                    show_logo: true
                })
            }
            reader.readAsDataURL(file)
        }
    }

    const removeLogo = () => {
        setSettings({
            ...settings,
            logo_url: null,
            show_logo: false
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
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
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/settings" className={styles.backBtn}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className={styles.title}>Pengaturan Struk</h1>
                        <p className={styles.subtitle}>Kustomisasi tampilan struk pembayaran</p>
                    </div>
                </div>
                <Button onClick={handleSave} loading={saving}>
                    <Save size={18} />
                    Simpan
                </Button>
            </div>

            <div className={styles.mainGrid}>
                {/* Settings Panel */}
                <div className={styles.settingsPanel}>
                    {/* Preset Templates */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <FileText size={18} />
                            Template Preset
                        </h3>
                        <div className={styles.presetGrid}>
                            {(['simple', 'standard', 'detailed'] as ReceiptPreset[]).map((preset) => (
                                <button
                                    key={preset}
                                    className={`${styles.presetBtn} ${settings.template_preset === preset ? styles.presetActive : ''}`}
                                    onClick={() => handlePresetChange(preset)}
                                >
                                    <span className={styles.presetName}>
                                        {preset === 'simple' ? 'Simple' : preset === 'standard' ? 'Standard' : 'Detailed'}
                                    </span>
                                    <span className={styles.presetDesc}>
                                        {preset === 'simple' ? 'Minimalis' : preset === 'standard' ? 'Standar' : 'Lengkap'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Image size={18} />
                            Logo Toko
                        </h3>
                        <div className={styles.logoSection}>
                            {settings.logo_url ? (
                                <div className={styles.logoPreview}>
                                    <img src={settings.logo_url} alt="Logo" />
                                    <button className={styles.removeLogoBtn} onClick={removeLogo}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label className={styles.uploadArea}>
                                    <Upload size={24} />
                                    <span>Upload Logo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        hidden
                                    />
                                </label>
                            )}
                            <label className={styles.toggleRow}>
                                <span>Tampilkan Logo</span>
                                <input
                                    type="checkbox"
                                    checked={settings.show_logo}
                                    onChange={(e) => setSettings({ ...settings, show_logo: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Header Elements */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Store size={18} />
                            Header Struk
                        </h3>
                        <div className={styles.toggleList}>
                            <label className={styles.toggleRow}>
                                <div className={styles.toggleLabel}>
                                    <Store size={16} />
                                    <span>Nama Toko</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_store_name}
                                    onChange={(e) => setSettings({ ...settings, show_store_name: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                            <label className={styles.toggleRow}>
                                <div className={styles.toggleLabel}>
                                    <MapPin size={16} />
                                    <span>Alamat Toko</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_store_address}
                                    onChange={(e) => setSettings({ ...settings, show_store_address: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                            <label className={styles.toggleRow}>
                                <div className={styles.toggleLabel}>
                                    <Phone size={16} />
                                    <span>Telepon Toko</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_store_phone}
                                    onChange={(e) => setSettings({ ...settings, show_store_phone: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Content Elements */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Receipt size={18} />
                            Konten Struk
                        </h3>
                        <div className={styles.toggleList}>
                            <label className={styles.toggleRow}>
                                <div className={styles.toggleLabel}>
                                    <FileText size={16} />
                                    <span>Nomor Invoice</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_invoice_number}
                                    onChange={(e) => setSettings({ ...settings, show_invoice_number: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                            <label className={styles.toggleRow}>
                                <div className={styles.toggleLabel}>
                                    <Clock size={16} />
                                    <span>Tanggal & Waktu</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_date_time}
                                    onChange={(e) => setSettings({ ...settings, show_date_time: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                            <label className={styles.toggleRow}>
                                <div className={styles.toggleLabel}>
                                    <Receipt size={16} />
                                    <span>Detail Item (Qty x Harga)</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_item_details}
                                    onChange={(e) => setSettings({ ...settings, show_item_details: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                            <label className={styles.toggleRow}>
                                <div className={styles.toggleLabel}>
                                    <CreditCard size={16} />
                                    <span>Metode Pembayaran</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_payment_method}
                                    onChange={(e) => setSettings({ ...settings, show_payment_method: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                            <label className={styles.toggleRow}>
                                <div className={styles.toggleLabel}>
                                    <Coins size={16} />
                                    <span>Kembalian</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_change}
                                    onChange={(e) => setSettings({ ...settings, show_change: e.target.checked })}
                                    className={styles.toggle}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <MessageSquare size={18} />
                            Footer / Pesan
                        </h3>
                        <label className={styles.toggleRow}>
                            <span>Tampilkan Footer</span>
                            <input
                                type="checkbox"
                                checked={settings.show_footer}
                                onChange={(e) => setSettings({ ...settings, show_footer: e.target.checked })}
                                className={styles.toggle}
                            />
                        </label>
                        <textarea
                            className={styles.footerInput}
                            value={settings.footer_text}
                            onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                            placeholder="Pesan terima kasih..."
                            rows={3}
                            disabled={!settings.show_footer}
                        />
                    </div>
                </div>

                {/* Preview Panel */}
                <div className={styles.previewPanel}>
                    <h3 className={styles.previewTitle}>
                        <Eye size={18} />
                        Preview Struk
                    </h3>
                    <div className={styles.receiptPreview}>
                        <div className={styles.receipt}>
                            {/* Logo */}
                            {settings.show_logo && settings.logo_url && (
                                <div className={styles.receiptLogo}>
                                    <img src={settings.logo_url} alt="Logo" />
                                </div>
                            )}

                            {/* Store Header */}
                            {settings.show_store_name && (
                                <div className={styles.receiptStoreName}>
                                    {storeSettings?.store_name || 'Nama Toko'}
                                </div>
                            )}
                            {settings.show_store_address && storeSettings?.store_address && (
                                <div className={styles.receiptStoreInfo}>
                                    {storeSettings.store_address}
                                </div>
                            )}
                            {settings.show_store_phone && storeSettings?.store_phone && (
                                <div className={styles.receiptStoreInfo}>
                                    Telp: {storeSettings.store_phone}
                                </div>
                            )}

                            <div className={styles.receiptDivider}></div>
                            <div className={styles.receiptTitle}>STRUK PEMBAYARAN</div>
                            <div className={styles.receiptDivider}></div>

                            {/* Invoice & Date */}
                            {settings.show_invoice_number && (
                                <div className={styles.receiptRow}>
                                    Invoice: INV-20241214-001
                                </div>
                            )}
                            {settings.show_date_time && (
                                <>
                                    <div className={styles.receiptRow}>Sabtu, 14/12/2024</div>
                                    <div className={styles.receiptRow}>Jam: 12:19 WIB</div>
                                </>
                            )}

                            <div className={styles.receiptDivider}></div>

                            {/* Items */}
                            <div className={styles.receiptItem}>
                                <span>Produk Contoh A</span>
                            </div>
                            {settings.show_item_details && (
                                <div className={styles.receiptItemDetail}>
                                    2 x Rp50.000 = Rp100.000
                                </div>
                            )}
                            <div className={styles.receiptItem}>
                                <span>Produk Contoh B</span>
                            </div>
                            {settings.show_item_details && (
                                <div className={styles.receiptItemDetail}>
                                    1 x Rp25.000 = Rp25.000
                                </div>
                            )}

                            <div className={styles.receiptDivider}></div>

                            {/* Total */}
                            <div className={styles.receiptTotal}>
                                <span>TOTAL</span>
                                <span>Rp125.000</span>
                            </div>

                            {settings.show_change && (
                                <div className={styles.receiptRow}>
                                    <span>Kembalian</span>
                                    <span>Rp25.000</span>
                                </div>
                            )}

                            {settings.show_payment_method && (
                                <div className={styles.receiptRow}>
                                    Metode: CASH
                                </div>
                            )}

                            <div className={styles.receiptDivider}></div>

                            {/* Footer */}
                            {settings.show_footer && settings.footer_text && (
                                <div className={styles.receiptFooter}>
                                    {settings.footer_text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={styles.toast}>
                    <Check size={20} />
                    {toast}
                </div>
            )}
        </div>
    )
}
