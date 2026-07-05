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
import { PromotionsService, PromotionQueryDto } from './promotions.service'
import { CreatePromotionDto } from './dto/create-promotion.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { Role } from '@prisma/client'
import { IsOptional, IsString } from 'class-validator'

class ActivePromotionQueryDto {
  @IsOptional()
  @IsString()
  productId?: string
}

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  findAll(@Query() dto: PromotionQueryDto) {
    return this.promotionsService.findAll(dto)
  }

  @Get('active')
  findActive(@Query() query: ActivePromotionQueryDto) {
    return this.promotionsService.findActiveForProduct(query.productId ?? '')
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: Partial<CreatePromotionDto>) {
    return this.promotionsService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id)
  }
}
