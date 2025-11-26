'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Trash2, Edit } from 'lucide-react'
import { format } from 'date-fns'

interface Product {
    id: string
    name: string
    category: string
    price: number
    stock_quantity: number
    expiry_date: string | null
}

export default function ProductList() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setProducts(data || [])
        } catch (error) {
            console.error('Error fetching products:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteProduct = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)

            if (error) throw error
            setProducts(products.filter(p => p.id !== id))
        } catch (error) {
            console.error('Error deleting product:', error)
            alert('Error deleting product')
        }
    }

    if (loading) return <div className="text-center py-4">Loading products...</div>

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {products.map((product) => (
                    <li key={product.id}>
                        <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium text-indigo-600 truncate">{product.name}</p>
                                    <p className="text-sm text-gray-500">{product.category || 'Uncategorized'}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">₹{product.price}</p>
                                        <p className={`text-sm ${product.stock_quantity < 10 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                            Stock: {product.stock_quantity}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => deleteProduct(product.id)}
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            {product.expiry_date && (
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500">
                                            Expires: {format(new Date(product.expiry_date), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </li>
                ))}
                {products.length === 0 && (
                    <li className="px-4 py-8 text-center text-gray-500">
                        No products found. Add one to get started!
                    </li>
                )}
            </ul>
        </div>
    )
}
