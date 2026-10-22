/* ============ API LAYER ============ */
const API = {
  getToken() { return localStorage.getItem(TOKEN_KEY) || ''; },
  setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); },

  async call(action, payload = {}) {
    const body = JSON.stringify({ action, token: this.getToken(), ...payload });
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.success) {
        if (json.code === 401) this.setToken('');
        throw new Error(json.error || 'Gagal');
      }
      return json.data;
    } catch (err) {
      console.error('[API]', action, err);
      throw err;
    }
  }
};