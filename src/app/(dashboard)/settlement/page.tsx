'use client'

import { useEffect, useState } from 'react'
import { Calculator, DollarSign, CreditCard, Check, AlertCircle, Clock } from 'lucide-react'
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

interface LastSettlement {
    id: string
    settled_at: string
    cashier_name?: string
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
    const [settling, setSettling] = useState(false)
    const [settled, setSettled] = useState(false)
    const [lastSettlement, setLastSettlement] = useState<LastSettlement | null>(null)

    useEffect(() => {
        if (!storeId) return
        fetchData()
    }, [storeId])

    const fetchData = async () => {
        if (!storeId) return
        try {
            // Get last settlement
            const last = await firestoreService.getLastSettlement(storeId)
            setLastSettlement(last)

            // Get all transactions
            const transactions = await firestoreService.getTransactions(storeId)

            console.log('Store ID:', storeId)
            console.log('Last settlement:', last)
            console.log('Total transactions:', transactions.length)

            // Get today's date at midnight for comparison
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayStr = today.toISOString().split('T')[0]

            let filteredTx
            if (last) {
                // Check if last settlement was today
                const settlementDate = new Date(last.settled_at)
                const isSettlementToday = last.settled_at.startsWith(todayStr)

                if (isSettlementToday) {
                    // Settlement already done today, show transactions after settlement
                    filteredTx = transactions.filter(tx =>
                        new Date(tx.created_at) > settlementDate &&
                        tx.payment_status === 'completed'
                    )
                } else {
                    // Last settlement was on a previous day, show today's transactions
                    filteredTx = transactions.filter(tx =>
                        tx.created_at.startsWith(todayStr) &&
                        tx.payment_status === 'completed'
                    )
                }
            } else {
                // No settlement yet, show today's transactions
                filteredTx = transactions.filter(tx =>
                    tx.created_at.startsWith(todayStr) &&
                    tx.payment_status === 'completed'
                )
            }

            console.log('Filtered transactions:', filteredTx.length)

            let cashSales = 0
            let transferSales = 0
            let qrisSales = 0

            filteredTx.forEach(tx => {
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
                transactionCount: filteredTx.length
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

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const actualCashAmount = parseFloat(actualCash.replace(/[^0-9]/g, '')) || 0
    const difference = actualCashAmount - data.cashSales
    const isMatch = Math.abs(difference) < 1

    const handleSettle = async () => {
        if (!storeId || settling) return

        setSettling(true)
        try {
            await firestoreService.createSettlement({
                store_id: storeId,
                cashier_id: user?.cashierId || user?.id,
                cashier_name: user?.name || 'Unknown',
                cash_sales: data.cashSales,
                transfer_sales: data.transferSales,
                qris_sales: data.qrisSales,
                total_sales: data.totalSales,
                actual_cash: actualCashAmount,
                difference: difference,
                transaction_count: data.transactionCount
            })

            setSettled(true)
            setActualCash('')

            // Refresh data to show reset
            await fetchData()

            setTimeout(() => setSettled(false), 3000)
        } catch (error) {
            console.error('Error saving settlement:', error)
            alert('Gagal menyimpan settlement')
        } finally {
            setSettling(false)
        }
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
                        Rekonsiliasi penjualan • {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </p>
                </div>
            </div>

            {/* Last Settlement Info */}
            {lastSettlement && (
                <div className={styles.lastSettlement}>
                    <Clock size={16} />
                    <span>Settlement terakhir: {formatDate(lastSettlement.settled_at)}</span>
                    {lastSettlement.cashier_name && <span>oleh {lastSettlement.cashier_name}</span>}
                </div>
            )}

            <div className={styles.mainGrid}>
                {/* Sales Summary */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>
                        <Calculator size={20} />
                        Ringkasan Penjualan Hari Ini
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
                            disabled={!actualCash || settling || data.transactionCount === 0}
                        >
                            {settling ? (
                                <>
                                    <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    Simpan Settlement
                                </>
                            )}
                        </button>

                        {settled && (
                            <div className={styles.success}>
                                ✅ Settlement berhasil! Ringkasan penjualan telah di-reset.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

