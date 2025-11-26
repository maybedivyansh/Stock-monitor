import Link from 'next/link'
import ProductList from '@/components/ProductList'
import { Plus } from 'lucide-react'

export default function ProductsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                <Link
                    href="/dashboard/products/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Product
                </Link>
            </div>
            <ProductList />
        </div>
    )
}
