let currentUser = null;
let currentProfile = null;

async function initAuth() {
  if (typeof window.getSession !== 'function') return;
  const session = await window.getSession();
  if (session?.user) {
    currentUser = session.user;
    currentProfile = typeof window.getProfile === 'function' ? await window.getProfile(session.user.id) : null;
    if (!currentProfile) {
      currentProfile = null;
    }
    if (currentProfile && session.user.email?.toLowerCase() === 'admin@gmail.com') {
      currentProfile.role = 'admin';
    }
  }
  updateAuthUI();
}

function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const userMenu = document.getElementById('userMenu');
  const userName = document.getElementById('userName');

  const isLoggedIn = !!currentUser;
  const isAdmin = ['admin', 'staff'].includes(currentProfile?.role);

  if (isLoggedIn) {
    if (loginBtn) loginBtn.classList.add('hidden');
    if (userMenu) {
      userMenu.classList.remove('hidden');
      if (userName) userName.textContent = currentProfile?.full_name || currentUser.email?.split('@')[0] || 'User';
    }
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
  }

  // Toggle "My Orders" links (visible only when logged in) across all pages
  document.querySelectorAll('[data-i18n="navOrders"], [data-i18n="myOrders"]').forEach(el => {
    el.classList.toggle('hidden', !isLoggedIn);
  });

  // Toggle "Dashboard" links (visible only for admin/staff) across all pages
  document.querySelectorAll('[data-i18n="navDashboard"], [id="adminLink"], [id="adminLinkDropdown"]').forEach(el => {
    el.classList.toggle('hidden', !isAdmin);
  });
}

function openLoginModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  document.getElementById('authFormTitle').textContent = currentLang === 'ar' ? 'تسجيل الدخول' : 'Login';
  document.getElementById('authSubmitBtn').textContent = currentLang === 'ar' ? 'دخول' : 'Login';
  document.getElementById('authToggleText').innerHTML =
    currentLang === 'ar'
      ? 'ليس لديك حساب؟ <a href="#" onclick="openSignupModal()" class="text-[#F3B423] font-bold">إنشاء حساب</a>'
      : 'Don\'t have an account? <a href="#" onclick="openSignupModal()" class="text-[#F3B423] font-bold">Sign up</a>';
  document.getElementById('authNameField')?.classList.add('hidden');
  document.getElementById('authPhoneField')?.classList.add('hidden');
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function openSignupModal() {
  closeAuthModal();
  const modal = document.getElementById('authModal');
  if (!modal) return;
  document.getElementById('authFormTitle').textContent = currentLang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account';
  document.getElementById('authSubmitBtn').textContent = currentLang === 'ar' ? 'إنشاء حساب' : 'Sign Up';
  document.getElementById('authToggleText').innerHTML =
    currentLang === 'ar'
      ? 'لديك حساب بالفعل؟ <a href="#" onclick="openLoginModal()" class="text-[#F3B423] font-bold">تسجيل دخول</a>'
      : 'Already have an account? <a href="#" onclick="openLoginModal()" class="text-[#F3B423] font-bold">Login</a>';
  document.getElementById('authNameField')?.classList.remove('hidden');
  document.getElementById('authPhoneField')?.classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authName').value = '';
  document.getElementById('authPhone').value = '';
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  document.body.style.overflow = '';
}

async function handleAuthSubmit() {
  const email = document.getElementById('authEmail')?.value.trim();
  const password = document.getElementById('authPassword')?.value;
  const name = document.getElementById('authName')?.value.trim();
  const phone = document.getElementById('authPhone')?.value.trim();
  const errorEl = document.getElementById('authError');
  const isLogin = document.getElementById('authNameField')?.classList.contains('hidden');

  errorEl.classList.add('hidden');

  if (!email || !password) {
    errorEl.textContent = currentLang === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    if (isLogin) {
      if (typeof window.signIn !== 'function') throw new Error(currentLang === 'ar' ? 'خدمة تسجيل الدخول غير متاحة' : 'Sign in unavailable');
      await window.signIn(email, password);
    } else {
      if (!name) {
        errorEl.textContent = currentLang === 'ar' ? 'يرجى إدخال الاسم' : 'Please enter your name';
        errorEl.classList.remove('hidden');
        return;
      }
      if (typeof window.signUp !== 'function') throw new Error(currentLang === 'ar' ? 'خدمة إنشاء الحساب غير متاحة' : 'Sign up unavailable');
      const signUpData = await window.signUp(email, password, name, phone);
      if (signUpData?.error) throw new Error(signUpData.error_description || signUpData.msg || signUpData.error);
      if (!signUpData?.access_token) {
        if (signUpData?.user?.identities?.length === 0) {
          alert(currentLang === 'ar'
            ? 'تم إنشاء الحساب! يرجى تفعيل البريد الإلكتروني من خلال الرابط المرسل إلى بريدك.'
            : 'Account created! Please check your email to confirm your account.');
          closeAuthModal();
          return;
        }
        throw new Error(currentLang === 'ar' ? 'فشل إنشاء الحساب' : 'Sign up failed');
      }
    }

    // Refresh auth state
    await initAuth();
    closeAuthModal();
    clearAuthForm();
    alert(currentLang === 'ar' ? 'تم إنشاء الحساب بنجاح! مرحباً بك' : 'Account created successfully! Welcome');
    if (typeof renderCart === 'function') renderCart();
    if (typeof renderProducts === 'function') renderProducts();

  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

async function handleLogout() {
  if (typeof window.signOut !== 'function') {
    currentUser = null;
    currentProfile = null;
    updateAuthUI();
    return;
  }
  await window.signOut();
  currentUser = null;
  currentProfile = null;
  updateAuthUI();
  if (typeof renderCart === 'function') renderCart();
}

// Explicit global exports
window.openLoginModal = openLoginModal;
window.openSignupModal = openSignupModal;
window.closeAuthModal = closeAuthModal;
window.handleAuthSubmit = handleAuthSubmit;
window.handleLogout = handleLogout;
window.initAuth = initAuth;
