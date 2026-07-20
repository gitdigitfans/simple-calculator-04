import { create } from 'zustand';
import type { HeroSlide, PopupSettings, FabSettings } from '~/lib/types';
import { fetchSetting, upsertSetting } from '~/lib/supabase';

interface SettingsState {
  heroSlides: HeroSlide[];
  popup: PopupSettings | null;
  fab: FabSettings | null;
  loadHeroSlides: () => Promise<void>;
  saveHeroSlides: (slides: HeroSlide[]) => Promise<void>;
  loadPopup: () => Promise<void>;
  savePopup: (popup: PopupSettings) => Promise<void>;
  loadFab: () => Promise<void>;
  saveFab: (fab: FabSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  heroSlides: [],
  popup: null,
  fab: null,

  loadHeroSlides: async () => {
    try {
      const data = await fetchSetting('hero_slides');
      if (Array.isArray(data)) {
        set({ heroSlides: data });
      }
    } catch (err) {
      console.error('Failed to load hero slides:', err);
    }
  },

  saveHeroSlides: async (slides) => {
    await upsertSetting('hero_slides', slides);
    set({ heroSlides: slides });
  },

  loadPopup: async () => {
    try {
      const data = await fetchSetting('popup');
      if (data && typeof data === 'object') {
        set({ popup: data as PopupSettings });
      }
    } catch (err) {
      console.error('Failed to load popup settings:', err);
    }
  },

  savePopup: async (popup) => {
    await upsertSetting('popup', popup);
    set({ popup });
  },

  loadFab: async () => {
    try {
      const data = await fetchSetting('fab');
      if (data && typeof data === 'object') {
        set({ fab: data as FabSettings });
      }
    } catch (err) {
      console.error('Failed to load fab settings:', err);
    }
  },

  saveFab: async (fab) => {
    await upsertSetting('fab', fab);
    set({ fab });
  },
}));
