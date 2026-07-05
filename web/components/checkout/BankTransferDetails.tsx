'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface BankDetails {
  bankName: string
  accountName: string
  accountNo: string
  branch: string
}

interface BankTransferDetailsProps {
  bankDetails: BankDetails
  referenceNo: string
  onSlipUpload?: (file: File) => void
  slipUploaded?: boolean
}

export function BankTransferDetails({
  bankDetails,
  referenceNo,
  onSlipUpload,
  slipUploaded = false,
}: BankTransferDetailsProps) {
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    setUploadedFile(file)
    onSlipUpload?.(file)
    toast.success('Payment slip uploaded!')
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied!`)
    })
  }

  return (
    <div className="space-y-4">
      {/* Bank details card */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
        <h3 className="font-semibold text-brand-800 mb-3 flex items-center gap-2">
          <span className="text-lg">🏦</span>
          Bank Transfer Details
        </h3>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Bank', value: bankDetails.bankName },
            { label: 'Branch', value: bankDetails.branch },
            { label: 'Account Name', value: bankDetails.accountName },
            {
              label: 'Account Number',
              value: bankDetails.accountNo,
              copyable: true,
            },
            {
              label: 'Reference / Remarks',
              value: referenceNo,
              copyable: true,
              highlight: true,
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <span className="text-gray-600 w-32 flex-shrink-0">{row.label}</span>
              <div className="flex items-center gap-1 flex-1 justify-end">
                <span
                  className={cn(
                    'font-medium text-right',
                    row.highlight ? 'text-brand-700 font-bold text-base' : 'text-gray-900',
                  )}
                >
                  {row.value}
                </span>
                {row.copyable && (
                  <button
                    onClick={() => copyToClipboard(row.value, row.label)}
                    className="p-1 rounded text-brand-600 hover:bg-brand-100 flex-shrink-0"
                    aria-label={`Copy ${row.label}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important note */}
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        ⚠️ Include the reference number in your transfer remarks. Your order will be processed after payment verification (usually within 2 hours).
      </p>

      {/* Slip upload */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Upload payment slip{' '}
          <span className="text-gray-400 font-normal">(optional — speeds up verification)</span>
        </p>

        {uploadedFile || slipUploaded ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              {uploadedFile ? uploadedFile.name : 'Slip uploaded'}
            </span>
            <button
              onClick={() => {
                setUploadedFile(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file)
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors',
              dragOver
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50',
            )}
          >
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              Tap to upload or drag & drop
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG or PDF</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    </div>
  )
}
