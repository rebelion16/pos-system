'use client'

import { useState, useEffect, useCallback } from 'react'
import { Product } from '@/types/database'
import { realtimeProductService } from '@/lib/firebase/realtimeDb'
import { firestoreService } from '@/lib/firebase/firestore'
import { rtdb } from '@/lib/firebase/config'

interface UseRealtimeProductsOptions {
    storeCode?: string | null  // Required store code for data access
    autoSync?: boolean  // Automatically sync Firestore to RTDB on mount
    onStockChange?: (changes: { productId: string; stock: number }[]) => void
}

interface UseRealtimeProductsReturn {
    products: Product[]
    loading: boolean
    error: string | null
    isRealtime: boolean
    syncToRealtime: () => Promise<void>
    refreshProducts: () => Promise<void>
}

/**
 * Hook for real-time product sync using Firebase Realtime Database
 * 
 * Features:
 * - Real-time updates across devices/tabs
 * - Automatic stock change detection
 * - Fallback to Firestore if RTDB not available
 */
export function useRealtimeProducts(options: UseRealtimeProductsOptions = {}): UseRealtimeProductsReturn {
    const { storeCode, autoSync = false, onStockChange } = options

    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRealtime, setIsRealtime] = useState(false)

    // Sync Firestore products to Realtime Database
    const syncToRealtime = useCallback(async () => {
        if (!storeCode) return
        try {
            const firestoreProducts = await firestoreService.getProducts(storeCode)
            await realtimeProductService.syncProducts(firestoreProducts)
            console.log('[useRealtimeProducts] Synced', firestoreProducts.length, 'products to RTDB')
        } catch (err) {
            console.error('[useRealtimeProducts] Sync error:', err)
            setError('Gagal sync ke Realtime Database')
        }
    }, [storeCode])

    // Refresh products from Firestore
    const refreshProducts = useCallback(async () => {
        if (!storeCode) return
        try {
            const firestoreProducts = await firestoreService.getProducts(storeCode)
            setProducts(firestoreProducts)
        } catch (err) {
            console.error('[useRealtimeProducts] Refresh error:', err)
        }
    }, [storeCode])

    useEffect(() => {
        if (!storeCode) {
            setLoading(false)
            return
        }

        let unsubscribeProducts: (() => void) | null = null
        let unsubscribeStock: (() => void) | null = null

        const initializeRealtime = async () => {
            // Check if Realtime Database is available
            if (rtdb) {
                console.log('[useRealtimeProducts] RTDB available, setting up listeners')

                // Auto-sync from Firestore if enabled
                if (autoSync) {
                    await syncToRealtime()
                }

                // Subscribe to real-time product updates
                unsubscribeProducts = realtimeProductService.subscribeToProducts((rtdbProducts) => {
                    console.log('[useRealtimeProducts] Received', rtdbProducts.length, 'products from RTDB')
                    setProducts(rtdbProducts)
                    setLoading(false)
                    setIsRealtime(true)
                })

                // Subscribe to stock changes if callback provided
                if (onStockChange) {
                    unsubscribeStock = realtimeProductService.subscribeToStockChanges(onStockChange)
                }
            } else {
                // Fallback to Firestore
                console.log('[useRealtimeProducts] RTDB not available, using Firestore')
                try {
                    const firestoreProducts = await firestoreService.getProducts(storeCode)
                    setProducts(firestoreProducts)
                    setIsRealtime(false)
                } catch (err) {
                    console.error('[useRealtimeProducts] Firestore error:', err)
                    setError('Gagal memuat produk')
                }
                setLoading(false)
            }
        }

        initializeRealtime()

        return () => {
            if (unsubscribeProducts) unsubscribeProducts()
            if (unsubscribeStock) unsubscribeStock()
        }
    }, [storeCode, autoSync, onStockChange, syncToRealtime])

    return {
        products,
        loading,
        error,
        isRealtime,
        syncToRealtime,
        refreshProducts,
    }
}

/**
 * Hook for real-time stock updates only (optimized for POS)
 */
export function useRealtimeStock(onStockChange: (productId: string, newStock: number) => void) {
    useEffect(() => {
        if (!rtdb) return

        const unsubscribe = realtimeProductService.subscribeToStockChanges((changes) => {
            changes.forEach(({ productId, stock }) => {
                onStockChange(productId, stock)
            })
        })

        return unsubscribe
    }, [onStockChange])
}

export default useRealtimeProducts

