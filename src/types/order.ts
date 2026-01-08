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
  order_items?: OrderItem[];
}
