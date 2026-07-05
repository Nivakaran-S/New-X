// ─── Enums ────────────────────────────────────────────────────────────
export type Role =
  | 'SUPER_ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE'
  | 'SALES_REP' | 'DELIVERY' | 'BRAND_PRINCIPAL' | 'CUSTOMER' | 'WHOLESALE_BUYER'

export type AccountType = 'RETAIL' | 'WHOLESALE' | 'STAFF' | 'VENDOR'

export type UnitType = 'UNIT' | 'DOZEN' | 'CASE' | 'PALLET'

export type OrderSource = 'POS' | 'WEBSITE' | 'WHATSAPP' | 'PHONE' | 'API'

export type OrderStatus =
  | 'PENDING' | 'PENDING_VERIFICATION' | 'CONFIRMED'
  | 'PROCESSING' | 'PRE_ORDER' | 'CANCELLED' | 'REFUNDED'

export type PaymentStatus = 'UNPAID' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'REFUNDED'

export type PaymentMethod = 'BANK_TRANSFER' | 'COD' | 'CREDIT_ACCOUNT' | 'CASH' | 'SPLIT'

export type FulfillmentType = 'DELIVERY' | 'PICKUP'

export type DeliveryProvider = 'PICKME_FLASH' | 'PRONTO' | 'OWN_FLEET' | 'PICKUP'

export type VehicleType = 'MOTORBIKE' | 'TUK' | 'CAR' | 'TRUCK'

export type ShipmentStatus =
  | 'PENDING' | 'BOOKING' | 'ASSIGNED' | 'PICKED_UP'
  | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'

export type ConvStatus = 'BOT' | 'HUMAN' | 'RESOLVED'

export type AlertType = 'BACK_IN_STOCK' | 'PRE_ORDER'

export type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_DELIVERY'

// ─── Base types ────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string | null
  phone: string | null
  whatsappPhone: string | null
  name: string
  businessName: string | null
  role: Role
  accountType: AccountType
  passwordHash: string | null
  isActive: boolean
  isApproved: boolean
  creditLimit: number
  outstandingBalance: number
  paymentTermDays: number
  pricingTierId: string | null
  referralCode: string | null
  referredById: string | null
  loyaltyPoints: number
  totalSpend: number
  orderCount: number
  rfmScore: string | null
  lastOrderAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Brand {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  description: string | null
  imageUrl: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id: string
  name: string
  slug: string
}

export interface Product {
  id: string
  sku: string
  barcode: string | null
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  brandId: string
  categoryId: string
  isActive: boolean
  isFeatured: boolean
  allowPreOrder: boolean
  allowBackOrder: boolean
  metaTitle: string | null
  metaDescription: string | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  alt: string | null
  isPrimary: boolean
  sortOrder: number
}

