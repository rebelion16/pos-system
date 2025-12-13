'use client'

import { localStorageService } from './localStorage'

interface SyncResult {
    success: boolean
    message: string
}

// Set/Get Web App URL
export const setWebAppUrl = (url: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('pos_webapp_url', url)
    }
}

export const getWebAppUrl = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('pos_webapp_url') || ''
    }
    return ''
}

// Format helpers
const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

const getPaymentLabel = (method: string): string => {
    const labels: Record<string, string> = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' }
    return labels[method] || method
}

// Main sync function
export const syncTransactionsToSheets = async (): Promise<SyncResult> => {
    const webAppUrl = getWebAppUrl()

    if (!webAppUrl) {
        return { success: false, message: 'Web App URL belum diatur di Pengaturan' }
    }

    try {
        const transactions = localStorageService.getTransactions()
        const items = localStorageService.getTransactionItems()

        if (transactions.length === 0) {
            return { success: false, message: 'Tidak ada transaksi' }
        }

        // Build rows
        const rows: string[][] = []
        transactions.forEach(tx => {
            const txItems = items.filter(item => item.transaction_id === tx.id)
            if (txItems.length === 0) {
                rows.push([
                    tx.invoice_number, formatDate(tx.created_at), '-', '0', '0', '0',
                    getPaymentLabel(tx.payment_method), tx.total.toString(),
                    tx.payment_status === 'completed' ? 'Selesai' : tx.payment_status
                ])
            } else {
                txItems.forEach((item, i) => {
                    rows.push([
                        i === 0 ? tx.invoice_number : '', i === 0 ? formatDate(tx.created_at) : '',
                        item.product_name, item.quantity.toString(), item.price.toString(),
                        item.subtotal.toString(), i === 0 ? getPaymentLabel(tx.payment_method) : '',
                        i === 0 ? tx.total.toString() : '',
                        i === 0 ? (tx.payment_status === 'completed' ? 'Selesai' : tx.payment_status) : ''
                    ])
                })
            }
        })

        const payload = JSON.stringify({
            headers: ['Invoice', 'Tanggal', 'Produk', 'Qty', 'Harga', 'Subtotal', 'Metode', 'Total', 'Status'],
            data: rows
        })

        // Use URLSearchParams for better compatibility
        const params = new URLSearchParams()
        params.append('data', payload)

        await fetch(webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            mode: 'no-cors'
        })

        // With no-cors we can't check response, assume success if no error
        return { success: true, message: `${transactions.length} transaksi dikirim!` }

    } catch (error) {
        return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Gagal'}` }
    }
}
