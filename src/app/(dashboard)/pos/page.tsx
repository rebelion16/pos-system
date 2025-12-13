'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
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
    Package
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Product, Category, ProductWithRelations, PaymentMethod } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'
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
    const searchRef = useRef<HTMLInputElement>(null)

    // Memoize supabase client
    const supabase = useMemo(() => createClient(), [])

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
            const { data, error } = await supabase
                .from('products')
                .select(`*, category:categories(*)`)
                .eq('is_active', true)
                .gt('stock', 0)
                .order('name')

            if (error) {
                console.warn('Products table may not exist yet:', error.message)
                setProducts([])
            } else {
                setProducts(data || [])
            }
        } catch (err) {
            console.warn('Error fetching products:', err)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        const { data } = await supabase
            .from('categories')
            .select('*')
            .order('name')
        setCategories(data || [])
    }

    const addToCart = (product: Product) => {
        const existingItem = cart.find(item => item.product.id === product.id)

        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                setCart(cart.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                ))
            }
        } else {
            setCart([...cart, { product, quantity: 1 }])
        }
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta
                if (newQty <= 0) return item
                if (newQty > item.product.stock) return item
                return { ...item, quantity: newQty }
            }
            return item
        }))
    }

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product.id !== productId))
    }

    const clearCart = () => {
        setCart([])
    }

    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    }

    const calculateTotal = () => {
        return calculateSubtotal()
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
            const today = new Date()
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
            const timeStr = Date.now().toString().slice(-4)
            const invoiceNumber = `INV-${dateStr}-${timeStr}`

            // Create transaction
            const { data: transaction, error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user?.id,
                    invoice_number: invoiceNumber,
                    subtotal: calculateSubtotal(),
                    tax: 0,
                    discount: 0,
                    total: calculateTotal(),
                    payment_method: paymentMethod,
                    payment_status: 'completed',
                    cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) || calculateTotal() : null,
                    change_amount: paymentMethod === 'cash' ? calculateChange() : null,
                })
                .select()
                .single()

            if (txError) throw txError

            // Create transaction items
            const items = cart.map(item => ({
                transaction_id: transaction.id,
                product_id: item.product.id,
                product_name: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                subtotal: item.product.price * item.quantity,
            }))

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(items)

            if (itemsError) throw itemsError

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

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode?.includes(searchQuery)
        const matchesCategory = !selectedCategory || product.category_id === selectedCategory
        return matchesSearch && matchesCategory
    })

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
                            placeholder="Cari produk atau scan barcode..."
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
        </div>
    )
}
