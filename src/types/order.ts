export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'received' | 'rejected';

export interface OrderItem {
  id: string;
  order_id: string;
  item: string;
  quantity: number;
  price: number;
}

export interface Order {
  order_id: string;
  customer_id: string;
  customer_name: string;
  phone_number: string;
  status: OrderStatus;
  new_order_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  received_at: string | null;
  created_at: string;
  subtotal: number;
  subtotal_with_tax: number;
  /**
   * Caller's note, printed on the kitchen ticket. Optional: the columns are
   * newer than the rows, so orders taken before the migration have neither.
   */
  special_requests?: string | null;
  /** Pickup time as the caller said it ("in 20 minutes", "around 7"). */
  pickup_time?: string | null;
  order_items?: OrderItem[];
}
