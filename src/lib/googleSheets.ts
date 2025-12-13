'use client'

import { localStorageService } from './localStorage'

// Types
interface SyncResult {
    success: boolean
    message: string
    rowsAdded?: number
}

// Google Apps Script Web App URL (user must deploy their own)
// Instructions: https://developers.google.com/apps-script/guides/web
let WEBAPP_URL = ''

// Set Web App URL (call this after user provides their deployed URL)
export const setWebAppUrl = (url: string) => {
    WEBAPP_URL = url
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
            message: 'Web App URL belum diatur. Buka Pengaturan untuk mengatur URL Google Apps Script.'
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

        // Send to Google Apps Script
        const response = await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors', // Required for cross-origin Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'sync',
                data: rows,
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
                ]
            })
        })

        // With no-cors, we can't read the response, but if no error thrown, assume success
        return {
            success: true,
            message: `${transactions.length} transaksi berhasil dikirim ke Google Sheets!`,
            rowsAdded: rows.length
        }

    } catch (error) {
        console.error('Sync error:', error)
        return {
            success: false,
            message: `Error: ${error instanceof Error ? error.message : 'Gagal mengirim data'}`
        }
    }
}

// Generate Apps Script code for user to deploy
export const getAppsScriptCode = (spreadsheetId: string): string => {
    return `// POS System - Google Apps Script
// Deploy ini sebagai Web App

const SPREADSHEET_ID = '${spreadsheetId}';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Transaksi');
    
    // Create sheet if not exists
    if (!sheet) {
      sheet = ss.insertSheet('Transaksi');
    }
    
    // Clear and add headers if first row
    if (sheet.getLastRow() === 0 && data.headers) {
      sheet.appendRow(data.headers);
    }
    
    // Append data rows
    if (data.data && data.data.length > 0) {
      // Clear existing data (keep headers)
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
      }
      
      // Add new data
      data.data.forEach(row => {
        sheet.appendRow(row);
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data synced successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('POS Sync API is running');
}
`;
}

export default {
    syncTransactionsToSheets,
    setWebAppUrl,
    getWebAppUrl,
    getAppsScriptCode
}
