'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2, Calculator } from 'lucide-react'

const saleSchema = z.object({
    product_id: z.string().min(1, 'Product is required'),
    quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Quantity must be a valid positive number',
    }),
})

type SaleFormValues = z.infer<typeof saleSchema>

interface Product {
    id: string
    name: string
    price: number
    stock_quantity: number
}

export default function SalesEntryForm({ onSaleComplete }: { onSaleComplete: () => void }) {
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const supabase = createClientComponentClient()

    const {
        register,
        handleSubmit,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm<SaleFormValues>({
        resolver: zodResolver(saleSchema),
    })

    const quantity = watch('quantity')

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('id, name, price, stock_quantity')
            .gt('stock_quantity', 0) // Only show products in stock
            .order('name')

        if (data) setProducts(data)
    }

    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value
        const product = products.find(p => p.id === productId) || null
        setSelectedProduct(product)
        setValue('product_id', productId) // Manually set value for react-hook-form
    }

    const onSubmit = async (data: SaleFormValues) => {
        if (!selectedProduct) return

        const qty = Number(data.quantity)
        if (qty > selectedProduct.stock_quantity) {
            alert(`Only ${selectedProduct.stock_quantity} items in stock!`)
            return
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user found')

            const totalPrice = selectedProduct.price * qty

            // 1. Record Sale
            const { error: saleError } = await supabase.from('sales').insert({
                user_id: user.id,
                product_id: selectedProduct.id,
                quantity: qty,
                total_price: totalPrice,
            })
            if (saleError) throw saleError

            // 2. Update Stock
            const { error: stockError } = await supabase
                .from('products')
                .update({ stock_quantity: selectedProduct.stock_quantity - qty })
                .eq('id', selectedProduct.id)

            if (stockError) throw stockError

            // Reset form and refresh data
            reset()
            setSelectedProduct(null)
            fetchProducts() // Refresh stock levels
            onSaleComplete() // Notify parent to refresh sales list
            alert('Sale recorded successfully!')

        } catch (error) {
            console.error('Error recording sale:', error)
            alert('Error recording sale')
        } finally {
            setLoading(false)
        }
    }

    const totalPrice = selectedProduct && quantity ? selectedProduct.price * Number(quantity) : 0

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Record New Sale</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <select
                        {...register('product_id')}
                        onChange={handleProductChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    >
                        <option value="">Select a product</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} (${p.price}) - Stock: {p.stock_quantity}
                            </option>
                        ))}
                    </select>
                    {errors.product_id && <p className="mt-1 text-sm text-red-600">{errors.product_id.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                        type="number"
                        {...register('quantity')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                    {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
                </div>

                {selectedProduct && (
                    <div className="bg-gray-50 p-3 rounded-md flex items-center justify-between">
                        <span className="text-sm text-gray-500">Total Price:</span>
                        <span className="text-lg font-bold text-indigo-600">${totalPrice.toFixed(2)}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !selectedProduct}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Complete Sale'}
                </button>
            </form>
        </div>
    )
}
