'use client'

import { useEffect, useState } from 'react'
import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Calendar,
    Download,
    FileSpreadsheet,
    Check,
    Cloud,
    CloudOff
} from 'lucide-react'
import { firestoreService } from '@/lib/firebase/firestore'
import { syncTransactionsToSheets, getWebAppUrl } from '@/lib/googleSheets'
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
    const [syncing, setSyncing] = useState(false)
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [syncMessage, setSyncMessage] = useState('')
    const [hasWebAppUrl, setHasWebAppUrl] = useState(false)
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')

    useEffect(() => {
        fetchReportData()
        setHasWebAppUrl(!!getWebAppUrl())
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

            // Fetch from Firestore
            const allTransactions = await firestoreService.getTransactions()
            const allItems = await firestoreService.getTransactionItems()

            // Filter by date and status
            const filteredTx = allTransactions.filter(tx => {
                const txDate = new Date(tx.created_at)
                return tx.payment_status === 'completed' &&
                    txDate >= start &&
                    txDate <= end
            })

            // Add items to transactions
            const txList: TransactionData[] = filteredTx.map(tx => ({
                ...tx,
                items: allItems.filter(item => item.transaction_id === tx.id)
            }))

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

    const exportToCSV = async () => {
        if (transactions.length === 0) return

        setExporting(true)
        try {
            // Fetch categories and products for category grouping
            const categories = await firestoreService.getCategories()
            const products = await firestoreService.getProducts()

            // Helper to escape CSV fields
            const escapeCSV = (val: any) => {
                if (val === null || val === undefined) return ''
                const str = String(val)
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`
                }
                return str
            }

            // Helper to format date without commas
            const formatDate = (dateStr: string) => {
                const date = new Date(dateStr)
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                const hours = date.getHours().toString().padStart(2, '0')
                const minutes = date.getMinutes().toString().padStart(2, '0')
                return `${day}/${month}/${year} ${hours}:${minutes}`
            }

            // Get method label
            const getMethod = (method: string) => {
                switch (method) {
                    case 'cash': return 'Tunai'
                    case 'transfer': return 'Transfer'
                    case 'qris': return 'QRIS'
                    default: return method
                }
            }

            // ===== SHEET 1: RINGKASAN TRANSAKSI =====
            let csvContent = 'LAPORAN PENJUALAN - ' + getPeriodLabel().toUpperCase() + '\n'
            csvContent += 'Tanggal Export: ' + formatDate(new Date().toISOString()) + '\n\n'

            // Transaction summary header
            csvContent += 'RINGKASAN TRANSAKSI\n'
            csvContent += 'No. Invoice,Tanggal,Waktu,Metode Bayar,Total,Status\n'

            // Transaction rows
            transactions.forEach(tx => {
                const date = new Date(tx.created_at)
                const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
                const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                const method = getMethod(tx.payment_method)
                const status = tx.payment_status === 'completed' ? 'Selesai' : tx.payment_status
                csvContent += `${escapeCSV(tx.invoice_number)},${dateStr},${timeStr},${method},${tx.total},${status}\n`
            })

            // Transaction summary totals
            const totalSales = transactions.reduce((sum, tx) => sum + Number(tx.total), 0)
            csvContent += `\n,,,Total Penjualan,${totalSales},\n`
            csvContent += `,,,Jumlah Transaksi,${transactions.length},\n\n`

            // ===== SHEET 2: DETAIL PENJUALAN PER ITEM =====
            csvContent += '\nDETAIL PENJUALAN PER ITEM\n'
            csvContent += 'No. Invoice,Tanggal,Nama Produk,Qty,Harga Satuan,Subtotal\n'

            transactions.forEach(tx => {
                const date = new Date(tx.created_at)
                const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
                if (tx.items && tx.items.length > 0) {
                    tx.items.forEach(item => {
                        const price = item.subtotal / item.quantity
                        csvContent += `${escapeCSV(tx.invoice_number)},${dateStr},${escapeCSV(item.product_name)},${item.quantity},${Math.round(price)},${item.subtotal}\n`
                    })
                }
            })

            // Calculate item totals
            const itemTotals = new Map<string, { name: string; qty: number; revenue: number }>()
            transactions.forEach(tx => {
                tx.items?.forEach(item => {
                    const existing = itemTotals.get(item.product_name) || { name: item.product_name, qty: 0, revenue: 0 }
                    existing.qty += item.quantity
                    existing.revenue += item.subtotal
                    itemTotals.set(item.product_name, existing)
                })
            })

            csvContent += '\nREKAP PER PRODUK\n'
            csvContent += 'Nama Produk,Total Qty,Total Penjualan\n'
            Array.from(itemTotals.values())
                .sort((a, b) => b.revenue - a.revenue)
                .forEach(item => {
                    csvContent += `${escapeCSV(item.name)},${item.qty},${item.revenue}\n`
                })

            // ===== SHEET 3: PENJUALAN PER KATEGORI =====
            csvContent += '\nPENJUALAN PER KATEGORI\n'
            csvContent += 'Kategori,Jumlah Item Terjual,Total Penjualan\n'

            // Create category map
            const categoryMap = new Map<string, string>()
            products.forEach(p => {
                if (p.category_id) {
                    const cat = categories.find(c => c.id === p.category_id)
                    categoryMap.set(p.name, cat?.name || 'Tanpa Kategori')
                } else {
                    categoryMap.set(p.name, 'Tanpa Kategori')
                }
            })

            // Calculate category totals
            const categoryTotals = new Map<string, { qty: number; revenue: number }>()
            transactions.forEach(tx => {
                tx.items?.forEach(item => {
                    const catName = categoryMap.get(item.product_name) || 'Tanpa Kategori'
                    const existing = categoryTotals.get(catName) || { qty: 0, revenue: 0 }
                    existing.qty += item.quantity
                    existing.revenue += item.subtotal
                    categoryTotals.set(catName, existing)
                })
            })

            Array.from(categoryTotals.entries())
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .forEach(([catName, data]) => {
                    csvContent += `${escapeCSV(catName)},${data.qty},${data.revenue}\n`
                })

            // ===== SHEET 4: RINGKASAN METODE PEMBAYARAN =====
            csvContent += '\nRINGKASAN METODE PEMBAYARAN\n'
            csvContent += 'Metode,Jumlah Transaksi,Total\n'

            const methodTotals = new Map<string, { count: number; total: number }>()
            transactions.forEach(tx => {
                const method = getMethod(tx.payment_method)
                const existing = methodTotals.get(method) || { count: 0, total: 0 }
                existing.count += 1
                existing.total += Number(tx.total)
                methodTotals.set(method, existing)
            })

            methodTotals.forEach((data, method) => {
                csvContent += `${method},${data.count},${data.total}\n`
            })

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
                    {hasWebAppUrl && (
                        <Button
                            variant={syncStatus === 'success' ? "primary" : "secondary"}
                            onClick={async () => {
                                setSyncing(true)
                                setSyncStatus('idle')
                                const result = await syncTransactionsToSheets()
                                setSyncing(false)
                                setSyncStatus(result.success ? 'success' : 'error')
                                setSyncMessage(result.message)
                                if (result.success) {
                                    setTimeout(() => setSyncStatus('idle'), 3000)
                                }
                            }}
                            disabled={syncing || transactions.length === 0}
                        >
                            {syncing ? (
                                <>
                                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                                    Sync...
                                </>
                            ) : syncStatus === 'success' ? (
                                <>
                                    <Check size={18} />
                                    Synced!
                                </>
                            ) : syncStatus === 'error' ? (
                                <>
                                    <CloudOff size={18} />
                                    Gagal
                                </>
                            ) : (
                                <>
                                    <Cloud size={18} />
                                    Sync ke Sheets
                                </>
                            )}
                        </Button>
                    )}
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
