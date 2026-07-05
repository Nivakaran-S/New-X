// ─── Re-export Prisma types for convenience ───────────────────────────
export type {
  User, Product, ProductVariant, ProductImage,
  Brand, Category, Tag,
  Order, OrderItem,
  Payment, Shipment,
  Cart, CartItem,
  InventoryItem, Warehouse,
  PricingTier, PricingRule,
  WhatsAppConversation, WhatsAppMessage,
  StockAlert, LoyaltyTransaction,
  DemandForecast, AuditLog,
  VehicleCapacity, AppSetting,
  Role, AccountType, UnitType, OrderSource, OrderStatus,
  PaymentStatus, PaymentMethod, FulfillmentType,
  DeliveryProvider, VehicleType, ShipmentStatus,
  ConvStatus, AlertType, CouponType,
} from '@prisma/client'

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
  nudge?: string // "Add 4 more to unlock case pricing"
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
  deliveryAddress: import('@prisma/client').Address | null
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
