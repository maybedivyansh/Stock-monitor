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

        // Check for specific new product alert
        let newProduct = null
        try {
            const body = await request.json()
            newProduct = body.newProduct
        } catch (e) {
            // Request might not have body (e.g. cron job), ignore error
        }

        if (newProduct) {
            // Validate if alert is actually needed
            const stock = Number(newProduct.stock_quantity)
            const threshold = Number(newProduct.low_stock_threshold) || 50
            const isLowStock = stock < threshold

            let isExpiring = false
            if (newProduct.expiry_date) {
                const expiry = new Date(newProduct.expiry_date)
                const alertDays = Number(newProduct.expiry_alert_days) || 20
                const today = new Date()
                const alertDate = new Date()
                alertDate.setDate(today.getDate() + alertDays)

                // Reset time components for accurate date comparison
                today.setHours(0, 0, 0, 0)
                alertDate.setHours(23, 59, 59, 999)

                isExpiring = expiry <= alertDate && expiry >= today
            }

            if (!isLowStock && !isExpiring) {
                return NextResponse.json({ message: 'No alert needed' })
            }

            // Send specific alert for the new product
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                console.error('Missing email credentials')
                return NextResponse.json({ error: 'Missing email credentials' }, { status: 500 })
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            })

            const htmlContent = `
                <h2>New Product Alert: ${newProduct.name}</h2>
                <p>A new product has been added that requires attention:</p>
                <ul>
                    <li><strong>Name:</strong> ${newProduct.name}</li>
                    <li><strong>Category:</strong> ${newProduct.category || 'N/A'}</li>
                    <li><strong>Price:</strong> ${newProduct.price}</li>
                    <li><strong>Stock Quantity:</strong> <strong style="color: ${Number(newProduct.stock_quantity) < (Number(newProduct.low_stock_threshold) || 50) ? '#dc2626' : 'inherit'}">${newProduct.stock_quantity}</strong> (Threshold: ${newProduct.low_stock_threshold || 50})</li>
                    <li><strong>Expiry Date:</strong> <strong style="color: #d97706">${newProduct.expiry_date || 'N/A'}</strong> (Alert: ${newProduct.expiry_alert_days || 20} days before)</li>
                </ul>
            `

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `New Product Alert: ${newProduct.name}`,
                html: htmlContent,
            })

            return NextResponse.json({ success: true, message: 'New product alert sent' })
        }

        // 1. Fetch Products (Legacy/Cron logic)
        const { data: products } = await supabase
            .from('products')
            .select('*')

        if (!products) return NextResponse.json({ message: 'No products found' })

        // 2. Check Alerts
        const lowStock = products.filter(p => p.stock_quantity < (p.low_stock_threshold ?? 50))

        const today = new Date()

        const expiring = products.filter(p => {
            if (!p.expiry_date) return false
            const expiry = new Date(p.expiry_date)
            const alertDays = p.expiry_alert_days ?? 20

            const alertDate = new Date()
            alertDate.setDate(today.getDate() + alertDays)

            return expiry <= alertDate && expiry >= today
        })

        if (lowStock.length === 0 && expiring.length === 0) {
            return NextResponse.json({ message: 'No alerts to send' })
        }

        // 3. Compose Email
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('Missing email credentials')
            return NextResponse.json({ error: 'Missing email credentials in environment variables' }, { status: 500 })
        }

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
