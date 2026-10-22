/* ============ UI: SIDEBAR, BOTTOM NAV & KOMPONEN ============ */
const UI = {
  renderSidebar() {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const current = (location.hash || '#dashboard').slice(1);

    sb.innerHTML = `
      <div class="brand">
        <img src="assets/img/logo.png" alt="Logo"
             onerror="this.style.background='#A8E6CF';this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'">
        <div><h1>Alumni PP Ainul Hasan</h1><small>Satu Pesantren, Satu Silaturahmi</small></div>
      </div>
      <nav class="nav">
        ${MENU.map(m => {
          if (m.adminOnly && !Store.isAdmin()) return '';
          const active = current === m.id ? 'active' : '';
          return `<a href="#${m.id}" class="${active}" data-menu="${m.id}">
            <i data-lucide="${m.icon}"></i><span>${m.label}</span></a>`;
        }).join('')}
        <a href="#" data-menu="logout"><i data-lucide="log-out"></i><span>Keluar</span></a>
      </nav>`;

    const bn = document.getElementById('bottomNav');
    if (bn) {
      const items = MENU.filter(m => !m.adminOnly || Store.isAdmin());
      bn.innerHTML = items.map(m => {
        const active = current === m.id ? 'active' : '';
        return `<a href="#${m.id}" class="${active}">
          <i data-lucide="${m.icon}"></i><span>${m.label}</span></a>`;
      }).join('') + `<a href="#" data-menu="logout">
        <i data-lucide="log-out"></i><span>Keluar</span></a>`;
    }

    if (window.lucide) lucide.createIcons();

    if (!sb._bound) {
      sb.addEventListener('click', e => {
        const a = e.target.closest('[data-menu]');
        if (!a) return;
        e.preventDefault();
        if (a.dataset.menu === 'logout') return Store.logout();
        location.hash = '#' + a.dataset.menu;
        if (window.innerWidth <= 900) {
          sb.classList.remove('open');
          const ov = document.getElementById('overlay');
          if (ov) ov.classList.remove('active');
        }
      });
      sb._bound = true;
    }

    if (bn && !bn._bound) {
      bn.addEventListener('click', e => {
        const a = e.target.closest('[data-menu]');
        if (!a) return;
        if (a.dataset.menu === 'logout') { e.preventDefault(); return Store.logout(); }
      });
      bn._bound = true;
    }

    if (!document.querySelector('.hamburger')) {
      const btn = document.createElement('button');
      btn.className = 'hamburger';
      btn.innerHTML = '<i data-lucide="menu"></i>';
      btn.onclick = () => {
        sb.classList.toggle('open');
        const ov = document.getElementById('overlay');
        if (ov) ov.classList.toggle('active');
      };
      const main = document.getElementById('main');
      if (main) main.prepend(btn);
      if (window.lucide) lucide.createIcons();
    }
    const ov = document.getElementById('overlay');
    if (ov) ov.onclick = () => {
      sb.classList.remove('open');
      ov.classList.remove('active');
    };
  },

  topbar(title, subtitle = '', extra = '') {
    return `
      <div class="topbar">
        <div>
          <h2>${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="sub">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${extra}
      </div>`;
  },

  loading() {
    return '<div class="skeleton" style="height:120px;margin-bottom:14px"></div>'.repeat(3);
  },

  empty(msg) {
    return `<div class="empty">${escapeHtml(msg)}</div>`;
  }
};