'use client'

import { useEffect, useState, use } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import ProductForm from '@/components/ProductForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [product, setProduct] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()
    const router = useRouter()

    useEffect(() => {
        const fetchProduct = async () => {
            console.log('Fetching product with ID:', id)
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) {
                    console.error('Supabase error fetching product:', error)
                    throw error
                }

                if (!data) {
                    console.error('No data returned for product:', id)
                    throw new Error('Product not found')
                }

                console.log('Product data fetched:', data)
                setProduct(data)
            } catch (error: any) {
                console.error('Error fetching product:', error)
                alert(`Error fetching product details: ${error.message || JSON.stringify(error)}`)
                // router.push('/dashboard/products') // Commented out to see the error
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            fetchProduct()
        } else {
            console.error('No product ID provided in params')
            setLoading(false)
        }
    }, [id, supabase, router])

    if (loading) return <div className="text-center py-4">Loading product details...</div>
    if (!product) return <div className="text-center py-4">Product not found</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <Link
                    href="/dashboard/products"
                    className="mr-4 text-gray-500 hover:text-gray-700"
                >
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            </div>
            <div className="max-w-2xl">
                <ProductForm initialData={product} />
            </div>
        </div>
    )
}
