'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    QrCode,
    X,
    Check,
    Package,
    Camera,
    Wifi,
    WifiOff,
    Printer,
    Scan,
    Copy,
    Building2,
    Phone,
    Send,
    FileText,
    MessageCircle
} from 'lucide-react'
import { firestoreService } from '@/lib/firebase/firestore'
import { Product, Category, ProductWithRelations, PaymentMethod, BankAccount, QRISConfig } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import styles from './pos.module.css'

type ReceiptType = 'none' | 'print' | 'whatsapp' | 'telegram'

interface CartItem {
    product: Product
    quantity: number
}

export default function POSPage() {
    const { user } = useAuth()
    const [products, setProducts] = useState<ProductWithRelations[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [showPayment, setShowPayment] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
    const [cashReceived, setCashReceived] = useState('')
    const [processing, setProcessing] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [lastInvoice, setLastInvoice] = useState('')
    const [showScanner, setShowScanner] = useState(false)
    const [scannerConnected, setScannerConnected] = useState(false)
    const [printerConnected, setPrinterConnected] = useState(false)
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
    const [qrisConfig, setQrisConfig] = useState<QRISConfig | null>(null)
    const [selectedBank, setSelectedBank] = useState<string>('')
    const [showReceiptModal, setShowReceiptModal] = useState(false)
    const [receiptType, setReceiptType] = useState<ReceiptType>('none')
    const [receiptContact, setReceiptContact] = useState('')
    const [sendingReceipt, setSendingReceipt] = useState(false)
    const [lastTransactionData, setLastTransactionData] = useState<{
        invoice: string
        items: { name: string; qty: number; price: number; subtotal: number }[]
        total: number
        paymentMethod: PaymentMethod
        change?: number
    } | null>(null)
    const [storeSettings, setStoreSettings] = useState<{
        name: string
        phone: string | null
        address: string | null
    } | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const barcodeBufferRef = useRef('')
    const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        fetchProducts()
        fetchCategories()
        fetchPaymentSettings()

        // Focus search on mount
        if (searchRef.current) {
            searchRef.current.focus()
        }
    }, [])

    const fetchPaymentSettings = async () => {
        try {
            const [accounts, qris, settings] = await Promise.all([
                firestoreService.getBankAccounts(),
                firestoreService.getQRISConfig(),
                firestoreService.getSettings(),
            ])
            setBankAccounts(accounts.filter(a => a.is_active))
            setQrisConfig(qris)
            if (accounts.length > 0) {
                setSelectedBank(accounts[0].id)
            }
            if (settings) {
                setStoreSettings({
                    name: settings.store_name || 'Toko',
                    phone: settings.store_phone,
                    address: settings.store_address,
                })
            }
        } catch (err) {
            console.log('[POS] Payment settings not configured:', err)
        }
    }

    const fetchProducts = async () => {
        try {
            const data = await firestoreService.getActiveProductsWithRelations()
            setProducts(data)
        } catch (err) {
            console.warn('Error fetching products:', err)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        const data = await firestoreService.getCategories()
        setCategories(data)
    }

    // Function to find product by barcode and add to cart
    const findAndAddByBarcode = useCallback((barcode: string) => {
        const product = products.find(p =>
            p.barcode === barcode ||
            p.barcode?.endsWith(barcode) ||
            (barcode.length >= 4 && p.barcode?.slice(-4) === barcode.slice(-4))
        )
        if (product) {
            addToCart(product)
            setSearchQuery('')
            return true
        }
        return false
    }, [products])

    // USB Barcode Scanner Detection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input fields (except for Enter)
            if (e.target instanceof HTMLInputElement && e.key !== 'Enter') {
                return
            }

            // Handle Enter key for USB scanner
            if (e.key === 'Enter' && barcodeBufferRef.current.length > 3) {
                e.preventDefault()
                const barcode = barcodeBufferRef.current.trim()
                console.log('[Scanner] Detected barcode:', barcode)
                setScannerConnected(true)
                findAndAddByBarcode(barcode)
                barcodeBufferRef.current = ''
                return
            }

            // Collect barcode characters (from USB scanner)
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                // If active element is not search input, it's likely from scanner
                if (document.activeElement !== searchRef.current) {
                    barcodeBufferRef.current += e.key
                    setScannerConnected(true)

                    // Clear buffer after 100ms of no input (end of scan)
                    if (barcodeTimeoutRef.current) {
                        clearTimeout(barcodeTimeoutRef.current)
                    }
                    barcodeTimeoutRef.current = setTimeout(() => {
                        if (barcodeBufferRef.current.length > 3) {
                            console.log('[Scanner] Buffer timeout, detected:', barcodeBufferRef.current)
                            findAndAddByBarcode(barcodeBufferRef.current.trim())
                        }
                        barcodeBufferRef.current = ''
                    }, 100)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [findAndAddByBarcode])

    // Check USB and Bluetooth Printers
    useEffect(() => {
        const checkPrinters = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nav = navigator as any

            // Check USB Printer using WebUSB API
            try {
                if (nav.usb) {
                    // Get previously authorized USB devices
                    const usbDevices = await nav.usb.getDevices()
                    if (usbDevices && usbDevices.length > 0) {
                        // Check if any device looks like a printer (common vendor IDs)
                        const usbPrinter = usbDevices.find((d: { vendorId?: number; productName?: string }) => {
                            // Common thermal printer vendor IDs
                            const printerVendors = [0x0483, 0x0416, 0x0493, 0x04b8, 0x0519, 0x067b, 0x1a86, 0x20d1, 0x0fe6]
                            const isPrinterVendor = printerVendors.includes(d.vendorId || 0)
                            const hasPrinterName = d.productName?.toLowerCase().includes('print') ||
                                d.productName?.toLowerCase().includes('pos') ||
                                d.productName?.toLowerCase().includes('receipt') ||
                                d.productName?.toLowerCase().includes('thermal')
                            return isPrinterVendor || hasPrinterName
                        })
                        if (usbPrinter) {
                            console.log('[USB Printer] Detected:', usbPrinter.productName)
                            setPrinterConnected(true)
                            return // USB printer found, no need to check Bluetooth
                        }
                    }

                    // Listen for USB device connect/disconnect
                    nav.usb.addEventListener('connect', (e: { device: { productName?: string } }) => {
                        console.log('[USB] Device connected:', e.device.productName)
                        setPrinterConnected(true)
                    })
                    nav.usb.addEventListener('disconnect', () => {
                        console.log('[USB] Device disconnected')
                        setPrinterConnected(false)
                    })
                }
            } catch (err) {
                console.log('[USB] Not available or permission denied')
            }

            // Check Bluetooth Printer as fallback
            try {
                if (nav.bluetooth) {
                    const available = await nav.bluetooth.getAvailability?.()
                    if (available) {
                        const devices = await nav.bluetooth.getDevices?.()
                        if (devices && devices.length > 0) {
                            const printer = devices.find((d: { name?: string }) =>
                                d.name?.toLowerCase().includes('print') ||
                                d.name?.toLowerCase().includes('pos') ||
                                d.name?.toLowerCase().includes('receipt')
                            )
                            if (printer) {
                                console.log('[Bluetooth Printer] Detected:', printer.name)
                                setPrinterConnected(true)
                            }
                        }
                    }
                }
            } catch (err) {
                console.log('[Bluetooth] Not available or permission denied')
            }
        }
        checkPrinters()
    }, [])

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id)
            if (existing) {
                if (existing.quantity >= product.stock) {
                    alert('Stok tidak mencukupi')
                    return prev
                }
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { product, quantity: 1 }]
        })
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev =>
            prev.map(item => {
                if (item.product.id !== productId) return item
                const newQty = item.quantity + delta
                if (newQty < 1) return item
                if (newQty > item.product.stock) {
                    alert('Stok tidak mencukupi')
                    return item
                }
                return { ...item, quantity: newQty }
            }).filter(item => item.quantity > 0)
        )
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId))
    }

    const clearCart = () => {
        setCart([])
    }

    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    }

    const calculateTotal = () => {
        return calculateSubtotal() // No tax for now
    }

    const calculateChange = () => {
        const received = parseFloat(cashReceived) || 0
        return received - calculateTotal()
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const handlePayment = async () => {
        if (cart.length === 0) return
        if (paymentMethod === 'cash' && calculateChange() < 0) {
            alert('Jumlah uang tidak cukup')
            return
        }

        setProcessing(true)

        try {
            // Generate invoice number
            const invoiceNumber = firestoreService.generateInvoiceNumber()

            // Create transaction items
            const items = cart.map(item => ({
                product_id: item.product.id,
                product_name: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                subtotal: item.product.price * item.quantity,
            }))

            // Create transaction using Firestore
            await firestoreService.createTransaction({
                user_id: user?.id || '',
                invoice_number: invoiceNumber,
                subtotal: calculateSubtotal(),
                tax: 0,
                discount: 0,
                total: calculateTotal(),
                payment_method: paymentMethod,
                payment_status: 'completed',
                cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) || calculateTotal() : null,
                change_amount: paymentMethod === 'cash' ? calculateChange() : null,
                bank_account_id: paymentMethod === 'transfer' ? selectedBank : null,
                qris_reference: null,
                notes: null,
            }, items)

            // Save transaction data for receipt
            setLastTransactionData({
                invoice: invoiceNumber,
                items: cart.map(item => ({
                    name: item.product.name,
                    qty: item.quantity,
                    price: item.product.price,
                    subtotal: item.product.price * item.quantity,
                })),
                total: calculateTotal(),
                paymentMethod: paymentMethod,
                change: paymentMethod === 'cash' ? calculateChange() : undefined,
            })

            // Success - show receipt selection
            setLastInvoice(invoiceNumber)
            setShowPayment(false)
            setShowReceiptModal(true)
            setReceiptType('none')
            setReceiptContact('')
            clearCart()
            setCashReceived('')
            fetchProducts() // Refresh stock
        } catch (error) {
            console.error('Error processing payment:', error)
            alert('Gagal memproses pembayaran')
        } finally {
            setProcessing(false)
        }
    }

    // Generate receipt text for digital sharing
    const generateReceiptText = () => {
        if (!lastTransactionData) return ''

        // Store header
        let text = ` *${storeSettings?.name || 'TOKO'}*\n`
        if (storeSettings?.address) {
            text += ` ${storeSettings.address}\n`
        }
        if (storeSettings?.phone) {
            text += ` ${storeSettings.phone}\n`
        }
        text += `\n *STRUK PEMBAYARAN*\n`
        text += `━━━━━━━━━━━━━━━━━━\n`
        text += `Invoice: ${lastTransactionData.invoice}\n`
        text += `Tanggal: ${new Date().toLocaleString('id-ID')}\n`
        text += `━━━━━━━━━━━━━━━━━━\n\n`

        lastTransactionData.items.forEach(item => {
            text += `${item.name}\n`
            text += `  ${item.qty} x ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}\n`
        })

        text += `\n━━━━━━━━━━━━━━━━━━\n`
        text += `*TOTAL: ${formatCurrency(lastTransactionData.total)}*\n`

        if (lastTransactionData.change !== undefined && lastTransactionData.change > 0) {
            text += `Kembalian: ${formatCurrency(lastTransactionData.change)}\n`
        }

        text += `Metode: ${lastTransactionData.paymentMethod.toUpperCase()}\n`
        text += `━━━━━━━━━━━━━━━━━━\n`
        text += `Terima kasih sudah beli di ${storeSettings?.name || 'TOKO'}!`

        return text
    }

    // Send receipt via WhatsApp or Telegram
    const sendReceipt = async () => {
        if (!receiptContact.trim()) {
            alert('Masukkan nomor WhatsApp atau username Telegram!')
            return
        }

        setSendingReceipt(true)
        const receiptText = generateReceiptText()

        try {
            if (receiptType === 'whatsapp') {
                // Format phone number
                let phone = receiptContact.replace(/\D/g, '')
                if (phone.startsWith('0')) {
                    phone = '62' + phone.slice(1)
                }
                if (!phone.startsWith('62')) {
                    phone = '62' + phone
                }

                // Open WhatsApp Web
                const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(receiptText)}`
                window.open(waUrl, '_blank')
            } else if (receiptType === 'telegram') {
                // Check if input is phone number or username
                const isPhoneNumber = /^[0-9+]/.test(receiptContact.trim())

                if (isPhoneNumber) {
                    // Format phone number for Telegram
                    let phone = receiptContact.replace(/\D/g, '')
                    if (phone.startsWith('0')) {
                        phone = '62' + phone.slice(1)
                    }
                    if (!phone.startsWith('62')) {
                        phone = '62' + phone
                    }
                    const tgUrl = `https://t.me/+${phone}?text=${encodeURIComponent(receiptText)}`
                    window.open(tgUrl, '_blank')
                } else {
                    // Use as username
                    let username = receiptContact.replace('@', '')
                    const tgUrl = `https://t.me/${username}?text=${encodeURIComponent(receiptText)}`
                    window.open(tgUrl, '_blank')
                }
            }

            // Show success and close modal
            setShowReceiptModal(false)
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
        } catch (error) {
            console.error('Error sending receipt:', error)
            alert('Gagal mengirim struk')
        } finally {
            setSendingReceipt(false)
        }
    }

    // Print receipt
    const printReceipt = () => {
        if (!lastTransactionData) return

        // Create print content
        const printWindow = window.open('', '_blank', 'width=300,height=600')
        if (!printWindow) {
            alert('Popup diblokir. Izinkan popup untuk mencetak struk.')
            return
        }

        const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Struk - ${lastTransactionData.invoice}</title>
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
    </style>
</head>
<body>
    <div class="center store-name">${storeSettings?.name || 'TOKO'}</div>
    ${storeSettings?.address ? `<div class="center store-info">${storeSettings.address}</div>` : ''}
    ${storeSettings?.phone ? `<div class="center store-info">Telp: ${storeSettings.phone}</div>` : ''}
    <div class="divider"></div>
    <div class="center bold">STRUK PEMBAYARAN</div>
    <div class="divider"></div>
    <div>Invoice: ${lastTransactionData.invoice}</div>
    <div>Tanggal: ${new Date().toLocaleString('id-ID')}</div>
    <div class="divider"></div>
    ${lastTransactionData.items.map(item => `
        <div>${item.name}</div>
        <div class="item-detail">${item.qty} x ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}</div>
    `).join('')}
    <div class="divider"></div>
    <div class="total item"><span>TOTAL</span><span>${formatCurrency(lastTransactionData.total)}</span></div>
    ${lastTransactionData.change !== undefined && lastTransactionData.change > 0 ? `<div class="item"><span>Kembalian</span><span>${formatCurrency(lastTransactionData.change)}</span></div>` : ''}
    <div>Metode: ${lastTransactionData.paymentMethod.toUpperCase()}</div>
    <div class="divider"></div>
    <div class="center">Terima kasih!</div>
    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

        printWindow.document.write(printContent)
        printWindow.document.close()

        // Close modal
        setShowReceiptModal(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
    }

    // Skip receipt
    const skipReceipt = () => {
        setShowReceiptModal(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
    }

    // Enhanced search logic - matches name, SKU, full barcode, or last 4 digits of barcode
    const filteredProducts = products.filter(product => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return !selectedCategory || product.category_id === selectedCategory

        const matchesName = product.name.toLowerCase().includes(query)
        const matchesSku = product.sku?.toLowerCase().includes(query)
        const matchesFullBarcode = product.barcode?.toLowerCase().includes(query.toLowerCase())

        // Check if input is numeric (likely barcode digits)
        const isNumericQuery = /^\d+$/.test(query)

        // Match last 4 digits of barcode (when user inputs exactly 4 digits or more)
        let matchesLast4Barcode = false
        if (isNumericQuery && query.length >= 4) {
            const last4Query = query.slice(-4)
            const last4Barcode = product.barcode?.slice(-4)
            matchesLast4Barcode = last4Query === last4Barcode
        }

        // Also match if barcode ends with the search query
        const matchesBarcodeEnd = isNumericQuery && product.barcode?.endsWith(query)

        const matchesSearch = matchesName || matchesSku || matchesFullBarcode || matchesLast4Barcode || matchesBarcodeEnd
        const matchesCategory = !selectedCategory || product.category_id === selectedCategory
        return matchesSearch && matchesCategory
    })

    // Handle camera barcode scan
    const handleBarcodeScan = (barcode: string) => {
        console.log('[Camera] Scanned barcode:', barcode)
        setShowScanner(false)

        // Try to find and add product
        if (!findAndAddByBarcode(barcode)) {
            // If not found, set search query
            setSearchQuery(barcode)
        }
    }

    const quickAmounts = [10000, 20000, 50000, 100000]

    return (
        <div className={styles.container}>
            {/* Products Section */}
            <div className={styles.productsSection}>
                {/* Search & Filters */}
                <div className={styles.searchBar}>
                    <div className={styles.searchBox}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Cari produk atau scan barcode (4 digit terakhir)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        {searchQuery && (
                            <button
                                className={styles.clearSearch}
                                onClick={() => setSearchQuery('')}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <button
                        className={styles.scanButton}
                        onClick={() => setShowScanner(true)}
                        title="Scan Barcode dengan Kamera"
                    >
                        <Camera size={20} />
                    </button>
                    {/* Device Status Indicators */}
                    <div className={styles.deviceStatus}>
                        <div className={`${styles.statusIndicator} ${scannerConnected ? styles.statusConnected : ''}`} title={scannerConnected ? 'Scanner USB Terhubung' : 'Scanner USB Tidak Terdeteksi'}>
                            <Scan size={16} />
                        </div>
                        <div className={`${styles.statusIndicator} ${printerConnected ? styles.statusConnected : ''}`} title={printerConnected ? 'Printer Terhubung (USB/Bluetooth)' : 'Printer Tidak Terdeteksi'}>
                            <Printer size={16} />
                        </div>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className={styles.categoryTabs}>
                    <button
                        className={`${styles.categoryTab} ${!selectedCategory ? styles.categoryTabActive : ''}`}
                        onClick={() => setSelectedCategory('')}
                    >
                        Semua
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            className={`${styles.categoryTab} ${selectedCategory === cat.id ? styles.categoryTabActive : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
                            style={selectedCategory === cat.id && cat.color ? {
                                backgroundColor: cat.color + '20',
                                color: cat.color,
                                borderColor: cat.color
                            } : undefined}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                {loading ? (
                    <div className={styles.loading}>
                        <div className="spinner spinner-lg"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className={styles.emptyProducts}>
                        <Package size={48} />
                        <p>Tidak ada produk ditemukan</p>
                    </div>
                ) : (
                    <div className={styles.productGrid}>
                        {filteredProducts.map((product) => {
                            const inCart = cart.find(item => item.product.id === product.id)
                            return (
                                <button
                                    key={product.id}
                                    className={`${styles.productCard} ${inCart ? styles.productInCart : ''}`}
                                    onClick={() => addToCart(product)}
                                >
                                    <div className={styles.productImage}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} />
                                        ) : (
                                            <Package size={32} color="var(--gray-300)" />
                                        )}
                                        {inCart && (
                                            <span className={styles.cartBadge}>{inCart.quantity}</span>
                                        )}
                                    </div>
                                    <div className={styles.productName}>{product.name}</div>
                                    <div className={styles.productPrice}>{formatCurrency(product.price)}</div>
                                    <div className={styles.productStock}>Stok: {product.stock}</div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Cart Section */}
            <div className={styles.cartSection}>
                <div className={styles.cartHeader}>
                    <ShoppingCart size={20} />
                    <h2>Keranjang</h2>
                    {cart.length > 0 && (
                        <button className={styles.clearCartBtn} onClick={clearCart}>
                            Hapus Semua
                        </button>
                    )}
                </div>

                <div className={styles.cartItems}>
                    {cart.length === 0 ? (
                        <div className={styles.emptyCart}>
                            <ShoppingCart size={40} />
                            <p>Keranjang kosong</p>
                            <span>Pilih produk untuk menambahkan</span>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.product.id} className={styles.cartItem}>
                                <div className={styles.cartItemInfo}>
                                    <p className={styles.cartItemName}>{item.product.name}</p>
                                    <p className={styles.cartItemPrice}>{formatCurrency(item.product.price)}</p>
                                </div>
                                <div className={styles.cartItemActions}>
                                    <div className={styles.quantityControl}>
                                        <button onClick={() => updateQuantity(item.product.id, -1)}>
                                            <Minus size={14} />
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product.id, 1)}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <p className={styles.cartItemSubtotal}>
                                        {formatCurrency(item.product.price * item.quantity)}
                                    </p>
                                    <button
                                        className={styles.removeBtn}
                                        onClick={() => removeFromCart(item.product.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div className={styles.cartFooter}>
                        <div className={styles.cartTotal}>
                            <span>Total</span>
                            <span className={styles.totalAmount}>{formatCurrency(calculateTotal())}</span>
                        </div>
                        <Button
                            className={styles.payButton}
                            onClick={() => setShowPayment(true)}
                        >
                            <CreditCard size={20} />
                            Bayar Sekarang
                        </Button>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPayment && (
                <div className="modal-overlay" onClick={() => setShowPayment(false)}>
                    <div className={styles.paymentModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.paymentHeader}>
                            <h3>Pembayaran</h3>
                            <button className={styles.closeModal} onClick={() => setShowPayment(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.paymentBody}>
                            <div className={styles.paymentTotal}>
                                <span>Total Pembayaran</span>
                                <span className={styles.paymentAmount}>{formatCurrency(calculateTotal())}</span>
                            </div>

                            <div className={styles.paymentMethods}>
                                <p className={styles.paymentLabel}>Metode Pembayaran</p>
                                <div className={styles.methodGrid}>
                                    <button
                                        className={`${styles.methodBtn} ${paymentMethod === 'cash' ? styles.methodActive : ''}`}
                                        onClick={() => setPaymentMethod('cash')}
                                    >
                                        <Banknote size={24} />
                                        <span>Tunai</span>
                                    </button>
                                    <button
                                        className={`${styles.methodBtn} ${paymentMethod === 'transfer' ? styles.methodActive : ''}`}
                                        onClick={() => setPaymentMethod('transfer')}
                                    >
                                        <CreditCard size={24} />
                                        <span>Transfer</span>
                                    </button>
                                    <button
                                        className={`${styles.methodBtn} ${paymentMethod === 'qris' ? styles.methodActive : ''}`}
                                        onClick={() => setPaymentMethod('qris')}
                                    >
                                        <QrCode size={24} />
                                        <span>QRIS</span>
                                    </button>
                                </div>
                            </div>

                            {paymentMethod === 'cash' && (
                                <div className={styles.cashSection}>
                                    <p className={styles.paymentLabel}>Uang Diterima</p>
                                    <input
                                        type="number"
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value)}
                                        placeholder="0"
                                        className={styles.cashInput}
                                        autoFocus
                                    />
                                    <div className={styles.quickAmounts}>
                                        {quickAmounts.map((amount) => (
                                            <button
                                                key={amount}
                                                className={styles.quickAmountBtn}
                                                onClick={() => setCashReceived(amount.toString())}
                                            >
                                                {formatCurrency(amount)}
                                            </button>
                                        ))}
                                        <button
                                            className={styles.quickAmountBtn}
                                            onClick={() => setCashReceived(calculateTotal().toString())}
                                        >
                                            Uang Pas
                                        </button>
                                    </div>
                                    {parseFloat(cashReceived) > 0 && (
                                        <div className={styles.changeInfo}>
                                            <span>Kembalian</span>
                                            <span className={calculateChange() >= 0 ? styles.changePositive : styles.changeNegative}>
                                                {formatCurrency(Math.max(0, calculateChange()))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'qris' && (
                                <div className={styles.qrisSection}>
                                    {qrisConfig?.enabled && qrisConfig.qris_static_code ? (
                                        <div className={styles.qrisContent}>
                                            <img
                                                src={qrisConfig.qris_static_code}
                                                alt="QRIS"
                                                className={styles.qrisImage}
                                            />
                                            <div className={styles.qrisMerchant}>
                                                <strong>{qrisConfig.merchant_name || 'Merchant'}</strong>
                                                <span>Scan untuk membayar {formatCurrency(calculateTotal())}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.qrisPlaceholder}>
                                            <QrCode size={80} />
                                            <p>QRIS belum dikonfigurasi</p>
                                            <span>Atur QRIS di menu Pengaturan → Pembayaran</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'transfer' && (
                                <div className={styles.transferSection}>
                                    {bankAccounts.length > 0 ? (
                                        <div className={styles.bankList}>
                                            {bankAccounts.map((bank) => (
                                                <div
                                                    key={bank.id}
                                                    className={`${styles.bankCard} ${selectedBank === bank.id ? styles.bankCardActive : ''}`}
                                                    onClick={() => setSelectedBank(bank.id)}
                                                >
                                                    <div className={styles.bankIcon}>
                                                        <Building2 size={24} />
                                                    </div>
                                                    <div className={styles.bankDetails}>
                                                        <strong>{bank.bank_name}</strong>
                                                        <span className={styles.bankNumber}>{bank.account_number}</span>
                                                        <span className={styles.bankHolder}>a.n. {bank.account_holder}</span>
                                                    </div>
                                                    <button
                                                        className={styles.copyBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            navigator.clipboard.writeText(bank.account_number)
                                                            alert('Nomor rekening disalin!')
                                                        }}
                                                        title="Salin nomor rekening"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <p className={styles.transferNote}>
                                                Total: <strong>{formatCurrency(calculateTotal())}</strong>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className={styles.transferInfo}>
                                            <CreditCard size={40} />
                                            <p>Rekening bank belum dikonfigurasi</p>
                                            <span>Tambah rekening di menu Pengaturan → Pembayaran</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.paymentFooter}>
                            <Button variant="secondary" onClick={() => setShowPayment(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handlePayment}
                                loading={processing}
                                disabled={paymentMethod === 'cash' && calculateChange() < 0}
                            >
                                <Check size={18} />
                                Konfirmasi Pembayaran
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Selection Modal */}
            {showReceiptModal && (
                <div className="modal-overlay">
                    <div className={styles.receiptModal}>
                        <div className={styles.receiptModalHeader}>
                            <FileText size={24} />
                            <div>
                                <h3>Pembayaran Berhasil!</h3>
                                <p>Invoice: {lastInvoice}</p>
                            </div>
                        </div>

                        <div className={styles.receiptModalBody}>
                            <p className={styles.receiptLabel}>Pilih jenis struk:</p>

                            <div className={styles.receiptOptions}>
                                <button
                                    className={`${styles.receiptOption} ${receiptType === 'print' ? styles.receiptOptionActive : ''}`}
                                    onClick={() => setReceiptType('print')}
                                >
                                    <Printer size={28} />
                                    <span>Cetak Fisik</span>
                                </button>
                                <button
                                    className={`${styles.receiptOption} ${receiptType === 'whatsapp' ? styles.receiptOptionActive : ''}`}
                                    onClick={() => setReceiptType('whatsapp')}
                                >
                                    <Phone size={28} />
                                    <span>WhatsApp</span>
                                </button>
                                <button
                                    className={`${styles.receiptOption} ${receiptType === 'telegram' ? styles.receiptOptionActive : ''}`}
                                    onClick={() => setReceiptType('telegram')}
                                >
                                    <MessageCircle size={28} />
                                    <span>Telegram</span>
                                </button>
                            </div>

                            {(receiptType === 'whatsapp' || receiptType === 'telegram') && (
                                <div className={styles.receiptContactInput}>
                                    <label>
                                        {receiptType === 'whatsapp'
                                            ? 'Nomor WhatsApp Customer'
                                            : 'Nomor HP / Username Telegram Customer'}
                                    </label>
                                    <input
                                        type="text"
                                        value={receiptContact}
                                        onChange={(e) => setReceiptContact(e.target.value)}
                                        placeholder={receiptType === 'whatsapp' ? '08123456789' : '08123456789 atau @username'}
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        <div className={styles.receiptModalFooter}>
                            <Button variant="secondary" onClick={skipReceipt}>
                                Lewati
                            </Button>
                            {receiptType === 'print' && (
                                <Button variant="primary" onClick={printReceipt}>
                                    <Printer size={18} />
                                    Cetak Struk
                                </Button>
                            )}
                            {(receiptType === 'whatsapp' || receiptType === 'telegram') && (
                                <Button
                                    variant="primary"
                                    onClick={sendReceipt}
                                    loading={sendingReceipt}
                                    disabled={!receiptContact.trim()}
                                >
                                    <Send size={18} />
                                    Kirim Struk
                                </Button>
                            )}
                            {receiptType === 'none' && (
                                <Button variant="primary" onClick={skipReceipt}>
                                    <Check size={18} />
                                    Selesai
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showSuccess && (
                <div className={styles.successToast}>
                    <Check size={24} />
                    <div>
                        <p>Pembayaran Berhasil!</p>
                        <span>Invoice: {lastInvoice}</span>
                    </div>
                </div>
            )}

            {/* Camera Barcode Scanner */}
            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    )
}
