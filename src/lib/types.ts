export interface Product {
  id: number;
  category_id?: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price: number;
  images: string[];
  custom_sizes?: string;
  warehouses?: Warehouse[];
  product_variants?: ProductVariant[];
  variants: ProductVariant[];
  created_at?: string;
  category?: string;
}

export interface ProductVariant {
  id?: number;
  product_id?: number;
  size: string;
  stock: number;
}

export interface Warehouse {
  name: string;
  items: { size: string; stock: number }[];
}

export interface Category {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  image?: string;
  hidden: boolean;
  parent_id: string | null;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  auto_apply: boolean;
  show_countdown?: boolean;
  conditions: CouponConditions | string;
  active: boolean;
  label_ar: string;
  label_en: string;
  maxUses?: number;
  expires_at?: string;
}

export interface CouponConditions {
  minItems?: number | null;
  minAmount?: number | null;
  category?: string | null;
  size?: string | null;
  sizes?: string[];
}

export interface CartItem {
  productId: number;
  size: string;
  quantity: number;
  price: number;
  name_ar: string;
  name_en: string;
  category: string;
  image: string;
}

export interface Order {
  id: number;
  user_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  notes?: string;
  items?: OrderItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  status: string;
  created_at: string;
}

export interface OrderItem {
  product_id: number;
  size: string;
  quantity: number;
  price: number;
  name_ar?: string;
  name_en?: string;
  category?: string;
  image?: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  role: 'admin' | 'staff' | 'user';
  created_at?: string;
}

export interface Session {
  user: { id: string; email?: string; user_metadata?: Record<string, any> };
  access_token: string;
}

export interface HeroSlide {
  id: number;
  title_ar: string;
  title_en: string;
  subtitle_ar?: string;
  subtitle_en?: string;
  image: string;
  link?: string;
  active?: boolean;
  order?: number;
}

export interface PopupSettings {
  enabled: boolean;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  image: string;
  buttonText_ar: string;
  buttonText_en: string;
  buttonLink: string;
}

export interface FabSettings {
  enabled: boolean;
  phoneNumber: string;
  whatsappNumber: string;
  message_ar: string;
  message_en: string;
}
