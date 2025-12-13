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
    avatar_url: string | null
    email_verified: boolean
    loginType: 'firebase' | 'cashier'
    cashierId?: string
}

interface AuthContextType {
    user: User | null
    firebaseUser: FirebaseUser | null
    loading: boolean
    isConfigured: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null; needsVerification?: boolean }>
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
                setUser(createUserFromAuth(authUser))
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
    const createUserFromAuth = (authUser: FirebaseUser): User => {
        return {
            id: authUser.uid,
            email: authUser.email || '',
            name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
            role: 'owner', // Default role for new users
            avatar_url: authUser.photoURL || null,
            email_verified: authUser.emailVerified,
            loginType: 'firebase'
        }
    }

    const refreshUser = async () => {
        if (!auth) return
        if (auth.currentUser) {
            await auth.currentUser.reload()
            setUser(createUserFromAuth(auth.currentUser))
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

    const signUp = async (email: string, password: string, name: string) => {
        if (!auth) {
            return { error: new Error('Firebase tidak dikonfigurasi') }
        }
        try {
            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)

            // Update display name
            await updateProfile(newUser, { displayName: name })

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

            // Store cashier session
            sessionStorage.setItem(CASHIER_SESSION_KEY, JSON.stringify({
                id: cashier.id,
                name: cashier.name,
                username: cashier.username,
                storeCode: cashier.store_code
            }))

            // Set user state
            setUser({
                id: cashier.id,
                email: '',
                name: cashier.name,
                role: 'cashier',
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
