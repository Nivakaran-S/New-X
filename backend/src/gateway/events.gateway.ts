import { Logger, UseGuards } from '@nestjs/common'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/realtime' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(EventsGateway.name)

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  // Join a room (e.g. by orderId, userId, or 'admin')
  @SubscribeMessage('join')
  handleJoin(client: Socket, room: string) {
    client.join(room)
    return { event: 'joined', data: room }
  }

  // Emit stock update to all subscribers of a variant room
  emitStockUpdate(variantId: string, newStock: number) {
    this.server.to(`variant:${variantId}`).emit('stock:updated', { variantId, stock: newStock })
  }

  // Emit order status change
  emitOrderUpdate(orderId: string, status: string) {
    this.server.to(`order:${orderId}`).emit('order:updated', { orderId, status })
  }

  // Emit new order notification to admin room
  emitNewOrder(order: any) {
    this.server
      .to('admin')
      .emit('order:new', { orderId: order.id, orderNumber: order.orderNumber, total: order.totalAmount })
  }

  // Emit shipment update
  emitShipmentUpdate(orderId: string, shipmentStatus: string) {
    this.server.to(`order:${orderId}`).emit('shipment:updated', { orderId, status: shipmentStatus })
  }

  // Emit low stock alert to admin room
  emitLowStockAlert(variantId: string, currentStock: number) {
    this.server.to('admin').emit('stock:low', { variantId, stock: currentStock })
  }
}
