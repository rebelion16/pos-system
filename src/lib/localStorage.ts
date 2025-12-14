'use client'

import { User, Category, Product, Supplier, Transaction, TransactionItem, Settings, ProductWithRelations, StockHistory } from '@/types/database'

// Generate UUID
const generateId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// Storage keys
const STORAGE_KEYS = {
    users: 'pos_users',
    categories: 'pos_categories',
    products: 'pos_products',
    suppliers: 'pos_suppliers',
    transactions: 'pos_transactions',
    transactionItems: 'pos_transaction_items',
    stockHistory: 'pos_stock_history',
    settings: 'pos_settings',
    currentUser: 'pos_current_user',
    isInitialized: 'pos_is_initialized',
}

// Initialize with demo data
const initializeDemoData = () => {
    if (typeof window === 'undefined') return

    const isInitialized = localStorage.getItem(STORAGE_KEYS.isInitialized)
    if (isInitialized) return

    // Demo user
    const demoUserId = generateId()
    const demoUser: User = {
        id: demoUserId,
        email: 'demo@pos.com',
        name: 'Demo User',
        role: 'owner',
        store_id: demoUserId,  // Owner's store_id is their own ID
        store_code: 'DEMO001',  // Store code for joining
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify([demoUser]))

    // Demo categories
    const categories: Category[] = [
        { id: generateId(), store_id: demoUserId, name: 'Makanan', description: 'Produk makanan', color: '#10B981', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: generateId(), store_id: demoUserId, name: 'Minuman', description: 'Produk minuman', color: '#3B82F6', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: generateId(), store_id: demoUserId, name: 'Snack', description: 'Makanan ringan', color: '#F59E0B', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories))

    // Demo products
    const products: Product[] = [
        { id: generateId(), store_id: demoUserId, category_id: categories[0].id, supplier_id: null, name: 'Nasi Goreng', sku: 'MKN001', barcode: null, description: 'Nasi goreng spesial', price: 15000, cost_price: 10000, stock: 50, min_stock: 10, image_url: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: generateId(), store_id: demoUserId, category_id: categories[0].id, supplier_id: null, name: 'Mie Goreng', sku: 'MKN002', barcode: null, description: 'Mie goreng spesial', price: 12000, cost_price: 8000, stock: 40, min_stock: 10, image_url: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: generateId(), store_id: demoUserId, category_id: categories[1].id, supplier_id: null, name: 'Es Teh Manis', sku: 'MNM001', barcode: null, description: 'Es teh manis segar', price: 5000, cost_price: 2000, stock: 100, min_stock: 20, image_url: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: generateId(), store_id: demoUserId, category_id: categories[1].id, supplier_id: null, name: 'Es Jeruk', sku: 'MNM002', barcode: null, description: 'Es jeruk segar', price: 6000, cost_price: 3000, stock: 80, min_stock: 20, image_url: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: generateId(), store_id: demoUserId, category_id: categories[2].id, supplier_id: null, name: 'Keripik Singkong', sku: 'SNK001', barcode: null, description: 'Keripik singkong renyah', price: 8000, cost_price: 5000, stock: 30, min_stock: 10, image_url: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products))

    // Demo settings
    const settings: Settings = {
        id: generateId(),
        store_name: 'Toko Demo',
        store_address: 'Jl. Contoh No. 123',
        store_phone: '08123456789',
        store_logo: null,
        store_code: null,
        tax_rate: 0,
        currency: 'IDR',
        theme: 'light-blue',
        printer_enabled: false,
        printer_name: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))

    // Empty arrays for other data
    localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify([]))
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify([]))
    localStorage.setItem(STORAGE_KEYS.transactionItems, JSON.stringify([]))
    localStorage.setItem(STORAGE_KEYS.stockHistory, JSON.stringify([]))

    localStorage.setItem(STORAGE_KEYS.isInitialized, 'true')
}

// Generic CRUD operations
const getItems = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
}

const setItems = <T>(key: string, items: T[]): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(items))
}

