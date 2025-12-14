'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, RefreshCw } from 'lucide-react'
import styles from './BarcodeScanner.module.css'

interface BarcodeScannerProps {
    onScan: (barcode: string) => void
    onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
    const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Get available cameras
        Html5Qrcode.getCameras()
            .then(devices => {
                if (devices && devices.length) {
                    setCameras(devices)
                    // Prefer back camera
                    const backCamera = devices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('rear') ||
                        d.label.toLowerCase().includes('environment')
                    )
                    setSelectedCamera(backCamera?.id || devices[0].id)
                } else {
                    setError('Tidak ada kamera yang tersedia')
                }
            })
            .catch(err => {
                console.error('Error getting cameras:', err)
                setError('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.')
            })

        return () => {
            stopScanner()
        }
    }, [])

    useEffect(() => {
        if (selectedCamera && !isScanning) {
            startScanner()
        }
    }, [selectedCamera])

    const startScanner = async () => {
        if (!selectedCamera) return

        setError(null)
        setIsScanning(true)

        try {
            scannerRef.current = new Html5Qrcode('barcode-reader')

            await scannerRef.current.start(
                selectedCamera,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.777778
                },
                (decodedText) => {
                    // Successfully scanned
                    onScan(decodedText)
                    stopScanner()
                },
                (errorMessage) => {
                    // Ignore scan errors (happens continuously while looking for barcode)
                }
            )
        } catch (err) {
            console.error('Error starting scanner:', err)
            setError('Gagal memulai scanner. Coba refresh halaman.')
            setIsScanning(false)
        }
    }

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop()
                scannerRef.current.clear()
            } catch (err) {
                console.error('Error stopping scanner:', err)
            }
            scannerRef.current = null
        }
        setIsScanning(false)
    }

    const switchCamera = () => {
        if (cameras.length <= 1) return

        const currentIndex = cameras.findIndex(c => c.id === selectedCamera)
        const nextIndex = (currentIndex + 1) % cameras.length

        stopScanner().then(() => {
            setSelectedCamera(cameras[nextIndex].id)
        })
    }

    const handleClose = () => {
        stopScanner().then(() => {
            onClose()
        })
    }

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.container} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>
                        <Camera size={20} />
                        Scan Barcode
                    </h3>
                    <button className={styles.closeBtn} onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.scannerArea}>
                    <div id="barcode-reader" ref={containerRef}></div>

                    {!isScanning && !error && (
                        <div className={styles.loading}>
                            <div className="spinner spinner-lg"></div>
                            <p>Memulai kamera...</p>
                        </div>
                    )}

                    {error && (
                        <div className={styles.error}>
                            <p>{error}</p>
                            <button onClick={startScanner} className={styles.retryBtn}>
                                <RefreshCw size={16} />
                                Coba Lagi
                            </button>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <p className={styles.hint}>Arahkan kamera ke barcode produk</p>

                    {cameras.length > 1 && (
                        <button className={styles.switchBtn} onClick={switchCamera}>
                            <RefreshCw size={16} />
                            Ganti Kamera
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
