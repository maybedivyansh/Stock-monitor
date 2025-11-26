'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const productSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    category: z.string().optional(),
    price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Price must be a valid positive number',
    }),
    stock_quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Stock quantity must be a valid positive number',
    }),
    expiry_date: z.string().optional(),
    low_stock_threshold: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Threshold must be a valid positive number',
    }),
    expiry_alert_days: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Days must be a valid positive number',
    }),
})

type ProductFormValues = z.infer<typeof productSchema>

export default function ProductForm() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClientComponentClient()
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            category: '',
            price: '',
            stock_quantity: '',
            expiry_date: '',
            low_stock_threshold: '50',
            expiry_alert_days: '20',
        },
    })

    const onSubmit = async (data: ProductFormValues) => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('No user found')

            const { error } = await supabase.from('products').insert({
                user_id: user.id,
                name: data.name,
                category: data.category,
                price: Number(data.price),
                stock_quantity: Number(data.stock_quantity),
                expiry_date: data.expiry_date || null,
                low_stock_threshold: Number(data.low_stock_threshold),
                expiry_alert_days: Number(data.expiry_alert_days),
            })

            if (error) throw error

            // Check if the newly added product triggers an alert
            const stockQuantity = Number(data.stock_quantity)
            const expiryDate = data.expiry_date ? new Date(data.expiry_date) : null
            const today = new Date()
            const sevenDaysFromNow = new Date()
            sevenDaysFromNow.setDate(today.getDate() + Number(data.expiry_alert_days))

            const isLowStock = stockQuantity < Number(data.low_stock_threshold)
            const isExpiringSoon = expiryDate && expiryDate <= sevenDaysFromNow && expiryDate >= today

            // If product triggers an alert, send email notification
            if (isLowStock || isExpiringSoon) {
                try {
                    await fetch('/api/send-alerts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            newProduct: {
                                name: data.name,
                                category: data.category,
                                price: data.price,
                                stock_quantity: stockQuantity,
                                expiry_date: data.expiry_date,
                                low_stock_threshold: Number(data.low_stock_threshold),
                                expiry_alert_days: Number(data.expiry_alert_days),
                            },
                        }),
                    })
                    console.log('Alert email triggered for new product')
                } catch (emailError) {
                    console.error('Failed to send alert email:', emailError)
                    // Don't block the product creation if email fails
                }
            }

            router.push('/dashboard/products')
            router.refresh()
        } catch (error) {
            console.error('Error adding product:', error)
            alert('Error adding product')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div>
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <input
                    {...register('name')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                    {...register('category')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input
                        type="number"
                        step="0.01"
                        {...register('price')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900"
                    />
                    {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                    <input
                        type="number"
                        {...register('stock_quantity')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900"
                    />
                    {errors.stock_quantity && <p className="mt-1 text-sm text-red-600">{errors.stock_quantity.message}</p>}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                <input
                    type="date"
                    {...register('expiry_date')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Low Stock Alert Threshold</label>
                    <input
                        type="number"
                        {...register('low_stock_threshold')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900"
                    />
                    {errors.low_stock_threshold && <p className="mt-1 text-sm text-red-600">{errors.low_stock_threshold.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Days Before Expiry Alert</label>
                    <input
                        type="number"
                        {...register('expiry_alert_days')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900"
                    />
                    {errors.expiry_alert_days && <p className="mt-1 text-sm text-red-600">{errors.expiry_alert_days.message}</p>}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add Product'}
                </button>
            </div>
        </form>
    )
}
