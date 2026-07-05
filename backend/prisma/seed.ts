import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Pricing Tiers ──────────────────────────────
  await prisma.pricingTier.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Retail',   discountPct: 0,  minMonthlySpend: 0,      sortOrder: 0 },
      { name: 'Bronze',   discountPct: 5,  minMonthlySpend: 25000,  sortOrder: 1 },
      { name: 'Silver',   discountPct: 8,  minMonthlySpend: 75000,  sortOrder: 2 },
      { name: 'Gold',     discountPct: 12, minMonthlySpend: 200000, sortOrder: 3 },
      { name: 'Platinum', discountPct: 15, minMonthlySpend: 500000, sortOrder: 4 },
    ],
  })

  // ── Owner account ──────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@1234', 12)
  const owner = await prisma.user.upsert({
    where: { email: 'owner@healplace.lk' },
    update: {},
    create: {
      email:        'owner@healplace.lk',
      phone:        '+94771000001',
      name:         'HealPlace Owner',
      businessName: 'HealPlace (Pvt) Ltd',
      role:         'SUPER_ADMIN',
      accountType:  'STAFF',
      isActive:     true,
      isApproved:   true,
      passwordHash,
    },
  })
  console.log('✅ Owner created:', owner.email)

  // ── Default Warehouse ──────────────────────────
  await prisma.warehouse.upsert({
    where:  { id: 'default-warehouse' },
    update: {},
    create: { id: 'default-warehouse', name: 'Pettah Main Store', address: 'Pettah, Colombo 11', isDefault: true },
  })

  // ── Vehicle Capacity (PickMe Flash) ────────────
  await prisma.vehicleCapacity.createMany({
    skipDuplicates: true,
    data: [
      {
        provider: 'PICKME_FLASH', vehicleType: 'MOTORBIKE',
        label: 'Flash (Motorbike)',
        maxWeightKg: 10, maxVolumeLitres: 30, maxLengthCm: 40,
        baseFee: 250, perKmFee: 40,
      },
      {
        provider: 'PICKME_FLASH', vehicleType: 'TUK',
        label: 'Flash L (Tuk-tuk)',
        maxWeightKg: 50, maxVolumeLitres: 200, maxLengthCm: 80,
        baseFee: 450, perKmFee: 60,
      },
      {
        provider: 'PICKME_FLASH', vehicleType: 'CAR',
        label: 'Flash XL (Car)',
        maxWeightKg: 150, maxVolumeLitres: 500, maxLengthCm: 120,
        baseFee: 700, perKmFee: 80,
      },
      {
        provider: 'PICKME_FLASH', vehicleType: 'TRUCK',
        label: 'Flash XXL (Truck)',
        maxWeightKg: 500, maxVolumeLitres: 2000, maxLengthCm: 200,
        baseFee: 1500, perKmFee: 120,
      },
    ],
  })

  // ── Sample Brand ────────────────────────────────
  const brand = await prisma.brand.upsert({
    where: { slug: 'dettol' },
    update: {},
    create: { name: 'Dettol', slug: 'dettol', description: 'Trusted hygiene brand' },
  })

  // ── Sample Category ─────────────────────────────
  const category = await prisma.category.upsert({
    where: { slug: 'cleaning-hygiene' },
    update: {},
    create: { name: 'Cleaning & Hygiene', slug: 'cleaning-hygiene', sortOrder: 1 },
  })

  // ── Sample Product ──────────────────────────────
  const product = await prisma.product.upsert({
    where: { sku: 'DTL-SOAP-75G' },
    update: {},
    create: {
      sku:         'DTL-SOAP-75G',
      barcode:     '6281003016558',
      name:        'Dettol Original Soap 75g',
      slug:        'dettol-original-soap-75g',
      description: 'Dettol Original antibacterial soap 75g. Protects against 100 illness-causing germs.',
      brandId:     brand.id,
      categoryId:  category.id,
      isActive:    true,
      isFeatured:  true,
    },
  })

  const variant = await prisma.productVariant.upsert({
    where: { sku: 'DTL-SOAP-75G-UNIT' },
    update: {},
    create: {
      sku:           'DTL-SOAP-75G-UNIT',
      barcode:       '6281003016558',
      name:          '75g',
      productId:     product.id,
      costPrice:     72,
      retailPrice:   95,
      wholesalePrice: 86,
      lengthCm:      7.5,
      widthCm:       3.5,
      heightCm:      5.0,
      weightGrams:   85,
      unitsPerDozen: 12,
      unitsPerCase:  48,
    },
  })

  // Inventory
  await prisma.inventoryItem.upsert({
    where: { variantId_warehouseId: { variantId: variant.id, warehouseId: 'default-warehouse' } },
    update: {},
    create: {
      variantId:   variant.id,
      warehouseId: 'default-warehouse',
      qty:         240,
      reorderLevel: 48,
      maxLevel:    960,
    },
  })

  // Pricing rules
  await prisma.pricingRule.createMany({
    skipDuplicates: true,
    data: [
      { productId: product.id, unitType: 'UNIT',  minQty: 1,  price: 95,    label: 'Per unit' },
      { productId: product.id, unitType: 'DOZEN', minQty: 1,  price: 1080,  label: 'Per dozen (12 units)' },
      { productId: product.id, unitType: 'CASE',  minQty: 1,  price: 4128,  label: 'Per case (48 units)' },
    ],
  })

  // ── App Settings ────────────────────────────────
  await prisma.appSetting.upsert({
    where: { key: 'payment' },
    update: {},
    create: {
      key: 'payment',
      value: {
        isCodEnabled:        false, // Enable after PickMe Flash COD confirmed
        bankName:            'Commercial Bank of Ceylon',
        bankAccountNo:       '',    // Fill your account number
        bankAccountName:     'HealPlace (Pvt) Ltd',
        bankBranch:          'Pettah',
        paymentHoldMinutes:  120,   // 2-hour hold on bank transfer orders
        maxCodOrderAmount:   25000,
        codDeliveryZoneKm:   15,    // COD only within 15km of shop
      },
    },
  })

  await prisma.appSetting.upsert({
    where: { key: 'store' },
    update: {},
    create: {
      key: 'store',
      value: {
        name:             'HealPlace',
        phone:            '',
        whatsappPhone:    '',
        email:            'info@healplace.com',
        address:          'Pettah, Colombo 11, Sri Lanka',
        lat:              6.9349,
        lng:              79.8560,
        freeDeliveryThreshold: 5000, // LKR — free delivery above this
        deliveryCutoffHour:    14,   // 2pm cutoff for same-day delivery
      },
    },
  })

  console.log('✅ Seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
