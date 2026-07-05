'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useCartStore, useAuthStore } from '@/lib/store'
import { ProgressBar } from '@/components/checkout/ProgressBar'
import { BankTransferDetails } from '@/components/checkout/BankTransferDetails'
import { formatLKRShort, generateOrderRef } from '@/lib/utils'
import { apiPost } from '@/lib/api'
import { trackInitiateCheckout } from '@/lib/analytics'
import type { ApiResponse } from '@healplace/types'

const FREE_DELIVERY_THRESHOLD = 5000
const DELIVERY_FEE = 450

// ── Bank details (in real app, fetch from settings API) ───────────────────
const BANK_DETAILS = {
  bankName: 'Commercial Bank of Ceylon',
  accountName: 'HealPlace (Pvt) Ltd',
  accountNo: '8005512345',
  branch: 'Pettah Branch',
}

interface DeliveryForm {
  fullName: string
  phone: string
  address: string
  notes: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const { items, subtotal, clearCart } = useCartStore()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'COD'>('BANK_TRANSFER')
  const [delivery, setDelivery] = useState<DeliveryForm>({
    fullName: user?.name ?? '',
    phone: user?.phone ?? '',
    address: '',
    notes: '',
  })
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [placing, setPlacing] = useState(false)

  const sub = subtotal()
  const deliveryFee = sub >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = sub + deliveryFee
  const refNo = generateOrderRef()
  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  // Fire InitiateCheckout pixel event once when the page loads with cart items
  useEffect(() => {
    if (items.length === 0) return
    trackInitiateCheckout(total, itemCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/products" className="text-brand-600 hover:underline">
          Browse products
        </Link>
      </div>
    )
  }

  // ── Step validation ───────────────────────────────────────────────────────
  function validateDelivery(): boolean {
    if (!delivery.fullName.trim()) { toast.error('Please enter your name'); return false }
    if (!delivery.phone.trim()) { toast.error('Please enter your phone number'); return false }
    if (!delivery.address.trim()) { toast.error('Please enter your delivery address'); return false }
    return true
  }

  async function placeOrder() {
    setPlacing(true)
    try {
      const orderData = {
        items: items.map((i) => ({
          variantId: i.variantId,
          qty: i.qty,
          unitType: i.unitType,
          unitPrice: i.unitPrice,
        })),
        deliveryAddress: {
          fullName: delivery.fullName,
          phone: delivery.phone,
          address: delivery.address,
          notes: delivery.notes,
        },
        paymentMethod,
        referenceNo: refNo,
        subtotal: sub,
        deliveryFee,
        total,
      }

      await apiPost<ApiResponse<{ orderNumber: string }>>(
        '/orders',
        orderData,
        token ?? undefined,
      )

      clearCart()
      router.push(`/order-confirmed?ref=${refNo}&phone=${encodeURIComponent(delivery.phone)}&method=${paymentMethod}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order'
      toast.error(message)
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <ProgressBar currentStep={step} />
      </div>

      {/* Guest notice */}
      {!user && (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
          <span className="text-sm font-semibold text-gray-700">Continuing as guest</span>
          <Link href="/login?next=/checkout" className="text-sm text-brand-600 hover:underline">
            Sign in instead
          </Link>
        </div>
      )}

      {/* ── Step 1: Contact & Delivery ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-gray-900">Contact & Delivery Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={delivery.fullName}
              onChange={(e) => setDelivery({ ...delivery, fullName: e.target.value })}
              placeholder="e.g. Saman Perera"
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
              <span className="text-xs text-gray-400 ml-1 font-normal">
                (For WhatsApp delivery updates)
              </span>
            </label>
            <input
              type="tel"
              value={delivery.phone}
              onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
              placeholder="+94 77 123 4567"
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Address
            </label>
            <textarea
              value={delivery.address}
              onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
              placeholder="Street, Area, City"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Notes
              <span className="text-xs text-gray-400 ml-1 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={delivery.notes}
              onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })}
              placeholder="e.g. Leave at reception, call before delivery"
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Delivery cost preview */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
            <span className="text-blue-700">Estimated delivery</span>
            <span className="font-semibold text-blue-800">
              {deliveryFee === 0 ? '🎉 FREE' : formatLKRShort(deliveryFee)}
            </span>
          </div>

          <button
            onClick={() => { if (validateDelivery()) setStep(2) }}
            className="w-full h-14 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 touch-target"
          >
            Continue to Payment
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Step 2: Payment ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-gray-900">Payment Method</h2>

          {/* Trust badges */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-brand-600" /> Secure</span>
            <span>✅ No hidden fees</span>
          </div>

          {/* Payment tabs */}
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            {(
              [
                { value: 'BANK_TRANSFER', label: '🏦 Bank Transfer' },
                { value: 'COD', label: '💵 Cash on Delivery' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors touch-target ${
                  paymentMethod === opt.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Bank transfer details */}
          {paymentMethod === 'BANK_TRANSFER' && (
            <BankTransferDetails
              bankDetails={BANK_DETAILS}
              referenceNo={refNo}
              onSlipUpload={(file) => setSlipFile(file)}
              slipUploaded={!!slipFile}
            />
          )}

          {/* COD */}
          {paymentMethod === 'COD' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-amber-800">Cash on Delivery</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Total</span>
                  <span className="font-semibold">{formatLKRShort(sub)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-semibold">{deliveryFee === 0 ? 'FREE' : formatLKRShort(deliveryFee)}</span>
                </div>
                <div className="border-t border-amber-200 pt-2 flex justify-between font-bold">
                  <span>Amount to pay on delivery</span>
                  <span>{formatLKRShort(total)}</span>
                </div>
              </div>
              <p className="text-xs text-amber-700">
                Please have the exact amount ready. Our delivery team will collect payment when delivering.
              </p>
            </div>
          )}

          <button
            onClick={() => setStep(3)}
            className="w-full h-14 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 touch-target"
          >
            Review Order
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Step 3: Review & Place Order ──────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-gray-900">Review Your Order</h2>

          {/* Delivery summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Delivery To</h3>
              <button onClick={() => setStep(1)} className="text-xs text-brand-600 hover:underline">Edit</button>
            </div>
            <p className="text-sm text-gray-700 font-medium">{delivery.fullName}</p>
            <p className="text-sm text-gray-600">{delivery.phone}</p>
            <p className="text-sm text-gray-600">{delivery.address}</p>
            {delivery.notes && <p className="text-xs text-gray-500 mt-1">{delivery.notes}</p>}
          </div>

          {/* Payment summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
              <button onClick={() => setStep(2)} className="text-xs text-brand-600 hover:underline">Edit</button>
            </div>
            <p className="text-sm text-gray-700">
              {paymentMethod === 'BANK_TRANSFER' ? '🏦 Bank Transfer' : '💵 Cash on Delivery'}
            </p>
            {paymentMethod === 'BANK_TRANSFER' && slipFile && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3" /> Slip uploaded
              </p>
            )}
          </div>

          {/* Items */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Items ({itemCount})
            </h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={`${item.variantId}-${item.unitType}`} className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill className="object-contain p-0.5" sizes="40px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.unitLabel} × {item.qty}</p>
                  </div>
                  <p className="text-xs font-bold text-gray-900 flex-shrink-0">
                    {formatLKRShort(item.unitPrice * item.qty)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order total */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatLKRShort(sub)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery</span>
              <span>{deliveryFee === 0 ? 'FREE' : formatLKRShort(deliveryFee)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatLKRShort(total)}</span>
            </div>
          </div>

          {/* Place order */}
          <button
            onClick={placeOrder}
            disabled={placing}
            className="w-full h-14 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-brand-200 touch-target"
          >
            {placing ? 'Placing Order…' : 'Place Order'}
          </button>

          <p className="text-xs text-gray-400 text-center px-4">
            By placing this order you agree to our{' '}
            <Link href="/terms" className="text-brand-600 hover:underline">
              terms and conditions
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  )
}
