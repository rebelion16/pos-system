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
    Cashier,
    BankAccount,
    QRISConfig,
    ReceiptSettings
} from '@/types/database'

// Collection names (under stores/{storeCode}/)
const STORE_COLLECTIONS = {
    categories: 'categories',
    products: 'products',
    suppliers: 'suppliers',
    transactions: 'transactions',
    transactionItems: 'transaction_items',
    stockHistory: 'stock_history',
    settings: 'settings',
    cashiers: 'cashiers',
    settlements: 'settlements',
    bankAccounts: 'bank_accounts',
    qrisConfig: 'qris_config',
    receiptSettings: 'receipt_settings',
}

// Global collections (not store-specific)
const GLOBAL_COLLECTIONS = {
    users: 'users',
}

// Helper to get store collection path
const getStoreCollection = (storeCode: string, collectionName: string) => {
    if (!db) throw new Error('Firestore not configured')
    return collection(db, 'stores', storeCode, collectionName)
}

// Helper to get store document path
const getStoreDoc = (storeCode: string, collectionName: string, docId: string) => {
    if (!db) throw new Error('Firestore not configured')
    return doc(db, 'stores', storeCode, collectionName, docId)
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

    // ==================== USERS (GLOBAL) ====================
    getUsers: async (): Promise<User[]> => {
        if (!db) return []
        const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.users))
        return snapshot.docs.map(doc => convertDoc<User>(doc))
    },

    getUserById: async (id: string): Promise<User | null> => {
        if (!db) return null
        const docRef = doc(db, GLOBAL_COLLECTIONS.users, id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) return null
        return convertDoc<User>(docSnap)
    },

    getUserByEmail: async (email: string): Promise<User | null> => {
        if (!db) return null
        const q = query(collection(db, GLOBAL_COLLECTIONS.users), where('email', '==', email))
        const snapshot = await getDocs(q)
        if (snapshot.empty) return null
        return convertDoc<User>(snapshot.docs[0])
    },

    getUserByStoreCode: async (storeCode: string): Promise<User | null> => {
        if (!db) return null
        const q = query(collection(db, GLOBAL_COLLECTIONS.users), where('store_code', '==', storeCode))
        const snapshot = await getDocs(q)
        if (snapshot.empty) return null
        return convertDoc<User>(snapshot.docs[0])
    },

    createUser: async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
        if (!db) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.users), {
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

    createUserWithId: async (id: string, userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
        if (!db) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = doc(db, GLOBAL_COLLECTIONS.users, id)
        await import('firebase/firestore').then(({ setDoc }) =>
            setDoc(docRef, {
                ...userData,
                created_at: now,
                updated_at: now,
            })
        )
        return {
            ...userData,
            id: id,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateUser: async (id: string, data: Partial<User>): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        const docRef = doc(db, GLOBAL_COLLECTIONS.users, id)
        await updateDoc(docRef, {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteUser: async (id: string): Promise<void> => {
        if (!db) throw new Error('Firestore not configured')
        await deleteDoc(doc(db, GLOBAL_COLLECTIONS.users, id))
    },

    // ==================== CATEGORIES ====================
    getCategories: async (storeCode: string): Promise<Category[]> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.categories))
        return snapshot.docs.map(doc => convertDoc<Category>(doc))
    },

    getCategoryById: async (storeCode: string, id: string): Promise<Category | null> => {
        if (!db || !storeCode) return null
        const docSnap = await getDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.categories, id))
        if (!docSnap.exists()) return null
        return convertDoc<Category>(docSnap)
    },

    createCategory: async (storeCode: string, data: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'store_id'>): Promise<Category> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.categories), {
            ...data,
            created_at: now,
            updated_at: now,
        })
        return {
            ...data,
            id: docRef.id,
            store_id: storeCode,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateCategory: async (storeCode: string, id: string, data: Partial<Category>): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await updateDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.categories, id), {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteCategory: async (storeCode: string, id: string): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await deleteDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.categories, id))
    },

    // ==================== PRODUCTS ====================
    getProducts: async (storeCode: string): Promise<Product[]> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.products))
        return snapshot.docs.map(doc => convertDoc<Product>(doc))
    },

    getProductsWithRelations: async (storeCode: string): Promise<ProductWithRelations[]> => {
        if (!db || !storeCode) return []
        const [products, categories, suppliers] = await Promise.all([
            firestoreService.getProducts(storeCode),
            firestoreService.getCategories(storeCode),
            firestoreService.getSuppliers(storeCode),
        ])
        return products.map(product => ({
            ...product,
            category: categories.find(c => c.id === product.category_id) || null,
            supplier: suppliers.find(s => s.id === product.supplier_id) || null,
        }))
    },

    getActiveProductsWithRelations: async (storeCode: string): Promise<ProductWithRelations[]> => {
        const products = await firestoreService.getProductsWithRelations(storeCode)
        return products.filter(p => p.is_active)
    },

    getProductById: async (storeCode: string, id: string): Promise<Product | null> => {
        if (!db || !storeCode) return null
        const docSnap = await getDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.products, id))
        if (!docSnap.exists()) return null
        return convertDoc<Product>(docSnap)
    },

    createProduct: async (storeCode: string, data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'store_id'>): Promise<Product> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.products), {
            ...data,
            created_at: now,
            updated_at: now,
        })
        return {
            ...data,
            id: docRef.id,
            store_id: storeCode,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateProduct: async (storeCode: string, id: string, data: Partial<Product>): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await updateDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.products, id), {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteProduct: async (storeCode: string, id: string): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await deleteDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.products, id))
    },

    updateProductStock: async (storeCode: string, id: string, quantityChange: number): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const product = await firestoreService.getProductById(storeCode, id)
        if (product) {
            await firestoreService.updateProduct(storeCode, id, { stock: product.stock + quantityChange })
        }
    },

    // ==================== SUPPLIERS ====================
    getSuppliers: async (storeCode: string): Promise<Supplier[]> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.suppliers))
        return snapshot.docs.map(doc => convertDoc<Supplier>(doc))
    },

    getSupplierById: async (storeCode: string, id: string): Promise<Supplier | null> => {
        if (!db || !storeCode) return null
        const docSnap = await getDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.suppliers, id))
        if (!docSnap.exists()) return null
        return convertDoc<Supplier>(docSnap)
    },

    createSupplier: async (storeCode: string, data: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'store_id'>): Promise<Supplier> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.suppliers), {
            ...data,
            created_at: now,
            updated_at: now,
        })
        return {
            ...data,
            id: docRef.id,
            store_id: storeCode,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateSupplier: async (storeCode: string, id: string, data: Partial<Supplier>): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await updateDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.suppliers, id), {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteSupplier: async (storeCode: string, id: string): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await deleteDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.suppliers, id))
    },

    // ==================== TRANSACTIONS ====================
    getTransactions: async (storeCode: string): Promise<Transaction[]> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.transactions))
        return snapshot.docs
            .map(doc => convertDoc<Transaction>(doc))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },

    getTransactionItems: async (storeCode: string): Promise<TransactionItem[]> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.transactionItems))
        return snapshot.docs.map(doc => convertDoc<TransactionItem>(doc))
    },

    getTodayTransactions: async (storeCode: string): Promise<Transaction[]> => {
        if (!db || !storeCode) return []
        const transactions = await firestoreService.getTransactions(storeCode)
        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        return transactions.filter(tx => new Date(tx.created_at) >= startOfDay)
    },

    createTransaction: async (
        storeCode: string,
        data: Omit<Transaction, 'id' | 'created_at' | 'store_id'>,
        items: Omit<TransactionItem, 'id' | 'transaction_id' | 'created_at' | 'store_id'>[]
    ): Promise<Transaction> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const batch = writeBatch(db)

        // Create transaction document
        const txRef = doc(getStoreCollection(storeCode, STORE_COLLECTIONS.transactions))
        batch.set(txRef, {
            ...data,
            created_at: now,
        })

        // Create transaction items and update stock
        for (const item of items) {
            const itemRef = doc(getStoreCollection(storeCode, STORE_COLLECTIONS.transactionItems))
            batch.set(itemRef, {
                ...item,
                transaction_id: txRef.id,
                created_at: now,
            })

            // Update product stock
            const productRef = getStoreDoc(storeCode, STORE_COLLECTIONS.products, item.product_id)
            const productSnap = await getDoc(productRef)
            if (productSnap.exists()) {
                const productData = productSnap.data()
                batch.update(productRef, {
                    stock: (productData.stock || 0) - item.quantity,
                    updated_at: now,
                })
            }
        }

        await batch.commit()

        return {
            ...data,
            id: txRef.id,
            store_id: storeCode,
            created_at: now.toDate().toISOString(),
        }
    },

    generateInvoiceNumber: (): string => {
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        return `INV-${dateStr}-${timeStr}-${random}`
    },

    // ==================== STOCK HISTORY ====================
    getStockHistory: async (storeCode: string): Promise<StockHistory[]> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.stockHistory))
        return snapshot.docs
            .map(doc => convertDoc<StockHistory>(doc))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },

    addStockHistory: async (storeCode: string, data: Omit<StockHistory, 'id' | 'created_at' | 'store_id'>): Promise<StockHistory> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.stockHistory), {
            ...data,
            created_at: now,
        })
        return {
            ...data,
            id: docRef.id,
            created_at: now.toDate().toISOString(),
        }
    },

    // ==================== SETTINGS ====================
    getSettings: async (storeCode: string): Promise<Settings | null> => {
        if (!db || !storeCode) return null
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.settings))
        if (snapshot.empty) return null
        return convertDoc<Settings>(snapshot.docs[0])
    },

    updateSettings: async (storeCode: string, data: Partial<Settings>): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.settings))

        if (snapshot.empty) {
            // Create new settings
            await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.settings), {
                ...data,
                store_id: storeCode,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
            })
        } else {
            // Update existing settings
            await updateDoc(snapshot.docs[0].ref, {
                ...data,
                updated_at: Timestamp.now(),
            })
        }
    },

    getSettingsByStoreCode: async (storeCode: string): Promise<Settings | null> => {
        return firestoreService.getSettings(storeCode)
    },

    // ==================== CASHIERS ====================
    getCashiers: async (storeCode: string): Promise<Cashier[]> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.cashiers))
        return snapshot.docs.map(doc => convertDoc<Cashier>(doc))
    },

    getCashierById: async (storeCode: string, id: string): Promise<Cashier | null> => {
        if (!db || !storeCode) return null
        const docSnap = await getDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.cashiers, id))
        if (!docSnap.exists()) return null
        return convertDoc<Cashier>(docSnap)
    },

    getCashierByUsername: async (username: string, storeCode: string): Promise<Cashier | null> => {
        if (!db || !storeCode) return null
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.cashiers))
        const cashier = snapshot.docs.find(doc => doc.data().username === username)
        if (!cashier) return null
        return convertDoc<Cashier>(cashier)
    },

    verifyCashierLogin: async (username: string, password: string, storeCode: string): Promise<Cashier | null> => {
        if (!db || !storeCode) return null
        const cashier = await firestoreService.getCashierByUsername(username, storeCode)
        if (!cashier) return null
        if (!cashier.is_active) return null
        const passwordHash = firestoreService.hashPassword(password)
        if (cashier.password_hash !== passwordHash) return null
        return cashier
    },

    hashPassword: (password: string): string => {
        let hash = 0
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
        }
        return Math.abs(hash).toString(16).padStart(8, '0')
    },

    createCashier: async (storeCode: string, data: { username: string; password: string; name: string }): Promise<Cashier> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')

        // Check if username already exists
        const existing = await firestoreService.getCashierByUsername(data.username, storeCode)
        if (existing) throw new Error('Username sudah digunakan')

        const now = Timestamp.now()
        const passwordHash = firestoreService.hashPassword(data.password)
        const docRef = await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.cashiers), {
            username: data.username,
            password_hash: passwordHash,
            name: data.name,
            store_code: storeCode,
            store_id: storeCode,
            is_active: true,
            created_at: now,
            updated_at: now,
        })

        return {
            id: docRef.id,
            username: data.username,
            password_hash: passwordHash,
            name: data.name,
            store_code: storeCode,
            store_id: storeCode,
            is_active: true,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateCashier: async (storeCode: string, id: string, data: Partial<Cashier & { password?: string }>): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const updateData: Record<string, unknown> = { ...data, updated_at: Timestamp.now() }
        if (data.password) {
            updateData.password_hash = firestoreService.hashPassword(data.password)
            delete updateData.password
        }
        await updateDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.cashiers, id), updateData)
    },

    deleteCashier: async (storeCode: string, id: string): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await deleteDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.cashiers, id))
    },

    // ==================== BANK ACCOUNTS ====================
    getBankAccounts: async (storeCode: string): Promise<BankAccount[]> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.bankAccounts))
        return snapshot.docs
            .map(doc => convertDoc<BankAccount>(doc))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },

    createBankAccount: async (storeCode: string, data: Omit<BankAccount, 'id' | 'created_at' | 'updated_at' | 'store_id'>): Promise<BankAccount> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const now = Timestamp.now()
        const docRef = await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.bankAccounts), {
            ...data,
            created_at: now,
            updated_at: now,
        })
        return {
            ...data,
            id: docRef.id,
            store_id: storeCode,
            created_at: now.toDate().toISOString(),
            updated_at: now.toDate().toISOString(),
        }
    },

    updateBankAccount: async (storeCode: string, id: string, data: Partial<BankAccount>): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await updateDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.bankAccounts, id), {
            ...data,
            updated_at: Timestamp.now(),
        })
    },

    deleteBankAccount: async (storeCode: string, id: string): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        await deleteDoc(getStoreDoc(storeCode, STORE_COLLECTIONS.bankAccounts, id))
    },

    // ==================== QRIS CONFIG ====================
    getQRISConfig: async (storeCode: string): Promise<QRISConfig | null> => {
        if (!db || !storeCode) return null
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.qrisConfig))
        if (snapshot.empty) return null
        const data = snapshot.docs[0].data() as Record<string, unknown>
        return {
            store_id: storeCode,
            enabled: (data.enabled as boolean) || false,
            merchant_name: (data.merchant_name as string) || '',
            merchant_id: (data.merchant_id as string) || '',
            qris_static_code: (data.qris_static_code as string | null) ?? null,
            qris_dynamic_enabled: (data.qris_dynamic_enabled as boolean) || false,
            nmid: (data.nmid as string | null) ?? null,
            api_key: (data.api_key as string | null) ?? null,
        }
    },

    saveQRISConfig: async (storeCode: string, config: Omit<QRISConfig, 'store_id'>): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.qrisConfig))

        if (snapshot.empty) {
            await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.qrisConfig), config)
        } else {
            await updateDoc(snapshot.docs[0].ref, { ...config })
        }
    },

    // ==================== RECEIPT SETTINGS ====================
    getReceiptSettings: async (storeCode: string): Promise<ReceiptSettings | null> => {
        if (!db || !storeCode) return null
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.receiptSettings))
        if (snapshot.empty) return null
        const data = snapshot.docs[0].data() as Record<string, unknown>
        return {
            store_id: storeCode,
            show_logo: (data.show_logo as boolean) || false,
            logo_url: (data.logo_url as string | null) ?? null,
            show_store_name: (data.show_store_name as boolean) ?? true,
            show_store_address: (data.show_store_address as boolean) ?? true,
            show_store_phone: (data.show_store_phone as boolean) ?? true,
            show_invoice_number: (data.show_invoice_number as boolean) ?? true,
            show_date_time: (data.show_date_time as boolean) ?? true,
            show_item_details: (data.show_item_details as boolean) ?? true,
            show_payment_method: (data.show_payment_method as boolean) ?? true,
            show_change: (data.show_change as boolean) ?? true,
            footer_text: (data.footer_text as string) || 'Terima kasih atas kunjungan Anda!',
            show_footer: (data.show_footer as boolean) ?? true,
            template_preset: (data.template_preset as 'simple' | 'standard' | 'detailed') || 'standard',
        }
    },

    saveReceiptSettings: async (storeCode: string, settings: Omit<ReceiptSettings, 'store_id'>): Promise<void> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.receiptSettings))

        if (snapshot.empty) {
            await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.receiptSettings), settings)
        } else {
            await updateDoc(snapshot.docs[0].ref, { ...settings })
        }
    },

    // ==================== SETTLEMENTS ====================
    getLastSettlement: async (storeCode: string): Promise<{ id: string; settled_at: string; cashier_name?: string } | null> => {
        if (!db || !storeCode) return null
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.settlements))
        if (snapshot.empty) return null

        const settlements = snapshot.docs.map(doc => {
            const data = doc.data() as Record<string, unknown>
            return {
                id: doc.id,
                settled_at: data.settled_at as string,
                cashier_name: data.cashier_name as string | undefined
            }
        }).sort((a, b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime())

        return settlements[0]
    },

    getTodaySettlements: async (storeCode: string): Promise<Array<{
        id: string
        settled_at: string
        cashier_name: string
        total_sales: number
        cash_sales: number
        transfer_sales: number
        qris_sales: number
        transaction_count: number
        difference: number
    }>> => {
        if (!db || !storeCode) return []
        const snapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.settlements))
        if (snapshot.empty) return []

        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

        return snapshot.docs
            .map(doc => {
                const data = doc.data() as Record<string, unknown>
                return {
                    id: doc.id,
                    settled_at: data.settled_at as string,
                    cashier_name: (data.cashier_name as string) || 'Unknown',
                    total_sales: (data.total_sales as number) || 0,
                    cash_sales: (data.cash_sales as number) || 0,
                    transfer_sales: (data.transfer_sales as number) || 0,
                    qris_sales: (data.qris_sales as number) || 0,
                    transaction_count: (data.transaction_count as number) || 0,
                    difference: (data.difference as number) || 0
                }
            })
            .filter(s => new Date(s.settled_at) >= todayStart)
            .sort((a, b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime())
    },

    createSettlement: async (storeCode: string, data: {
        cashier_id?: string
        cashier_name?: string
        cash_sales: number
        transfer_sales: number
        qris_sales: number
        total_sales: number
        actual_cash: number
        difference: number
        transaction_count: number
    }): Promise<{ id: string; settled_at: string }> => {
        if (!db || !storeCode) throw new Error('Firebase not configured')
        const now = new Date().toISOString()
        const docRef = await addDoc(getStoreCollection(storeCode, STORE_COLLECTIONS.settlements), {
            ...data,
            settled_at: now,
            created_at: now
        })
        return { id: docRef.id, settled_at: now }
    },

    // ==================== DANGER ZONE ====================
    deleteAllProductsAndTransactions: async (storeCode: string): Promise<{ productsDeleted: number; transactionsDeleted: number }> => {
        if (!db || !storeCode) throw new Error('Firestore not configured')
        const batch = writeBatch(db)
        let productsDeleted = 0
        let transactionsDeleted = 0

        // Delete all products
        const productsSnapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.products))
        productsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            productsDeleted++
        })

        // Delete all transactions
        const transactionsSnapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.transactions))
        transactionsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            transactionsDeleted++
        })

        // Delete all transaction items
        const itemsSnapshot = await getDocs(getStoreCollection(storeCode, STORE_COLLECTIONS.transactionItems))
        itemsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
        })

        await batch.commit()
        return { productsDeleted, transactionsDeleted }
    },
}

export default firestoreService
