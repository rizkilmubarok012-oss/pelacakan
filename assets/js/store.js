/* ============ STATE GLOBAL ============ */
const Store = {
  user: null,
  profile: null,
  loaded: false,

  async bootstrap() {
    if (this.loaded) return this;
    const cached = sessionStorage.getItem('ainulhasan_me');
    if (cached) {
      try {
        const d = JSON.parse(cached);
        if (d && d.user) {
          this.user = d.user; this.profile = d.profile;
          this.loaded = true;
          sessionStorage.removeItem('ainulhasan_me');
          return this;
        }
      } catch {}
    }
    try {
      const d = await API.call('me');
      this.user = d.user;
      this.profile = d.profile;
    } catch {
      location.replace('auth.html');
      return this;
    }
    this.loaded = true;
    return this;
  },

  isAdmin() { return this.user && this.user.role === 'admin'; },

  async logout() {
    try { await API.call('logout'); } catch {}
    API.setToken('');
    sessionStorage.clear();
    location.replace('auth.html');
  },

  async requireAdmin() {
    await this.bootstrap();
    if (!this.isAdmin()) {
      showToast('Akses ditolak', 'error');
      setTimeout(() => location.replace('app.html#dashboard'), 600);
      return false;
    }
    return true;
  }
};