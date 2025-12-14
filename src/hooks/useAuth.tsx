'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { auth, isFirebaseConfigured } from '@/lib/firebase/config'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User as FirebaseUser,
    updateProfile,
    sendEmailVerification
} from 'firebase/auth'
import { firestoreService } from '@/lib/firebase/firestore'

interface User {
    id: string
    email: string
    name: string
    role: 'owner' | 'admin' | 'cashier'
    storeId: string  // Store ID for multi-tenancy
    storeCode: string | null  // Store code (for owners)
    avatar_url: string | null
    email_verified: boolean
    loginType: 'firebase' | 'cashier'
    cashierId?: string
}

interface AuthContextType {
    user: User | null
    firebaseUser: FirebaseUser | null
    storeId: string | null  // Current store ID for data filtering
    loading: boolean
    isConfigured: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, name: string, storeCode?: string) => Promise<{ error: Error | null; needsVerification?: boolean }>
    signInWithGoogle: () => Promise<{ error: Error | null }>
    signInAsCashier: (username: string, password: string, storeCode: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const googleProvider = new GoogleAuthProvider()

// Session storage key for cashier login
const CASHIER_SESSION_KEY = 'pos_cashier_session'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Check for cashier session on mount
    useEffect(() => {
        if (!mounted) return

        // Check if there's a cashier session
        const cashierSession = sessionStorage.getItem(CASHIER_SESSION_KEY)
        if (cashierSession) {
            try {
                const cashierData = JSON.parse(cashierSession)
                setUser({
                    id: cashierData.id,
                    email: '',
                    name: cashierData.name,
                    role: 'cashier',
                    storeId: cashierData.storeId || '',
                    storeCode: null,
                    avatar_url: null,
                    email_verified: true,
                    loginType: 'cashier',
                    cashierId: cashierData.id
                })
                setLoading(false)
                return
            } catch {
                sessionStorage.removeItem(CASHIER_SESSION_KEY)
            }
        }

        // If Firebase is not configured, stop loading
        if (!isFirebaseConfigured || !auth) {
            setLoading(false)
            return
        }

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setFirebaseUser(authUser)
                const userData = await createUserFromAuth(authUser)
                setUser(userData)
            } else {
                setFirebaseUser(null)
                // Don't set user to null if there's a cashier session
                const cashierSession = sessionStorage.getItem(CASHIER_SESSION_KEY)
                if (!cashierSession) {
                    setUser(null)
                }
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [mounted])

    // Create user object from Firebase auth user
    const createUserFromAuth = async (authUser: FirebaseUser): Promise<User> => {
        // Fetch user data from Firestore to get store_id
        const firestoreUser = await firestoreService.getUserById(authUser.uid)

        return {
            id: authUser.uid,
            email: authUser.email || '',
            name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
            role: (firestoreUser?.role as 'owner' | 'admin' | 'cashier') || 'owner',
            storeId: firestoreUser?.store_id || authUser.uid, // Default to own ID for new owners
            storeCode: firestoreUser?.store_code || null,
            avatar_url: authUser.photoURL || null,
            email_verified: authUser.emailVerified,
            loginType: 'firebase'
        }
    }

    const refreshUser = async () => {
        if (!auth) return
        if (auth.currentUser) {
            await auth.currentUser.reload()
            const userData = await createUserFromAuth(auth.currentUser)
            setUser(userData)
        }
    }

    const signIn = async (email: string, password: string) => {
        if (!auth) {
            return { error: new Error('Firebase tidak dikonfigurasi') }
        }
        try {
            await signInWithEmailAndPassword(auth, email, password)
            return { error: null }
        } catch (err) {
            const error = err as Error
            let message = error.message

            // Translate Firebase error messages to Indonesian
            if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
                message = 'Email atau password salah'
            } else if (message.includes('auth/too-many-requests')) {
                message = 'Terlalu banyak percobaan. Coba lagi nanti.'
            }

            return { error: new Error(message) }
        }
    }

    const signUp = async (email: string, password: string, name: string, storeCode?: string) => {
        if (!auth) {
            return { error: new Error('Firebase tidak dikonfigurasi') }
        }
        try {
            // If joining as staff, validate store code first
            let storeOwner = null
            if (storeCode) {
                storeOwner = await firestoreService.getUserByStoreCode(storeCode)
                if (!storeOwner) {
                    return { error: new Error('Kode toko tidak ditemukan') }
                }
            }

            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)

            // Update display name
            await updateProfile(newUser, { displayName: name })

            // Generate store code for owner
            const generateStoreCode = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                let code = ''
                for (let i = 0; i < 6; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length))
                }
                return code
            }

            // Create user document in Firestore
            const isOwner = !storeCode
            const userStoreId = isOwner ? newUser.uid : storeOwner!.id
            const userStoreCode = isOwner ? generateStoreCode() : null
            const userRole = isOwner ? 'owner' : 'admin' // Staff registering get admin role, cashiers use different login

            await firestoreService.createUserWithId(newUser.uid, {
                email: newUser.email || email,
                name: name,
                role: userRole as 'owner' | 'admin' | 'cashier',
                store_id: userStoreId,
                store_code: userStoreCode,
                avatar_url: newUser.photoURL || null
            })

            // Send email verification
            await sendEmailVerification(newUser)

            return { error: null, needsVerification: true }
        } catch (err) {
            const error = err as Error
            let message = error.message

            // Translate Firebase error messages to Indonesian
            if (message.includes('auth/email-already-in-use')) {
                message = 'Email sudah terdaftar'
            } else if (message.includes('auth/weak-password')) {
                message = 'Password terlalu lemah'
            } else if (message.includes('auth/invalid-email')) {
                message = 'Format email tidak valid'
            }

            return { error: new Error(message) }
        }
    }

    const signInWithGoogle = async () => {
        if (!auth) {
            return { error: new Error('Firebase tidak dikonfigurasi') }
        }
        try {
            await signInWithPopup(auth, googleProvider)
            return { error: null }
        } catch (err) {
            const error = err as Error
            let message = error.message

            if (message.includes('auth/popup-closed-by-user')) {
                message = 'Login dibatalkan'
            } else if (message.includes('auth/popup-blocked')) {
                message = 'Popup diblokir browser. Izinkan popup untuk melanjutkan.'
            }

            return { error: new Error(message) }
        }
    }

    const signInAsCashier = async (username: string, password: string, storeCode: string) => {
        try {
            const cashier = await firestoreService.verifyCashierLogin(username, password, storeCode)

            if (!cashier) {
                return { error: new Error('Username, password, atau kode toko salah') }
            }

            // Get store_id directly from cashier record
            const storeId = cashier.store_id

            if (!storeId) {
                // Fallback: try to find by user store_code or settings (for backward compatibility)
                let fallbackStoreId = ''
                const storeOwner = await firestoreService.getUserByStoreCode(cashier.store_code)
                if (storeOwner) {
                    fallbackStoreId = storeOwner.id
                } else {
                    const storeSettings = await firestoreService.getSettingsByStoreCode(cashier.store_code)
                    if (storeSettings) {
                        fallbackStoreId = storeSettings.store_id
                    }
                }

                if (!fallbackStoreId) {
                    return { error: new Error('Data toko tidak ditemukan untuk kode ini') }
                }

                // Store cashier session WITH storeId for proper restoration
                sessionStorage.setItem(CASHIER_SESSION_KEY, JSON.stringify({
                    id: cashier.id,
                    name: cashier.name,
                    username: cashier.username,
                    storeCode: cashier.store_code,
                    storeId: fallbackStoreId
                }))

                setUser({
                    id: cashier.id,
                    email: '',
                    name: cashier.name,
                    role: 'cashier',
                    storeId: fallbackStoreId,
                    storeCode: null,
                    avatar_url: null,
                    email_verified: true,
                    loginType: 'cashier',
                    cashierId: cashier.id
                })

                return { error: null }
            }

            // Store cashier session WITH storeId for proper restoration
            sessionStorage.setItem(CASHIER_SESSION_KEY, JSON.stringify({
                id: cashier.id,
                name: cashier.name,
                username: cashier.username,
                storeCode: cashier.store_code,
                storeId: storeId
            }))

            setUser({
                id: cashier.id,
                email: '',
                name: cashier.name,
                role: 'cashier',
                storeId: storeId,
                storeCode: null,
                avatar_url: null,
                email_verified: true,
                loginType: 'cashier',
                cashierId: cashier.id
            })

            return { error: null }
        } catch (err) {
            const error = err as Error
            return { error: new Error(error.message || 'Gagal login. Silakan coba lagi.') }
        }
    }

    const signOut = async () => {
        // Clear cashier session
        sessionStorage.removeItem(CASHIER_SESSION_KEY)

        if (auth) {
            await firebaseSignOut(auth)
        }
        setUser(null)
        setFirebaseUser(null)
    }

    if (!mounted) {
        return (
            <AuthContext.Provider value={{
                user: null,
                firebaseUser: null,
                storeId: null,
                loading: true,
                isConfigured: isFirebaseConfigured,
                signIn,
                signUp,
                signInWithGoogle,
                signInAsCashier,
                signOut,
                refreshUser,
            }}>
                {children}
            </AuthContext.Provider>
        )
    }

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            storeId: user?.storeId || null,
            loading,
            isConfigured: isFirebaseConfigured,
            signIn,
            signUp,
            signInWithGoogle,
            signInAsCashier,
            signOut,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
