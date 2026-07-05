import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CreateVariantDto } from './dto/create-variant.dto'
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { PaginationDto } from '../common/dto/pagination.dto'
import { IsOptional, IsString, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'

class ProductQueryDto extends PaginationDto {
  @IsOptional() @IsString() categoryId?: string
  @IsOptional() @IsString() brandId?: string
  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : undefined)
  @IsBoolean()
  isActive?: boolean
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── Public routes ────────────────────────────────────────────────────────

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query)
  }

  @Get('barcode/:code')
  @UseGuards(AuthGuard('jwt'))
  findByBarcode(@Param('code') code: string) {
    return this.productsService.findByBarcode(code)
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug)
  }

  // ─── Protected: product CRUD ──────────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id)
  }

  // ─── Variants ─────────────────────────────────────────────────────────────

  @Get(':id/variants')
  @UseGuards(AuthGuard('jwt'))
  getVariants(@Param('id') id: string) {
    return this.productsService.getVariants(id)
  }

  @Post(':id/variants')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  createVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.productsService.createVariant(id, dto)
  }

  @Patch(':id/variants/:variantId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  updateVariant(
    @Param('id') _id: string,
    @Param('variantId') variantId: string,
    @Body() dto: Partial<CreateVariantDto>,
  ) {
    return this.productsService.updateVariant(variantId, dto)
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  deleteVariant(@Param('id') _id: string, @Param('variantId') variantId: string) {
    return this.productsService.deleteVariant(variantId)
  }

  // ─── Pricing rules ────────────────────────────────────────────────────────

  @Get(':id/pricing-rules')
  @UseGuards(AuthGuard('jwt'))
  getPricingRules(@Param('id') id: string) {
    return this.productsService.getPricingRules(id)
  }

  @Post(':id/pricing-rules')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  createPricingRule(@Param('id') id: string, @Body() dto: CreatePricingRuleDto) {
    return this.productsService.createPricingRule(id, dto)
  }

  @Patch(':id/pricing-rules/:ruleId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  updatePricingRule(
    @Param('id') _id: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: Partial<CreatePricingRuleDto>,
  ) {
    return this.productsService.updatePricingRule(ruleId, dto)
  }

  @Delete(':id/pricing-rules/:ruleId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  deletePricingRule(@Param('id') _id: string, @Param('ruleId') ruleId: string) {
    return this.productsService.deletePricingRule(ruleId)
  }

  // ─── Images ───────────────────────────────────────────────────────────────

  @Post(':id/images')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  uploadImage(@Param('id') id: string, @Body() body: { filename: string }) {
    return this.productsService.uploadImage(id, body.filename)
  }
}
