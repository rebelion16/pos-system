import Link from 'next/link'
import styles from './Footer.module.css'

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.content}>
                <div className={styles.left}>
                    <p>
                        Dibuat dengan ❤️ oleh{' '}
                        <a
                            href="https://www.instagram.com/lukmandian17"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.link}
                        >
                            Rebelion_16
                        </a>
                    </p>
                    <p className={styles.tagline}>"Tetap Kreatif, Tetap Rebel."</p>
                </div>

                <div className={styles.right}>
                    <span className={styles.version}>Versi Aplikasi v1.0.0</span>
                    <div className={styles.links}>
                        <Link href="/privacy-policy" target="_blank" className={styles.link}>
                            Kebijakan Privasi
                        </Link>
                        <span className={styles.separator}>•</span>
                        <Link href="/terms" target="_blank" className={styles.link}>
                            Syarat
                        </Link>
                        <span className={styles.separator}>•</span>
                        <a
                            href="https://t.me/rebelion_16"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.link}
                        >
                            Kontak
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
