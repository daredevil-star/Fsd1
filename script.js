// ═══════════════════════════════════════════════════════════
//  DATABASE  — localStorage-backed key-value store
// ═══════════════════════════════════════════════════════════
const DB = {
  KEY: 'feedforward_donations',
  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch { return []; }
  },
  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },
  insert(record) {
    const all = this.getAll();
    record.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    record.createdAt = new Date().toISOString();
    all.unshift(record);
    this.save(all);
    return record;
  },
  update(id, patch) {
    const all = this.getAll();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    this.save(all);
    return all[idx];
  },
  delete(id) {
    const all = this.getAll().filter(r => r.id !== id);
    this.save(all);
  }
};

// ═══════════════════════════════════════════════════════════
//  SEED DATA — if DB is empty
// ═══════════════════════════════════════════════════════════
(function seed() {
  if (DB.getAll().length) return;
  const items = [
    { donor:'Maria Santos', contact:'maria@gmail.com', food:'Chicken Adobo & Rice', qty:'30 servings', category:'Cooked Meal', location:'Quezon City, Luzon', notes:'Homemade, warm. Pickup by 7 PM.', status:'available', expiry: futureDate(6) },
    { donor:'Green Basket PH', contact:'0917-555-1234', food:'Fresh Vegetables Bundle', qty:'15 kg', category:'Produce', location:'Makati, BGC', notes:'Tomatoes, kangkong, squash. No pesticides.', status:'available', expiry: futureDate(3) },
    { donor:'Sunrise Bakery', contact:'sunrise@bakery.ph', food:'Pandesal & Ensaymada', qty:'200 pieces', category:'Bakery', location:'Cebu City', notes:'Baked this morning. Best consumed today.', status:'claimed', expiry: futureDate(1), claimedBy:'Cebu Feeding Program', claimedAt: new Date().toISOString() },
    { donor:'Lola Nena', contact:'0921-888-7777', food:'Sinigang na Bangus', qty:'10 servings', category:'Cooked Meal', location:'Pasig City', notes:'Traditional recipe. Allergen: fish.', status:'available', expiry: futureDate(4) },
    { donor:'SM Hypermarket', contact:'csm@sm.com.ph', food:'Assorted Canned Goods', qty:'50 cans', category:'Packaged', location:'SM North EDSA', notes:'Near-expiry stock. All sealed.', status:'available', expiry: futureDate(30) },
  ];
  items.forEach(i => DB.insert(i));
})();

function futureDate(hours) {
  const d = new Date(); d.setHours(d.getHours() + hours);
  return d.toISOString();
}

// ═══════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════
const sections = ['home','donate','browse','dashboard'];
function showSection(name) {
  sections.forEach(s => {
    document.getElementById(`sec-${s}`).style.display = (s === name) ? (s === 'home' ? 'block' : 'block') : 'none';
  });
  document.querySelectorAll('nav button').forEach((btn, i) => {
    btn.classList.toggle('active', sections[i] === name);
  });
  if (name === 'browse') renderListings();
  if (name === 'dashboard') renderDashboard();
  if (name === 'home') updateHeroStats();
}

