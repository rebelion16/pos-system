'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    Store,
    LayoutDashboard,
    ShoppingCart,
    Package,
    FolderOpen,
    Warehouse,
    Truck,
    FileText,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AuthProvider } from '@/hooks/useAuth'
import styles from './layout.module.css'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Kasir (POS)', href: '/pos', icon: ShoppingCart },
    { name: 'Produk', href: '/products', icon: Package },
    { name: 'Kategori', href: '/categories', icon: FolderOpen },
    { name: 'Stok', href: '/stock', icon: Warehouse },
    { name: 'Supplier', href: '/suppliers', icon: Truck },
    { name: 'Transaksi', href: '/transactions', icon: FileText },
    { name: 'Laporan', href: '/reports', icon: FileText },
    { name: 'Pengguna', href: '/users', icon: Users },
    { name: 'Pengaturan', href: '/settings', icon: Settings },
]

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const { user, signOut, loading } = useAuth()
    const userMenuRef = useRef<HTMLDivElement>(null)

    // Close user menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false)
            }
        }

        if (userMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [userMenuOpen])

    const handleSignOut = async () => {
        await signOut()
        router.push('/login')
    }

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
    }, [loading, user, router])

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat...</p>
            </div>
        )
    }

    // Don't render dashboard if no user
    if (!user) {
        return (
            <div className={styles.loadingContainer}>
                <div className="spinner spinner-lg"></div>
                <p>Mengarahkan ke login...</p>
            </div>
        )
    }

    const getUserInitials = () => {
        if (user?.name) {
            return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        return 'U'
    }

    const getRoleLabel = (role: string | undefined) => {
        switch (role) {
            case 'owner': return 'Pemilik'
            case 'admin': return 'Admin'
            case 'cashier': return 'Kasir'
            default: return 'User'
        }
    }

    return (
        <div className={styles.layout}>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className={styles.overlay}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <Store size={24} />
                        <span>POS UMKM</span>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        const Icon = item.icon

                        // Check access based on role
                        const restrictedForCashier = ['users', 'categories', 'suppliers', 'stock'].some(
                            path => item.href.includes(path)
                        )
                        const restrictedForAdmin = ['users'].some(path => item.href.includes(path))

                        if (user?.role === 'cashier' && restrictedForCashier) return null
                        if (user?.role === 'admin' && restrictedForAdmin) return null

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Icon size={20} />
                                <span>{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className="avatar">{getUserInitials()}</div>
                        <div className={styles.userDetails}>
                            <p className={styles.userName}>{user?.name || 'User'}</p>
                            <p className={styles.userRole}>{getRoleLabel(user?.role)}</p>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className={styles.signOutButton}>
                        <LogOut size={18} />
                        <span>Keluar</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={styles.main}>
                {/* Header */}
                <header className={styles.header}>
                    <button
                        className={styles.menuButton}
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className={styles.headerRight}>
                        <div className={styles.userMenu} ref={userMenuRef}>
                            <button
                                className={styles.userMenuButton}
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <div className="avatar avatar-sm">{getUserInitials()}</div>
                                <span className={styles.userMenuName}>{user?.name || 'User'}</span>
                                <ChevronDown size={16} />
                            </button>

                            {userMenuOpen && (
                                <div className={styles.userMenuDropdown}>
                                    <div className={styles.userMenuHeader}>
                                        <p className={styles.userMenuEmail}>{user?.email}</p>
                                        <span className={`badge badge-primary ${styles.roleBadge}`}>
                                            {getRoleLabel(user?.role)}
                                        </span>
                                    </div>
                                    <div className={styles.userMenuDivider}></div>
                                    <Link href="/settings" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}>
                                        <Settings size={16} />
                                        Pengaturan
                                    </Link>
                                    <button onClick={handleSignOut} className={styles.userMenuItem}>
                                        <LogOut size={16} />
                                        Keluar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    )
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </AuthProvider>
    )
}
