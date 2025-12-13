'use client'

import { useEffect, useState } from 'react'
import { Warehouse, AlertTriangle, TrendingUp, TrendingDown, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProductWithRelations } from '@/types/database'
import styles from './stock.module.css'

export default function StockPage() {
    const [products, setProducts] = useState<ProductWithRelations[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'low'>('all')
    const supabase = createClient()

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const { data } = await supabase
                .from('products')
                .select(`*, category:categories(*)`)
                .eq('is_active', true)
                .order('stock', { ascending: true })

            setProducts(data || [])
        } catch (error) {
            console.error('Error fetching products:', error)
        } finally {
            setLoading(false)
        }
    }

    const lowStockProducts = products.filter(p => p.stock < p.min_stock)

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filter === 'all' || p.stock < p.min_stock
        return matchesSearch && matchesFilter
    })

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat stok...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Manajemen Stok</h1>
                    <p className={styles.subtitle}>Pantau dan kelola stok produk</p>
                </div>
            </div>

            {/* Alert for low stock */}
            {lowStockProducts.length > 0 && (
                <div className={styles.alert}>
                    <AlertTriangle size={20} />
                    <span><strong>{lowStockProducts.length}</strong> produk memiliki stok menipis</span>
                </div>
            )}

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
                <div className={styles.filterBtns}>
                    <button
                        className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Semua
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'low' ? styles.filterActive : ''}`}
                        onClick={() => setFilter('low')}
                    >
                        Stok Menipis
                    </button>
                </div>
            </div>

            {/* Stock Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Produk</th>
                            <th>Kategori</th>
                            <th>Stok Saat Ini</th>
                            <th>Stok Minimum</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((product) => (
                            <tr key={product.id}>
                                <td>
                                    <span className={styles.productName}>{product.name}</span>
                                    {product.sku && <span className={styles.sku}>{product.sku}</span>}
                                </td>
                                <td>
                                    {product.category && (
                                        <span
                                            className={styles.categoryBadge}
                                            style={product.category.color ? {
                                                backgroundColor: product.category.color + '20',
                                                color: product.category.color
                                            } : undefined}
                                        >
                                            {product.category.name}
                                        </span>
                                    )}
                                </td>
                                <td className={styles.stockCell}>
                                    <span className={product.stock < product.min_stock ? styles.lowStock : ''}>
                                        {product.stock}
                                    </span>
                                </td>
                                <td>{product.min_stock}</td>
                                <td>
                                    {product.stock === 0 ? (
                                        <span className="badge badge-danger">Habis</span>
                                    ) : product.stock < product.min_stock ? (
                                        <span className="badge badge-warning">Menipis</span>
                                    ) : (
                                        <span className="badge badge-success">Tersedia</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
