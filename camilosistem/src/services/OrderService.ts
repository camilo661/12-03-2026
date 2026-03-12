// ============================================================
// CAMILOSISTEM - OrderService
// Lógica de negocio para el flujo del diagrama de procesos
// ============================================================

import {
  Order, OrderStatus, Quote, Invoice, DeliveryNote,
  OrderItem, OrderHistoryEntry, User, UserRole
} from '../models/types';

export class OrderService {
  private orders: Order[] = [];
  private users: User[] = [];
  private nextId = 1;

  constructor() {
    this.seedData();
  }

  // ──────────────────────────────────────────────
  // PASO 1: Shipping Office prepara requisición
  // ──────────────────────────────────────────────
  prepareRequisition(shippingOfficeId: string, items: OrderItem[], notes: string): Order {
    const order: Order = {
      id: `ORD-${String(this.nextId++).padStart(4, '0')}`,
      requisitionNumber: `REQ-${Date.now()}`,
      status: 'REQUISICION_PREPARADA',
      buyerAgentId: '',
      buyerAgentName: '',
      shippingOfficeId,
      items,
      quotes: [],
      needsReview: false,
      totalAmount: items.reduce((sum, i) => sum + i.totalPrice, 0),
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: []
    };
    this.addHistory(order, 'REQUISICION_PREPARADA', 'REQUISICION_PREPARADA', shippingOfficeId, 'SHIPPING_OFFICE', 'Requisición preparada');
    this.orders.push(order);
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 2: Buyer Agent prepara solicitud de cotización
  // ──────────────────────────────────────────────
  prepareRequestForQuote(orderId: string, buyerAgentId: string, buyerAgentName: string, needsReview: boolean): Order {
    const order = this.getOrderOrThrow(orderId);
    order.buyerAgentId = buyerAgentId;
    order.buyerAgentName = buyerAgentName;
    order.needsReview = needsReview;
    const newStatus: OrderStatus = needsReview ? 'EVALUACION_COTIZACION' : 'SOLICITUD_COTIZACION';
    this.transition(order, newStatus, buyerAgentId, 'BUYER_AGENT', `RFQ preparado. Necesita revisión: ${needsReview}`);
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 3a: Supervisor evalúa y aprueba/rechaza
  // ──────────────────────────────────────────────
  supervisorApprove(orderId: string, supervisorId: string, approved: boolean, notes: string): Order {
    const order = this.getOrderOrThrow(orderId);
    order.supervisorId = supervisorId;
    order.supervisorApproved = approved;
    const newStatus: OrderStatus = approved ? 'SOLICITUD_COTIZACION' : 'CANCELADO';
    this.transition(order, newStatus, supervisorId, 'SUPERVISOR', notes);
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 4: Seller revisa y decide cotizar
  // ──────────────────────────────────────────────
  sellerDecideToQuote(orderId: string, sellerId: string, willQuote: boolean): Order {
    const order = this.getOrderOrThrow(orderId);
    order.sellerId = sellerId;
    const newStatus: OrderStatus = willQuote ? 'PREPARACION_COTIZACION_ACTUAL' : 'CANCELADO';
    this.transition(order, newStatus, sellerId, 'SELLER', willQuote ? 'Vendedor decidió cotizar' : 'Vendedor rechazó cotizar');
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 5: Seller prepara cotización real
  // ──────────────────────────────────────────────
  prepareActualQuote(orderId: string, sellerId: string, quoteItems: OrderItem[], tax: number, validDays: number, notes: string): Order {
    const order = this.getOrderOrThrow(orderId);
    const subtotal = quoteItems.reduce((s, i) => s + i.totalPrice, 0);
    const total = subtotal + (subtotal * tax / 100);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const quote: Quote = {
      id: `QUO-${Date.now()}`,
      orderId,
      sellerId,
      items: quoteItems,
      subtotal,
      tax: subtotal * tax / 100,
      total,
      validUntil,
      status: 'ENVIADA',
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    order.quotes.push(quote);
    this.transition(order, 'ANALISIS_RESPUESTA_COTIZACION', sellerId, 'SELLER', 'Cotización real preparada');
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 6: Buyer analiza respuesta de cotización
  // ──────────────────────────────────────────────
  analyzeQuoteResponse(orderId: string, buyerAgentId: string): Order {
    const order = this.getOrderOrThrow(orderId);
    this.transition(order, 'REVISION_COTIZACION_ACTUAL', buyerAgentId, 'BUYER_AGENT', 'Analizando respuesta de cotización');
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 7: Buyer acepta o rechaza cotización
  // ──────────────────────────────────────────────
  reviewActualQuote(orderId: string, quoteId: string, buyerAgentId: string, acceptable: boolean, notes: string): Order {
    const order = this.getOrderOrThrow(orderId);
    order.quoteAcceptable = acceptable;
    const quote = order.quotes.find(q => q.id === quoteId);
    if (quote) {
      quote.status = acceptable ? 'ACEPTADA' : 'RECHAZADA';
      quote.updatedAt = new Date();
      if (acceptable) order.selectedQuoteId = quoteId;
    }
    const newStatus: OrderStatus = acceptable ? 'PREPARACION_PEDIDO' : 'PREPARACION_COTIZACION_ACTUAL';
    this.transition(order, newStatus, buyerAgentId, 'BUYER_AGENT', notes);
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 8: Buyer prepara pedido
  // ──────────────────────────────────────────────
  prepareOrder(orderId: string, buyerAgentId: string): Order {
    const order = this.getOrderOrThrow(orderId);
    this.transition(order, 'REVISION_PEDIDO', buyerAgentId, 'BUYER_AGENT', 'Pedido preparado, enviando a revisión de vendedor');
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 9: Seller revisa pedido
  // ──────────────────────────────────────────────
  sellerReviewOrder(orderId: string, sellerId: string, acceptable: boolean, notes: string): Order {
    const order = this.getOrderOrThrow(orderId);
    order.orderAcceptable = acceptable;
    const newStatus: OrderStatus = acceptable ? 'CUMPLIMIENTO_PEDIDO' : 'PREPARACION_PEDIDO';
    this.transition(order, newStatus, sellerId, 'SELLER', notes);
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 10: Fulfill order → Prepare invoice
  // ──────────────────────────────────────────────
  fulfillOrder(orderId: string, sellerId: string): Order {
    const order = this.getOrderOrThrow(orderId);
    this.transition(order, 'PREPARACION_FACTURA', sellerId, 'SELLER', 'Pedido en proceso de cumplimiento');
    return order;
  }

  prepareInvoice(orderId: string, sellerId: string): Order {
    const order = this.getOrderOrThrow(orderId);
    const quote = order.quotes.find(q => q.id === order.selectedQuoteId);
    const invoice: Invoice = {
      id: `INV-${Date.now()}`,
      orderId,
      quoteId: order.selectedQuoteId || '',
      buyerName: order.buyerAgentName,
      items: quote?.items || order.items,
      subtotal: quote?.subtotal || order.totalAmount,
      tax: quote?.tax || 0,
      total: quote?.total || order.totalAmount,
      status: 'PENDIENTE',
      issuedAt: new Date()
    };
    order.invoice = invoice;
    this.transition(order, 'RECIBIR_PAGO', sellerId, 'SELLER', 'Factura preparada');
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 11: Recibir pago del cliente
  // ──────────────────────────────────────────────
  receivePayment(orderId: string, sellerId: string): Order {
    const order = this.getOrderOrThrow(orderId);
    if (order.invoice) {
      order.invoice.status = 'PAGADA';
      order.invoice.paidAt = new Date();
    }
    this.transition(order, 'PRODUCTO_RECIBIDO', sellerId, 'SELLER', 'Pago recibido del cliente');
    return order;
  }

  // ──────────────────────────────────────────────
  // PASO 12: Receive Agent confirma producto recibido
  // ──────────────────────────────────────────────
  confirmProductReceived(orderId: string, receiveAgentId: string, deliveryAddress: string): Order {
    const order = this.getOrderOrThrow(orderId);
    order.receiveAgentId = receiveAgentId;
    const deliveryNote: DeliveryNote = {
      id: `DEL-${Date.now()}`,
      orderId,
      items: order.items,
      deliveryAddress,
      estimatedDate: new Date(),
      actualDate: new Date(),
      status: 'ENTREGADO',
      notes: 'Producto recibido y confirmado'
    };
    order.deliveryNote = deliveryNote;
    this.transition(order, 'COMPLETADO', receiveAgentId, 'RECEIVE_AGENT', 'Producto recibido. Pedido completado.');
    return order;
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────
  getAllOrders(): Order[] { return [...this.orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); }
  getOrderById(id: string): Order | undefined { return this.orders.find(o => o.id === id); }
  getAllUsers(): User[] { return this.users; }
  getUsersByRole(role: UserRole): User[] { return this.users.filter(u => u.role === role); }

  getDashboardStats() {
    return {
      totalOrders: this.orders.length,
      pendingOrders: this.orders.filter(o => !['COMPLETADO', 'CANCELADO'].includes(o.status)).length,
      completedOrders: this.orders.filter(o => o.status === 'COMPLETADO').length,
      cancelledOrders: this.orders.filter(o => o.status === 'CANCELADO').length,
      totalRevenue: this.orders.filter(o => o.status === 'COMPLETADO').reduce((s, o) => s + (o.invoice?.total || o.totalAmount), 0),
      pendingQuotes: this.orders.filter(o => ['SOLICITUD_COTIZACION', 'PREPARACION_COTIZACION_ACTUAL', 'REVISION_COTIZACION_ACTUAL'].includes(o.status)).length,
      pendingDeliveries: this.orders.filter(o => o.status === 'PRODUCTO_RECIBIDO').length,
    };
  }

  private getOrderOrThrow(id: string): Order {
    const o = this.orders.find(o => o.id === id);
    if (!o) throw new Error(`Pedido ${id} no encontrado`);
    return o;
  }

  private transition(order: Order, newStatus: OrderStatus, userId: string, role: UserRole, notes: string): void {
    const entry: OrderHistoryEntry = {
      id: `HIS-${Date.now()}`,
      orderId: order.id,
      action: `${order.status} → ${newStatus}`,
      fromStatus: order.status,
      toStatus: newStatus,
      performedBy: userId,
      performedByRole: role,
      timestamp: new Date(),
      notes
    };
    order.history.push(entry);
    order.status = newStatus;
    order.updatedAt = new Date();
  }

  private addHistory(order: Order, from: OrderStatus, to: OrderStatus, userId: string, role: UserRole, notes: string): void {
    order.history.push({
      id: `HIS-${Date.now()}`,
      orderId: order.id,
      action: notes,
      fromStatus: from,
      toStatus: to,
      performedBy: userId,
      performedByRole: role,
      timestamp: new Date(),
      notes
    });
  }

  private seedData(): void {
    this.users = [
      { id: 'U001', name: 'Carlos Martínez', role: 'SHIPPING_OFFICE', email: 'carlos@camilosistem.com', createdAt: new Date() },
      { id: 'U002', name: 'Ana López', role: 'BUYER_AGENT', email: 'ana@camilosistem.com', createdAt: new Date() },
      { id: 'U003', name: 'Roberto Silva', role: 'SUPERVISOR', email: 'roberto@camilosistem.com', createdAt: new Date() },
      { id: 'U004', name: 'María González', role: 'SELLER', email: 'maria@camilosistem.com', createdAt: new Date() },
      { id: 'U005', name: 'Juan Pérez', role: 'RECEIVE_AGENT', email: 'juan@camilosistem.com', createdAt: new Date() },
    ];

    // Seed some sample orders
    const sampleItems = [
      { id: 'I001', productId: 'P001', productName: 'Laptop Dell XPS', quantity: 2, unitPrice: 1200, totalPrice: 2400 },
      { id: 'I002', productId: 'P002', productName: 'Monitor 27"', quantity: 3, unitPrice: 350, totalPrice: 1050 },
    ];
    const o1 = this.prepareRequisition('U001', sampleItems, 'Pedido urgente para oficina central');
    this.prepareRequestForQuote(o1.id, 'U002', 'Ana López', false);
    this.sellerDecideToQuote(o1.id, 'U004', true);
    this.prepareActualQuote(o1.id, 'U004', sampleItems, 16, 15, 'Cotización con descuento por volumen');
    this.analyzeQuoteResponse(o1.id, 'U002');

    const o2Items = [{ id: 'I003', productId: 'P003', productName: 'Teclado Mecánico', quantity: 5, unitPrice: 80, totalPrice: 400 }];
    const o2 = this.prepareRequisition('U001', o2Items, 'Pedido mensual de insumos');
    this.prepareRequestForQuote(o2.id, 'U002', 'Ana López', true);
    this.supervisorApprove(o2.id, 'U003', true, 'Aprobado. Dentro del presupuesto.');
    this.sellerDecideToQuote(o2.id, 'U004', true);
    this.prepareActualQuote(o2.id, 'U004', o2Items, 16, 30, 'Cotización estándar');
    this.analyzeQuoteResponse(o2.id, 'U002');
    this.reviewActualQuote(o2.id, o2.quotes[0].id, 'U002', true, 'Cotización aceptada');
    this.prepareOrder(o2.id, 'U002');
    this.sellerReviewOrder(o2.id, 'U004', true, 'Pedido aceptado por el vendedor');
    this.fulfillOrder(o2.id, 'U004');
    this.prepareInvoice(o2.id, 'U004');
    this.receivePayment(o2.id, 'U004');
    this.confirmProductReceived(o2.id, 'U005', 'Calle 123, Bogotá');
  }
}
