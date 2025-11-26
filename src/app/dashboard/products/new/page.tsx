import ProductForm from '@/components/ProductForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewProductPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <Link
                    href="/dashboard/products"
                    className="mr-4 text-gray-500 hover:text-gray-700"
                >
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
            </div>
            <div className="max-w-2xl">
                <ProductForm />
            </div>
        </div>
    )
}
