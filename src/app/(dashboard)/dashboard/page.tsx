'use client'

import { useEffect, useState } from 'react'
import {
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Package,
    Users,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { firestoreService } from '@/lib/firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import styles from './dashboard.module.css'

interface DashboardStats {
    todaySales: number
    todayTransactions: number
    todayProfit: number
    totalProducts: number
    lowStockProducts: number
    monthlySales: number
    monthlyProfit: number
    lastMonthSales: number
}

interface RecentTransaction {
    id: string
    invoice_number: string
    total: number
    payment_method: string
    created_at: string
}

export default function DashboardPage() {
    const { user, storeCode } = useAuth()
    const [stats, setStats] = useState<DashboardStats>({
        todaySales: 0,
        todayTransactions: 0,
        todayProfit: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        monthlySales: 0,
        monthlyProfit: 0,
        lastMonthSales: 0,
    })
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!storeCode) return
        fetchDashboardData()
    }, [storeCode])

    const fetchDashboardData = async () => {
        if (!storeCode) return
        try {
            // Get data from Firestore
            const [products, transactions, transactionItems] = await Promise.all([
                firestoreService.getProducts(storeCode),
                firestoreService.getTransactions(storeCode),
                firestoreService.getTransactionItems(storeCode)
            ])

            // Create product cost price map for profit calculation
            const productCostMap = new Map<string, number>()
            products.forEach(p => {
                productCostMap.set(p.id, p.cost_price || 0)
            })

            const today = new Date()
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

            // Get today's transactions
            const todayTx = transactions.filter(t => {
                const txDate = new Date(t.created_at)
                return txDate >= startOfDay && t.payment_status === 'completed'
            })

            const todaySales = todayTx.reduce((sum, t) => sum + Number(t.total), 0)
            const todayTransactionsCount = todayTx.length

            // Calculate today's profit
            const todayTxIds = new Set(todayTx.map(t => t.id))
            const todayProfit = transactionItems
                .filter(item => todayTxIds.has(item.transaction_id))
                .reduce((sum, item) => {
                    const costPrice = productCostMap.get(item.product_id) || 0
                    const sellingPrice = item.subtotal / item.quantity
                    const profit = (sellingPrice - costPrice) * item.quantity
                    return sum + profit
                }, 0)

            // Get monthly transactions
            const monthlyTx = transactions.filter(t =>
                new Date(t.created_at) >= startOfMonth && t.payment_status === 'completed'
            )
            const monthlySales = monthlyTx.reduce((sum, t) => sum + Number(t.total), 0)

            // Calculate monthly profit
            const monthlyTxIds = new Set(monthlyTx.map(t => t.id))
            const monthlyProfit = transactionItems
                .filter(item => monthlyTxIds.has(item.transaction_id))
                .reduce((sum, item) => {
                    const costPrice = productCostMap.get(item.product_id) || 0
                    const sellingPrice = item.subtotal / item.quantity
                    const profit = (sellingPrice - costPrice) * item.quantity
                    return sum + profit
                }, 0)

            const lastMonthSales = transactions
                .filter(t => {
                    const txDate = new Date(t.created_at)
                    return txDate >= startOfLastMonth && txDate <= endOfLastMonth && t.payment_status === 'completed'
                })
                .reduce((sum, t) => sum + Number(t.total), 0)

            const activeProducts = products.filter(p => p.is_active)
            const lowStockProducts = activeProducts.filter(p => p.stock < p.min_stock)

            setStats({
                todaySales,
                todayTransactions: todayTransactionsCount,
                todayProfit,
                totalProducts: activeProducts.length,
                lowStockProducts: lowStockProducts.length,
                monthlySales,
                monthlyProfit,
                lastMonthSales,
            })

            // Recent transactions
            const recent = transactions
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
            setRecentTransactions(recent)
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Tunai'
            case 'transfer': return 'Transfer'
            case 'qris': return 'QRIS'
            default: return method
        }
    }

    const getSalesChange = () => {
        if (stats.lastMonthSales === 0) return { value: 0, isUp: true }
        const change = ((stats.monthlySales - stats.lastMonthSales) / stats.lastMonthSales) * 100
        return { value: Math.abs(change).toFixed(1), isUp: change >= 0 }
    }

    const salesChange = getSalesChange()

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat dashboard...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.greeting}>
                        Selamat datang kembali, <strong>{user?.name || 'User'}</strong>! 👋
                    </p>
                </div>
                <Link href="/pos" className="btn btn-primary">
                    <ShoppingCart size={18} />
                    Buka Kasir
                </Link>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Rp</span>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Penjualan Hari Ini</p>
                        <p className={styles.statValue}>{formatCurrency(stats.todaySales)}</p>
                        <p className={styles.statSub}>{stats.todayTransactions} transaksi</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--success-50)', color: 'var(--success-700)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Keuntungan Hari Ini</p>
                        <p className={styles.statValue} style={{ color: 'var(--success-600)' }}>{formatCurrency(stats.todayProfit)}</p>
                        <p className={styles.statSub}>dari {stats.todayTransactions} transaksi</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Penjualan Bulan Ini</p>
                        <p className={styles.statValue}>{formatCurrency(stats.monthlySales)}</p>
                        <div className={`${styles.statChange} ${salesChange.isUp ? styles.statChangeUp : styles.statChangeDown}`}>
                            {salesChange.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            <span>{salesChange.value}% dari bulan lalu</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--success-100)', color: 'var(--success-700)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Keuntungan Bulan Ini</p>
                        <p className={styles.statValue} style={{ color: 'var(--success-600)' }}>{formatCurrency(stats.monthlyProfit)}</p>
                        <p className={styles.statSub}>total profit bersih</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--warning-100)', color: 'var(--warning-600)' }}>
                        <Package size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Total Produk</p>
                        <p className={styles.statValue}>{stats.totalProducts}</p>
                        {stats.lowStockProducts > 0 && (
                            <p className={styles.statWarning}>⚠️ {stats.lowStockProducts} stok menipis</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions & Recent Transactions */}
            <div className={styles.grid}>
                {/* Quick Actions */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Aksi Cepat</h3>
                    <div className={styles.quickActions}>
                        <Link href="/pos" className={styles.quickAction}>
                            <div className={styles.quickActionIcon} style={{ background: 'var(--primary-100)' }}>
                                <ShoppingCart size={20} color="var(--primary-600)" />
                            </div>
                            <span>Buka Kasir</span>
                            <ArrowRight size={16} className={styles.quickActionArrow} />
                        </Link>
                        <Link href="/products" className={styles.quickAction}>
                            <div className={styles.quickActionIcon} style={{ background: 'var(--success-100)' }}>
                                <Package size={20} color="var(--success-600)" />
                            </div>
                            <span>Kelola Produk</span>
                            <ArrowRight size={16} className={styles.quickActionArrow} />
                        </Link>
                        <Link href="/reports" className={styles.quickAction}>
                            <div className={styles.quickActionIcon} style={{ background: 'var(--warning-100)' }}>
                                <TrendingUp size={20} color="var(--warning-600)" />
                            </div>
                            <span>Lihat Laporan</span>
                            <ArrowRight size={16} className={styles.quickActionArrow} />
                        </Link>
                    </div>
                </div>

                {/* Sales Comparison Chart */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Perbandingan Penjualan</h3>
                    <div className={styles.chartContainer}>
                        <div className={styles.chartBar}>
                            <div className={styles.chartLabel}>Bulan Ini</div>
                            <div className={styles.chartBarBg}>
                                <div
                                    className={styles.chartBarFill}
                                    style={{
                                        width: `${Math.min(100, stats.lastMonthSales > 0 ? (stats.monthlySales / Math.max(stats.monthlySales, stats.lastMonthSales)) * 100 : 100)}%`,
                                        background: 'var(--primary-500)'
                                    }}
                                />
                            </div>
                            <div className={styles.chartValue}>{formatCurrency(stats.monthlySales)}</div>
                        </div>
                        <div className={styles.chartBar}>
                            <div className={styles.chartLabel}>Bulan Lalu</div>
                            <div className={styles.chartBarBg}>
                                <div
                                    className={styles.chartBarFill}
                                    style={{
                                        width: `${Math.min(100, stats.monthlySales > 0 ? (stats.lastMonthSales / Math.max(stats.monthlySales, stats.lastMonthSales)) * 100 : (stats.lastMonthSales > 0 ? 100 : 0))}%`,
                                        background: 'var(--gray-400)'
                                    }}
                                />
                            </div>
                            <div className={styles.chartValue}>{formatCurrency(stats.lastMonthSales)}</div>
                        </div>
                        <div className={styles.chartSummary}>
                            {salesChange.isUp ? (
                                <span className={styles.chartUp}>↑ +{salesChange.value}% dari bulan lalu</span>
                            ) : (
                                <span className={styles.chartDown}>↓ -{salesChange.value}% dari bulan lalu</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Transaksi Terakhir</h3>
                        <Link href="/transactions" className={styles.viewAll}>
                            Lihat Semua
                        </Link>
                    </div>

                    {recentTransactions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <ShoppingCart size={40} className={styles.emptyIcon} />
                            <p>Belum ada transaksi</p>
                        </div>
                    ) : (
                        <div className={styles.transactionList}>
                            {recentTransactions.map((tx) => (
                                <div key={tx.id} className={styles.transactionItem}>
                                    <div className={styles.transactionInfo}>
                                        <p className={styles.transactionInvoice}>{tx.invoice_number}</p>
                                        <p className={styles.transactionDate}>{formatDate(tx.created_at)}</p>
                                    </div>
                                    <div className={styles.transactionRight}>
                                        <p className={styles.transactionAmount}>{formatCurrency(tx.total)}</p>
                                        <span className={`badge badge-gray`}>
                                            {getPaymentMethodLabel(tx.payment_method)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
