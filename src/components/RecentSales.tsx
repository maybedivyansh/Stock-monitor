'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'

interface Sale {
    id: string
    quantity: number
    total_price: number
    profit: number | null
    sale_date: string
    products: {
        name: string
    }
}

export default function RecentSales({ key }: { key?: number }) {
    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        fetchSales()
    }, [])

    const fetchSales = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
          id,
          quantity,
          total_price,
          quantity,
          total_price,
          profit,
          sale_date,
          products (
            name
          )
        `)
                .order('sale_date', { ascending: false })
                .limit(10)

            if (error) throw error
            // @ts-ignore
            setSales(data || [])
        } catch (error) {
            console.error('Error fetching sales:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="text-center py-4">Loading sales...</div>

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
            </div>
            <ul className="divide-y divide-gray-200">
                {sales.map((sale) => (
                    <li key={sale.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <p className="text-sm font-medium text-indigo-600 truncate">
                                    {/* @ts-ignore */}
                                    {sale.products?.name || 'Unknown Product'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {format(new Date(sale.sale_date), 'MMM d, h:mm a')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">₹{sale.total_price}</p>
                                {sale.profit !== null && (
                                    <p className={`text-xs font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {sale.profit >= 0 ? '+' : ''}₹{sale.profit.toFixed(2)}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500">Qty: {sale.quantity}</p>
                            </div>
                        </div>
                    </li>
                ))}
                {sales.length === 0 && (
                    <li className="px-4 py-8 text-center text-gray-500">
                        No sales recorded yet.
                    </li>
                )}
            </ul>
        </div>
    )
}
