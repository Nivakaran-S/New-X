import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

const FORECAST_DAYS = 14
const HISTORY_DAYS = 90
const MOVING_AVG_WINDOW = 7
const LOW_STOCK_URGENCY_THRESHOLD_DAYS = 3
const MEDIUM_STOCK_URGENCY_THRESHOLD_DAYS = 7

@Injectable()
export class ForecastingService {
  private readonly logger = new Logger(ForecastingService.name)

  constructor(private prisma: PrismaService) {}

  @Cron('0 4 * * *')
  async runDailyForecast() {
    try {
      this.logger.log('Starting nightly demand forecast run')

      const variants = await this.prisma.productVariant.findMany({
        where: { isActive: true },
        select: { id: true },
      })

      this.logger.log(`Forecasting for ${variants.length} active variants`)

      for (const variant of variants) {
        try {
          await this.updateForecast(variant.id)
        } catch (err) {
          this.logger.error(`Forecast failed for variant ${variant.id}: ${err}`)
        }
      }

      this.logger.log('Nightly demand forecast run complete')
    } catch (err) {
      this.logger.error(`runDailyForecast cron error: ${err}`)
    }
  }

  async updateForecast(variantId: string) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - HISTORY_DAYS)

    // Get last 90 days of sales
    const salesData = await this.prisma.orderItem.findMany({
      where: {
        variantId,
        order: {
          status: { not: 'CANCELLED' },
          createdAt: { gte: cutoff },
        },
      },
      include: {
        order: { select: { createdAt: true } },
      },
      orderBy: { order: { createdAt: 'asc' } },
    })

    // Aggregate qty per day
    const dailySales = new Map<string, number>()
    for (const item of salesData) {
      const day = item.order.createdAt.toISOString().split('T')[0]!
      dailySales.set(day, (dailySales.get(day) ?? 0) + item.qty)
    }

    // Build array of daily quantities over the 90-day window (fill missing days with 0)
    const dailyQtyArray: number[] = []
    for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]!
      dailyQtyArray.push(dailySales.get(key) ?? 0)
    }

    // Calculate 7-day moving average from the most recent window
    const recentWindow = dailyQtyArray.slice(-MOVING_AVG_WINDOW)
    const movingAvg =
      recentWindow.length > 0
        ? recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length
        : 0

    // Project next 14 days and upsert DemandForecast records
    const upserts = []
    for (let day = 1; day <= FORECAST_DAYS; day++) {
      const forecastDate = new Date()
      forecastDate.setDate(forecastDate.getDate() + day)
      forecastDate.setHours(0, 0, 0, 0)

      const predictedQty = Math.max(0, Math.round(movingAvg))

      // Confidence drops slightly for further-out days
      const confidence = Math.max(0.3, 0.9 - (day - 1) * 0.04)

      upserts.push(
        this.prisma.demandForecast.upsert({
          where: { variantId_forecastDate: { variantId, forecastDate } },
          create: {
            variantId,
            forecastDate,
            predictedQty,
            confidence: Math.round(confidence * 100) / 100,
            method: 'moving_avg',
          },
          update: {
            predictedQty,
            confidence: Math.round(confidence * 100) / 100,
            method: 'moving_avg',
          },
        }),
      )
    }

    await this.prisma.$transaction(upserts)
    return { variantId, movingAvg, forecastDays: FORECAST_DAYS }
  }

  async getForecast(variantId: string, days: number = FORECAST_DAYS) {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date()
    to.setDate(to.getDate() + days)

    return this.prisma.demandForecast.findMany({
      where: {
        variantId,
        forecastDate: { gte: from, lte: to },
      },
      orderBy: { forecastDate: 'asc' },
    })
  }

  async getRestockAlerts() {
    // Get all active variants with their current inventory and 14-day forecast
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true },
      include: {
        inventoryItems: {
          select: { qty: true, reservedQty: true },
        },
        product: { select: { id: true, name: true } },
      },
    })

    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date()
    to.setDate(to.getDate() + FORECAST_DAYS)

    const forecasts = await this.prisma.demandForecast.findMany({
      where: { forecastDate: { gte: from, lte: to } },
    })

    const alerts = []

    for (const variant of variants) {
      const currentStock = variant.inventoryItems.reduce(
        (sum, inv) => sum + inv.qty - inv.reservedQty,
        0,
      )

      const variantForecasts = forecasts.filter(f => f.variantId === variant.id)
      if (variantForecasts.length === 0) continue

      const totalForecastedDemand = variantForecasts.reduce((s, f) => s + f.predictedQty, 0)
      const predictedDailyQty = totalForecastedDemand / FORECAST_DAYS

      if (predictedDailyQty <= 0) continue

      const daysOfStock = predictedDailyQty > 0 ? currentStock / predictedDailyQty : Infinity

      if (daysOfStock < FORECAST_DAYS) {
        const urgency =
          daysOfStock <= LOW_STOCK_URGENCY_THRESHOLD_DAYS
            ? 'CRITICAL'
            : daysOfStock <= MEDIUM_STOCK_URGENCY_THRESHOLD_DAYS
              ? 'HIGH'
              : 'MEDIUM'

        const suggestedOrderQty = Math.ceil(
          totalForecastedDemand - currentStock + predictedDailyQty * 7, // 1-week buffer
        )

        alerts.push({
          variantId: variant.id,
          variantName: variant.name,
          sku: variant.sku,
          productId: variant.product.id,
          productName: variant.product.name,
          currentStock,
          predictedDailyQty: Math.round(predictedDailyQty * 100) / 100,
          daysOfStock: Math.round(daysOfStock * 10) / 10,
          forecastedDemand14Days: totalForecastedDemand,
          suggestedOrderQty: Math.max(0, suggestedOrderQty),
          urgency,
        })
      }
    }

    return alerts.sort((a, b) => a.daysOfStock - b.daysOfStock)
  }

  async getRestockDashboard() {
    const alerts = await this.getRestockAlerts()

    const critical = alerts.filter(a => a.urgency === 'CRITICAL')
    const high = alerts.filter(a => a.urgency === 'HIGH')
    const medium = alerts.filter(a => a.urgency === 'MEDIUM')

    return {
      summary: {
        totalAlertsCount: alerts.length,
        criticalCount: critical.length,
        highCount: high.length,
        mediumCount: medium.length,
      },
      critical,
      high,
      medium,
    }
  }
}
