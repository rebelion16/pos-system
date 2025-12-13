'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, FolderOpen, X } from 'lucide-react'
import { localStorageService } from '@/lib/localStorage'
import { Category } from '@/types/database'
import { Button, Input } from '@/components/ui'
import styles from './categories.module.css'

const colorOptions = [
    { value: '#EF4444', label: 'Merah' },
    { value: '#F97316', label: 'Orange' },
    { value: '#F59E0B', label: 'Kuning' },
    { value: '#10B981', label: 'Hijau' },
    { value: '#3B82F6', label: 'Biru' },
    { value: '#8B5CF6', label: 'Ungu' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#6B7280', label: 'Abu-abu' },
]

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3B82F6',
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const data = localStorageService.getCategories()
            setCategories(data)
        } catch (error) {
            console.error('Error fetching categories:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingCategory) {
                localStorageService.updateCategory(editingCategory.id, {
                    name: formData.name,
                    description: formData.description || null,
                    color: formData.color,
                })
            } else {
                localStorageService.createCategory({
                    name: formData.name,
                    description: formData.description || null,
                    color: formData.color,
                })
            }

            setShowModal(false)
            resetForm()
            fetchCategories()
        } catch (error) {
            console.error('Error saving category:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (category: Category) => {
        setEditingCategory(category)
        setFormData({
            name: category.name,
            description: category.description || '',
            color: category.color || '#3B82F6',
        })
        setShowModal(true)
    }

    const handleDelete = async (category: Category) => {
        if (!confirm(`Hapus kategori "${category.name}"?`)) return

        try {
            localStorageService.deleteCategory(category.id)
            fetchCategories()
        } catch (error) {
            console.error('Error deleting category:', error)
        }
    }

    const resetForm = () => {
        setFormData({ name: '', description: '', color: '#3B82F6' })
        setEditingCategory(null)
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat kategori...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Kategori</h1>
                    <p className={styles.subtitle}>Kelola kategori produk toko Anda</p>
                </div>
                <Button onClick={() => { resetForm(); setShowModal(true) }}>
                    <Plus size={18} />
                    Tambah Kategori
                </Button>
            </div>

            {categories.length === 0 ? (
                <div className={styles.emptyState}>
                    <FolderOpen size={64} className={styles.emptyIcon} />
                    <h3>Belum ada kategori</h3>
                    <p>Tambahkan kategori untuk mengorganisir produk Anda</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {categories.map((category) => (
                        <div key={category.id} className={styles.card}>
                            <div
                                className={styles.colorStrip}
                                style={{ backgroundColor: category.color || '#3B82F6' }}
                            />
                            <div className={styles.cardContent}>
                                <h4 className={styles.categoryName}>{category.name}</h4>
                                {category.description && (
                                    <p className={styles.categoryDesc}>{category.description}</p>
                                )}
                            </div>
                            <div className={styles.cardActions}>
                                <button className={styles.actionBtn} onClick={() => handleEdit(category)}>
                                    <Edit size={16} />
                                </button>
                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(category)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
                            </h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <Input
                                    label="Nama Kategori *"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Nama kategori"
                                />

                                <div className="input-group">
                                    <label className="label">Deskripsi</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="textarea"
                                        rows={2}
                                        placeholder="Deskripsi kategori (opsional)"
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="label">Warna</label>
                                    <div className={styles.colorPicker}>
                                        {colorOptions.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                className={`${styles.colorOption} ${formData.color === color.value ? styles.colorSelected : ''}`}
                                                style={{ backgroundColor: color.value }}
                                                onClick={() => setFormData({ ...formData, color: color.value })}
                                                title={color.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" loading={saving}>
                                    {editingCategory ? 'Simpan' : 'Tambah'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
