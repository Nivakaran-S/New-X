-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'SALES_REP', 'DELIVERY', 'BRAND_PRINCIPAL', 'CUSTOMER', 'WHOLESALE_BUYER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('RETAIL', 'WHOLESALE', 'STAFF', 'VENDOR');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('UNIT', 'DOZEN', 'CASE', 'PALLET');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('POS', 'WEBSITE', 'WHATSAPP', 'PHONE', 'API');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PENDING_VERIFICATION', 'CONFIRMED', 'PROCESSING', 'PRE_ORDER', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'VERIFIED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'COD', 'CREDIT_ACCOUNT', 'CASH', 'SPLIT');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "DeliveryProvider" AS ENUM ('PICKME_FLASH', 'PRONTO', 'OWN_FLEET', 'PICKUP');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORBIKE', 'TUK', 'CAR', 'TRUCK');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'BOOKING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConvStatus" AS ENUM ('BOT', 'HUMAN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MsgType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'LIST', 'BUTTON', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('BACK_IN_STOCK', 'PRE_ORDER');

-- CreateEnum
CREATE TYPE "AdPlatform" AS ENUM ('META', 'GOOGLE');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED', 'FREE_DELIVERY');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('ALL', 'WHOLESALE', 'RETAIL', 'SPECIFIC_PRODUCTS');

