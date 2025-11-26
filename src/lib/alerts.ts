import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export async function checkAlerts() {
    const supabase = createClientComponentClient()
    const { data: products } = await supabase
        .from('products')
        .select('*')

    if (!products) return []

    const alerts = []

    // Low Stock Alert (Threshold < 10)
    const lowStock = products.filter(p => p.stock_quantity < 10)
    if (lowStock.length > 0) {
        alerts.push({
            type: 'LOW_STOCK',
            message: `${lowStock.length} items are running low on stock.`,
            items: lowStock.map(p => p.name)
        })
    }

    // Expiry Alert (Expires in < 7 days)
    const today = new Date()
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(today.getDate() + 7)

    const expiring = products.filter(p => {
        if (!p.expiry_date) return false
        const expiry = new Date(p.expiry_date)
        return expiry <= sevenDaysFromNow && expiry >= today
    })

    if (expiring.length > 0) {
        alerts.push({
            type: 'EXPIRY',
            message: `${expiring.length} items are expiring soon.`,
            items: expiring.map(p => p.name)
        })
    }

    return alerts
}

export async function sendWhatsAppNotification(phoneNumber: string, message: string) {
    // Placeholder for WhatsApp Cloud API integration
    console.log(`Sending WhatsApp to ${phoneNumber}: ${message}`)

    // Real implementation would look like:
    /*
    const response = await fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message },
      }),
    })
    */
}
