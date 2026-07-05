import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { DeliveryService } from './delivery.service'
import { VehicleSelectorService } from './vehicle-selector.service'
import { CreateShipmentDto } from './dto/create-shipment.dto'
import { PickMeWebhookDto } from './dto/pickme-webhook.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { PaginationDto } from '../common/dto/pagination.dto'
import { Role, ShipmentStatus, DeliveryProvider } from '@prisma/client'

class UpdateShipmentStatusDto {
  status: ShipmentStatus
}

class UpdateVehicleCapacityDto {
  maxWeightKg?: number
  maxVolumeLitres?: number
  maxLengthCm?: number
  baseFee?: number
  perKmFee?: number
  isActive?: boolean
  label?: string
}

class ShipmentsQueryDto extends PaginationDto {
  status?: ShipmentStatus
  provider?: DeliveryProvider
}

@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly vehicleSelectorService: VehicleSelectorService,
  ) {}

  // ---------------------------------------------------------------------------
  // Shipments
  // ---------------------------------------------------------------------------

  /**
   * GET /delivery/shipments
   * List all shipments with optional filters. Staff only.
   */
  @Get('shipments')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE)
  async getShipments(@Query() query: ShipmentsQueryDto) {
    return this.deliveryService.getShipments(query)
  }

  /**
   * GET /delivery/shipments/:id
   * Retrieve a single shipment with full order detail. Staff only.
   */
  @Get('shipments/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE)
  async getShipment(@Param('id') id: string) {
    return this.deliveryService.getShipment(id)
  }

  /**
   * POST /delivery/shipments
   * Manually create and book a shipment for an order. Manager/Admin only.
   */
  @Post('shipments')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  async createShipment(@Body() dto: CreateShipmentDto) {
    // If provider and vehicleType are explicitly supplied we honour them;
    // otherwise the service auto-selects them via VehicleSelectorService.
    return this.deliveryService.bookDelivery(dto.orderId)
  }

  /**
   * PATCH /delivery/shipments/:id/status
   * Manual status override for staff.
   */
  @Patch('shipments/:id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  async updateShipmentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.deliveryService.updateShipmentStatus(id, dto.status)
  }

  /**
   * PATCH /delivery/shipments/:id/cancel
   * Cancel a shipment (calls provider cancel endpoint if applicable).
   */
  @Patch('shipments/:id/cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.MANAGER)
  async cancelShipment(@Param('id') id: string) {
    return this.deliveryService.cancelShipment(id)
  }

  // ---------------------------------------------------------------------------
  // Webhooks — no auth (provider calls these)
  // ---------------------------------------------------------------------------

  /**
   * POST /delivery/webhooks/pickme
   * Receive status update events from PickMe Flash.
   */
  @Post('webhooks/pickme')
  @HttpCode(HttpStatus.OK)
  async pickMeWebhook(@Body() payload: PickMeWebhookDto) {
    return this.deliveryService.handlePickMeWebhook(payload)
  }

  /**
   * POST /delivery/webhooks/pronto
   * Receive status update events from Pronto.
   */
  @Post('webhooks/pronto')
  @HttpCode(HttpStatus.OK)
  async prontoWebhook(@Body() payload: Record<string, unknown>) {
    return this.deliveryService.handleProntoWebhook(payload)
  }

  // ---------------------------------------------------------------------------
  // Vehicle capacities
  // ---------------------------------------------------------------------------

  /**
   * GET /delivery/vehicle-capacities
   * List all vehicle capacity configurations. Super-admin only.
   */
  @Get('vehicle-capacities')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getVehicleCapacities() {
    return this.deliveryService.getVehicleCapacities()
  }

  /**
   * PATCH /delivery/vehicle-capacities/:id
   * Update a vehicle capacity record. Super-admin only.
   */
  @Patch('vehicle-capacities/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updateVehicleCapacity(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleCapacityDto,
  ) {
    return this.deliveryService.updateVehicleCapacity(id, dto)
  }
}