-- CreateEnum
CREATE TYPE "LoyaltyTxType" AS ENUM ('EARN', 'REDEEM', 'BONUS', 'EXPIRE', 'ADJUST');

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minMonthlySpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsappPhone" TEXT,
    "name" TEXT NOT NULL,
    "businessName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "accountType" "AccountType" NOT NULL DEFAULT 'RETAIL',
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
    "pricingTierId" TEXT,
    "referralCode" TEXT,
    "referredById" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "rfmScore" TEXT,
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "label" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "postalCode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "iconUrl" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "brandId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "allowPreOrder" BOOLEAN NOT NULL DEFAULT false,
    "allowBackOrder" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "retailPrice" DECIMAL(10,2) NOT NULL,
    "wholesalePrice" DECIMAL(10,2) NOT NULL,
    "lengthCm" DOUBLE PRECISION NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightGrams" DOUBLE PRECISION NOT NULL,
    "unitsPerDozen" INTEGER NOT NULL DEFAULT 12,
    "unitsPerCase" INTEGER NOT NULL DEFAULT 24,
    "caseLength" DOUBLE PRECISION,
    "caseWidth" DOUBLE PRECISION,
    "caseHeight" DOUBLE PRECISION,
    "caseWeightGrams" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "maxLevel" INTEGER NOT NULL DEFAULT 500,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "CouponType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "scope" "CouponScope" NOT NULL DEFAULT 'ALL',
    "productIds" TEXT[],
    "minOrderAmt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minOrderAmt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "applicableTo" "CouponScope" NOT NULL DEFAULT 'ALL',
    "productIds" TEXT[],
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "unitType" "UnitType" NOT NULL DEFAULT 'UNIT',
    "qty" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL,
    "customerId" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "guestEmail" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'DELIVERY',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "couponCode" TEXT,
    "couponDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryAddressId" TEXT,
    "deliveryNotes" TEXT,
    "staffId" TEXT,
    "whatsappConversationId" TEXT,
    "invoiceNumber" TEXT,
    "irdSubmittedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceNo" TEXT,
    "slipImageUrl" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "codCollectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentHold" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "DeliveryProvider" NOT NULL,
    "providerRef" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "trackingUrl" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actualFee" DECIMAL(10,2),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "estimatedVolumeLitres" DOUBLE PRECISION,
    "calculatedWeightKg" DOUBLE PRECISION,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCapacity" (
    "id" TEXT NOT NULL,
    "provider" "DeliveryProvider" NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "label" TEXT NOT NULL,
    "maxWeightKg" DOUBLE PRECISION NOT NULL,
    "maxVolumeLitres" DOUBLE PRECISION NOT NULL,
    "maxLengthCm" DOUBLE PRECISION NOT NULL,
    "baseFee" DECIMAL(8,2) NOT NULL,
    "perKmFee" DECIMAL(6,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VehicleCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerId" TEXT,
    "status" "ConvStatus" NOT NULL DEFAULT 'BOT',
    "assignedToId" TEXT,
    "botState" JSONB,
    "orderId" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "type" "MsgType" NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "userId" TEXT,
    "alertType" "AlertType" NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LoyaltyTxType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "orderId" TEXT,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rewardedAt" TIMESTAMP(3),
    "referrerCredit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "territory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SalesRep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerVisit" (
    "id" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notes" TEXT,
    "orderTaken" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRoute" (
    "id" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "stops" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandPrincipal" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canViewSales" BOOLEAN NOT NULL DEFAULT true,
    "canViewStock" BOOLEAN NOT NULL DEFAULT true,
    "canViewRetailers" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BrandPrincipal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "predictedQty" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestockAlert" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "predictedDailyQty" DOUBLE PRECISION NOT NULL,
    "daysOfStock" DOUBLE PRECISION NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdConversionEvent" (
    "id" TEXT NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderId" TEXT,
    "userId" TEXT,
    "value" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "payload" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrdSubmission" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IrdSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_ProductToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_rfmScore_idx" ON "User"("rfmScore");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_barcode_key" ON "ProductVariant"("barcode");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_barcode_idx" ON "ProductVariant"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_variantId_warehouseId_key" ON "InventoryItem"("variantId", "warehouseId");

-- CreateIndex
CREATE INDEX "InventoryItem_variantId_idx" ON "InventoryItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_productId_unitType_minQty_key" ON "PricingRule"("productId", "unitType", "minQty");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionId_key" ON "Cart"("sessionId");

-- CreateIndex
CREATE INDEX "Cart_sessionId_idx" ON "Cart"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_unitType_key" ON "CartItem"("cartId", "variantId", "unitType");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_source_idx" ON "Order"("source");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentHold_orderId_key" ON "PaymentHold"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCapacity_provider_vehicleType_key" ON "VehicleCapacity"("provider", "vehicleType");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_remoteJid_key" ON "WhatsAppConversation"("remoteJid");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_status_idx" ON "WhatsAppConversation"("status");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_customerId_idx" ON "WhatsAppConversation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_messageId_key" ON "WhatsAppMessage"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_conversationId_idx" ON "WhatsAppMessage"("conversationId");

-- CreateIndex
CREATE INDEX "StockAlert_variantId_idx" ON "StockAlert"("variantId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_userId_idx" ON "LoyaltyTransaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesRep_userId_key" ON "SalesRep"("userId");

-- CreateIndex
CREATE INDEX "CustomerVisit_salesRepId_idx" ON "CustomerVisit"("salesRepId");

-- CreateIndex
CREATE INDEX "CustomerVisit_customerId_idx" ON "CustomerVisit"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPrincipal_brandId_key" ON "BrandPrincipal"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPrincipal_userId_key" ON "BrandPrincipal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandForecast_variantId_forecastDate_key" ON "DemandForecast"("variantId", "forecastDate");

-- CreateIndex
CREATE INDEX "DemandForecast_variantId_idx" ON "DemandForecast"("variantId");

-- CreateIndex
CREATE INDEX "RestockAlert_variantId_idx" ON "RestockAlert"("variantId");

-- CreateIndex
CREATE INDEX "AdConversionEvent_orderId_idx" ON "AdConversionEvent"("orderId");

-- CreateIndex
CREATE INDEX "AdConversionEvent_platform_eventName_idx" ON "AdConversionEvent"("platform", "eventName");

-- CreateIndex
CREATE UNIQUE INDEX "IrdSubmission_orderId_key" ON "IrdSubmission"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "_ProductToTag_B_index" ON "_ProductToTag"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "PricingTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerVisit" ADD CONSTRAINT "CustomerVisit_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerVisit" ADD CONSTRAINT "CustomerVisit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRoute" ADD CONSTRAINT "SalesRoute_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPrincipal" ADD CONSTRAINT "BrandPrincipal_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPrincipal" ADD CONSTRAINT "BrandPrincipal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToTag" ADD CONSTRAINT "_ProductToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToTag" ADD CONSTRAINT "_ProductToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
