'use client'

import { useEffect, useState } from 'react'
import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Calendar,
    Download,
    FileSpreadsheet,
    Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'
import styles from './reports.module.css'

interface ReportData {
    totalSales: number
    totalTransactions: number
    totalProfit: number
    avgTransaction: number
    salesByMethod: { method: string; total: number; count: number }[]
    topProducts: { name: string; quantity: number; revenue: number }[]
}

interface TransactionData {
    id: string
    invoice_number: string
    total: number
    payment_method: string
    payment_status: string
    created_at: string
    items?: { product_name: string; quantity: number; subtotal: number }[]
}

export default function ReportsPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null)
    const [transactions, setTransactions] = useState<TransactionData[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [exportSuccess, setExportSuccess] = useState(false)
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
    const supabase = createClient()

    useEffect(() => {
        fetchReportData()
    }, [period])

    const getDateRange = () => {
        const now = new Date()
        const start = new Date()

        switch (period) {
            case 'today':
                start.setHours(0, 0, 0, 0)
                break
            case 'week':
                start.setDate(now.getDate() - 7)
                start.setHours(0, 0, 0, 0)
                break
            case 'month':
                start.setMonth(now.getMonth() - 1)
                start.setHours(0, 0, 0, 0)
                break
        }

        return { start, end: now }
    }

    const fetchReportData = async () => {
        setLoading(true)
        try {
            const { start, end } = getDateRange()

            // Fetch transactions
            const { data } = await supabase
                .from('transactions')
                .select(`
          *,
          items:transaction_items(*)
        `)
                .eq('payment_status', 'completed')
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString())

            const txList = (data || []) as unknown as TransactionData[]
            setTransactions(txList)

            if (!txList.length) {
                setReportData(null)
                return
            }

            const totalSales = txList.reduce((sum, tx) => sum + Number(tx.total), 0)
            const totalTransactions = txList.length
            const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0

            // Sales by method
            const methodMap = new Map<string, { total: number; count: number }>()
            txList.forEach(tx => {
                const current = methodMap.get(tx.payment_method) || { total: 0, count: 0 }
                methodMap.set(tx.payment_method, {
                    total: current.total + Number(tx.total),
                    count: current.count + 1
                })
            })
            const salesByMethod = Array.from(methodMap.entries()).map(([method, data]) => ({
                method,
                ...data
            }))

            // Top products
            const productMap = new Map<string, { quantity: number; revenue: number }>()
            txList.forEach(tx => {
                tx.items?.forEach((item) => {
                    const current = productMap.get(item.product_name) || { quantity: 0, revenue: 0 }
                    productMap.set(item.product_name, {
                        quantity: current.quantity + item.quantity,
                        revenue: current.revenue + Number(item.subtotal)
                    })
                })
            })
            const topProducts = Array.from(productMap.entries())
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)

            setReportData({
                totalSales,
                totalTransactions,
                totalProfit: 0, // Calculate if cost_price is available
                avgTransaction,
                salesByMethod,
                topProducts
            })
        } catch (error) {
            console.error('Error fetching report data:', error)
        } finally {
            setLoading(false)
        }
    }

    const exportToCSV = () => {
        if (transactions.length === 0) return

        setExporting(true)
        try {
            // Create CSV content
            const headers = ['No. Invoice', 'Tanggal', 'Metode Bayar', 'Total', 'Status']
            const rows = transactions.map(tx => [
                tx.invoice_number,
                new Date(tx.created_at).toLocaleString('id-ID'),
                tx.payment_method === 'cash' ? 'Tunai' : tx.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
                tx.total,
                tx.payment_status === 'completed' ? 'Selesai' : tx.payment_status
            ])

            // Add summary
            const totalSales = transactions.reduce((sum, tx) => sum + Number(tx.total), 0)
            rows.push([])
            rows.push(['', '', 'Total Penjualan:', totalSales, ''])

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n')

            // Create blob and download
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `laporan_${period}_${new Date().toISOString().split('T')[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            setExportSuccess(true)
            setTimeout(() => setExportSuccess(false), 3000)
        } catch (error) {
            console.error('Error exporting:', error)
        } finally {
            setExporting(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Tunai'
            case 'transfer': return 'Transfer'
            case 'qris': return 'QRIS'
            default: return method
        }
    }

    const getPeriodLabel = () => {
        switch (period) {
            case 'today': return 'Hari Ini'
            case 'week': return '7 Hari Terakhir'
            case 'month': return '30 Hari Terakhir'
        }
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat laporan...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Laporan</h1>
                    <p className={styles.subtitle}>Analisis penjualan toko Anda</p>
                </div>
                <div className={styles.headerActions}>
                    <Button
                        variant={exportSuccess ? "primary" : "secondary"}
                        onClick={exportToCSV}
                        disabled={exporting || transactions.length === 0}
                    >
                        {exporting ? (
                            <>
                                <div className="spinner" style={{ width: '16px', height: '16px' }} />
                                Mengexport...
                            </>
                        ) : exportSuccess ? (
                            <>
                                <Check size={18} />
                                Berhasil!
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={18} />
                                Export Excel
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Period Selector */}
            <div className={styles.periodSelector}>
                <button
                    className={`${styles.periodBtn} ${period === 'today' ? styles.periodActive : ''}`}
                    onClick={() => setPeriod('today')}
                >
                    <Calendar size={16} />
                    Hari Ini
                </button>
                <button
                    className={`${styles.periodBtn} ${period === 'week' ? styles.periodActive : ''}`}
                    onClick={() => setPeriod('week')}
                >
                    <Calendar size={16} />
                    7 Hari
                </button>
                <button
                    className={`${styles.periodBtn} ${period === 'month' ? styles.periodActive : ''}`}
                    onClick={() => setPeriod('month')}
                >
                    <Calendar size={16} />
                    30 Hari
                </button>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className={styles.statLabel}>Total Penjualan</p>
                        <p className={styles.statValue}>{formatCurrency(reportData?.totalSales || 0)}</p>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p className={styles.statLabel}>Total Transaksi</p>
                        <p className={styles.statValue}>{reportData?.totalTransactions || 0}</p>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--warning-100)', color: 'var(--warning-600)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className={styles.statLabel}>Rata-rata Transaksi</p>
                        <p className={styles.statValue}>{formatCurrency(reportData?.avgTransaction || 0)}</p>
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Sales by Method */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Penjualan per Metode</h3>
                    {reportData?.salesByMethod.length === 0 ? (
                        <p className={styles.noData}>Belum ada data</p>
                    ) : (
                        <div className={styles.methodList}>
                            {reportData?.salesByMethod.map((item) => (
                                <div key={item.method} className={styles.methodItem}>
                                    <div className={styles.methodInfo}>
                                        <span className={styles.methodName}>{getMethodLabel(item.method)}</span>
                                        <span className={styles.methodCount}>{item.count} transaksi</span>
                                    </div>
                                    <span className={styles.methodTotal}>{formatCurrency(item.total)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Products */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Produk Terlaris</h3>
                    {reportData?.topProducts.length === 0 ? (
                        <p className={styles.noData}>Belum ada data</p>
                    ) : (
                        <div className={styles.productList}>
                            {reportData?.topProducts.map((item, index) => (
                                <div key={item.name} className={styles.productItem}>
                                    <span className={styles.productRank}>#{index + 1}</span>
                                    <div className={styles.productInfo}>
                                        <span className={styles.productName}>{item.name}</span>
                                        <span className={styles.productQty}>{item.quantity} terjual</span>
                                    </div>
                                    <span className={styles.productRevenue}>{formatCurrency(item.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
