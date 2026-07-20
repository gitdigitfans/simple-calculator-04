import { create } from 'zustand';
import type { Session, Profile } from '~/lib/types';
import {
  getSession,
  getProfile,
  signIn as supaSignIn,
  signUp as supaSignUp,
  signOut as supaSignOut,
} from '~/lib/supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  init: async () => {
    set({ loading: true });
    try {
      const session = await getSession();
      if (session?.user) {
        let profile = await getProfile(session.user.id);
        if (profile && session.user.email?.toLowerCase() === 'admin@gmail.com') {
          profile = { ...profile, role: 'admin' };
        }
        set({ session, profile });
      } else {
        set({ session: null, profile: null });
      }
    } catch {
      set({ session: null, profile: null });
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const result = await supaSignIn(email, password);
    if (result?.user) {
      const session: Session = { user: result.user, access_token: result.session.access_token };
      let profile = await getProfile(result.user.id);
      if (profile && result.user.email?.toLowerCase() === 'admin@gmail.com') {
        profile = { ...profile, role: 'admin' };
      }
      set({ session, profile });
    }
  },

  register: async (email, password, fullName, phone) => {
    const result = await supaSignUp(email, password, fullName, phone);
    if (result?.access_token && result?.user) {
      const session: Session = { user: result.user, access_token: result.access_token };
      let profile = await getProfile(result.user.id);
      if (profile && result.user.email?.toLowerCase() === 'admin@gmail.com') {
        profile = { ...profile, role: 'admin' };
      }
      set({ session, profile });
    } else if (result?.user?.identities?.length === 0) {
      throw new Error(
        'Account created! Please check your email to confirm your account.',
      );
    }
  },

  logout: async () => {
    try {
      await supaSignOut();
    } finally {
      set({ session: null, profile: null });
    }
  },

  refreshProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    const profile = await getProfile(session.user.id);
    set({ profile });
  },
}));
