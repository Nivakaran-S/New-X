import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OnEvent } from '@nestjs/event-emitter'
import MeiliSearch from 'meilisearch'
import { PrismaService } from '../prisma/prisma.service'
import { SearchQueryDto } from './dto/search-query.dto'

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name)
  private client: MeiliSearch
  private readonly indexName = 'products'

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.client = new MeiliSearch({
      host: config.get<string>('MEILISEARCH_HOST', 'http://localhost:7700'),
      apiKey: config.get<string>('MEILISEARCH_API_KEY', ''),
    })
  }

  async onModuleInit() {
    try {
      const index = this.client.index(this.indexName)
      await index.updateFilterableAttributes(['categoryId', 'brandId', 'isActive', 'inStock', 'retailPrice', 'wholesalePrice'])
      await index.updateSortableAttributes(['sortOrder', 'name', 'retailPrice'])
      this.logger.log('Meilisearch index configured')
    } catch (err) {
      this.logger.warn('Meilisearch not available:', err)
    }
  }

  async search(dto: SearchQueryDto) {
    const filters: string[] = ['isActive = true']
    if (dto.category) filters.push(`categoryId = "${dto.category}"`)
    if (dto.brand) filters.push(`brandId = "${dto.brand}"`)
    if (dto.inStock) filters.push('inStock = true')
    if (dto.minPrice !== undefined) filters.push(`retailPrice >= ${dto.minPrice}`)
    if (dto.maxPrice !== undefined) filters.push(`retailPrice <= ${dto.maxPrice}`)

    try {
      const result = await this.client.index(this.indexName).search(dto.q ?? '', {
        filter: filters.join(' AND '),
        limit: dto.limit ?? 20,
        offset: dto.offset ?? 0,
        attributesToHighlight: ['name', 'description'],
      })
      return result
    } catch {
      return this.searchFallback(dto)
    }
  }

  private async searchFallback(dto: SearchQueryDto) {
    const where: any = { isActive: true }
    if (dto.q) where.OR = [{ name: { contains: dto.q, mode: 'insensitive' } }, { description: { contains: dto.q, mode: 'insensitive' } }]
    if (dto.category) where.categoryId = dto.category
    if (dto.brand) where.brandId = dto.brand
    const products = await this.prisma.product.findMany({
      where,
      take: dto.limit ?? 20,
      skip: dto.offset ?? 0,
      include: { brand: true, category: true, images: { where: { isPrimary: true }, take: 1 } },
    })
    return { hits: products, estimatedTotalHits: products.length }
  }

  async syncProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true }, include: { inventoryItems: true } },
      },
    })
    if (!product) return

    const totalStock = product.variants.reduce((sum, v) =>
      sum + v.inventoryItems.reduce((s, i) => s + i.qty - i.reservedQty, 0), 0)

    const doc = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      brandId: product.brandId,
      brandName: product.brand.name,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      imageUrl: product.images[0]?.url ?? null,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      sortOrder: product.sortOrder,
      retailPrice: product.variants[0] ? Number(product.variants[0].retailPrice) : 0,
      wholesalePrice: product.variants[0] ? Number(product.variants[0].wholesalePrice) : 0,
      inStock: totalStock > 0,
      totalStock,
    }

    try {
      await this.client.index(this.indexName).addDocuments([doc])
    } catch (err) {
      this.logger.warn('Failed to sync product to Meilisearch:', err)
    }
  }

  async syncAll() {
    const products = await this.prisma.product.findMany({
      include: {
        brand: true,
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true }, include: { inventoryItems: true } },
      },
    })

    const docs = products.map(product => {
      const totalStock = product.variants.reduce((sum, v) =>
        sum + v.inventoryItems.reduce((s, i) => s + i.qty - i.reservedQty, 0), 0)
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        brandId: product.brandId,
        brandName: product.brand.name,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        imageUrl: product.images[0]?.url ?? null,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        sortOrder: product.sortOrder,
        retailPrice: product.variants[0] ? Number(product.variants[0].retailPrice) : 0,
        wholesalePrice: product.variants[0] ? Number(product.variants[0].wholesalePrice) : 0,
        inStock: totalStock > 0,
        totalStock,
      }
    })

    try {
      await this.client.index(this.indexName).addDocuments(docs)
      return { synced: docs.length }
    } catch (err) {
      this.logger.warn('Failed to sync all products:', err)
      return { synced: 0, error: String(err) }
    }
  }

  @OnEvent('product.created')
  async onProductCreated(payload: { productId: string }) {
    await this.syncProduct(payload.productId)
  }

  @OnEvent('product.updated')
  async onProductUpdated(payload: { productId: string }) {
    await this.syncProduct(payload.productId)
  }

  @OnEvent('product.deleted')
  async onProductDeleted(payload: { productId: string }) {
    try {
      await this.client.index(this.indexName).deleteDocument(payload.productId)
    } catch {}
  }
}
