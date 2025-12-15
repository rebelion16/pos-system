import Link from 'next/link'

export default function TermsPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', lineHeight: '1.6', color: '#333' }}>
            <Link href="/" style={{ color: '#666', textDecoration: 'none', marginBottom: '2rem', display: 'inline-block', fontSize: '0.9rem' }}>
                &larr; Kembali ke Aplikasi
            </Link>
            <h1 style={{ marginBottom: '0.5rem' }}>Syarat dan Ketentuan</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}><strong>Versi:</strong> 1.0.0</p>

            <p style={{ marginBottom: '1.5rem' }}>Dengan mengakses atau menggunakan aplikasi POS UMKM, Anda dianggap telah membaca, memahami, dan menyetujui syarat dan ketentuan berikut:</p>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>1. Penggunaan Aplikasi</h2>
            <p style={{ marginBottom: '1.5rem' }}>Aplikasi ini disediakan "sebagaimana adanya" (as is) untuk membantu operasional usaha Anda. Pengembang berupaya maksimal untuk memastikan keakuratan dan keamanan aplikasi, namun tidak bertanggung jawab atas kerugian langsung maupun tidak langsung yang mungkin timbul akibat penggunaan aplikasi ini.</p>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>2. Footer dan Atribusi</h2>
            <div style={{ padding: '1.25rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', margin: '1.5rem 0' }}>
                <p style={{ margin: 0, fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                    ⚠️ PENTING:
                </p>
                <p style={{ margin: 0, color: '#374151' }}>
                    Pengguna dilarang keras untuk menghapus, menyembunyikan, atau memodifikasi footer atribusi (bertuliskan <em>"Dibuat dengan ❤️ oleh Rebelion_16"</em>) tanpa izin tertulis dari pengembang.
                </p>
                <p style={{ marginTop: '1rem', marginBottom: 0, color: '#374151' }}>
                    Apabila Anda ingin menggunakan versi tanpa footer kebanggaan kami (White Label) atau memerlukan kustomisasi khusus untuk brand Anda, Anda <strong>wajib menghubungi pengembang</strong> melalui kontak yang tersedia untuk mendapatkan lisensi komersial/khusus.
                </p>
            </div>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>3. Perubahan Syarat</h2>
            <p style={{ marginBottom: '1.5rem' }}>Pengembang berhak mengubah syarat dan ketentuan ini sewaktu-waktu tanpa pemberitahuan sebelumnya. Penggunaan berkelanjutan Anda atas aplikasi setelah perubahan tersebut merupakan persetujuan Anda terhadap syarat baru.</p>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>4. Kontak</h2>
            <p>Untuk pertanyaan, dukungan, atau permohonan lisensi khusus (penghapusan footer), silakan hubungi kami via Telegram di: <a href="https://t.me/rebelion_16" target="_blank" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '500' }}>@rebelion_16</a>.</p>
        </div>
    )
}
