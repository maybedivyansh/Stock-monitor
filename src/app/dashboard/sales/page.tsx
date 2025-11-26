'use client'

import { useState } from 'react'
import SalesEntryForm from '@/components/SalesEntryForm'
import RecentSales from '@/components/RecentSales'

export default function SalesPage() {
    const [refreshKey, setRefreshKey] = useState(0)

    const handleSaleComplete = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <SalesEntryForm onSaleComplete={handleSaleComplete} />
                </div>

                <div>
                    <RecentSales key={refreshKey} />
                </div>
            </div>
        </div>
    )
}
