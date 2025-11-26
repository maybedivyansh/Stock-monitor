import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        // @ts-ignore
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Fetch Products
        const { data: products } = await supabase
            .from('products')
            .select('*')

        if (!products) return NextResponse.json({ message: 'No products found' })

        // 2. Check Alerts
        const lowStock = products.filter(p => p.stock_quantity < 10)

        const today = new Date()
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(today.getDate() + 7)

        const expiring = products.filter(p => {
            if (!p.expiry_date) return false
            const expiry = new Date(p.expiry_date)
            return expiry <= sevenDaysFromNow && expiry >= today
        })

        if (lowStock.length === 0 && expiring.length === 0) {
            return NextResponse.json({ message: 'No alerts to send' })
        }

        // 3. Compose Email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // User needs to set this
                pass: process.env.EMAIL_PASS, // User needs to set this (App Password)
            },
        })

        let htmlContent = `<h2>StockMonitor Alert Summary</h2>`

        if (lowStock.length > 0) {
            htmlContent += `<h3 style="color: #dc2626;">Low Stock Items (< 10)</h3><ul>`
            lowStock.forEach(p => {
                htmlContent += `<li><strong>${p.name}</strong> (${p.category || 'No Category'}) - Remaining: <strong>${p.stock_quantity}</strong></li>`
            })
            htmlContent += `</ul>`
        }

        if (expiring.length > 0) {
            htmlContent += `<h3 style="color: #d97706;">Expiring Soon (Next 7 Days)</h3><ul>`
            expiring.forEach(p => {
                htmlContent += `<li><strong>${p.name}</strong> (${p.category || 'No Category'}) - Expires: <strong>${p.expiry_date}</strong></li>`
            })
            htmlContent += `</ul>`
        }

        // 4. Send Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `StockMonitor Alert: ${lowStock.length} Low Stock, ${expiring.length} Expiring`,
            html: htmlContent,
        })

        return NextResponse.json({ success: true, message: 'Email sent' })

    } catch (error: any) {
        console.error('Email error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
