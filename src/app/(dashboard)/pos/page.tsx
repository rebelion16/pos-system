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
    Scan
} from 'lucide-react'
import { firestoreService } from '@/lib/firebase/firestore'
import { Product, Category, ProductWithRelations, PaymentMethod } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import styles from './pos.module.css'

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
    const searchRef = useRef<HTMLInputElement>(null)
    const barcodeBufferRef = useRef('')
    const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        fetchProducts()
        fetchCategories()

        // Focus search on mount
        if (searchRef.current) {
            searchRef.current.focus()
        }
    }, [])

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
                bank_account_id: null,
                qris_reference: null,
                notes: null,
            }, items)

            // Success
            setLastInvoice(invoiceNumber)
            setShowPayment(false)
            setShowSuccess(true)
            clearCart()
            setCashReceived('')
            fetchProducts() // Refresh stock

            setTimeout(() => {
                setShowSuccess(false)
            }, 3000)
        } catch (error) {
            console.error('Error processing payment:', error)
            alert('Gagal memproses pembayaran')
        } finally {
            setProcessing(false)
        }
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
                                    <div className={styles.qrisPlaceholder}>
                                        <QrCode size={120} />
                                        <p>QRIS akan ditampilkan di sini</p>
                                        <span>Silakan konfigurasikan integrasi QRIS</span>
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'transfer' && (
                                <div className={styles.transferSection}>
                                    <div className={styles.transferInfo}>
                                        <CreditCard size={40} />
                                        <p>Transfer ke rekening toko</p>
                                        <span>Konfirmasi pembayaran dengan pelanggan</span>
                                    </div>
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
