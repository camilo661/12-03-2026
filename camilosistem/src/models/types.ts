// ============================================================
// CAMILOSISTEM - Sistema de Gestión de Pedidos en Tiendas
// Modelos TypeScript basados en el diagrama de procesos
// ============================================================

export type OrderStatus =
  | 'REQUISICION_PREPARADA'
  | 'SOLICITUD_COTIZACION'
  | 'EVALUACION_COTIZACION'
  | 'COTIZACION_EN_REVISION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'PREPARACION_COTIZACION_ACTUAL'
  | 'ANALISIS_RESPUESTA_COTIZACION'
  | 'REVISION_COTIZACION_ACTUAL'
  | 'COTIZACION_ACEPTABLE'
  | 'PREPARACION_PEDIDO'
  | 'REVISION_PEDIDO'
  | 'PEDIDO_ACEPTABLE'
  | 'CUMPLIMIENTO_PEDIDO'
  | 'PREPARACION_FACTURA'
  | 'RECIBIR_PAGO'
  | 'PRODUCTO_RECIBIDO'
  | 'COMPLETADO'
  | 'CANCELADO';

export type UserRole =
  | 'SHIPPING_OFFICE'
  | 'BUYER_AGENT'
  | 'SUPERVISOR'
  | 'SELLER'
  | 'RECEIVE_AGENT';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quote {
  id: string;
  orderId: string;
  sellerId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: Date;
  status: 'PENDIENTE' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'REVISADA';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  orderId: string;
  quoteId: string;
  buyerName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'PENDIENTE' | 'PAGADA' | 'CANCELADA';
  issuedAt: Date;
  paidAt?: Date;
}

export interface DeliveryNote {
  id: string;
  orderId: string;
  items: OrderItem[];
  deliveryAddress: string;
  estimatedDate: Date;
  actualDate?: Date;
  status: 'PENDIENTE' | 'EN_TRANSITO' | 'ENTREGADO';
  notes: string;
}

export interface Order {
  id: string;
  requisitionNumber: string;
  status: OrderStatus;
  buyerAgentId: string;
  buyerAgentName: string;
  shippingOfficeId: string;
  supervisorId?: string;
  sellerId?: string;
  receiveAgentId?: string;
  items: OrderItem[];
  quotes: Quote[];
  selectedQuoteId?: string;
  invoice?: Invoice;
  deliveryNote?: DeliveryNote;
  needsReview: boolean;
  supervisorApproved?: boolean;
  quoteAcceptable?: boolean;
  orderAcceptable?: boolean;
  totalAmount: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  history: OrderHistoryEntry[];
}

export interface OrderHistoryEntry {
  id: string;
  orderId: string;
  action: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  performedBy: string;
  performedByRole: UserRole;
  timestamp: Date;
  notes: string;
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  pendingQuotes: number;
  pendingDeliveries: number;
}
