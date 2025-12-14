'use client'

import { useEffect, useState } from 'react'
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    X,
    Camera,
    Download,
    Loader2,
} from 'lucide-react'
import { firestoreService } from '@/lib/firebase/firestore'
import { productApiService, ProductApiResponse } from '@/lib/productApi'
import { Product, Category, ProductWithRelations } from '@/types/database'
import { Button, Input } from '@/components/ui'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { useAuth } from '@/hooks/useAuth'
import styles from './products.module.css'

export default function ProductsPage() {
    const { storeId } = useAuth()
    const [products, setProducts] = useState<ProductWithRelations[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        price: '',
        cost_price: '',
        stock: '',
        min_stock: '5',
        category_id: '',
        is_active: true,
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [showScanner, setShowScanner] = useState(false)
    const [lookingUp, setLookingUp] = useState(false)
    const [lookupResult, setLookupResult] = useState<ProductApiResponse | null>(null)

    useEffect(() => {
        if (!storeId) return
        fetchProducts()
        fetchCategories()
    }, [storeId])

    const fetchProducts = async () => {
        if (!storeId) return
        try {
            const data = await firestoreService.getProductsWithRelations(storeId)
            setProducts(data)
        } catch (err) {
            console.warn('Error fetching products:', err)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        if (!storeId) return
        const data = await firestoreService.getCategories(storeId)
        setCategories(data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)

        try {
            const productData = {
                name: formData.name,
                sku: formData.sku || null,
                barcode: formData.barcode || null,
                description: formData.description || null,
                price: parseFloat(formData.price) || 0,
                cost_price: parseFloat(formData.cost_price) || 0,
                stock: parseInt(formData.stock) || 0,
                min_stock: parseInt(formData.min_stock) || 5,
                category_id: formData.category_id || null,
                supplier_id: null,
                image_url: null,
                is_active: formData.is_active,
            }

            if (editingProduct) {
                await firestoreService.updateProduct(editingProduct.id, productData)
            } else {
                await firestoreService.createProduct({ ...productData, store_id: storeId! })
            }

            setShowModal(false)
            resetForm()
            fetchProducts()
        } catch (err) {
            console.error('Error saving product:', err)
            setError('Gagal menyimpan produk. Silakan coba lagi.')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            name: product.name,
            sku: product.sku || '',
            barcode: product.barcode || '',
            description: product.description || '',
            price: product.price.toString(),
            cost_price: product.cost_price.toString(),
            stock: product.stock.toString(),
            min_stock: product.min_stock.toString(),
            category_id: product.category_id || '',
            is_active: product.is_active,
        })
        setShowModal(true)
    }

    const handleDelete = async (product: Product) => {
        if (!confirm(`Hapus produk "${product.name}"?`)) return

        try {
            await firestoreService.deleteProduct(product.id)
            fetchProducts()
        } catch (error) {
            console.error('Error deleting product:', error)
            alert('Gagal menghapus produk')
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            barcode: '',
            description: '',
            price: '',
            cost_price: '',
            stock: '',
            min_stock: '5',
            category_id: '',
            is_active: true,
        })
        setEditingProduct(null)
        setError('')
    }

    const openAddModal = () => {
        resetForm()
        setLookupResult(null)
        setShowModal(true)
    }

    // Lookup product from Indonesian database API
    const lookupProductByBarcode = async (barcode: string) => {
        if (!barcode || barcode.length < 8) {
            setError('Barcode harus minimal 8 digit')
            return
        }

        setLookingUp(true)
        setError('')
        setLookupResult(null)

        try {
            const result = await productApiService.searchByBarcode(barcode, false)

            if (result.success && result.data && !Array.isArray(result.data)) {
                const product = result.data
                setLookupResult(product)

                // Auto-fill form with data from API
                setFormData(prev => ({
                    ...prev,
                    name: product.name || prev.name,
                    barcode: product.barcode || barcode,
                    description: product.description || prev.description,
                    price: product.price?.toString() || prev.price,
                }))

                setError('')
            } else {
                setError('Produk tidak ditemukan di database Indonesia')
            }
        } catch (err) {
            console.error('Lookup error:', err)
            setError('Gagal mencari produk. Coba lagi.')
        } finally {
            setLookingUp(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = !selectedCategory || product.category_id === selectedCategory
        return matchesSearch && matchesCategory
    })

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat produk...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Produk</h1>
                    <p className={styles.subtitle}>Kelola produk toko Anda</p>
                </div>
                <Button onClick={openAddModal}>
                    <Plus size={18} />
                    Tambah Produk
                </Button>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Cari produk..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="select"
                    style={{ width: 'auto', minWidth: '150px' }}
                >
                    <option value="">Semua Kategori</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Product Table */}
            {filteredProducts.length === 0 ? (
                <div className={styles.emptyState}>
                    <Package size={64} className={styles.emptyIcon} />
                    <h3>Belum ada produk</h3>
                    <p>Tambahkan produk pertama Anda untuk mulai berjualan</p>
                    <Button onClick={openAddModal} style={{ marginTop: '1rem' }}>
                        <Plus size={18} />
                        Tambah Produk
                    </Button>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.productTable}>
                        <thead>
                            <tr>
                                <th>Nama Produk</th>
                                <th>Barcode</th>
                                <th>Stok</th>
                                <th>Harga</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className={!product.is_active ? styles.inactiveRow : ''}>
                                    <td>
                                        <div className={styles.productNameCell}>
                                            <span className={styles.productName}>{product.name}</span>
                                            {product.category && (
                                                <span
                                                    className={styles.productCategory}
                                                    style={product.category.color ? {
                                                        backgroundColor: product.category.color + '20',
                                                        color: product.category.color
                                                    } : undefined}
                                                >
                                                    {product.category.name}
                                                </span>
                                            )}
                                            {!product.is_active && (
                                                <span className={styles.inactiveBadge}>Nonaktif</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={styles.barcodeCell}>{product.barcode || '-'}</td>
                                    <td className={`${styles.stockCell} ${product.stock < product.min_stock ? styles.lowStock : ''}`}>
                                        {product.stock}
                                    </td>
                                    <td className={styles.priceCell}>{formatCurrency(product.price)}</td>
                                    <td className={styles.actionsCell}>
                                        <button className={styles.actionBtn} onClick={() => handleEdit(product)} title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(product)} title="Hapus">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                            </h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {error && (
                                    <div className={styles.error}>{error}</div>
                                )}

                                <Input
                                    label="Nama Produk *"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Nama produk"
                                />

                                <div className={styles.formRow}>
                                    <Input
                                        label="SKU"
                                        type="text"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        placeholder="ABC-001"
                                    />
                                    <div className={styles.barcodeInputWrapper}>
                                        <Input
                                            label="Barcode"
                                            type="text"
                                            value={formData.barcode}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                            placeholder="8992761234567"
                                        />
                                        <div className={styles.barcodeButtons}>
                                            <button
                                                type="button"
                                                className={styles.scanBtn}
                                                onClick={() => setShowScanner(true)}
                                                title="Scan Barcode"
                                            >
                                                <Camera size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.scanBtn} ${styles.lookupBtn}`}
                                                onClick={() => lookupProductByBarcode(formData.barcode)}
                                                disabled={lookingUp || !formData.barcode}
                                                title="Cari dari Database Indonesia"
                                            >
                                                {lookingUp ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Lookup Result Banner */}
                                {lookupResult && (
                                    <div className={styles.lookupResultBanner}>
                                        <div className={styles.lookupResultIcon}>✓</div>
                                        <div className={styles.lookupResultInfo}>
                                            <strong>Data ditemukan!</strong>
                                            <span>{lookupResult.name} {lookupResult.brand && `(${lookupResult.brand})`}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.lookupResultClose}
                                            onClick={() => setLookupResult(null)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                <div className={styles.formRow}>
                                    <Input
                                        label="Harga Jual *"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                        placeholder="0"
                                        min="0"
                                    />
                                    <Input
                                        label="Harga Modal"
                                        type="number"
                                        value={formData.cost_price}
                                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>

                                <div className={styles.formRow}>
                                    <Input
                                        label="Stok"
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                    />
                                    <Input
                                        label="Stok Minimum"
                                        type="number"
                                        value={formData.min_stock}
                                        onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                        placeholder="5"
                                        min="0"
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="label">Kategori</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                        className="select"
                                    >
                                        <option value="">Pilih Kategori</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="label">Deskripsi</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="textarea"
                                        rows={3}
                                        placeholder="Deskripsi produk (opsional)"
                                    />
                                </div>

                                <div className={styles.checkboxGroup}>
                                    <label className={styles.checkbox}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <span>Produk Aktif</span>
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" loading={saving}>
                                    {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Barcode Scanner Modal */}
            {showScanner && (
                <BarcodeScanner
                    onScan={(barcode) => {
                        setFormData({ ...formData, barcode })
                        setShowScanner(false)
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    )
}
