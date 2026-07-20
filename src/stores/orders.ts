import { create } from 'zustand';
import type { Order } from '~/lib/types';
import {
  fetchOrders,
  fetchMyOrders,
  createCheckoutOrder,
  updateOrderStatus,
} from '~/lib/supabase';

interface PlaceOrderParams {
  items: { product_id: number; size: string; quantity: number }[];
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_address: string;
  notes: string;
  coupon_code: string | null;
  discount: number;
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  loadOrders: (userId?: string) => Promise<void>;
  loadAllOrders: () => Promise<void>;
  placeOrder: (params: PlaceOrderParams) => Promise<Order>;
  updateStatus: (id: number, status: string) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  loading: false,

  loadOrders: async (userId) => {
    set({ loading: true });
    try {
      if (userId) {
        const data = await fetchMyOrders(userId);
        set({ orders: data || [] });
      } else {
        set({ orders: [] });
      }
    } catch {
      set({ orders: [] });
    } finally {
      set({ loading: false });
    }
  },

  loadAllOrders: async () => {
    set({ loading: true });
    try {
      const data = await fetchOrders();
      set({ orders: data || [] });
    } catch {
      set({ orders: [] });
    } finally {
      set({ loading: false });
    }
  },

  placeOrder: async (params) => {
    const result = await createCheckoutOrder({
      p_items: params.items,
      p_shipping_name: params.shipping_name,
      p_shipping_phone: params.shipping_phone,
      p_shipping_city: params.shipping_city,
      p_shipping_address: params.shipping_address,
      p_notes: params.notes,
      p_coupon_code: params.coupon_code,
      p_discount: params.discount,
    });

    const newOrder: Order = {
      id: result.id,
      customer_name: params.shipping_name,
      customer_phone: params.shipping_phone,
      customer_address: params.shipping_address,
      customer_city: params.shipping_city,
      notes: params.notes,
      subtotal: params.items.reduce((sum, i) => sum + i.quantity, 0),
      discount: params.discount,
      total: result.total,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    set((state) => ({ orders: [newOrder, ...state.orders] }));
    return newOrder;
  },

  updateStatus: async (id, status) => {
    const updated = await updateOrderStatus(id, status);
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, ...updated } : o)),
    }));
  },
}));
