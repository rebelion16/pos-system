export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type UserRole = 'owner' | 'admin' | 'cashier'
export type PaymentMethod = 'cash' | 'transfer' | 'qris'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type StockType = 'in' | 'out' | 'adjustment'

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    name: string
                    role: UserRole
                    store_id: string  // Owner's user ID (for owner = own ID, for admin/cashier = owner's ID)
                    store_code: string | null  // Unique store code for joining (only for owners)
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    name: string
                    role?: UserRole
                    store_id: string
                    store_code?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string
                    role?: UserRole
                    store_id?: string
                    store_code?: string | null
                    avatar_url?: string | null
                    updated_at?: string
                }
            }
            categories: {
                Row: {
                    id: string
                    store_id: string
                    name: string
                    description: string | null
                    color: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    name: string
                    description?: string | null
                    color?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    name?: string
                    description?: string | null
                    color?: string | null
                    updated_at?: string
                }
            }
            suppliers: {
                Row: {
                    id: string
                    store_id: string
                    name: string
                    phone: string | null
                    email: string | null
                    address: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    name: string
                    phone?: string | null
                    email?: string | null
                    address?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    name?: string
                    phone?: string | null
                    email?: string | null
                    address?: string | null
                    updated_at?: string
                }
            }
            products: {
                Row: {
                    id: string
                    store_id: string
                    category_id: string | null
                    supplier_id: string | null
                    name: string
                    sku: string | null
                    barcode: string | null
                    description: string | null
                    price: number
                    cost_price: number
                    stock: number
                    min_stock: number
                    image_url: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    category_id?: string | null
                    supplier_id?: string | null
                    name: string
                    sku?: string | null
                    barcode?: string | null
                    description?: string | null
                    price: number
                    cost_price?: number
                    stock?: number
                    min_stock?: number
                    image_url?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    category_id?: string | null
                    supplier_id?: string | null
                    name?: string
                    sku?: string | null
                    barcode?: string | null
                    description?: string | null
                    price?: number
                    cost_price?: number
                    stock?: number
                    min_stock?: number
                    image_url?: string | null
                    is_active?: boolean
                    updated_at?: string
                }
            }
            stock_history: {
                Row: {
                    id: string
                    product_id: string
                    user_id: string
                    quantity_change: number
                    type: StockType
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    product_id: string
                    user_id: string
                    quantity_change: number
                    type: StockType
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    product_id?: string
                    user_id?: string
                    quantity_change?: number
                    type?: StockType
                    notes?: string | null
                }
            }
            transactions: {
                Row: {
                    id: string
                    user_id: string
                    invoice_number: string
                    subtotal: number
                    tax: number
                    discount: number
                    total: number
                    payment_method: PaymentMethod
                    payment_status: PaymentStatus
                    cash_received: number | null
                    change_amount: number | null
                    bank_account_id: string | null
                    qris_reference: string | null
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    invoice_number: string
                    subtotal: number
                    tax?: number
                    discount?: number
                    total: number
                    payment_method: PaymentMethod
                    payment_status?: PaymentStatus
                    cash_received?: number | null
                    change_amount?: number | null
                    bank_account_id?: string | null
                    qris_reference?: string | null
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    invoice_number?: string
                    subtotal?: number
                    tax?: number
                    discount?: number
                    total?: number
                    payment_method?: PaymentMethod
                    payment_status?: PaymentStatus
                    cash_received?: number | null
                    change_amount?: number | null
                    bank_account_id?: string | null
                    qris_reference?: string | null
                    notes?: string | null
                }
            }
            transaction_items: {
                Row: {
                    id: string
                    transaction_id: string
                    product_id: string
                    product_name: string
                    quantity: number
                    price: number
                    subtotal: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    transaction_id: string
                    product_id: string
                    product_name: string
                    quantity: number
                    price: number
                    subtotal: number
                    created_at?: string
                }
                Update: {
                    transaction_id?: string
                    product_id?: string
                    product_name?: string
                    quantity?: number
                    price?: number
                    subtotal?: number
                }
            }
            bank_accounts: {
                Row: {
                    id: string
                    bank_name: string
                    account_number: string
                    account_holder: string
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    bank_name: string
                    account_number: string
                    account_holder: string
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    bank_name?: string
                    account_number?: string
                    account_holder?: string
                    is_active?: boolean
                    updated_at?: string
                }
            }
            settings: {
                Row: {
                    id: string
                    store_id: string
                    store_name: string
                    store_address: string | null
                    store_phone: string | null
                    store_logo: string | null
                    store_code: string | null
                    tax_rate: number
                    currency: string
                    theme: string
                    printer_enabled: boolean
                    printer_name: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    store_name: string
                    store_address?: string | null
                    store_phone?: string | null
                    store_logo?: string | null
                    store_code?: string | null
                    tax_rate?: number
                    currency?: string
                    theme?: string
                    printer_enabled?: boolean
                    printer_name?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    store_name?: string
                    store_address?: string | null
                    store_phone?: string | null
                    store_logo?: string | null
                    store_code?: string | null
                    tax_rate?: number
                    currency?: string
                    theme?: string
                    printer_enabled?: boolean
                    printer_name?: string | null
                    updated_at?: string
                }
            }
            cashiers: {
                Row: {
                    id: string
                    username: string
                    password_hash: string
                    name: string
                    store_code: string
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    username: string
                    password_hash: string
                    name: string
                    store_code: string
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    username?: string
                    password_hash?: string
                    name?: string
                    store_code?: string
                    is_active?: boolean
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            user_role: UserRole
            payment_method: PaymentMethod
            payment_status: PaymentStatus
            stock_type: StockType
        }
    }
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type StockHistory = Database['public']['Tables']['stock_history']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionItem = Database['public']['Tables']['transaction_items']['Row']
export type BankAccount = Database['public']['Tables']['bank_accounts']['Row']
export type Settings = Database['public']['Tables']['settings']['Row']
export type Cashier = Database['public']['Tables']['cashiers']['Row']

// Extended types with relations
export type ProductWithRelations = Product & {
    category?: Category | null
    supplier?: Supplier | null
}

export type TransactionWithItems = Transaction & {
    items: TransactionItem[]
    user?: User | null
}

// QRIS Configuration
export interface QRISConfig {
    enabled: boolean
    merchant_name: string
    merchant_id: string
    qris_static_code: string | null  // Static QRIS image URL
    qris_dynamic_enabled: boolean
    nmid: string | null  // National Merchant ID
    api_key: string | null  // For dynamic QRIS generation
}

// Extended BankAccount with logo
export interface BankAccountExtended extends BankAccount {
    bank_logo?: string | null
    bank_code?: string | null
}

// Receipt Settings for custom receipt templates
export type ReceiptPreset = 'simple' | 'standard' | 'detailed'

export interface ReceiptSettings {
    // Header
    show_logo: boolean
    logo_url: string | null
    show_store_name: boolean
    show_store_address: boolean
    show_store_phone: boolean

    // Content
    show_invoice_number: boolean
    show_date_time: boolean
    show_item_details: boolean
    show_payment_method: boolean
    show_change: boolean

    // Footer
    footer_text: string
    show_footer: boolean

    // Template preset
    template_preset: ReceiptPreset
}
