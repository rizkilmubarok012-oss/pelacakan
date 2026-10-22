/* Khusus untuk auth.html */
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

tabLogin.onclick = () => {
  loginForm.style.display = ''; registerForm.style.display = 'none';
  tabLogin.className = 'btn btn-sm'; tabRegister.className = 'btn btn-sm btn-ghost';
};
tabRegister.onclick = () => {
  loginForm.style.display = 'none'; registerForm.style.display = '';
  tabRegister.className = 'btn btn-sm'; tabLogin.className = 'btn btn-sm btn-ghost';
};

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Memproses...';
  try {
    const f = new FormData(e.target);
    const d = await API.call('login', {
      email: f.get('email').trim(),
      password: f.get('password')
    });
    API.setToken(d.token);
    sessionStorage.clear();
    showToast('Login berhasil', 'success');
    setTimeout(() => location.replace('app.html'), 400);
  } catch (err) {
    showToast(err.message, 'error');
  } finally { btn.disabled = false; btn.textContent = 'Masuk'; }
});

registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Memproses...';
  try {
    const f = new FormData(e.target);
    await API.call('register', Object.fromEntries(f.entries()));
    showToast('Pendaftaran berhasil, tunggu verifikasi pengurus', 'success');
    registerForm.reset();
    tabLogin.click();
  } catch (err) {
    showToast(err.message, 'error');
  } finally { btn.disabled = false; btn.textContent = 'Daftar'; }
});