import Link from 'next/link'
import { MessageCircle, Mail, MapPin, Phone } from 'lucide-react'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-bold text-2xl text-white mb-3">
              Heal<span className="text-brand-400">Place</span>
            </div>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Sri Lanka&apos;s trusted FMCG wholesale distributor, based in
              Pettah, Colombo. Serving retail shops, pharmacies, and bulk
              buyers since 2015.
            </p>
            <div className="flex items-center gap-2 text-sm mb-2">
              <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <span>Pettah, Colombo 11, Sri Lanka</span>
            </div>
            <div className="flex items-center gap-2 text-sm mb-2">
              <Phone className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <a href="tel:+94771234567" className="hover:text-white">
                +94 77 123 4567
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <a href="mailto:info@healplace.lk" className="hover:text-white">
                info@healplace.lk
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
              Shop
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'All Products', href: '/products' },
                { label: 'Cleaning & Hygiene', href: '/products?category=cleaning-hygiene' },
                { label: 'Personal Care', href: '/products?category=personal-care' },
                { label: 'Household', href: '/products?category=household' },
                { label: 'Food & Beverages', href: '/products?category=food-beverages' },
                { label: 'Bestsellers', href: '/products?featured=true' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
              Account
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Sign In', href: '/login' },
                { label: 'Create Account', href: '/register' },
                { label: 'Wholesale Account', href: '/wholesale' },
                { label: 'Track Order', href: '/track' },
                { label: 'My Orders', href: '/account' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
              Help
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Delivery Policy', href: '/delivery-policy' },
                { label: 'Returns Policy', href: '/returns-policy' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms & Conditions', href: '/terms' },
                { label: 'About Us', href: '/about' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>
            &copy; {year} HealPlace (Pvt) Ltd. BR No. PV/123456. All rights
            reserved.
          </p>

          <div className="flex items-center gap-4">
            {/* Payment methods */}
            <div className="flex items-center gap-2">
              <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-[10px] font-medium">
                Bank Transfer
              </span>
              <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-[10px] font-medium">
                Cash on Delivery
              </span>
            </div>

            {/* WhatsApp */}
            <a
              href="https://wa.me/94771234567?text=Hi%20HealPlace"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-400 hover:text-green-300"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
