let _chart = null;

const Pages = {
  // ================= DASHBOARD =================
  async dashboard(c) {
    c.innerHTML = UI.topbar('Dashboard', 'Ringkasan data alumni') + UI.loading();
    try {
      const d = await API.call('getDashboard');
      c.innerHTML = UI.topbar('Dashboard', 'Ringkasan data alumni') + `
        <div class="grid grid-3">
          <div class="card stat"><span class="label">Total Alumni</span><span class="value">${d.totalAlumni}</span></div>
          <div class="card stat"><span class="label">Profil Lengkap</span><span class="value">${d.completeProfiles}</span></div>
          <div class="card stat"><span class="label">Acara Mendatang</span><span class="value">${d.upcomingCount}</span></div>
        </div>
        <div class="grid grid-2" style="margin-top:18px">
          <div class="card" style="height:280px"><canvas id="chart"></canvas></div>
          <div class="card"><h3>Acara Terdekat</h3>
            <p style="margin-top:8px;color:var(--muted)">${d.nextEvent ? escapeHtml(d.nextEvent.title) : 'Tidak ada'}</p></div>
        </div>`;
      if (_chart) { _chart.destroy(); _chart = null; }
      _chart = new Chart(document.getElementById('chart'), {
        type: 'bar',
        data: { labels: Object.keys(d.byYear), datasets: [{ data: Object.values(d.byYear), backgroundColor: '#56C596' }] },
        options: { plugins: { legend: { display: false } }, maintainAspectRatio: false }
      });
    } catch(e) { c.innerHTML = UI.empty(e.message); }
  },

  // ================= ALUMNI =================
  _alumniCache: null,

  async alumni(c, force = false) {
    c.innerHTML = UI.topbar('Daftar Alumni', 'Cari data teman angkatan') + `
      <div class="card" style="margin-bottom:16px">
        <input id="fQ" placeholder="Cari nama alumni..." style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd">
      </div>
      <div id="alumniGrid" class="grid grid-2"></div>`;

    const render = items => {
      const g = document.getElementById('alumniGrid');
      if (!g) return;
      if (!items.length) { g.innerHTML = UI.empty('Alumni tidak ditemukan'); return; }
      g.innerHTML = items.map(a => `
        <div class="alumni-card" onclick="Pages._detail('${a.id}')">
          ${a.photo_url ? `<img src="${a.photo_url}" loading="lazy" alt="">` : `<div class="avatar">${escapeHtml(a.full_name.charAt(0))}</div>`}
          <div class="info"><h4>${escapeHtml(a.full_name)}</h4><p>Lulus ${a.year_out || '-'}</p></div>
        </div>`).join('');
    };

    const load = async (q = '') => {
      const g = document.getElementById('alumniGrid');
      if (!g) return;
      if (!q && this._alumniCache && !force) { render(this._alumniCache); return; }
      g.innerHTML = UI.loading();
      try {
        const d = await API.call('listAlumni', { q });
        if (!q) this._alumniCache = d.items;
        render(d.items);
      } catch(e) { g.innerHTML = UI.empty(e.message); }
    };
    load();
    const inp = document.getElementById('fQ');
    if (inp) inp.oninput = debounce(e => load(e.target.value), 500);
  },

  _detail(id) {
    API.call('getAlumniDetail', { id }).then(a => {
      const box = el(`<div class="lightbox active"><div class="card" style="max-width:400px">
        <h3 style="text-align:center">${escapeHtml(a.full_name)}</h3>
        <p style="text-align:center;color:var(--muted);margin-top:6px">${escapeHtml(a.occupation || '-')} ${a.company ? 'di ' + escapeHtml(a.company) : ''}</p>
        <p style="text-align:center;color:var(--muted)">${escapeHtml(a.city || '-')}, ${escapeHtml(a.province || '-')}</p>
        ${a.bio ? `<p style="margin-top:10px">"${escapeHtml(a.bio)}"</p>` : ''}
        <button class="btn btn-ghost" style="width:100%;margin-top:14px" onclick="this.closest('.lightbox').remove()">Tutup</button>
      </div></div>`);
      box.onclick = e => { if(e.target === box) box.remove(); };
      document.body.appendChild(box);
    }).catch(e => showToast(e.message, 'error'));
  },

  // ================= KALENDER =================
  _calState: { month: null, selected: null },

  async calendar(c) {
    const now = new Date();
    if (!this._calState.month) {
      this._calState.month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }
    this._calState.selected = null;
    c.innerHTML = UI.topbar('Kalender Acara', 'Agenda kegiatan alumni') + UI.loading();

    const renderAll = async () => {
      const monthStr = this._calState.month;
      const [y, m] = monthStr.split('-').map(Number);
      const monthName = new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      let data;
      try {
        data = await API.call('calendarEvents', { month: monthStr });
      } catch (e) {
        c.innerHTML = UI.topbar('Kalender Acara', 'Agenda kegiatan alumni') + UI.empty(e.message);
        return;
      }

      const firstDay = new Date(y, m - 1, 1).getDay();
      const daysInMonth = new Date(y, m, 0).getDate();
      const todayStr = new Date().toISOString().slice(0, 10);

      const byDate = {};
      data.events.forEach(ev => {
        const d = new Date(ev.start_at);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        (byDate[key] = byDate[key] || []).push(ev);
      });

      const cells = [];
      const offset = (firstDay + 6) % 7;
      for (let i = 0; i < offset; i++) cells.push(`<div class="cal-day empty"></div>`);
      for (let d = 1; d <= daysInMonth; d++) {
        const key = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const cls = [
          'cal-day',
          key === todayStr ? 'today' : '',
          byDate[key] ? 'has-event' : '',
          this._calState.selected === key ? 'selected' : ''
        ].filter(Boolean).join(' ');
        cells.push(`<div class="${cls}" data-date="${key}">${d}</div>`);
      }

      const selected = this._calState.selected;
      let listEvents = selected ? (byDate[selected] || []) : data.events;
      const listTitle = selected
        ? 'Acara ' + new Date(selected).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Semua Acara ' + monthName;

      const listHtml = listEvents.length
        ? listEvents.map(ev => this._eventItemHtml(ev)).join('')
        : `<div class="empty">Belum ada acara</div>`;

      const upcomingHtml = data.upcoming.length
        ? `<h4 style="margin:20px 0 10px;font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Acara Berikutnya</h4>
           ${data.upcoming.map(ev => this._eventItemHtml(ev)).join('')}`
        : '';

      c.innerHTML = UI.topbar('Kalender Acara', 'Agenda kegiatan alumni') + `
        <div class="grid grid-2">
          <div class="card calendar">
            <div class="cal-toolbar">
              <h3>${monthName}</h3>
              <div class="nav-btns">
                <button class="btn btn-sm btn-ghost" data-cal-nav="-1">‹</button>
                <button class="btn btn-sm btn-ghost" data-cal-nav="0">Hari ini</button>
                <button class="btn btn-sm btn-ghost" data-cal-nav="1">›</button>
              </div>
            </div>
            <div class="cal-dow">
              <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span>
            </div>
            <div class="cal-days">${cells.join('')}</div>
          </div>
          <div class="card">
            <h3 style="margin-bottom:12px">${escapeHtml(listTitle)}</h3>
            <div class="event-list">${listHtml}</div>
            ${upcomingHtml}
          </div>
        </div>`;

      c.querySelectorAll('[data-cal-nav]').forEach(btn => {
        btn.onclick = () => {
          const dir = Number(btn.dataset.calNav);
          const [yy, mm] = this._calState.month.split('-').map(Number);
          let newDate = new Date(yy, mm - 1, 1);
          if (dir === 0) newDate = new Date();
          else newDate.setMonth(newDate.getMonth() + dir);
          this._calState.month = newDate.getFullYear() + '-' + String(newDate.getMonth() + 1).padStart(2, '0');
          this._calState.selected = null;
          renderAll();
        };
      });

      c.querySelectorAll('.cal-day[data-date]').forEach(cell => {
        cell.onclick = () => {
          const dt = cell.dataset.date;
          this._calState.selected = (this._calState.selected === dt) ? null : dt;
          renderAll();
        };
      });

      c.querySelectorAll('.event-item[data-event-id]').forEach(item => {
        item.onclick = () => Pages._detailEvent(item.dataset.eventId, byDate, data);
      });

      if (window.lucide) lucide.createIcons();
    };

    await renderAll();
  },

  _eventItemHtml(ev) {
    const d = new Date(ev.start_at);
    const day = d.getDate();
    const mon = d.toLocaleDateString('id-ID', { month: 'short' });
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `<div class="event-item" data-event-id="${ev.id}">
      <div class="date-badge"><div class="d">${day}</div><div class="m">${mon}</div></div>
      <div class="info">
        <h4>${escapeHtml(ev.title)}</h4>
        <p>${time}${ev.location ? ' · ' + escapeHtml(ev.location) : ''}</p>
      </div>
    </div>`;
  },

  _detailEvent(id, byDate, data) {
    let ev = null;
    if (byDate) {
      Object.values(byDate).forEach(list => {
        const f = list.find(x => String(x.id) === String(id));
        if (f) ev = f;
      });
    }
    if (!ev && data) {
      ev = (data.events || []).find(x => String(x.id) === String(id))
        || (data.upcoming || []).find(x => String(x.id) === String(id));
    }
    if (!ev) return showToast('Acara tidak ditemukan', 'error');

    const dt = fmtDateTime(ev.start_at);
    const box = el(`<div class="lightbox active"><div class="card" style="max-width:420px">
      <h3 style="margin-bottom:8px">${escapeHtml(ev.title)}</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:10px">
        <b>Waktu:</b> ${dt}
      </p>
      ${ev.location ? `<p style="color:var(--muted);font-size:13px;margin-bottom:10px"><b>Lokasi:</b> ${escapeHtml(ev.location)}</p>` : ''}
      ${ev.organizer ? `<p style="color:var(--muted);font-size:13px;margin-bottom:10px"><b>Penyelenggara:</b> ${escapeHtml(ev.organizer)}</p>` : ''}
      ${ev.description ? `<p style="font-size:14px;line-height:1.5;margin-top:10px">${escapeHtml(ev.description)}</p>` : ''}
      ${ev.contact ? `<p style="font-size:13px;margin-top:10px"><b>Kontak:</b> ${escapeHtml(ev.contact)}</p>` : ''}
      ${ev.registration_url ? `<a class="btn" style="width:100%;justify-content:center;margin-top:14px" href="${escapeHtml(ev.registration_url)}" target="_blank" rel="noopener">Daftar Acara</a>` : ''}
      <button class="btn btn-ghost" style="width:100%;margin-top:10px" onclick="this.closest('.lightbox').remove()">Tutup</button>
    </div></div>`);
    box.onclick = e => { if (e.target === box) box.remove(); };
    document.body.appendChild(box);
  },

  // ================= PROFIL =================
  async me(c) {
    c.innerHTML = UI.loading();
    try {
      const d = await API.call('me');
      Store.user = d.user;
      Store.profile = d.profile;
      const p = d.profile || {};
      const initial = (d.user.full_name || 'A').charAt(0);

      c.innerHTML = UI.topbar('Profil Saya', 'Kelola data dan biodata Anda') + `
        <div class="grid grid-2">
          <div class="card" style="text-align:center; background:linear-gradient(135deg, #fff 0%, #F0FBF6 100%);">
            <div style="width:120px;height:120px;margin:0 auto 16px;border-radius:50%; background:var(--mint); color:#fff; display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:bold; box-shadow:0 8px 20px rgba(86,197,150,.3); overflow:hidden;">
              ${p.photo_url ? `<img src="${p.photo_url}" style="width:100%;height:100%;object-fit:cover;">` : initial}
            </div>
            <h2>${escapeHtml(d.user.full_name)}</h2>
            <p style="color:var(--muted);margin-bottom:12px">${escapeHtml(p.occupation || 'Alumni')}</p>
            <span class="btn btn-sm ${p.verification_status === 'verified' ? '' : 'btn-ghost'}" style="cursor:default">
              ${p.verification_status === 'verified' ? '✓ Terverifikasi' : '⌛ Menunggu Verifikasi'}
            </span>
            <div style="margin-top:20px;text-align:left;font-size:14px">
               <p><b>Angkatan Lulus:</b> ${p.year_out || '-'}</p>
               <p><b>Domisili:</b> ${escapeHtml(p.city || '-')}, ${escapeHtml(p.province || '-')}</p>
            </div>
          </div>

          <form id="profForm" class="card">
            <h3 style="margin-bottom:16px">Edit Biodata</h3>
            <div class="form-grid">
              <div class="field"><label>Nama Lengkap</label><input name="full_name" value="${escapeHtml(p.full_name||'')}" required></div>
              <div class="field"><label>Pekerjaan</label><input name="occupation" value="${escapeHtml(p.occupation||'')}"></div>
              <div class="field"><label>Instansi</label><input name="company" value="${escapeHtml(p.company||'')}"></div>
              <div class="field"><label>No WhatsApp</label><input name="whatsapp" value="${escapeHtml(p.whatsapp||'')}"></div>
              <div class="field"><label>Kota</label><input name="city" value="${escapeHtml(p.city||'')}"></div>
              <div class="field"><label>Provinsi</label><input name="province" value="${escapeHtml(p.province||'')}"></div>
              <div class="field field-full"><label>URL Foto Profil</label><input name="photo_url" value="${escapeHtml(p.photo_url||'')}" placeholder="https://..."></div>
              <div class="field field-full"><label>Bio Singkat</label><textarea name="bio">${escapeHtml(p.bio||'')}</textarea></div>
              <div class="field field-full" style="flex-direction:row;align-items:center;gap:10px">
                <input type="checkbox" name="publish_whatsapp" id="pubWa" ${p.publish_whatsapp==='TRUE'?'checked':''} style="width:auto">
                <label for="pubWa" style="margin:0">Tampilkan no WA ke publik</label>
              </div>
            </div>
            <button type="submit" class="btn" style="width:100%;margin-top:16px">Simpan Perubahan</button>
          </form>
        </div>`;

      document.getElementById('profForm').onsubmit = async e => {
        e.preventDefault();
        const f = new FormData(e.target);
        const data = Object.fromEntries(f.entries());
        data.publish_whatsapp = document.getElementById('pubWa').checked;
        try {
          await API.call('saveMyProfile', data);
          showToast('Profil berhasil diperbarui!', 'success');
          this._alumniCache = null;
          Pages.me(c);
        } catch(err) { showToast(err.message, 'error'); }
      };
    } catch(e) { c.innerHTML = UI.empty(e.message); }
  },

  // ================= ADMIN =================
  async admin(c) {
    if (!await Store.requireAdmin()) return;
    c.innerHTML = UI.topbar('Panel Admin', 'Kelola data website') + `
      <div class="card" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" data-tab="alumni">Alumni</button>
        <button class="btn btn-sm btn-ghost" data-tab="events">Acara</button>
        <button class="btn btn-sm btn-ghost" data-tab="messages">Pesan</button>
      </div>
      <div id="adminArea"></div>`;
    c.querySelectorAll('[data-tab]').forEach(btn => {
      btn.onclick = () => {
        c.querySelectorAll('[data-tab]').forEach(b => b.className = 'btn btn-sm btn-ghost');
        btn.className = 'btn btn-sm';
        Pages._tabAdmin(btn.dataset.tab);
      };
    });
    Pages._tabAdmin('alumni');
  },

  async _tabAdmin(tab) {
    const area = document.getElementById('adminArea');
    if (!area) return;
    area.innerHTML = UI.loading();
    try {
      if (tab === 'alumni') {
        const list = await API.call('adminListAlumni');
        area.innerHTML = `<div class="card table-wrap"><table>
          <thead><tr><th>Nama</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>${list.map(a => `<tr>
            <td>${escapeHtml(a.full_name)}</td>
            <td>${escapeHtml(a.verification_status)}</td>
            <td><button class="btn btn-sm" onclick="Pages._verify('${a.id}')">Verifikasi</button></td>
          </tr>`).join('')}</tbody></table></div>`;
      }

      if (tab === 'events') {
        const list = await API.call('listEvents');
        list.sort((a,b) => new Date(b.start_at) - new Date(a.start_at));
        area.innerHTML = `
          <div class="card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
              <h3>Daftar Acara (${list.length})</h3>
              <button class="btn btn-sm" id="btnNewEvent">+ Tambah Acara</button>
            </div>
          </div>
          <div class="card table-wrap">
            <table>
              <thead><tr><th>Judul</th><th>Mulai</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>${list.map(e => `<tr>
                <td>${escapeHtml(e.title)}</td>
                <td>${fmtDateTime(e.start_at)}</td>
                <td>${escapeHtml(e.location || '-')}</td>
                <td>${escapeHtml(e.status || '-')}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-sm btn-ghost" data-edit="${e.id}">Edit</button>
                  <button class="btn btn-sm btn-danger" data-del="${e.id}">Hapus</button>
                </td>
              </tr>`).join('')}</tbody>
            </table>
          </div>`;

        document.getElementById('btnNewEvent').onclick = () => Pages._formEvent(null);
        area.querySelectorAll('[data-edit]').forEach(b => {
          b.onclick = () => {
            const ev = list.find(x => String(x.id) === String(b.dataset.edit));
            Pages._formEvent(ev);
          };
        });
        area.querySelectorAll('[data-del]').forEach(b => {
          b.onclick = async () => {
            if (!confirm('Hapus acara ini?')) return;
            try {
              await API.call('adminDeleteEvent', { id: b.dataset.del });
              showToast('Acara dihapus', 'success');
              Pages._tabAdmin('events');
            } catch(e) { showToast(e.message, 'error'); }
          };
        });
      }

      if (tab === 'messages') {
        const list = await API.call('adminListMessages');
        area.innerHTML = `<div class="card table-wrap"><table>
          <thead><tr><th>Nama</th><th>Subjek</th><th>Pesan</th></tr></thead>
          <tbody>${list.map(m => `<tr>
            <td>${escapeHtml(m.name)}</td>
            <td>${escapeHtml(m.subject)}</td>
            <td>${escapeHtml(m.content)}</td>
          </tr>`).join('')}</tbody></table></div>`;
      }

      if (window.lucide) lucide.createIcons();
    } catch(e) { area.innerHTML = UI.empty(e.message); }
  },

  _formEvent(ev) {
    const isEdit = !!ev;
    const e = ev || {};
    const toLocalInput = d => {
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const startVal = e.start_at ? toLocalInput(new Date(e.start_at)) : '';
    const endVal = e.end_at ? toLocalInput(new Date(e.end_at)) : '';

    const box = el(`<div class="lightbox active" style="z-index:600"><div class="card" style="max-width:520px;max-height:90vh;overflow-y:auto">
      <h3 style="margin-bottom:14px">${isEdit ? 'Edit Acara' : 'Tambah Acara'}</h3>
      <form id="evForm">
        <div class="field" style="margin-bottom:12px">
          <label>Judul *</label>
          <input name="title" required value="${escapeHtml(e.title || '')}">
        </div>
        <div class="form-grid" style="margin-bottom:12px">
          <div class="field"><label>Mulai *</label>
            <input type="datetime-local" name="start_at" required value="${startVal}"></div>
          <div class="field"><label>Selesai</label>
            <input type="datetime-local" name="end_at" value="${endVal}"></div>
        </div>
        <div class="field" style="margin-bottom:12px">
          <label>Lokasi</label>
          <input name="location" value="${escapeHtml(e.location || '')}">
        </div>
        <div class="field" style="margin-bottom:12px">
          <label>Penyelenggara</label>
          <input name="organizer" value="${escapeHtml(e.organizer || '')}">
        </div>
        <div class="field" style="margin-bottom:12px">
          <label>Deskripsi</label>
          <textarea name="description">${escapeHtml(e.description || '')}</textarea>
        </div>
        <div class="field" style="margin-bottom:12px">
          <label>URL Poster (opsional)</label>
          <input name="poster_url" value="${escapeHtml(e.poster_url || '')}">
        </div>
        <div class="field" style="margin-bottom:12px">
          <label>URL Pendaftaran (opsional)</label>
          <input name="registration_url" value="${escapeHtml(e.registration_url || '')}">
        </div>
        <div class="field" style="margin-bottom:12px">
          <label>Kontak</label>
          <input name="contact" value="${escapeHtml(e.contact || '')}">
        </div>
        <div class="field" style="margin-bottom:12px">
          <label>Status</label>
          <select name="status">
            <option value="published" ${(e.status||'published')==='published'?'selected':''}>Published</option>
            <option value="draft" ${e.status==='draft'?'selected':''}>Draft</option>
            <option value="cancelled" ${e.status==='cancelled'?'selected':''}>Cancelled</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button type="submit" class="btn" style="flex:1;justify-content:center">Simpan</button>
          <button type="button" class="btn btn-ghost" data-cancel style="flex:1;justify-content:center">Batal</button>
        </div>
      </form>
    </div></div>`);

    box.querySelector('[data-cancel]').onclick = () => box.remove();
    box.onclick = e2 => { if (e2.target === box) box.remove(); };

    box.querySelector('#evForm').onsubmit = async e2 => {
      e2.preventDefault();
      const f = new FormData(e2.target);
      const payload = Object.fromEntries(f.entries());
      if (payload.start_at) payload.start_at = new Date(payload.start_at).toISOString();
      if (payload.end_at) payload.end_at = payload.end_at ? new Date(payload.end_at).toISOString() : '';
      if (isEdit) payload.id = e.id;

      try {
        await API.call('adminSaveEvent', { event: payload });
        showToast(isEdit ? 'Acara diperbarui' : 'Acara ditambahkan', 'success');
        box.remove();
        Pages._tabAdmin('events');
      } catch(err) { showToast(err.message, 'error'); }
    };

    document.body.appendChild(box);
  },

  async _verify(id) {
    try {
      await API.call('adminVerifyAlumni', { id, status: 'verified' });
      Pages._tabAdmin('alumni');
      showToast('Alumni diverifikasi', 'success');
    } catch(e) { showToast(e.message, 'error'); }
  }
};

async function route() {
  await Store.bootstrap();
  UI.renderSidebar();
  const hash = (location.hash || '#dashboard').slice(1);
  const container = document.getElementById('pageContent');
  const fn = Pages[hash] || Pages.dashboard;
  try { await fn.call(Pages, container); }
  catch (err) { container.innerHTML = UI.empty(err.message); }
  if (window.lucide) lucide.createIcons();
}
window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);