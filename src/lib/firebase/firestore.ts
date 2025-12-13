'use client'

import { db, isFirebaseConfigured } from './config'
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
    onSnapshot,
    DocumentReference
} from 'firebase/firestore'
import {
    User,
    Category,
    Product,
    Supplier,
    Transaction,
    TransactionItem,
    Settings,
    ProductWithRelations,
    StockHistory,
    Cashier
} from '@/types/database'

// Collection names
const COLLECTIONS = {
    users: 'users',
    categories: 'categories',
    products: 'products',
    suppliers: 'suppliers',
    transactions: 'transactions',
    transactionItems: 'transaction_items',
    stockHistory: 'stock_history',
    settings: 'settings',
    cashiers: 'cashiers',
}

// Helper to generate UUID
const generateId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// Convert Firestore timestamp to ISO string
const toISOString = (timestamp: Timestamp | string | undefined): string => {
    if (!timestamp) return new Date().toISOString()
    if (typeof timestamp === 'string') return timestamp
    return timestamp.toDate().toISOString()
}

// Convert document data to typed object
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T => {
    const data = doc.data()
    return {
        ...data,
        id: doc.id,
        created_at: toISOString(data.created_at as Timestamp),
        updated_at: toISOString(data.updated_at as Timestamp),
    } as T
}

