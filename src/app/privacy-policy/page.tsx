import Link from 'next/link'

export default function PrivacyPolicyPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', lineHeight: '1.6', color: '#333' }}>
            <Link href="/" style={{ color: '#666', textDecoration: 'none', marginBottom: '2rem', display: 'inline-block', fontSize: '0.9rem' }}>
                &larr; Kembali ke Aplikasi
            </Link>
            <h1 style={{ marginBottom: '0.5rem' }}>Kebijakan Privasi</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}><strong>Terakhir diperbarui:</strong> {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <p style={{ marginBottom: '1.5rem' }}>Selamat datang di POS UMKM ("Aplikasi"). Kami menghargai privasi Anda dan berkomitmen untuk melindungi informasi pribadi Anda.</p>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>1. Informasi yang Kami Kumpulkan</h2>
            <p>Aplikasi ini mengumpulkan informasi yang Anda berikan secara langsung, seperti:</p>
            <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                <li>Informasi akun (nama, email, nama toko).</li>
                <li>Data transaksi, produk, dan inventaris yang Anda masukkan.</li>
            </ul>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>2. Penggunaan Informasi</h2>
            <p>Informasi yang dikumpulkan digunakan semata-mata untuk:</p>
            <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                <li>Menyediakan layanan Kasir / Point of Sale (POS).</li>
                <li>Mengelola inventaris dan menghasilkan laporan penjualan Anda.</li>
                <li>Meningkatkan pengalaman dan kinerja aplikasi.</li>
            </ul>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>3. Penyimpanan Data</h2>
            <p style={{ marginBottom: '1.5rem' }}>Data Anda disimpan dengan aman menggunakan infrastruktur layanan cloud terpercaya (Google Firebase). Kami tidak menjual atau menyewakan data pribadi Anda kepada pihak ketiga.</p>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>4. Kontak</h2>
            <p>Jika Anda memiliki pertanyaan tentang kebijakan ini atau cara kami menangani data Anda, silakan hubungi pengembang melalui tautan Kontak yang tersedia di footer aplikasi.</p>
        </div>
    )
}
