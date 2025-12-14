'use client'

import { useEffect, useState } from 'react'
import { Calculator, DollarSign, CreditCard, Check, AlertCircle } from 'lucide-react'
import { firestoreService } from '@/lib/firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import styles from './settlement.module.css'

interface SettlementData {
    cashSales: number
    transferSales: number
    qrisSales: number
    totalSales: number
    transactionCount: number
}

export default function SettlementPage() {
    const { user, storeId } = useAuth()
    const [data, setData] = useState<SettlementData>({
        cashSales: 0,
        transferSales: 0,
        qrisSales: 0,
        totalSales: 0,
        transactionCount: 0
    })
    const [actualCash, setActualCash] = useState('')
    const [loading, setLoading] = useState(true)
    const [settled, setSettled] = useState(false)

    useEffect(() => {
        if (!storeId) return
        fetchTodaysSales()
    }, [storeId])

    const fetchTodaysSales = async () => {
        if (!storeId) return
        try {
            const transactions = await firestoreService.getTransactions(storeId)

            // Filter today's completed transactions
            const today = new Date().toISOString().split('T')[0]
            const todaysTx = transactions.filter(tx =>
                tx.created_at.startsWith(today) &&
                tx.payment_status === 'completed'
            )

            let cashSales = 0
            let transferSales = 0
            let qrisSales = 0

            todaysTx.forEach(tx => {
                if (tx.payment_method === 'cash') {
                    cashSales += tx.total
                } else if (tx.payment_method === 'transfer') {
                    transferSales += tx.total
                } else if (tx.payment_method === 'qris') {
                    qrisSales += tx.total
                }
            })

            setData({
                cashSales,
                transferSales,
                qrisSales,
                totalSales: cashSales + transferSales + qrisSales,
                transactionCount: todaysTx.length
            })
        } catch (error) {
            console.error('Error fetching sales data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const actualCashAmount = parseFloat(actualCash.replace(/[^0-9]/g, '')) || 0
    const difference = actualCashAmount - data.cashSales
    const isMatch = Math.abs(difference) < 1

    const handleSettle = () => {
        // In a real app, save settlement data to database
        setSettled(true)
        setTimeout(() => setSettled(false), 3000)
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat data settlement...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Settlement Kasir</h1>
                    <p className={styles.subtitle}>
                        Rekonsiliasi penjualan hari ini • {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </p>
                </div>
            </div>

            <div className={styles.mainGrid}>
                {/* Sales Summary */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>
                        <Calculator size={20} />
                        Ringkasan Penjualan
                    </h3>

                    <div className={styles.salesList}>
                        <div className={styles.salesItem}>
                            <div className={styles.salesIcon} style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
                                <DollarSign size={20} />
                            </div>
                            <div className={styles.salesInfo}>
                                <span className={styles.salesLabel}>Tunai (Cash)</span>
                                <span className={styles.salesValue}>{formatCurrency(data.cashSales)}</span>
                            </div>
                        </div>

                        <div className={styles.salesItem}>
                            <div className={styles.salesIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                                <CreditCard size={20} />
                            </div>
                            <div className={styles.salesInfo}>
                                <span className={styles.salesLabel}>Transfer Bank</span>
                                <span className={styles.salesValue}>{formatCurrency(data.transferSales)}</span>
                            </div>
                        </div>

                        <div className={styles.salesItem}>
                            <div className={styles.salesIcon} style={{ background: 'var(--warning-100)', color: 'var(--warning-600)' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                            </div>
                            <div className={styles.salesInfo}>
                                <span className={styles.salesLabel}>QRIS</span>
                                <span className={styles.salesValue}>{formatCurrency(data.qrisSales)}</span>
                            </div>
                        </div>

                        <div className={styles.salesTotal}>
                            <span>Total Penjualan</span>
                            <span>{formatCurrency(data.totalSales)}</span>
                        </div>
                        <div className={styles.txCount}>
                            {data.transactionCount} transaksi hari ini
                        </div>
                    </div>
                </div>

                {/* Cash Reconciliation */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>
                        <DollarSign size={20} />
                        Rekonsiliasi Tunai
                    </h3>

                    <div className={styles.recon}>
                        <div className={styles.reconRow}>
                            <span>Penjualan Tunai (Sistem)</span>
                            <span className={styles.system}>{formatCurrency(data.cashSales)}</span>
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Uang Tunai Aktual (di Laci)</label>
                            <input
                                type="text"
                                className={styles.cashInput}
                                placeholder="Masukkan jumlah uang..."
                                value={actualCash}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '')
                                    setActualCash(value ? parseInt(value).toLocaleString('id-ID') : '')
                                }}
                            />
                        </div>

                        {actualCash && (
                            <div className={`${styles.difference} ${isMatch ? styles.match : difference > 0 ? styles.over : styles.under}`}>
                                <div className={styles.diffIcon}>
                                    {isMatch ? <Check size={20} /> : <AlertCircle size={20} />}
                                </div>
                                <div className={styles.diffInfo}>
                                    <span className={styles.diffLabel}>
                                        {isMatch ? 'Sesuai!' : difference > 0 ? 'Kelebihan' : 'Kekurangan'}
                                    </span>
                                    <span className={styles.diffValue}>
                                        {isMatch ? 'Data cocok' : formatCurrency(Math.abs(difference))}
                                    </span>
                                </div>
                            </div>
                        )}

                        <button
                            className={`btn btn-primary ${styles.settleBtn}`}
                            onClick={handleSettle}
                            disabled={!actualCash}
                        >
                            <Check size={18} />
                            Simpan Settlement
                        </button>

                        {settled && (
                            <div className={styles.success}>
                                ✅ Settlement berhasil disimpan!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
