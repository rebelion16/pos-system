'use client'

import { localStorageService } from './localStorage'

// Types
interface SyncResult {
    success: boolean
    message: string
    rowsAdded?: number
}

// Set Web App URL
export const setWebAppUrl = (url: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('pos_webapp_url', url)
    }
}

// Get stored Web App URL
export const getWebAppUrl = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('pos_webapp_url') || ''
    }
    return ''
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

// Get payment label
const getPaymentLabel = (method: string): string => {
    switch (method) {
        case 'cash': return 'Tunai'
        case 'transfer': return 'Transfer'
        case 'qris': return 'QRIS'
        default: return method
    }
}

// Sync transactions to Google Sheets via Apps Script
export const syncTransactionsToSheets = async (): Promise<SyncResult> => {
    const webAppUrl = getWebAppUrl()

    if (!webAppUrl) {
        return {
            success: false,
            message: 'Web App URL belum diatur. Buka Pengaturan untuk mengatur URL.'
        }
    }

    try {
        const transactions = localStorageService.getTransactions()
        const items = localStorageService.getTransactionItems()

        if (transactions.length === 0) {
            return { success: false, message: 'Tidak ada transaksi untuk disinkronkan' }
        }

        // Prepare data rows
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
                    tx.total.toString(),
                    tx.payment_status === 'completed' ? 'Selesai' : tx.payment_status
                ])
            } else {
                txItems.forEach((item, index) => {
                    rows.push([
                        index === 0 ? tx.invoice_number : '',
                        index === 0 ? formatDate(tx.created_at) : '',
                        item.product_name,
                        item.quantity.toString(),
                        item.price.toString(),
                        item.subtotal.toString(),
                        index === 0 ? getPaymentLabel(tx.payment_method) : '',
                        index === 0 ? tx.total.toString() : '',
                        index === 0 ? (tx.payment_status === 'completed' ? 'Selesai' : tx.payment_status) : ''
                    ])
                })
            }
        })

        // Prepare payload
        const payload = {
            action: 'sync',
            headers: [
                'No. Invoice',
                'Tanggal',
                'Produk',
                'Qty',
                'Harga',
                'Subtotal',
                'Metode Bayar',
                'Total',
                'Status'
            ],
            data: rows
        }

        // Send as form data (works better with Apps Script)
        const formData = new FormData()
        formData.append('payload', JSON.stringify(payload))

        const response = await fetch(webAppUrl, {
            method: 'POST',
            body: formData
        })

        // Check response
        if (response.ok || response.type === 'opaque') {
            return {
                success: true,
                message: `${transactions.length} transaksi berhasil dikirim ke Google Sheets!`,
                rowsAdded: rows.length
            }
        } else {
            return {
                success: false,
                message: 'Gagal mengirim data. Periksa URL Web App.'
            }
        }

    } catch (error) {
        console.error('Sync error:', error)
        return {
            success: false,
            message: `Error: ${error instanceof Error ? error.message : 'Gagal mengirim data'}`
        }
    }
}

export default {
    syncTransactionsToSheets,
    setWebAppUrl,
    getWebAppUrl
}