export interface ProductVariant {
  id: string
  productId: string
  sku: string
  barcode: string | null
  name: string
  costPrice: number
  retailPrice: number
  wholesalePrice: number
  lengthCm: number
  widthCm: number
  heightCm: number
  weightGrams: number
  unitsPerDozen: number
  unitsPerCase: number
  caseLength: number | null
  caseWidth: number | null
  caseHeight: number | null
  caseWeightGrams: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Warehouse {
  id: string
  name: string
  code: string
  address: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface InventoryItem {
  id: string
  variantId: string
  warehouseId: string
  qtyOnHand: number
  qtyReserved: number
  qtyAvailable: number
  reorderPoint: number
  updatedAt: Date
}

export interface PricingTier {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PricingRule {
  id: string
  tierId: string | null
  productId: string | null
  variantId: string | null
  unitType: UnitType
  price: number
  minQty: number
  label?: string | null
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Cart {
  id: string
  customerId: string | null
  sessionId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  id: string
  cartId: string
  variantId: string
  unitType: UnitType
  qty: number
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  orderNumber: string
  source: OrderSource
  customerId: string | null
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentType: FulfillmentType
  subtotal: number
  discountAmount: number
  taxAmount: number
  deliveryAmount: number
  totalAmount: number
  couponCode: string | null
  couponDiscount: number
  deliveryAddressId: string | null
  deliveryNotes: string | null
  staffId: string | null
  whatsappConversationId: string | null
  invoiceNumber: string | null
  irdSubmittedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  variantId: string
  unitType: UnitType
  qty: number
  unitPrice: number
  totalPrice: number
  discount: number
  costPrice: number
}

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  referenceNo: string | null
  slipImageUrl: string | null
  verifiedById: string | null
  verifiedAt: Date | null
  codCollectedAt: Date | null
  notes: string | null
  createdAt: Date
}

export interface Shipment {
  id: string
  orderId: string
  provider: DeliveryProvider
  providerRef: string | null
  vehicleType: VehicleType
  trackingUrl: string | null
  status: ShipmentStatus
  estimatedFee: number
  actualFee: number | null
  pickedUpAt: Date | null
  deliveredAt: Date | null
  estimatedVolumeLitres: number | null
  calculatedWeightKg: number | null
  failureReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VehicleCapacity {
  id: string
  vehicleType: VehicleType
  maxVolumeLitres: number
  maxWeightKg: number
  baseFee: number
  perKmFee: number
  isActive: boolean
  updatedAt: Date
}

export interface WhatsAppConversation {
  id: string
  waId: string
  customerName: string | null
  customerId: string | null
  status: ConvStatus
  assignedToId: string | null
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface WhatsAppMessage {
  id: string
  conversationId: string
  waMessageId: string | null
  createdAt: Date
}

export interface StockAlert {
  id: string
  variantId: string
  customerId: string | null
  email: string | null
  phone: string | null
  alertType: AlertType
  isTriggered: boolean
  triggeredAt: Date | null
  createdAt: Date
}

export interface LoyaltyTransaction {
  id: string
  customerId: string
  orderId: string | null
  points: number
  createdAt: Date
}

export interface DemandForecast {
  id: string
  variantId: string
  forecastDate: Date
  predictedQty: number
  createdAt: Date
}

export interface AuditLog {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  before: unknown
  after: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export interface AppSetting {
  key: string
  value: string
  updatedAt: Date
}

export interface Address {
  id: string
  customerId: string
  label: string | null
  line1: string
  line2: string | null
  city: string
  district: string | null
  postalCode: string | null
  lat: number | null
  lng: number | null
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// ─── API response envelope ────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
  meta?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta
}

// ─── Auth ─────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: SafeUser
}

export type SafeUser = Omit<User, 'passwordHash'>

// ─── Cart types ───────────────────────────────────────────────────────
export interface CartItemWithProduct extends CartItem {
  variant: ProductVariant & {
    product: Product & { brand: Brand; images: ProductImage[] }
  }
  resolvedPrice: number
  resolvedLabel: string
  lineTotal: number
}

export interface CartSummary {
  items: CartItemWithProduct[]
  subtotal: number
  deliveryEstimate: number | null
  total: number
  nudge?: string
  couponDiscount?: number
  freeDeliveryThreshold?: number
  amountToFreeDelivery?: number
}

// ─── Product with pricing ─────────────────────────────────────────────
export interface ProductWithDetails extends Product {
  brand: Brand
  category: Category
  variants: ProductVariantWithInventory[]
  pricingRules: PricingRule[]
  images: ProductImage[]
  tags: Tag[]
}

export interface ProductVariantWithInventory extends ProductVariant {
  inventoryItems: (InventoryItem & { warehouse: Warehouse })[]
  totalStock: number
  reservedStock: number
  availableStock: number
}

// ─── Order with details ───────────────────────────────────────────────
export interface OrderWithDetails extends Order {
  items: (OrderItem & {
    variant: ProductVariant & { product: Product & { images: ProductImage[] } }
  })[]
  payments: Payment[]
  shipment: Shipment | null
  customer: SafeUser | null
  deliveryAddress: Address | null
}

// ─── POS ──────────────────────────────────────────────────────────────
export interface PosLineItem {
  variantId: string
  variant: ProductVariant & { product: Product }
  unitType: UnitType
  qty: number
  unitPrice: number
  totalPrice: number
  discount: number
}

export interface PosTransaction {
  customerId?: string
  customerName?: string
  items: PosLineItem[]
  subtotal: number
  discountAmount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  cashReceived?: number
  change?: number
  referenceNo?: string
}

// ─── Analytics ────────────────────────────────────────────────────────
export interface DashboardSummary {
  todayRevenue: number
  todayOrders: number
  thisMonthRevenue: number
  thisMonthOrders: number
  totalCustomers: number
  lowStockCount: number
  pendingVerification: number
  topProducts: { name: string; revenue: number; units: number }[]
}

// ─── Settings ─────────────────────────────────────────────────────────
export interface PaymentSettings {
  isCodEnabled: boolean
  bankName: string
  bankAccountNo: string
  bankAccountName: string
  bankBranch: string
  paymentHoldMinutes: number
  maxCodOrderAmount: number
  codDeliveryZoneKm: number
}

export interface StoreSettings {
  name: string
  phone: string
  whatsappPhone: string
  email: string
  address: string
  lat: number
  lng: number
  freeDeliveryThreshold: number
  deliveryCutoffHour: number
}