// Local Storage Service
export const localStorageService = {
    initialize: initializeDemoData,

    // Users
    getUsers: (): User[] => getItems<User>(STORAGE_KEYS.users),

    getUserById: (id: string): User | null => {
        const users = getItems<User>(STORAGE_KEYS.users)
        return users.find(u => u.id === id) || null
    },

    getUserByEmail: (email: string): User | null => {
        const users = getItems<User>(STORAGE_KEYS.users)
        return users.find(u => u.email === email) || null
    },

    createUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User => {
        const users = getItems<User>(STORAGE_KEYS.users)
        const newUser: User = {
            ...user,
            id: generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
        users.push(newUser)
        setItems(STORAGE_KEYS.users, users)
        return newUser
    },

    // Current user session
    setCurrentUser: (user: User | null): void => {
        if (typeof window === 'undefined') return
        if (user) {
            localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user))
        } else {
            localStorage.removeItem(STORAGE_KEYS.currentUser)
        }
    },

    getCurrentUser: (): User | null => {
        if (typeof window === 'undefined') return null
        const data = localStorage.getItem(STORAGE_KEYS.currentUser)
        return data ? JSON.parse(data) : null
    },

    // Categories
    getCategories: (): Category[] => getItems<Category>(STORAGE_KEYS.categories),

    getCategoryById: (id: string): Category | null => {
        const categories = getItems<Category>(STORAGE_KEYS.categories)
        return categories.find(c => c.id === id) || null
    },

    createCategory: (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Category => {
        const categories = getItems<Category>(STORAGE_KEYS.categories)
        const newCategory: Category = {
            ...data,
            id: generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
        categories.push(newCategory)
        setItems(STORAGE_KEYS.categories, categories)
        return newCategory
    },

    updateCategory: (id: string, data: Partial<Category>): Category | null => {
        const categories = getItems<Category>(STORAGE_KEYS.categories)
        const index = categories.findIndex(c => c.id === id)
        if (index === -1) return null
        categories[index] = { ...categories[index], ...data, updated_at: new Date().toISOString() }
        setItems(STORAGE_KEYS.categories, categories)
        return categories[index]
    },

    deleteCategory: (id: string): boolean => {
        const categories = getItems<Category>(STORAGE_KEYS.categories)
        const filtered = categories.filter(c => c.id !== id)
        if (filtered.length === categories.length) return false
        setItems(STORAGE_KEYS.categories, filtered)
        return true
    },

    // Products
    getProducts: (): Product[] => getItems<Product>(STORAGE_KEYS.products),

    getProductsWithRelations: (): ProductWithRelations[] => {
        const products = getItems<Product>(STORAGE_KEYS.products)
        const categories = getItems<Category>(STORAGE_KEYS.categories)
        const suppliers = getItems<Supplier>(STORAGE_KEYS.suppliers)

        return products.map(p => ({
            ...p,
            category: categories.find(c => c.id === p.category_id) || null,
            supplier: suppliers.find(s => s.id === p.supplier_id) || null,
        }))
    },

    getActiveProductsWithRelations: (): ProductWithRelations[] => {
        return localStorageService.getProductsWithRelations()
            .filter(p => p.is_active && p.stock > 0)
    },

    getProductById: (id: string): Product | null => {
        const products = getItems<Product>(STORAGE_KEYS.products)
        return products.find(p => p.id === id) || null
    },

    createProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product => {
        const products = getItems<Product>(STORAGE_KEYS.products)
        const newProduct: Product = {
            ...data,
            id: generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
        products.push(newProduct)
        setItems(STORAGE_KEYS.products, products)
        return newProduct
    },

    updateProduct: (id: string, data: Partial<Product>): Product | null => {
        const products = getItems<Product>(STORAGE_KEYS.products)
        const index = products.findIndex(p => p.id === id)
        if (index === -1) return null
        products[index] = { ...products[index], ...data, updated_at: new Date().toISOString() }
        setItems(STORAGE_KEYS.products, products)
        return products[index]
    },

    deleteProduct: (id: string): boolean => {
        const products = getItems<Product>(STORAGE_KEYS.products)
        const filtered = products.filter(p => p.id !== id)
        if (filtered.length === products.length) return false
        setItems(STORAGE_KEYS.products, filtered)
        return true
    },

    updateProductStock: (id: string, quantityChange: number): Product | null => {
        const products = getItems<Product>(STORAGE_KEYS.products)
        const index = products.findIndex(p => p.id === id)
        if (index === -1) return null
        products[index].stock += quantityChange
        products[index].updated_at = new Date().toISOString()
        setItems(STORAGE_KEYS.products, products)
        return products[index]
    },

    // Suppliers
    getSuppliers: (): Supplier[] => getItems<Supplier>(STORAGE_KEYS.suppliers),

    createSupplier: (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Supplier => {
        const suppliers = getItems<Supplier>(STORAGE_KEYS.suppliers)
        const newSupplier: Supplier = {
            ...data,
            id: generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
        suppliers.push(newSupplier)
        setItems(STORAGE_KEYS.suppliers, suppliers)
        return newSupplier
    },

    updateSupplier: (id: string, data: Partial<Supplier>): Supplier | null => {
        const suppliers = getItems<Supplier>(STORAGE_KEYS.suppliers)
        const index = suppliers.findIndex(s => s.id === id)
        if (index === -1) return null
        suppliers[index] = { ...suppliers[index], ...data, updated_at: new Date().toISOString() }
        setItems(STORAGE_KEYS.suppliers, suppliers)
        return suppliers[index]
    },

    deleteSupplier: (id: string): boolean => {
        const suppliers = getItems<Supplier>(STORAGE_KEYS.suppliers)
        const filtered = suppliers.filter(s => s.id !== id)
        if (filtered.length === suppliers.length) return false
        setItems(STORAGE_KEYS.suppliers, filtered)
        return true
    },

    // Transactions
    getTransactions: (): Transaction[] => getItems<Transaction>(STORAGE_KEYS.transactions),

    getTransactionItems: (): TransactionItem[] => getItems<TransactionItem>(STORAGE_KEYS.transactionItems),

    createTransaction: (data: Omit<Transaction, 'id' | 'created_at'>, items: Omit<TransactionItem, 'id' | 'transaction_id' | 'created_at'>[]): Transaction => {
        const transactions = getItems<Transaction>(STORAGE_KEYS.transactions)
        const transactionItems = getItems<TransactionItem>(STORAGE_KEYS.transactionItems)

        const transactionId = generateId()
        const newTransaction: Transaction = {
            ...data,
            id: transactionId,
            created_at: new Date().toISOString(),
        }
        transactions.push(newTransaction)
        setItems(STORAGE_KEYS.transactions, transactions)

        // Add items
        const newItems = items.map(item => ({
            ...item,
            id: generateId(),
            transaction_id: transactionId,
            created_at: new Date().toISOString(),
        }))
        transactionItems.push(...newItems)
        setItems(STORAGE_KEYS.transactionItems, transactionItems)

        // Update stock
        items.forEach(item => {
            localStorageService.updateProductStock(item.product_id, -item.quantity)
        })

        return newTransaction
    },

    getTodayTransactions: (): Transaction[] => {
        const transactions = getItems<Transaction>(STORAGE_KEYS.transactions)
        const today = new Date().toISOString().split('T')[0]
        return transactions.filter(t => t.created_at.startsWith(today))
    },

    // Settings
    getSettings: (): Settings | null => {
        if (typeof window === 'undefined') return null
        const data = localStorage.getItem(STORAGE_KEYS.settings)
        return data ? JSON.parse(data) : null
    },

    updateSettings: (data: Partial<Settings>): Settings | null => {
        const settings = localStorageService.getSettings()
        if (!settings) return null
        const updated = { ...settings, ...data, updated_at: new Date().toISOString() }
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(updated))
        return updated
    },

    // Generate invoice number
    generateInvoiceNumber: (): string => {
        const date = new Date()
        const year = date.getFullYear().toString().slice(-2)
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        return `INV${year}${month}${day}${random}`
    },

    // Reset all data
    resetData: (): void => {
        if (typeof window === 'undefined') return
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key)
        })
        initializeDemoData()
    },
}

export default localStorageService
