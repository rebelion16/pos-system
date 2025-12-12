'use client'

import { useEffect, useState } from 'react'
import {
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Package,
    DollarSign,
    Users,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import styles from './dashboard.module.css'

interface DashboardStats {
    todaySales: number
    todayTransactions: number
    totalProducts: number
    lowStockProducts: number
    monthlySales: number
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
    const { user } = useAuth()
    const [stats, setStats] = useState<DashboardStats>({
        todaySales: 0,
        todayTransactions: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        monthlySales: 0,
        lastMonthSales: 0,
    })
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

            // Fetch today's transactions
            const { data: todayTx } = await supabase
                .from('transactions')
                .select('total')
                .gte('created_at', today.toISOString())
                .eq('payment_status', 'completed')

            // Fetch this month's sales
            const { data: monthTx } = await supabase
                .from('transactions')
                .select('total')
                .gte('created_at', startOfMonth.toISOString())
                .eq('payment_status', 'completed')

            // Fetch last month's sales
            const { data: lastMonthTx } = await supabase
                .from('transactions')
                .select('total')
                .gte('created_at', startOfLastMonth.toISOString())
                .lte('created_at', endOfLastMonth.toISOString())
                .eq('payment_status', 'completed')

            // Fetch total products
            const { count: productCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            // Fetch low stock products
            const { count: lowStockCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .lt('stock', 10)

            // Fetch recent transactions
            const { data: recent } = await supabase
                .from('transactions')
                .select('id, invoice_number, total, payment_method, created_at')
                .order('created_at', { ascending: false })
                .limit(5)

            const todaySales = todayTx?.reduce((sum, t) => sum + Number(t.total), 0) || 0
            const monthlySales = monthTx?.reduce((sum, t) => sum + Number(t.total), 0) || 0
            const lastMonthSales = lastMonthTx?.reduce((sum, t) => sum + Number(t.total), 0) || 0

            setStats({
                todaySales,
                todayTransactions: todayTx?.length || 0,
                totalProducts: productCount || 0,
                lowStockProducts: lowStockCount || 0,
                monthlySales,
                lastMonthSales,
            })

            setRecentTransactions(recent || [])
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
                        <DollarSign size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Penjualan Hari Ini</p>
                        <p className={styles.statValue}>{formatCurrency(stats.todaySales)}</p>
                        <p className={styles.statSub}>{stats.todayTransactions} transaksi</p>
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

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                        <Users size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Role Anda</p>
                        <p className={styles.statValue} style={{ fontSize: '1.25rem' }}>
                            {user?.role === 'owner' ? 'Pemilik' : user?.role === 'admin' ? 'Admin' : 'Kasir'}
                        </p>
                        <p className={styles.statSub}>{user?.email}</p>
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
