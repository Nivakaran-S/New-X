import Link from 'next/link'
import type { Metadata } from 'next'
import { CheckCircle2, ArrowRight, Building2, TrendingUp, Clock, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Wholesale Account | Wonderland',
  description: 'Apply for a wholesale account and unlock better pricing, credit terms, and priority delivery for your business.',
}

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Better Pricing',
    description: 'Up to 30% lower than retail prices. Unlock better rates as your order volume grows.',
  },
  {
    icon: Clock,
    title: 'Credit Terms',
    description: 'Approved businesses get 30-day payment terms. Order now, pay later.',
  },
  {
    icon: Building2,
    title: 'Dedicated Account Manager',
    description: 'Get a dedicated contact for quotes, large orders, and custom packaging.',
  },
  {
    icon: Shield,
    title: 'Priority Fulfillment',
    description: 'Wholesale orders are processed first. Never run out of stock at your shop.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Apply Online',
    description: 'Fill in your business details. Takes less than 2 minutes.',
  },
  {
    step: '2',
    title: 'Get Approved',
    description: 'Our team reviews your application within 24 hours.',
  },
  {
    step: '3',
    title: 'Start Saving',
    description: 'Log in to see wholesale prices immediately after approval.',
  },
]

const PRICING_TIERS = [
  {
    name: 'Starter',
    monthlyVolume: 'LKR 25,000 – 100,000',
    discount: '10–15%',
    credit: 'No credit',
    delivery: 'Standard',
    highlight: false,
  },
  {
    name: 'Growth',
    monthlyVolume: 'LKR 100,000 – 500,000',
    discount: '15–20%',
    credit: '15-day credit',
    delivery: 'Priority',
    highlight: true,
  },
  {
    name: 'Enterprise',
    monthlyVolume: 'LKR 500,000+',
    discount: '20–30%',
    credit: '30-day credit',
    delivery: 'Express + dedicated slot',
    highlight: false,
  },
]

export default function WholesalePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block bg-brand-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">
            For Businesses
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-5 leading-tight">
            Wholesale Pricing for{' '}
            <span className="text-brand-400">Sri Lankan Businesses</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of shops, pharmacies, and businesses who save thousands
            of rupees every month with Wonderland wholesale accounts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?type=wholesale"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-4 rounded-xl transition-all active:scale-95 text-base"
            >
              Apply for Wholesale Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://wa.me/94771234567?text=Hi%20Wonderland%2C%20I%27m%20interested%20in%20a%20wholesale%20account"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-base"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Who it&apos;s for */}
      <section className="bg-gray-50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Who applies for wholesale?</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              '🏪 Retail shops',
              '💊 Pharmacies',
              '🏨 Hotels & restaurants',
              '🏢 Offices',
              '🏫 Schools & institutions',
              '🚐 Mobile vendors',
            ].map((label) => (
              <span
                key={label}
                className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-full shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          Why wholesale with Wonderland?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
            >
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-600 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-extrabold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-brand-100 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Pricing Tiers</h2>
        <p className="text-gray-500 text-center text-sm mb-10">
          Discounts scale automatically as your monthly volume grows.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border-2 p-5 ${
                tier.highlight
                  ? 'border-brand-600 bg-brand-50 shadow-lg shadow-brand-100'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {tier.highlight && (
                <span className="inline-block bg-brand-600 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full mb-3">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-900 mb-1">{tier.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{tier.monthlyVolume}/month</p>
              <div className="space-y-2 mb-5">
                {[
                  { label: 'Discount', value: tier.discount },
                  { label: 'Payment Terms', value: tier.credit },
                  { label: 'Delivery', value: tier.delivery },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span className="text-gray-600">{row.label}:</span>
                    <span className="font-semibold text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/register?type=wholesale"
                className={`block w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  tier.highlight
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'border border-brand-600 text-brand-600 hover:bg-brand-50'
                }`}
              >
                Apply Now
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gray-50 py-12 text-center px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Ready to save on every order?
        </h2>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Join now and get approved within 24 hours. No commitment, no minimum order.
        </p>
        <Link
          href="/register?type=wholesale"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all active:scale-95"
        >
          Apply for Wholesale Account
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  )
}
