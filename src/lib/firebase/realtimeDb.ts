/**
 * Firebase Realtime Database Service for Real-time Product Sync
 * 
 * This service provides real-time listeners for product changes
 * to enable automatic sync across devices/tabs
 */

import { rtdb } from './config'
import {
    ref,
    onValue,
    set,
    update,
    remove,
    push,
    off,
    DataSnapshot,
    DatabaseReference
} from 'firebase/database'
import { Product } from '@/types/database'

// Real-time listener callbacks
type ProductCallback = (products: Product[]) => void
type ProductChangeCallback = (product: Product, changeType: 'added' | 'changed' | 'removed') => void

// Active listeners storage
const activeListeners: Map<string, DatabaseReference> = new Map()

/**
 * Subscribe to real-time product updates
 * @param callback Function called whenever products change
 * @returns Unsubscribe function
 */
export function subscribeToProducts(callback: ProductCallback): () => void {
    if (!rtdb) {
        console.warn('[RTDB] Realtime Database not initialized')
        return () => { }
    }

    const productsRef = ref(rtdb, 'products')

    const unsubscribe = onValue(productsRef, (snapshot: DataSnapshot) => {
        const products: Product[] = []
        snapshot.forEach((childSnapshot) => {
            const product = childSnapshot.val()
            products.push({
                ...product,
                id: childSnapshot.key,
            })
        })
        callback(products)
    }, (error) => {
        console.error('[RTDB] Error subscribing to products:', error)
    })

    activeListeners.set('products', productsRef)

    return () => {
        off(productsRef)
        activeListeners.delete('products')
    }
}

/**
 * Subscribe to a single product for real-time updates
 * @param productId Product ID to subscribe to
 * @param callback Function called when product changes
 * @returns Unsubscribe function
 */
export function subscribeToProduct(
    productId: string,
    callback: (product: Product | null) => void
): () => void {
    if (!rtdb) {
        console.warn('[RTDB] Realtime Database not initialized')
        return () => { }
    }

    const productRef = ref(rtdb, `products/${productId}`)

    onValue(productRef, (snapshot: DataSnapshot) => {
        if (snapshot.exists()) {
            callback({
                ...snapshot.val(),
                id: snapshot.key,
            })
        } else {
            callback(null)
        }
    })

    activeListeners.set(`product_${productId}`, productRef)

    return () => {
        off(productRef)
        activeListeners.delete(`product_${productId}`)
    }
}

/**
 * Sync product to Realtime Database
 * @param product Product to sync
 */
export async function syncProduct(product: Product): Promise<void> {
    if (!rtdb) {
        console.warn('[RTDB] Realtime Database not initialized')
        return
    }

    const productRef = ref(rtdb, `products/${product.id}`)
    await set(productRef, {
        ...product,
        updated_at: new Date().toISOString(),
    })
    console.log('[RTDB] Product synced:', product.id)
}

/**
 * Update product stock in real-time
 * @param productId Product ID
 * @param newStock New stock value
 */
export async function updateProductStock(productId: string, newStock: number): Promise<void> {
    if (!rtdb) {
        console.warn('[RTDB] Realtime Database not initialized')
        return
    }

    const productRef = ref(rtdb, `products/${productId}`)
    await update(productRef, {
        stock: newStock,
        updated_at: new Date().toISOString(),
    })
    console.log('[RTDB] Stock updated:', productId, newStock)
}

/**
 * Batch sync multiple products
 * @param products Array of products to sync
 */
export async function syncProducts(products: Product[]): Promise<void> {
    if (!rtdb) {
        console.warn('[RTDB] Realtime Database not initialized')
        return
    }

    const updates: Record<string, Product> = {}
    products.forEach(product => {
        updates[`products/${product.id}`] = {
            ...product,
            updated_at: new Date().toISOString(),
        }
    })

    const rootRef = ref(rtdb)
    await update(rootRef, updates)
    console.log('[RTDB] Batch synced', products.length, 'products')
}

/**
 * Remove product from Realtime Database
 * @param productId Product ID to remove
 */
export async function removeProduct(productId: string): Promise<void> {
    if (!rtdb) {
        console.warn('[RTDB] Realtime Database not initialized')
        return
    }

    const productRef = ref(rtdb, `products/${productId}`)
    await remove(productRef)
    console.log('[RTDB] Product removed:', productId)
}

/**
 * Subscribe to stock changes only (optimized for POS)
 * @param callback Called when any product stock changes
 * @returns Unsubscribe function
 */
export function subscribeToStockChanges(
    callback: (changes: { productId: string; stock: number }[]) => void
): () => void {
    if (!rtdb) {
        console.warn('[RTDB] Realtime Database not initialized')
        return () => { }
    }

    const productsRef = ref(rtdb, 'products')
    let previousStocks: Record<string, number> = {}

    onValue(productsRef, (snapshot: DataSnapshot) => {
        const changes: { productId: string; stock: number }[] = []

        snapshot.forEach((childSnapshot) => {
            const product = childSnapshot.val()
            const productId = childSnapshot.key!
            const currentStock = product.stock || 0

            if (previousStocks[productId] !== undefined &&
                previousStocks[productId] !== currentStock) {
                changes.push({ productId, stock: currentStock })
            }

            previousStocks[productId] = currentStock
        })

        if (changes.length > 0) {
            callback(changes)
        }
    })

    activeListeners.set('stock_changes', productsRef)

    return () => {
        off(productsRef)
        activeListeners.delete('stock_changes')
    }
}

/**
 * Cleanup all active listeners
 */
export function cleanupAllListeners(): void {
    activeListeners.forEach((ref, key) => {
        off(ref)
    })
    activeListeners.clear()
    console.log('[RTDB] All listeners cleaned up')
}

export const realtimeProductService = {
    subscribeToProducts,
    subscribeToProduct,
    syncProduct,
    syncProducts,
    updateProductStock,
    removeProduct,
    subscribeToStockChanges,
    cleanupAllListeners,
}

export default realtimeProductService
