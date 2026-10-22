/* ============ EVENT NOTIFICATION POPUP ============ */
const EventNotif = {
  _popupShown: false,
  _pollTimer: null,
  _dismissed: [],

  async init() {
    if (this._pollTimer) return;
    try {
      const r = await API.call('getDismissedEvents');
      this._dismissed = r.dismissed || [];
    } catch {}
    this.check();
    this._pollTimer = setInterval(() => this.check(), EVENT_POLL_MS);
  },

  async check() {
    try {
      const r = await API.call('eventNotifications');
      const list = (r.events || []).filter(ev => this._dismissed.indexOf(ev.id) === -1);
      if (!list.length) { this.removeBadge(); return; }
      this.showBadge(list.length);
      if (!this._popupShown) this.showPopup(list);
    } catch {}
  },

  showBadge(n) {
    let b = document.getElementById('notifBadge');
    if (!b) {
      b = document.createElement('div');
      b.id = 'notifBadge';
      b.className = 'notif-badge';
      b.innerHTML = '<i data-lucide="bell"></i><span class="count"></span>';
      b.onclick = () => this.forceOpen();
      document.body.appendChild(b);
      if (window.lucide) lucide.createIcons();
    }
    b.querySelector('.count').textContent = n;
    b.style.display = 'flex';
  },

  removeBadge() {
    const b = document.getElementById('notifBadge');
    if (b) b.remove();
  },

  async forceOpen() {
    try {
      const r = await API.call('eventNotifications');
      const list = (r.events || []).filter(ev => this._dismissed.indexOf(ev.id) === -1);
      if (!list.length) { showToast('Tidak ada pengingat acara', 'info'); return; }
      this.showPopup(list, true);
    } catch (e) { showToast(e.message, 'error'); }
  },

  showPopup(list) {
    const old = document.getElementById('eventPopupOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'eventPopupOverlay';
    overlay.className = 'event-popup-overlay active';

    const items = list.map(ev => {
      const d = new Date(ev.start_at);
      const time = d.toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long',
        year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const tagCls = ev.days_left === 0 ? 'today' : '';
      return `<div class="event-popup-item">
        <span class="tag ${tagCls}">${escapeHtml(ev.tag)}</span>
        <h4>${escapeHtml(ev.title)}</h4>
        <div class="meta" style="margin-top:4px"><i data-lucide="clock"></i> ${time}</div>
        ${ev.location ? `<div class="meta" style="margin-top:2px"><i data-lucide="map-pin"></i> ${escapeHtml(ev.location)}</div>` : ''}
      </div>`;
    }).join('');

    overlay.innerHTML = `
      <div class="event-popup">
        <div class="event-popup-header">
          <button class="close-x" data-close>×</button>
          <div class="bell"><i data-lucide="bell"></i></div>
          <h3>Pengingat Acara</h3>
          <p>${list.length} acara mendatang yang perlu Anda ketahui</p>
        </div>
        <div class="event-popup-body">${items}</div>
        <div class="event-popup-footer">
          <button class="btn btn-ghost" data-dismiss style="flex:1">Nanti</button>
          <button class="btn" data-goto style="flex:1">Lihat Kalender</button>
        </div>
      </div>`;

    const close = () => { overlay.remove(); this._popupShown = false; };
    overlay.querySelector('[data-close]').onclick = close;
    overlay.querySelector('[data-dismiss]').onclick = async () => {
      for (const ev of list) {
        try { await API.call('dismissEventNotification', { event_id: ev.id }); } catch {}
        if (this._dismissed.indexOf(ev.id) === -1) this._dismissed.push(ev.id);
      }
      this.removeBadge();
      close();
    };
    overlay.querySelector('[data-goto]').onclick = () => {
      location.hash = '#calendar';
      close();
    };
    overlay.onclick = e => { if (e.target === overlay) close(); };

    document.body.appendChild(overlay);
    this._popupShown = true;
    if (window.lucide) lucide.createIcons();
  }
};