import { Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../prisma/prisma.service'
import { PaginationDto, paginate } from '../common/dto/pagination.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CreateVariantDto } from './dto/create-variant.dto'
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto'

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    dto: PaginationDto & { categoryId?: string; brandId?: string; isActive?: boolean },
  ) {
    const where: Record<string, unknown> = {}

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { sku: { contains: dto.search, mode: 'insensitive' } },
        { shortDescription: { contains: dto.search, mode: 'insensitive' } },
      ]
    }

    if (dto.categoryId) where.categoryId = dto.categoryId
    if (dto.brandId) where.brandId = dto.brandId
    if (dto.isActive !== undefined) where.isActive = dto.isActive

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: dto.skip,
        take: dto.limit ?? 20,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          brand: true,
          category: true,
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.product.count({ where }),
    ])

    return paginate(products, total, dto)
  }

  async findOne(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        pricingRules: { where: { isActive: true }, orderBy: { minQty: 'asc' } },
        tags: true,
      },
    })

    if (!product) throw new NotFoundException(`Product not found: ${idOrSlug}`)

    return {
      ...product,
      variants: product.variants.map(v => ({
        ...v,
        costPrice: v.costPrice.toNumber(),
        retailPrice: v.retailPrice.toNumber(),
        wholesalePrice: v.wholesalePrice.toNumber(),
        lengthCm: v.lengthCm,
        widthCm: v.widthCm,
        heightCm: v.heightCm,
        weightGrams: v.weightGrams,
        caseLength: v.caseLength ?? null,
        caseWidth: v.caseWidth ?? null,
        caseHeight: v.caseHeight ?? null,
        caseWeightGrams: v.caseWeightGrams ?? null,
      })),
      pricingRules: product.pricingRules.map(r => ({
        ...r,
        price: r.price.toNumber(),
      })),
    }
  }

  async findByBarcode(code: string) {
    // Look up variant by barcode, return the parent product with that variant highlighted
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        OR: [{ barcode: code }, { sku: code }],
        isActive: true,
      },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            pricingRules: { where: { isActive: true }, orderBy: { minQty: 'asc' } },
          },
        },
        inventoryItems: { take: 1 },
      },
    })

    if (!variant) throw new NotFoundException(`No product found for barcode: ${code}`)

    return {
      ...variant.product,
      matchedVariant: {
        ...variant,
        costPrice: variant.costPrice.toNumber(),
        retailPrice: variant.retailPrice.toNumber(),
        wholesalePrice: variant.wholesalePrice.toNumber(),
      },
      pricingRules: variant.product.pricingRules.map(r => ({
        ...r,
        price: r.price.toNumber(),
      })),
    }
  }

  async create(dto: CreateProductDto) {
    const { tagNames, ...productData } = dto

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        tags: tagNames?.length
          ? {
              connectOrCreate: tagNames.map(name => ({
                where: { name },
                create: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
              })),
            }
          : undefined,
      },
      include: {
        brand: true,
        category: true,
        tags: true,
      },
    })

    this.eventEmitter.emit('product.created', { productId: product.id, product })
    return product
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id)

    const { tagNames, ...productData } = dto

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        tags: tagNames !== undefined
          ? {
              set: [],
              connectOrCreate: tagNames.map(name => ({
                where: { name },
                create: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
              })),
            }
          : undefined,
      },
      include: {
        brand: true,
        category: true,
        tags: true,
      },
    })

    this.eventEmitter.emit('product.updated', { productId: product.id, product })
    return product
  }

  async remove(id: string) {
    await this.findOne(id)

    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    this.eventEmitter.emit('product.deleted', { productId: id })
    return product
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.findOne(productId)

    return this.prisma.productVariant.create({
      data: {
        ...dto,
        productId,
      },
    })
  }

  async updateVariant(variantId: string, dto: Partial<CreateVariantDto>) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    })
    if (!variant) throw new NotFoundException(`Variant not found: ${variantId}`)

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    })
  }

  async deleteVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    })
    if (!variant) throw new NotFoundException(`Variant not found: ${variantId}`)

    return this.prisma.productVariant.delete({ where: { id: variantId } })
  }

  async getVariants(productId: string) {
    await this.findOne(productId)

    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    })

    return variants.map(v => ({
      ...v,
      costPrice: v.costPrice.toNumber(),
      retailPrice: v.retailPrice.toNumber(),
      wholesalePrice: v.wholesalePrice.toNumber(),
      lengthCm: v.lengthCm.toNumber(),
      widthCm: v.widthCm.toNumber(),
      heightCm: v.heightCm.toNumber(),
      weightGrams: v.weightGrams.toNumber(),
      caseLength: v.caseLength?.toNumber() ?? null,
      caseWidth: v.caseWidth?.toNumber() ?? null,
      caseHeight: v.caseHeight?.toNumber() ?? null,
      caseWeightGrams: v.caseWeightGrams?.toNumber() ?? null,
    }))
  }

  async createPricingRule(productId: string, dto: CreatePricingRuleDto) {
    await this.findOne(productId)

    const rule = await this.prisma.pricingRule.create({
      data: {
        ...dto,
        productId,
      },
    })

    return { ...rule, price: rule.price.toNumber() }
  }

  async updatePricingRule(ruleId: string, dto: Partial<CreatePricingRuleDto>) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id: ruleId } })
    if (!rule) throw new NotFoundException(`Pricing rule not found: ${ruleId}`)

    const updated = await this.prisma.pricingRule.update({
      where: { id: ruleId },
      data: dto,
    })

    return { ...updated, price: updated.price.toNumber() }
  }

  async deletePricingRule(ruleId: string) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id: ruleId } })
    if (!rule) throw new NotFoundException(`Pricing rule not found: ${ruleId}`)

    return this.prisma.pricingRule.delete({ where: { id: ruleId } })
  }

  async getPricingRules(productId: string) {
    await this.findOne(productId)

    const rules = await this.prisma.pricingRule.findMany({
      where: { productId },
      orderBy: { minQty: 'asc' },
    })

    return rules.map(r => ({ ...r, price: r.price.toNumber() }))
  }

  async uploadImage(productId: string, filename: string) {
    await this.findOne(productId)

    const url = `https://cdn.healplace.com/products/${productId}/${filename}`

    const lastImage = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'desc' },
    })

    const sortOrder = lastImage ? lastImage.sortOrder + 1 : 0

    return this.prisma.productImage.create({
      data: {
        productId,
        url,
        filename,
        sortOrder,
      },
    })
  }
}