// Firestore Service
export const firestoreService = {
    isConfigured: isFirebaseConfigured && db !== null,

    // ==================== USERS ====================
    getUsers: async (): Promise<User[]> => {
        if (!db) return []
        const snapshot = await getDocs(collection(db, COLLECTIONS.users))
        return snapshot.docs.map(doc => convertDoc<User>(doc))
    },

    getUserById: async (id: string): Promise<User | null> => {
        if (!db) return null
        const docRef = doc(db, COLLECTIONS.users, id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) return null
        return convertDoc<User>(docSnap)
    },

    getUserByEmail: async (email: string): Promise<User | null> => {
        if (!db) return null
        const q = query(collection(db, COLLECTIONS.users), where('email', '==', email))
        const snapshot = await getDocs(q)
        if (snapshot.empty) return null
        return convertDoc<User>(snapshot.docs[0])
    },

    createUser: async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
        if (!db) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(collection(db, COLLECTIONS.users), {
            ...userData,
            created_at: now,
            updated_at: now,
        })
        return {
            ...userData,
            id: docRef.id,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateUser: async (id: string, data: Partial<User>): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        const docRef = doc(db, COLLECTIONS.users, id)
        await updateDoc(docRef, {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteUser: async (id: string): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        await deleteDoc(doc(db, COLLECTIONS.users, id))
    },

    // ==================== CATEGORIES ====================
    getCategories: async (): Promise<Category[]> => {
        if (!db) return []
        const snapshot = await getDocs(collection(db, COLLECTIONS.categories))
        return snapshot.docs.map(doc => convertDoc<Category>(doc))
    },

    getCategoryById: async (id: string): Promise<Category | null> => {
        if (!db) return null
        const docRef = doc(db, COLLECTIONS.categories, id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) return null
        return convertDoc<Category>(docSnap)
    },

    createCategory: async (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> => {
        if (!db) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(collection(db, COLLECTIONS.categories), {
            ...data,
            created_at: now,
            updated_at: now,
        })
        return {
            ...data,
            id: docRef.id,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateCategory: async (id: string, data: Partial<Category>): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        const docRef = doc(db, COLLECTIONS.categories, id)
        await updateDoc(docRef, {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteCategory: async (id: string): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        await deleteDoc(doc(db, COLLECTIONS.categories, id))
    },

    // ==================== PRODUCTS ====================
    getProducts: async (): Promise<Product[]> => {
        if (!db) return []
        const snapshot = await getDocs(collection(db, COLLECTIONS.products))
        return snapshot.docs.map(doc => convertDoc<Product>(doc))
    },

    getProductsWithRelations: async (): Promise<ProductWithRelations[]> => {
        if (!db) return []
        const [products, categories, suppliers] = await Promise.all([
            firestoreService.getProducts(),
            firestoreService.getCategories(),
            firestoreService.getSuppliers(),
        ])
        return products.map(p => ({
            ...p,
            category: categories.find(c => c.id === p.category_id) || null,
            supplier: suppliers.find(s => s.id === p.supplier_id) || null,
        }))
    },

    getActiveProductsWithRelations: async (): Promise<ProductWithRelations[]> => {
        const products = await firestoreService.getProductsWithRelations()
        return products.filter(p => p.is_active && p.stock > 0)
    },

    getProductById: async (id: string): Promise<Product | null> => {
        if (!db) return null
        const docRef = doc(db, COLLECTIONS.products, id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) return null
        return convertDoc<Product>(docSnap)
    },

    createProduct: async (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> => {
        if (!db) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(collection(db, COLLECTIONS.products), {
            ...data,
            created_at: now,
            updated_at: now,
        })
        return {
            ...data,
            id: docRef.id,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateProduct: async (id: string, data: Partial<Product>): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        const docRef = doc(db, COLLECTIONS.products, id)
        await updateDoc(docRef, {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteProduct: async (id: string): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        await deleteDoc(doc(db, COLLECTIONS.products, id))
    },

    updateProductStock: async (id: string, quantityChange: number): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        const product = await firestoreService.getProductById(id)
        if (!product) throw new Error('Product not found')
        await firestoreService.updateProduct(id, {
            stock: product.stock + quantityChange,
        })
    },

    // ==================== SUPPLIERS ====================
    getSuppliers: async (): Promise<Supplier[]> => {
        if (!db) return []
        const snapshot = await getDocs(collection(db, COLLECTIONS.suppliers))
        return snapshot.docs.map(doc => convertDoc<Supplier>(doc))
    },

    getSupplierById: async (id: string): Promise<Supplier | null> => {
        if (!db) return null
        const docRef = doc(db, COLLECTIONS.suppliers, id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) return null
        return convertDoc<Supplier>(docSnap)
    },

    createSupplier: async (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
        if (!db) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(collection(db, COLLECTIONS.suppliers), {
            ...data,
            created_at: now,
            updated_at: now,
        })
        return {
            ...data,
            id: docRef.id,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateSupplier: async (id: string, data: Partial<Supplier>): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        const docRef = doc(db, COLLECTIONS.suppliers, id)
        await updateDoc(docRef, {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteSupplier: async (id: string): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        await deleteDoc(doc(db, COLLECTIONS.suppliers, id))
    },

    // ==================== TRANSACTIONS ====================
    getTransactions: async (): Promise<Transaction[]> => {
        if (!db) return []
        const snapshot = await getDocs(collection(db, COLLECTIONS.transactions))
        return snapshot.docs.map(doc => convertDoc<Transaction>(doc))
    },

    getTransactionItems: async (): Promise<TransactionItem[]> => {
        if (!db) return []
        const snapshot = await getDocs(collection(db, COLLECTIONS.transactionItems))
        return snapshot.docs.map(doc => convertDoc<TransactionItem>(doc))
    },

    getTodayTransactions: async (): Promise<Transaction[]> => {
        if (!db) return []
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const q = query(
            collection(db, COLLECTIONS.transactions),
            where('created_at', '>=', Timestamp.fromDate(today))
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => convertDoc<Transaction>(doc))
    },

    createTransaction: async (
        data: Omit<Transaction, 'id' | 'created_at'>,
        items: Omit<TransactionItem, 'id' | 'transaction_id' | 'created_at'>[]
    ): Promise<Transaction> => {
        if (!db) throw new Error('Firestore not configured')
        const now = Timestamp.now()

        // Create transaction
        const transactionRef = await addDoc(collection(db, COLLECTIONS.transactions), {
            ...data,
            created_at: now,
        })

        // Create transaction items and update stock
        const batch = writeBatch(db)
        for (const item of items) {
            const itemRef = doc(collection(db, COLLECTIONS.transactionItems))
            batch.set(itemRef, {
                ...item,
                transaction_id: transactionRef.id,
                created_at: now,
            })

            // Update product stock
            const productRef = doc(db, COLLECTIONS.products, item.product_id)
            const productSnap = await getDoc(productRef)
            if (productSnap.exists()) {
                const currentStock = productSnap.data().stock || 0
                batch.update(productRef, {
                    stock: currentStock - item.quantity,
                    updated_at: now,
                })
            }
        }
        await batch.commit()

        return {
            ...data,
            id: transactionRef.id,
            created_at: now.toDate().toISOString(),
        }
    },

    // ==================== SETTINGS ====================
    getSettings: async (): Promise<Settings | null> => {
        if (!db) return null
        const snapshot = await getDocs(collection(db, COLLECTIONS.settings))
        if (snapshot.empty) return null
        return convertDoc<Settings>(snapshot.docs[0])
    },

    updateSettings: async (data: Partial<Settings>): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        const snapshot = await getDocs(collection(db, COLLECTIONS.settings))
        if (snapshot.empty) {
            // Create settings if not exists
            await addDoc(collection(db, COLLECTIONS.settings), {
                store_name: 'Toko Saya',
                store_address: '',
                store_phone: '',
                store_logo: null,
                store_code: null,
                tax_rate: 0,
                currency: 'IDR',
                theme: 'light-blue',
                printer_enabled: false,
                printer_name: null,
                ...data,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            })
        } else {
            const docRef = doc(db, COLLECTIONS.settings, snapshot.docs[0].id)
            await updateDoc(docRef, {
                ...data,
                updated_at: Timestamp.now(),
            })
        }
    },

    // ==================== CASHIERS ====================
    // Simple hash function for password (for demo purposes)
    hashPassword: (password: string): string => {
        let hash = 0
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
        }
        return 'HASH_' + Math.abs(hash).toString(16).padStart(8, '0')
    },

    getCashiers: async (storeCode?: string): Promise<Cashier[]> => {
        if (!db) return []
        let q
        if (storeCode) {
            q = query(collection(db, COLLECTIONS.cashiers), where('store_code', '==', storeCode))
        } else {
            q = collection(db, COLLECTIONS.cashiers)
        }
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => convertDoc<Cashier>(doc))
    },

    getCashierById: async (id: string): Promise<Cashier | null> => {
        if (!db) return null
        const docRef = doc(db, COLLECTIONS.cashiers, id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) return null
        return convertDoc<Cashier>(docSnap)
    },

    getCashierByUsername: async (username: string, storeCode: string): Promise<Cashier | null> => {
        if (!db) return null
        const q = query(
            collection(db, COLLECTIONS.cashiers),
            where('username', '==', username),
            where('store_code', '==', storeCode)
        )
        const snapshot = await getDocs(q)
        if (snapshot.empty) return null
        return convertDoc<Cashier>(snapshot.docs[0])
    },

    verifyCashierLogin: async (username: string, password: string, storeCode: string): Promise<Cashier | null> => {
        if (!db) return null
        const cashier = await firestoreService.getCashierByUsername(username, storeCode)
        if (!cashier) return null
        if (!cashier.is_active) return null
        const passwordHash = firestoreService.hashPassword(password)
        if (cashier.password_hash !== passwordHash) return null
        return cashier
    },

    createCashier: async (data: { username: string; password: string; name: string; store_code: string }): Promise<Cashier> => {
        if (!db) throw new Error('Firestore not configured')

        // Check if username already exists for this store
        const existing = await firestoreService.getCashierByUsername(data.username, data.store_code)
        if (existing) {
            throw new Error('Username sudah digunakan')
        }

        const now = Timestamp.now()
        const passwordHash = firestoreService.hashPassword(data.password)

        const docRef = await addDoc(collection(db, COLLECTIONS.cashiers), {
            username: data.username,
            password_hash: passwordHash,
            name: data.name,
            store_code: data.store_code,
            is_active: true,
            created_at: now,
            updated_at: now,
        })

        return {
            id: docRef.id,
            username: data.username,
            password_hash: passwordHash,
            name: data.name,
            store_code: data.store_code,
            is_active: true,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateCashier: async (id: string, data: { name?: string; username?: string; password?: string; is_active?: boolean }): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        const updateData: Record<string, unknown> = {
            updated_at: Timestamp.now(),
        }
        if (data.name !== undefined) updateData.name = data.name
        if (data.username !== undefined) updateData.username = data.username
        if (data.password !== undefined) updateData.password_hash = firestoreService.hashPassword(data.password)
        if (data.is_active !== undefined) updateData.is_active = data.is_active

        const docRef = doc(db, COLLECTIONS.cashiers, id)
        await updateDoc(docRef, updateData)
    },

    deleteCashier: async (id: string): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        await deleteDoc(doc(db, COLLECTIONS.cashiers, id))
    },

    // ==================== UTILITIES ====================
    generateInvoiceNumber: (): string => {
        const date = new Date()
        const year = date.getFullYear().toString().slice(-2)
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        return `INV${year}${month}${day}${random}`
    },

    // Initialize demo data if empty
    initializeDemoData: async (): Promise<void> => {
        if (!db) return

        // Check if already has data
        const categories = await firestoreService.getCategories()
        if (categories.length > 0) return

        // Create demo categories
        const cat1 = await firestoreService.createCategory({ name: 'Makanan', description: 'Produk makanan', color: '#10B981' })
        const cat2 = await firestoreService.createCategory({ name: 'Minuman', description: 'Produk minuman', color: '#3B82F6' })
        const cat3 = await firestoreService.createCategory({ name: 'Snack', description: 'Makanan ringan', color: '#F59E0B' })

        // Create demo products
        await firestoreService.createProduct({
            category_id: cat1.id,
            supplier_id: null,
            name: 'Nasi Goreng',
            sku: 'MKN001',
            barcode: null,
            description: 'Nasi goreng spesial',
            price: 15000,
            cost_price: 10000,
            stock: 50,
            min_stock: 10,
            image_url: null,
            is_active: true,
        })
        await firestoreService.createProduct({
            category_id: cat2.id,
            supplier_id: null,
            name: 'Es Teh Manis',
            sku: 'MNM001',
            barcode: null,
            description: 'Es teh manis segar',
            price: 5000,
            cost_price: 2000,
            stock: 100,
            min_stock: 20,
            image_url: null,
            is_active: true,
        })
        await firestoreService.createProduct({
            category_id: cat3.id,
            supplier_id: null,
            name: 'Keripik Singkong',
            sku: 'SNK001',
            barcode: null,
            description: 'Keripik singkong renyah',
            price: 8000,
            cost_price: 5000,
            stock: 30,
            min_stock: 10,
            image_url: null,
            is_active: true,
        })

        // Create default settings
        await firestoreService.updateSettings({
            store_name: 'Toko Demo',
            store_address: 'Jl. Contoh No. 123',
            store_phone: '08123456789',
            tax_rate: 0,
            currency: 'IDR',
            theme: 'light-blue',
        })
    },
}

export default firestoreService
