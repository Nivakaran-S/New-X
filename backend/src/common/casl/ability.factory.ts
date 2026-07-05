import { Injectable } from '@nestjs/common'
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability'
import { User } from '@prisma/client'

// Define subjects (Prisma model names as strings for simplicity)
type Subjects =
  | 'Product'
  | 'ProductVariant'
  | 'Order'
  | 'User'
  | 'Payment'
  | 'Inventory'
  | 'Report'
  | 'Setting'
  | 'Coupon'
  | 'Delivery'
  | 'LoyaltyTransaction'
  | 'IrdSubmission'
  | 'AuditLog'
  | 'all'

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage'

export type AppAbility = MongoAbility<[Actions, Subjects]>

@Injectable()
export class AbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

    switch (user.role) {
      case 'SUPER_ADMIN':
        can('manage', 'all')
        break

      case 'MANAGER':
        can('manage', 'Product')
        can('manage', 'Order')
        can('manage', 'Coupon')
        can('manage', 'Delivery')
        can('read', 'Report')
        can('read', 'LoyaltyTransaction')
        can('read', 'User')
        can('update', 'User')
        cannot('delete', 'User')
        cannot('manage', 'Setting')
        cannot('manage', 'IrdSubmission')
        cannot('read', 'AuditLog')
        break

      case 'CASHIER':
        can('read', 'Product')
        can('read', 'ProductVariant')
        can('create', 'Order')
        can('read', 'Order')
        // Cashiers cannot see cost prices — enforced at service level by checking ability
        cannot('read', 'Report')
        cannot('manage', 'Coupon')
        cannot('manage', 'Delivery')
        break

      case 'WAREHOUSE':
        can('read', 'Product')
        can('manage', 'Inventory')
        can('read', 'Order')
        can('read', 'Delivery')
        cannot('manage', 'Order')
        cannot('read', 'Report')
        break

      case 'SALES_REP':
        can('read', 'Product')
        can('read', 'User') // their customers only
        can('create', 'Order')
        can('read', 'Order') // their orders only
        cannot('manage', 'Product')
        cannot('read', 'Report')
        break

      case 'BRAND_PRINCIPAL':
        can('read', 'Product') // their brand only
        can('read', 'Order') // their brand products only
        can('read', 'Report') // their brand reports only
        cannot('manage', 'Product')
        cannot('manage', 'Order')
        break

      case 'WHOLESALE_BUYER':
      case 'RETAIL_BUYER':
        can('read', 'Product')
        can('create', 'Order')
        can('read', 'Order') // own orders only
        cannot('manage', 'all')
        break

      default:
        can('read', 'Product')
        break
    }

    return build()
  }
}
