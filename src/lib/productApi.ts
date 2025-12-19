/**
 * Indonesian Product Database API Service
 * 
 * API: https://api-products.alpha-projects.cloud
 * 
 * Provides product lookup by barcode or name from Indonesian product database
 */

const API_BASE_URL = 'https://api-products.alpha-projects.cloud/api/v1'

export interface ProductApiResponse {
    id?: string
    barcode?: string
    name?: string
    description?: string
    price?: number
    category?: string
    brand?: string
    image_url?: string
    imgBarcode?: string | null  // From API
    weight?: string
    unit?: string
    uom?: string  // Unit of measure from API
}

export interface ProductSearchResult {
    success: boolean
    data: ProductApiResponse | ProductApiResponse[] | null
    error?: string
}

/**
 * Search product by barcode
 * @param barcode - Product barcode (EAN-13, UPC, etc.)
 * @param generateBarcode - Whether to generate barcode image
 */
export async function searchProductByBarcode(
    barcode: string,
    generateBarcode: boolean = false
): Promise<ProductSearchResult> {
    try {
        const url = `${API_BASE_URL}/products-barcode?barcode=${encodeURIComponent(barcode)}&generateBarcode=${generateBarcode}`

        console.log('[Product API] Searching barcode:', barcode)
        console.log('[Product API] URL:', url)

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })

        console.log('[Product API] Response status:', response.status)

        if (!response.ok) {
            if (response.status === 404) {
                console.log('[Product API] Product not found (404)')
                return { success: false, data: null, error: 'Produk tidak ditemukan' }
            }
            throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log('[Product API] Response data:', data)

        // Handle both single object and array responses
        if (data && (data.id || data.barcode || data.name)) {
            return { success: true, data }
        }

        return { success: false, data: null, error: 'Produk tidak ditemukan' }
    } catch (error) {
        console.error('[Product API] Error searching by barcode:', error)
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Gagal mencari produk'
        }
    }
}

/**
 * Search products by name/keyword
 * @param name - Product name or keyword
 */
export async function searchProductByName(name: string): Promise<ProductSearchResult> {
    try {
        const url = `${API_BASE_URL}/products?name=${encodeURIComponent(name)}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, data: [], error: 'Produk tidak ditemukan' }
            }
            throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        return { success: true, data: Array.isArray(data) ? data : [data] }
    } catch (error) {
        console.error('[Product API] Error searching by name:', error)
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Gagal mencari produk'
        }
    }
}

/**
 * Combined search - tries barcode first, then name
 * @param query - Barcode or product name
 */
export async function searchProduct(query: string): Promise<ProductSearchResult> {
    // Check if query looks like a barcode (numeric, 8-14 digits)
    const isBarcode = /^\d{8,14}$/.test(query.trim())

    if (isBarcode) {
        const result = await searchProductByBarcode(query.trim())
        if (result.success && result.data) {
            return result
        }
    }

    // Fall back to name search
    return searchProductByName(query.trim())
}

export const productApiService = {
    searchByBarcode: searchProductByBarcode,
    searchByName: searchProductByName,
    search: searchProduct,
}

export default productApiService
