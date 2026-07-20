import { create } from 'zustand';
import type { Product, Category, Coupon } from '~/lib/types';
import { fetchProducts, fetchCategories, fetchCoupons } from '~/lib/supabase';

export interface FilterState {
  category: string | null;
  subcategory: string | null;
  availability: 'all' | 'available';
  size: string[] | null;
}

interface ProductState {
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  loading: boolean;
  init: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  getNormalizedProducts: () => Product[];
  getFilteredProducts: (filters: FilterState) => Product[];
  getSubcategories: (slug: string) => Category[];
  isParentCategory: (slug: string) => boolean;
}

function normalizeProduct(raw: Product, categories: Category[]): Product {
  const base: Product = {
    ...raw,
    category: raw.category_id
      ? categories.find((c) => String(c.id) === String(raw.category_id))?.slug || ''
      : '',
    custom_sizes: raw.custom_sizes || '',
  };

  const cs = base.custom_sizes ?? '';
  const hasCustom = typeof cs === 'string' ? cs.trim().length > 0 : false;

  if (raw.warehouses && raw.warehouses.length > 0 && hasCustom) {
    const stockMap: Record<string, number> = {};
    for (const wh of raw.warehouses) {
      for (const item of wh.items) {
        stockMap[item.size] = (stockMap[item.size] || 0) + (item.stock || 0);
      }
    }
    const variants = Object.entries(stockMap).map(([size, stock]) => ({
      id: 0,
      size,
      stock,
    }));
    return { ...base, variants, product_variants: variants };
  }

  return {
    ...base,
    variants: (raw.product_variants || []).map((v) => ({
      id: v.id,
      size: v.size,
      stock: v.stock,
    })),
  };
}

function getTotalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

function getAllCategorySlugs(slug: string, categories: Category[]): string[] {
  const slugs = [slug];
  const cat = categories.find((c) => c.slug === slug);
  if (cat) {
    const subs = categories.filter((c) => String(c.parent_id) === String(cat.id));
    for (const sub of subs) slugs.push(sub.slug);
  }
  return slugs;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  coupons: [],
  loading: false,

  init: async () => {
    set({ loading: true });
    try {
      const [prodData, catData, coupData] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchCoupons(),
      ]);
      const categories = catData.map((c) => ({
        ...c,
        slug: c.slug || c.id,
        hidden: c.hidden || false,
        parent_id: c.parent_id || null,
      }));
      const normalized = (prodData || []).map((p) => normalizeProduct(p, categories));
      set({
        categories,
        coupons: coupData || [],
        products: normalized,
      });
    } catch (err) {
      console.error('Failed to init products:', err);
    } finally {
      set({ loading: false });
    }
  },

  refreshProducts: async () => {
    try {
      const prodData = await fetchProducts();
      const { categories } = get();
      if (prodData && prodData.length > 0) {
        set({ products: prodData.map((p) => normalizeProduct(p, categories)) });
      }
    } catch (err) {
      console.error('Failed to refresh products:', err);
    }
  },

  getNormalizedProducts: () => {
    const { products } = get();
    return products;
  },

  getFilteredProducts: (filters) => {
    const { products, categories } = get();
    const hiddenCats = categories.filter((c) => c.hidden);
    const hiddenSlugs = new Set<string>();
    for (const hc of hiddenCats) {
      hiddenSlugs.add(hc.slug);
      const subs = categories.filter((c) => String(c.parent_id) === String(hc.id));
      for (const sub of subs) hiddenSlugs.add(sub.slug);
    }

    let result = products.filter((p) => !hiddenSlugs.has(p.category || ''));

    if (filters.category) {
      const catSlugs = getAllCategorySlugs(filters.category, categories);
      result = result.filter((p) => catSlugs.includes(p.category || ''));
    }

    if (filters.subcategory) {
      result = result.filter((p) => p.category === filters.subcategory);
    }

    if (filters.availability === 'available') {
      result = result.filter((p) => getTotalStock(p) > 0);
    }

    if (filters.size && filters.size.length > 0) {
      result = result.filter((p) =>
        filters.size!.some((s) => {
          const variant = p.variants.find((v) => v.size === s);
          return variant && variant.stock > 0;
        }),
      );
    }

    return result;
  },

  getSubcategories: (slug) => {
    const { categories } = get();
    const cat = categories.find((c) => c.slug === slug);
    if (!cat) return [];
    return categories.filter((c) => String(c.parent_id) === String(cat.id));
  },

  isParentCategory: (slug) => {
    const { getSubcategories } = get();
    return getSubcategories(slug).length > 0;
  },
}));
