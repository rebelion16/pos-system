'use client'

import { useEffect, useState } from 'react'
import { Search, FileText, Calendar, Download, Printer } from 'lucide-react'
import { firestoreService } from '@/lib/firebase/firestore'
import { Transaction, ReceiptSettings, Settings } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
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
    const { storeId } = useAuth()
    const [transactions, setTransactions] = useState<TransactionWithItems[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState('')

    useEffect(() => {
        if (!storeId) return
        fetchTransactions()
        fetchSettings()
    }, [dateFilter, storeId])

    const [storeSettings, setStoreSettings] = useState<Settings | null>(null)
    const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null)

    const fetchSettings = async () => {
        if (!storeId) return
        try {
            const [store, receipt] = await Promise.all([
                firestoreService.getSettings(storeId),
                firestoreService.getReceiptSettings()
            ])
            setStoreSettings(store)
            setReceiptSettings(receipt)
        } catch (err) {
            console.log('Settings not configured')
        }
    }

    const fetchTransactions = async () => {
        if (!storeId) return
        try {
            const allTransactions = await firestoreService.getTransactions(storeId)
            const allItems = await firestoreService.getTransactionItems(storeId)

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

    // Reprint receipt function
    const reprintReceipt = (tx: TransactionWithItems) => {
        const now = new Date(tx.created_at)
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        const dayName = days[now.getDay()]
        const date = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        const offset = -now.getTimezoneOffset() / 60
        let timezone = 'WIB'
        if (offset === 8) timezone = 'WITA'
        else if (offset === 9) timezone = 'WIT'
        const timeStr = `${hours}:${minutes} ${timezone}`

        const printWindow = window.open('', '_blank', 'width=300,height=600')
        if (!printWindow) {
            alert('Popup diblokir. Izinkan popup untuk mencetak struk.')
            return
        }

        // Build header based on settings
        let headerHtml = ''
        if (receiptSettings?.show_logo && receiptSettings?.logo_url) {
            headerHtml += `<div class="center"><img src="${receiptSettings.logo_url}" style="max-width:80px;max-height:50px;margin-bottom:4px;" /></div>`
        }
        if (!receiptSettings || receiptSettings.show_store_name) {
            headerHtml += `<div class="center store-name">${storeSettings?.store_name || 'TOKO'}</div>`
        }
        if ((!receiptSettings || receiptSettings.show_store_address) && storeSettings?.store_address) {
            headerHtml += `<div class="center store-info">${storeSettings.store_address}</div>`
        }
        if ((!receiptSettings || receiptSettings.show_store_phone) && storeSettings?.store_phone) {
            headerHtml += `<div class="center store-info">Telp: ${storeSettings.store_phone}</div>`
        }

        // Build invoice/date section
        let infoHtml = ''
        if (!receiptSettings || receiptSettings.show_invoice_number) {
            infoHtml += `<div>Invoice: ${tx.invoice_number}</div>`
        }
        if (!receiptSettings || receiptSettings.show_date_time) {
            infoHtml += `<div class="item"><span>${dayName}, ${date}</span><span>${timeStr}</span></div>`
        }

        // Build items section
        const itemsHtml = (tx.items || []).map(item => {
            let html = `<div>${item.product_name}</div>`
            if (!receiptSettings || receiptSettings.show_item_details) {
                html += `<div class="item-detail">${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}</div>`
            }
            return html
        }).join('')

        // Build footer section
        let footerHtml = ''
        if (!receiptSettings || receiptSettings.show_payment_method) {
            footerHtml += `<div>Metode: ${getPaymentMethodLabel(tx.payment_method)}</div>`
        }

        const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Struk - ${tx.invoice_number}</title>
    <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .item { display: flex; justify-content: space-between; }
        .item-detail { font-size: 10px; color: #666; }
        .total { font-size: 14px; font-weight: bold; margin: 8px 0; }
        .store-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .store-info { font-size: 10px; color: #666; }
        .reprint { text-align: center; font-size: 10px; color: #999; margin-top: 4px; }
    </style>
</head>
<body>
    ${headerHtml}
    <div class="divider"></div>
    <div class="center bold">STRUK PEMBAYARAN</div>
    <div class="reprint">(Cetak Ulang)</div>
    <div class="divider"></div>
    ${infoHtml}
    <div class="divider"></div>
    ${itemsHtml}
    <div class="divider"></div>
    <div class="total item"><span>TOTAL</span><span>${formatCurrency(tx.total)}</span></div>
    ${footerHtml}
    <div class="divider"></div>
    ${receiptSettings?.show_footer && receiptSettings?.footer_text ? `<div class="center">${receiptSettings.footer_text}</div>` : '<div class="center">Terima kasih!</div>'}
    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

        printWindow.document.write(printContent)
        printWindow.document.close()
    }

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
                                <th>Aksi</th>
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
                                    <td>
                                        <button
                                            className={styles.printBtn}
                                            onClick={() => reprintReceipt(tx)}
                                            title="Cetak Ulang Struk"
                                        >
                                            <Printer size={16} />
                                        </button>
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
