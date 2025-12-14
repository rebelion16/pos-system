import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getDatabase, Database } from 'firebase/database'

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

// Initialize Firebase only if API key is provided
let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let rtdb: Database | null = null

// Check if Firebase is configured
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

// Debug logging
if (typeof window !== 'undefined') {
    console.log('[Firebase Config] API Key exists:', !!firebaseConfig.apiKey)
    console.log('[Firebase Config] Project ID:', firebaseConfig.projectId)
    console.log('[Firebase Config] Database URL:', firebaseConfig.databaseURL)
    console.log('[Firebase Config] Is configured:', isFirebaseConfigured)
}

if (isFirebaseConfigured && typeof window !== 'undefined') {
    try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
        auth = getAuth(app)
        db = getFirestore(app)

        // Initialize Realtime Database if URL is provided
        if (firebaseConfig.databaseURL) {
            rtdb = getDatabase(app)
            console.log('[Firebase] Realtime Database initialized')
        }

        console.log('[Firebase] Successfully initialized. Firestore db:', !!db, 'RTDB:', !!rtdb)
    } catch (error) {
        console.error('[Firebase] Initialization error:', error)
    }
} else if (typeof window !== 'undefined') {
    console.warn('[Firebase] NOT configured - missing API key or project ID')
}

export { app, auth, db, rtdb, isFirebaseConfigured }
