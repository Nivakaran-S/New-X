'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPatch } from '@/lib/api'
import { Loader2, Save, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import type { PaymentSettings, StoreSettings } from '@healplace/types'

export default function SettingsPage() {
  const { token, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard')
    }
  }, [user, router])

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    isCodEnabled: false,
    bankName: '',
    bankAccountNo: '',
    bankAccountName: '',
    bankBranch: '',
    paymentHoldMinutes: 30,
    maxCodOrderAmount: 10000,
    codDeliveryZoneKm: 10,
  })

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: '',
    phone: '',
    whatsappPhone: '',
    email: '',
    address: '',
    lat: 0,
    lng: 0,
    freeDeliveryThreshold: 0,
    deliveryCutoffHour: 18,
  })

  const [loading, setLoading] = useState(true)
  const [savingPayment, setSavingPayment] = useState(false)
  const [savingStore, setSavingStore] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet<Record<string, string>>('/settings', token)
      if (data) {
        setPaymentSettings((prev) => ({
          ...prev,
          isCodEnabled: data.isCodEnabled === 'true',
          bankName: data.bankName ?? '',
          bankAccountNo: data.bankAccountNo ?? '',
          bankAccountName: data.bankAccountName ?? '',
          bankBranch: data.bankBranch ?? '',
          paymentHoldMinutes: parseInt(data.paymentHoldMinutes ?? '30'),
          maxCodOrderAmount: parseInt(data.maxCodOrderAmount ?? '10000'),
          codDeliveryZoneKm: parseInt(data.codDeliveryZoneKm ?? '10'),
        }))
        setStoreSettings((prev) => ({
          ...prev,
          name: data.storeName ?? '',
          phone: data.storePhone ?? '',
          whatsappPhone: data.whatsappPhone ?? '',
          email: data.storeEmail ?? '',
          address: data.storeAddress ?? '',
          lat: parseFloat(data.lat ?? '0'),
          lng: parseFloat(data.lng ?? '0'),
          freeDeliveryThreshold: parseInt(data.freeDeliveryThreshold ?? '0'),
          deliveryCutoffHour: parseInt(data.deliveryCutoffHour ?? '18'),
        }))
      }
    } catch {
      // Settings may 404 on fresh install — that's OK
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function savePaymentSettings() {
    if (!token) return
    setSavingPayment(true)
    try {
      const entries: [string, string][] = [
        ['isCodEnabled', String(paymentSettings.isCodEnabled)],
        ['bankName', paymentSettings.bankName],
        ['bankAccountNo', paymentSettings.bankAccountNo],
        ['bankAccountName', paymentSettings.bankAccountName],
        ['bankBranch', paymentSettings.bankBranch],
        ['paymentHoldMinutes', String(paymentSettings.paymentHoldMinutes)],
        ['maxCodOrderAmount', String(paymentSettings.maxCodOrderAmount)],
        ['codDeliveryZoneKm', String(paymentSettings.codDeliveryZoneKm)],
      ]
      await Promise.all(
        entries.map(([key, value]) => apiPatch(`/settings/${key}`, { value }, token)),
      )
      toast.success('Payment settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingPayment(false)
    }
  }

  async function saveStoreSettings() {
    if (!token) return
    setSavingStore(true)
    try {
      const entries: [string, string][] = [
        ['storeName', storeSettings.name],
        ['storePhone', storeSettings.phone],
        ['whatsappPhone', storeSettings.whatsappPhone],
        ['storeEmail', storeSettings.email],
        ['storeAddress', storeSettings.address],
        ['lat', String(storeSettings.lat)],
        ['lng', String(storeSettings.lng)],
        ['freeDeliveryThreshold', String(storeSettings.freeDeliveryThreshold)],
        ['deliveryCutoffHour', String(storeSettings.deliveryCutoffHour)],
      ]
      await Promise.all(
        entries.map(([key, value]) => apiPatch(`/settings/${key}`, { value }, token)),
      )
      toast.success('Store settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingStore(false)
    }
  }

  if (user && user.role !== 'SUPER_ADMIN') return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={22} />
          Settings
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage platform configuration</p>
      </div>

      {/* Payment settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-900 text-lg">Payment Settings</h2>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 text-sm">Cash on Delivery (COD)</p>
            <p className="text-xs text-gray-400">Allow customers to pay on delivery</p>
          </div>
          <button
            onClick={() =>
              setPaymentSettings((p) => ({ ...p, isCodEnabled: !p.isCodEnabled }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              paymentSettings.isCodEnabled ? 'bg-brand-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                paymentSettings.isCodEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Bank Name', key: 'bankName' as const },
            { label: 'Account Number', key: 'bankAccountNo' as const },
            { label: 'Account Name', key: 'bankAccountName' as const },
            { label: 'Branch', key: 'bankBranch' as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                value={paymentSettings[key] as string}
                onChange={(e) =>
                  setPaymentSettings((p) => ({ ...p, [key]: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Hold (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={paymentSettings.paymentHoldMinutes}
              onChange={(e) =>
                setPaymentSettings((p) => ({
                  ...p,
                  paymentHoldMinutes: parseInt(e.target.value) || 30,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max COD Order Amount (LKR)
            </label>
            <input
              type="number"
              min="0"
              value={paymentSettings.maxCodOrderAmount}
              onChange={(e) =>
                setPaymentSettings((p) => ({
                  ...p,
                  maxCodOrderAmount: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              COD Delivery Zone (km)
            </label>
            <input
              type="number"
              min="0"
              value={paymentSettings.codDeliveryZoneKm}
              onChange={(e) =>
                setPaymentSettings((p) => ({
                  ...p,
                  codDeliveryZoneKm: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={savePaymentSettings}
            disabled={savingPayment}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {savingPayment ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Payment Settings
          </button>
        </div>
      </div>

      {/* Store settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-gray-900 text-lg">Store Settings</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Store Name', key: 'name' as const },
            { label: 'Phone', key: 'phone' as const },
            { label: 'WhatsApp Number', key: 'whatsappPhone' as const },
            { label: 'Email', key: 'email' as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                value={storeSettings[key] as string}
                onChange={(e) =>
                  setStoreSettings((p) => ({ ...p, [key]: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            rows={2}
            value={storeSettings.address}
            onChange={(e) => setStoreSettings((p) => ({ ...p, address: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Free Delivery Threshold (LKR)
            </label>
            <input
              type="number"
              min="0"
              value={storeSettings.freeDeliveryThreshold}
              onChange={(e) =>
                setStoreSettings((p) => ({
                  ...p,
                  freeDeliveryThreshold: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Cutoff Hour (24h)
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={storeSettings.deliveryCutoffHour}
              onChange={(e) =>
                setStoreSettings((p) => ({
                  ...p,
                  deliveryCutoffHour: parseInt(e.target.value) || 18,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={storeSettings.lat}
              onChange={(e) =>
                setStoreSettings((p) => ({ ...p, lat: parseFloat(e.target.value) || 0 }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={storeSettings.lng}
              onChange={(e) =>
                setStoreSettings((p) => ({ ...p, lng: parseFloat(e.target.value) || 0 }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveStoreSettings}
            disabled={savingStore}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {savingStore ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Store Settings
          </button>
        </div>
      </div>
    </div>
  )
}
