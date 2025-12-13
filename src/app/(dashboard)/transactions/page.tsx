'use client'

import { useEffect, useState } from 'react'
import { Search, FileText, Calendar, Download } from 'lucide-react'
import { firestoreService } from '@/lib/firebase/firestore'
import { Transaction } from '@/types/database'
import styles from './transactions.module.css'

interface TransactionWithItems extends Transaction {
    items?: Array<{
        id: string
        product_name: string
        quantity: number
        price: number
        subtotal: number
    }>
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<TransactionWithItems[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState('')

    useEffect(() => {
        fetchTransactions()
    }, [dateFilter])

    const fetchTransactions = async () => {
        try {
            const allTransactions = await firestoreService.getTransactions()
            const allItems = await firestoreService.getTransactionItems()

            // Combine transactions with their items
            let txWithItems: TransactionWithItems[] = allTransactions.map(tx => ({
                ...tx,
                items: allItems.filter(item => item.transaction_id === tx.id)
            }))

            // Sort by date descending
            txWithItems.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )

            // Filter by date if set
            if (dateFilter) {
                const filterDate = new Date(dateFilter).toISOString().split('T')[0]
                txWithItems = txWithItems.filter(tx =>
                    tx.created_at.startsWith(filterDate)
                )
            }

            setTransactions(txWithItems)
        } catch (error) {
            console.error('Error fetching transactions:', error)
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return 'badge-success'
            case 'pending': return 'badge-warning'
            case 'failed': return 'badge-danger'
            default: return 'badge-gray'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Selesai'
            case 'pending': return 'Pending'
            case 'failed': return 'Gagal'
            case 'refunded': return 'Refund'
            default: return status
        }
    }

    const filteredTransactions = transactions.filter(tx =>
        tx.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat transaksi...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Transaksi</h1>
                    <p className={styles.subtitle}>Riwayat semua transaksi</p>
                </div>
            </div>

            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Cari invoice..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <div className={styles.dateFilter}>
                    <Calendar size={18} />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>
            </div>

            {filteredTransactions.length === 0 ? (
                <div className={styles.emptyState}>
                    <FileText size={64} className={styles.emptyIcon} />
                    <h3>Belum ada transaksi</h3>
                    <p>Transaksi akan muncul di sini setelah ada penjualan</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Tanggal</th>
                                <th>Items</th>
                                <th>Metode</th>
                                <th>Total</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id}>
                                    <td>
                                        <span className={styles.invoice}>{tx.invoice_number}</span>
                                    </td>
                                    <td>{formatDate(tx.created_at)}</td>
                                    <td>{tx.items?.length || 0} item</td>
                                    <td>
                                        <span className="badge badge-gray">
                                            {getPaymentMethodLabel(tx.payment_method)}
                                        </span>
                                    </td>
                                    <td className={styles.amount}>{formatCurrency(tx.total)}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(tx.payment_status)}`}>
                                            {getStatusLabel(tx.payment_status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
