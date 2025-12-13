'use client'

import { localStorageService } from './localStorage'

// Types for sync
interface SyncResult {
    success: boolean
    message: string
    rowsAdded?: number
}

// Spreadsheet URL
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1PHR_1NWx-cQHu2JIGOrjR25Oa4-xfh61R21dxjGHWnM/edit'

// Format currency for spreadsheet
const formatCurrency = (amount: number): string => {
    return amount.toString()
}

// Format date for spreadsheet
const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// Get payment method label
const getPaymentLabel = (method: string): string => {
    switch (method) {
        case 'cash': return 'Tunai'
        case 'transfer': return 'Transfer'
        case 'qris': return 'QRIS'
        default: return method
    }
}

// Main sync function - downloads CSV and opens Google Sheets
export const syncTransactionsToSheets = async (): Promise<SyncResult> => {
    try {
        const transactions = localStorageService.getTransactions()
        const items = localStorageService.getTransactionItems()

        if (transactions.length === 0) {
            return { success: false, message: 'Tidak ada transaksi untuk disinkronkan' }
        }

        // Build CSV content
        const headers = [
            'No. Invoice',
            'Tanggal',
            'Produk',
            'Qty',
            'Harga',
            'Subtotal',
            'Metode Bayar',
            'Total Transaksi',
            'Status'
        ]

        const rows: string[][] = []

        transactions.forEach(tx => {
            const txItems = items.filter(item => item.transaction_id === tx.id)

            if (txItems.length === 0) {
                rows.push([
                    tx.invoice_number,
                    formatDate(tx.created_at),
                    '-',
                    '0',
                    '0',
                    '0',
                    getPaymentLabel(tx.payment_method),
                    formatCurrency(tx.total),
                    tx.payment_status === 'completed' ? 'Selesai' : tx.payment_status
                ])
            } else {
                txItems.forEach((item, index) => {
                    rows.push([
                        index === 0 ? tx.invoice_number : '',
                        index === 0 ? formatDate(tx.created_at) : '',
                        item.product_name,
                        item.quantity.toString(),
                        formatCurrency(item.price),
                        formatCurrency(item.subtotal),
                        index === 0 ? getPaymentLabel(tx.payment_method) : '',
                        index === 0 ? formatCurrency(tx.total) : '',
                        index === 0 ? (tx.payment_status === 'completed' ? 'Selesai' : tx.payment_status) : ''
                    ])
                })
            }
        })

        // Create CSV content with proper escaping
        const escapeCSV = (str: string) => {
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        }

        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n')

        // Download CSV file
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const filename = `transaksi_pos_${new Date().toISOString().split('T')[0]}.csv`

        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100)

        // Open Google Sheets in new tab
        window.open(SPREADSHEET_URL, '_blank')

        return {
            success: true,
            message: `File "${filename}" diunduh! Buka Google Sheets → File → Import → Upload file tersebut.`,
            rowsAdded: transactions.length
        }

    } catch (error) {
        console.error('Sync error:', error)
        return {
            success: false,
            message: `Error: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`
        }
    }
}

export default {
    syncTransactionsToSheets
}
