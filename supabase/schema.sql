-- =============================================
-- POS SYSTEM UMKM - Database Schema
-- Run this script in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'cashier');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'qris');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE stock_type AS ENUM ('in', 'out', 'adjustment');

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role DEFAULT 'cashier',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUPPLIERS TABLE
-- =============================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT,
  description TEXT,
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(15,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STOCK HISTORY TABLE
-- =============================================
CREATE TABLE stock_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  quantity_change INTEGER NOT NULL,
  type stock_type NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BANK ACCOUNTS TABLE
-- =============================================
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRANSACTIONS TABLE
-- =============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  cash_received DECIMAL(15,2),
  change_amount DECIMAL(15,2),
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  qris_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRANSACTION ITEMS TABLE
-- =============================================
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SETTINGS TABLE
-- =============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL DEFAULT 'Toko Saya',
  store_address TEXT,
  store_phone TEXT,
  store_logo TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  theme TEXT DEFAULT 'blue',
  printer_enabled BOOLEAN DEFAULT false,
  printer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_stock_history_product ON stock_history(product_id);
CREATE INDEX idx_stock_history_date ON stock_history(created_at);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_number);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "Users can view all users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Owners can manage all users" ON users FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- CATEGORIES policies (all authenticated users can read, admin/owner can write)
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Owner can manage categories" ON categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- SUPPLIERS policies
CREATE POLICY "Anyone can view suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Owner can manage suppliers" ON suppliers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- PRODUCTS policies
CREATE POLICY "Anyone can view products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Owner can manage products" ON products FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- STOCK HISTORY policies
CREATE POLICY "Anyone can view stock history" ON stock_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Owner can manage stock" ON stock_history FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- BANK ACCOUNTS policies
CREATE POLICY "Anyone can view bank accounts" ON bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage bank accounts" ON bank_accounts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- TRANSACTIONS policies
CREATE POLICY "Anyone can view transactions" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner can update transactions" ON transactions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- TRANSACTION ITEMS policies
CREATE POLICY "Anyone can view transaction items" ON transaction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create transaction items" ON transaction_items FOR INSERT TO authenticated WITH CHECK (true);

-- SETTINGS policies
CREATE POLICY "Anyone can view settings" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage settings" ON settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTION: Auto create user profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cashier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- FUNCTION: Update product stock on transaction
-- =============================================
CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Reduce stock when transaction item is created
  UPDATE products 
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_transaction_item_created
  AFTER INSERT ON transaction_items
  FOR EACH ROW EXECUTE FUNCTION update_product_stock_on_sale();

-- =============================================
-- FUNCTION: Generate Invoice Number
-- =============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  seq_num INTEGER;
  invoice TEXT;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO seq_num
  FROM transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  invoice := 'INV-' || today_date || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN invoice;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INSERT DEFAULT SETTINGS
-- =============================================
INSERT INTO settings (store_name, store_address, tax_rate, currency, theme)
VALUES ('Toko Saya', 'Alamat Toko', 0, 'IDR', 'blue')
ON CONFLICT DO NOTHING;

-- =============================================
-- INSERT SAMPLE CATEGORIES
-- =============================================
INSERT INTO categories (name, description, color) VALUES
  ('Makanan', 'Produk makanan siap saji', '#EF4444'),
  ('Minuman', 'Produk minuman', '#3B82F6'),
  ('Snack', 'Makanan ringan', '#F59E0B'),
  ('Rokok', 'Produk rokok', '#6B7280'),
  ('Lainnya', 'Produk lainnya', '#8B5CF6')
ON CONFLICT DO NOTHING;
