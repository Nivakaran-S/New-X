import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { BankTransferDetails } from '@/components/checkout/BankTransferDetails'
import PurchaseTracker from './PurchaseTracker'

const BANK_DETAILS = {
  bankName: 'Commercial Bank of Ceylon',
  accountName: 'Wonderland (Pvt) Ltd',
  accountNo: '8005512345',
  branch: 'Pettah Branch',
}

interface OrderConfirmedPageProps {
  searchParams: Promise<{
    ref?: string
    phone?: string
    method?: string
  }>
}

export default async function OrderConfirmedPage({ searchParams }: OrderConfirmedPageProps) {
  const params = await searchParams
  const { ref, phone, method } = params
  const isBankTransfer = method === 'BANK_TRANSFER'

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Fire Purchase pixel event when order is confirmed */}
      {ref && <PurchaseTracker orderId={ref} />}

      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-brand-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Order Confirmed! 🎉
        </h1>
        {ref && (
          <p className="text-brand-600 font-mono font-bold text-lg mb-2">{ref}</p>
        )}
        {phone && (
          <p className="text-gray-600 text-sm">
            We&apos;ll WhatsApp you at{' '}
            <strong className="text-gray-900">{phone}</strong> with delivery updates.
          </p>
        )}
      </div>

      {/* Bank transfer section */}
      {isBankTransfer && ref && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Complete Your Payment
          </h2>
          <Suspense fallback={null}>
            <BankTransferDetails
              bankDetails={BANK_DETAILS}
              referenceNo={ref}
            />
          </Suspense>
        </div>
      )}

      {/* WhatsApp support */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-8">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Need help?</h2>
        <p className="text-sm text-gray-600 mb-3">
          Our team is available on WhatsApp for any questions about your order.
        </p>
        <a
          href={`https://wa.me/94771234567?text=Hi%20Wonderland!%20I%20have%20a%20question%20about%20my%20order%20${ref ?? ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#20b858] transition-colors text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Chat on WhatsApp
        </a>
      </div>

      {/* Cross-sell */}
      <div className="mb-8">
        <h2 className="text-base font-bold text-gray-900 mb-4">
          Customers Also Bought
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'Hand Sanitizer 500ml', price: 'LKR 350' },
            { name: 'Dish Soap 1L', price: 'LKR 220' },
            { name: 'Surface Cleaner', price: 'LKR 280' },
          ].map((item) => (
            <Link
              key={item.name}
              href="/products"
              className="bg-white border border-gray-100 rounded-xl p-3 text-center hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center text-2xl">
                📦
              </div>
              <p className="text-[11px] font-medium text-gray-800 leading-tight mb-1">{item.name}</p>
              <p className="text-xs text-brand-600 font-bold">{item.price}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Create account CTA */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 text-center">
        <h2 className="font-bold text-gray-900 mb-2">Save time next order</h2>
        <p className="text-sm text-gray-600 mb-4">
          Create an account to track orders, save addresses, and earn loyalty
          points on every purchase.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-700 transition-colors text-sm"
        >
          Create Account — It&apos;s Free
        </Link>
      </div>

      {/* Track order */}
      {ref && (
        <div className="mt-6 text-center">
          <Link
            href={`/track/${ref}`}
            className="text-sm text-brand-600 hover:underline"
          >
            Track your order →
          </Link>
        </div>
      )}
    </div>
  )
}
