'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { checkAlerts } from '@/lib/alerts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Package, ShoppingCart, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalSales: 0,
        lowStockCount: 0,
    })
    const [alerts, setAlerts] = useState<any[]>([])
    const [salesData, setSalesData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        fetchDashboardData()
        checkEmailAlerts()
    }, [])

    const checkEmailAlerts = async () => {
        const lastSent = localStorage.getItem('last_alert_date')
        const today = new Date().toDateString()

        if (lastSent !== today) {
            try {
                const res = await fetch('/api/send-alerts', { method: 'POST' })
                if (res.ok) {
                    localStorage.setItem('last_alert_date', today)
                    console.log('Alert check triggered successfully')
                } else {
                    console.error('Alert check failed:', await res.text())
                }
            } catch (error) {
                console.error('Failed to trigger alert check:', error)
            }
        }
    }

    const fetchDashboardData = async () => {
        try {
            // 1. Fetch Counts
            const { count: productCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })

            const { count: salesCount } = await supabase
                .from('sales')
                .select('*', { count: 'exact', head: true })

            // 2. Fetch Alerts
            const currentAlerts = await checkAlerts()
            const lowStockAlert = currentAlerts.find(a => a.type === 'LOW_STOCK')

            setStats({
                totalProducts: productCount || 0,
                totalSales: salesCount || 0,
                lowStockCount: lowStockAlert ? (lowStockAlert.items as any[]).length : 0,
            })
            setAlerts(currentAlerts)

            // 3. Fetch Sales Data for Chart (Last 7 days)
            const { data: sales } = await supabase
                .from('sales')
                .select('total_price, sale_date')
                .gte('sale_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('sale_date')

            if (sales) {
                // Group by date
                const grouped = sales.reduce((acc: any, curr) => {
                    const date = new Date(curr.sale_date).toLocaleDateString()
                    acc[date] = (acc[date] || 0) + curr.total_price
                    return acc
                }, {})

                const chartData = Object.entries(grouped).map(([date, total]) => ({
                    name: date,
                    total: total,
                }))
                setSalesData(chartData)
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading dashboard...</div>

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Total Products */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Package className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                                    <dd className="text-lg font-medium text-gray-900">{stats.totalProducts}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Sales */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <ShoppingCart className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
                                    <dd className="text-lg font-medium text-gray-900">{stats.totalSales}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Low Stock */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Items</dt>
                                    <dd className="text-lg font-medium text-gray-900">{stats.lowStockCount}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Attention Needed</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {alerts.map((alert, idx) => (
                                        <li key={idx}>
                                            {alert.message} <span className="font-medium">({(alert.items as string[]).join(', ')})</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Overview (Last 7 Days)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="total" fill="#4f46e5" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
