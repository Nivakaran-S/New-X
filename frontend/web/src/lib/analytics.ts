// Meta Pixel + Google Analytics event helpers
// These fire browser-side pixel events (complementary to server-side Conversions API)

declare global {
  interface Window {
    fbq: (...args: any[]) => void
    gtag: (...args: any[]) => void
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Meta Pixel events
export function fbTrack(event: string, data?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', event, data)
}

export function fbTrackCustom(event: string, data?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('trackCustom', event, data)
}

// Google Analytics / Google Ads events
export function gaEvent(action: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', action, params)
}

// Standard e-commerce events
export function trackViewProduct(product: { id: string; name: string; price: number; category?: string }) {
  fbTrack('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price,
    currency: 'LKR',
  })
  gaEvent('view_item', {
    currency: 'LKR',
    value: product.price,
    items: [{ item_id: product.id, item_name: product.name, item_category: product.category, price: product.price }],
  })
}

export function trackAddToCart(items: Array<{ id: string; name: string; price: number; qty: number }>, totalValue: number) {
  fbTrack('AddToCart', {
    content_ids: items.map(i => i.id),
    content_type: 'product',
    value: totalValue,
    currency: 'LKR',
    num_items: items.length,
  })
  gaEvent('add_to_cart', {
    currency: 'LKR',
    value: totalValue,
    items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty })),
  })
}

export function trackInitiateCheckout(totalValue: number, itemCount: number) {
  fbTrack('InitiateCheckout', {
    value: totalValue,
    currency: 'LKR',
    num_items: itemCount,
  })
  gaEvent('begin_checkout', {
    currency: 'LKR',
    value: totalValue,
  })
}

export function trackPurchase(orderId: string, totalValue: number, items: Array<{ id: string; name: string; price: number; qty: number }>) {
  fbTrack('Purchase', {
    value: totalValue,
    currency: 'LKR',
    content_ids: items.map(i => i.id),
    content_type: 'product',
    num_items: items.length,
    order_id: orderId,
  })
  gaEvent('purchase', {
    transaction_id: orderId,
    value: totalValue,
    currency: 'LKR',
    items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty })),
  })
}