// ═══════════════════════════════════════════════════════════
//  SUBMIT DONATION
// ═══════════════════════════════════════════════════════════
function submitDonation() {
  const name = v('d-name'), contact = v('d-contact'),
        food = v('d-food'), qty = v('d-qty'), location = v('d-location');
  if (!name || !contact || !food || !qty || !location) {
    toast('Please fill in all required fields.', 'error'); return;
  }
  DB.insert({
    donor: name, contact, food, qty,
    category: v('d-cat'), location,
    expiry: document.getElementById('d-expiry').value || null,
    notes: v('d-notes'), status: 'available'
  });
  ['d-name','d-contact','d-food','d-qty','d-location','d-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('d-expiry').value = '';
  toast('Donation listed successfully! 🎉', 'success');
  updateHeroStats();
}

// ═══════════════════════════════════════════════════════════
//  RENDER LISTINGS
// ═══════════════════════════════════════════════════════════
function renderListings() {
  const q = v('search-input').toLowerCase();
  const cat = v('filter-cat');
  const status = v('filter-status');
  let data = DB.getAll();

  data = data.filter(d => {
    const match = [d.food, d.location, d.donor, d.category].join(' ').toLowerCase();
    if (q && !match.includes(q)) return false;
    if (cat && d.category !== cat) return false;
    if (status && d.status !== status) return false;
    return true;
  });

  const grid = document.getElementById('listings-grid');
  if (!data.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🥡</div>
      <h3>No donations found</h3>
      <p>Try adjusting your filters or <a href="#" onclick="showSection('donate')" style="color:var(--accent)">list one yourself</a>.</p>
    </div>`; return;
  }

  grid.innerHTML = data.map(d => {
    const expired = d.expiry && new Date(d.expiry) < new Date();
    const status = expired ? 'expired' : d.status;
    const badgeClass = { available:'badge-available', claimed:'badge-claimed', expired:'badge-expired' }[status];
    const badgeLabel = { available:'Available', claimed:'Claimed', expired:'Expired' }[status];
    const expiryStr = d.expiry ? `⏰ ${new Date(d.expiry).toLocaleString('en-PH', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}` : '';
    return `
    <div class="donation-card">
      <div class="card-header">
        <div class="card-title">${esc(d.food)}</div>
        <div class="badge ${badgeClass}">${badgeLabel}</div>
      </div>
      <div class="card-tags">
        <span class="tag">${esc(d.category)}</span>
        <span class="tag">${esc(d.qty)}</span>
      </div>
      <div class="card-meta">
        <span>👤 ${esc(d.donor)}</span>
        <span>📍 ${esc(d.location)}</span>
        ${expiryStr ? `<span>${expiryStr}</span>` : ''}
        ${d.claimedBy ? `<span>🤝 Claimed by ${esc(d.claimedBy)}</span>` : ''}
      </div>
      ${d.notes ? `<div class="card-desc">${esc(d.notes)}</div>` : ''}
      <div class="card-actions">
        ${status === 'available' ? `<button class="btn btn-success" onclick="openClaim('${d.id}')">🤝 Claim</button>` : ''}
        <button class="btn btn-ghost" style="font-size:0.8rem;padding:0.4rem 0.85rem" onclick="copyContact('${esc(d.contact)}')">📋 Contact</button>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
//  CLAIM FLOW
// ═══════════════════════════════════════════════════════════
let claimTargetId = null;
function openClaim(id) {
  claimTargetId = id;
  document.getElementById('c-name').value = '';
  document.getElementById('c-contact').value = '';
  document.getElementById('c-org').value = '';
  document.getElementById('c-time').value = '';
  document.getElementById('claim-modal').classList.add('open');
}
function closeModal() {
  document.getElementById('claim-modal').classList.remove('open');
  claimTargetId = null;
}
function confirmClaim() {
  const name = v('c-name'), contact = v('c-contact'), time = v('c-time');
  if (!name || !contact || !time) { toast('Please fill all required claim fields.', 'error'); return; }
  DB.update(claimTargetId, {
    status: 'claimed',
    claimedBy: name + (v('c-org') ? ` (${v('c-org')})` : ''),
    claimedContact: contact,
    claimedAt: new Date().toISOString(),
    pickupTime: time
  });
  closeModal();
  toast('Donation claimed! Please coordinate pickup. 🙌', 'success');
  renderListings();
  updateHeroStats();
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderDashboard() {
  const all = DB.getAll();
  const avail = all.filter(d => d.status === 'available').length;
  const claimed = all.filter(d => d.status === 'claimed').length;
  const cats = [...new Set(all.map(d => d.category))].length;

  document.getElementById('dash-stats').innerHTML = [
    ['📦', all.length, 'Total Donations'],
    ['✅', avail, 'Available'],
    ['🤝', claimed, 'Claimed'],
    ['🍽️', cats, 'Categories'],
  ].map(([icon, num, label]) => `
    <div class="dash-card">
      <div style="font-size:1.4rem">${icon}</div>
      <div class="dnum">${num}</div>
      <div class="dlabel">${label}</div>
    </div>`).join('');

  document.getElementById('dash-table').innerHTML = all.map(d => `
    <tr>
      <td><strong>${esc(d.food)}</strong></td>
      <td>${esc(d.donor)}</td>
      <td><span class="tag">${esc(d.category)}</span></td>
      <td>${esc(d.qty)}</td>
      <td>${esc(d.location)}</td>
      <td><span class="badge ${d.status === 'available' ? 'badge-available' : 'badge-claimed'}">${d.status}</span></td>
      <td style="color:var(--muted);font-size:0.8rem">${new Date(d.createdAt).toLocaleDateString()}</td>
      <td>
        ${d.status === 'available' ? `<button class="btn btn-success" onclick="openClaim('${d.id}');showSection('browse')">Claim</button>` : ''}
        <button class="btn btn-danger" onclick="deleteDonation('${d.id}')">Delete</button>
      </td>
    </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:2rem">No records yet.</td></tr>`;
}

function deleteDonation(id) {
  if (!confirm('Delete this donation record?')) return;
  DB.delete(id);
  toast('Record deleted.', 'error');
  renderDashboard();
  updateHeroStats();
}

// ═══════════════════════════════════════════════════════════
//  HERO STATS
// ═══════════════════════════════════════════════════════════
function updateHeroStats() {
  const all = DB.getAll();
  animCount('stat-total', all.length);
  animCount('stat-available', all.filter(d => d.status === 'available').length);
  animCount('stat-claimed', all.filter(d => d.status === 'claimed').length);
}

function animCount(id, target) {
  const el = document.getElementById(id);
  let n = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const t = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n;
    if (n >= target) clearInterval(t);
  }, 30);
}

// ═══════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════
function v(id) { return (document.getElementById(id)?.value || '').trim(); }
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 3200);
}

function copyContact(c) {
  navigator.clipboard?.writeText(c).catch(() => {});
  toast(`Contact copied: ${c}`);
}

// ── Init ──
updateHeroStats();
