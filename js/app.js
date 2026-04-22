/* ==============================
   GYM PRO - Application Logic
   ============================== */

const App = (() => {
  // ---- State ----
  let currentUser = null;
  let currentPanel = 'overview';
  let qrScanner = null;

  // ---- Plans ----
  const PLANS = {
    monthly:    { name: 'Monthly',     price: 999,  days: 30,  icon: '📅' },
    quarterly:  { name: 'Quarterly',   price: 2499, days: 90,  icon: '📆' },
    halfyearly: { name: 'Half Yearly', price: 4499, days: 180, icon: '🗓️' },
    annual:     { name: 'Annual',      price: 7999, days: 365, icon: '🎯' }
  };

  // ---- Database (localStorage wrapper) ----
  const DB = {
    get(key) { try { return JSON.parse(localStorage.getItem('gym_' + key)); } catch { return null; } },
    set(key, val) { localStorage.setItem('gym_' + key, JSON.stringify(val)); },
    init() {
      if (DB.get('initialized')) return;

      const today = new Date();
      const d = (offset) => {
        const dt = new Date(today);
        dt.setDate(dt.getDate() + offset);
        return dt.toISOString().split('T')[0];
      };

      const users = [
        { id: 'owner1', username: 'owner', password: 'admin123', role: 'owner', name: 'Ravi Shankar', phone: '9876543210', email: 'owner@gympro.com', photo: '' },
        { id: 'trainer1', username: 'trainer', password: 'trainer123', role: 'trainer', name: 'Sunil Kumar', phone: '9876543211', email: 'trainer@gympro.com', photo: '' },
        { id: 'm1', username: '9001001001', password: 'member123', role: 'member', name: 'Rajesh Kumar', phone: '9001001001', email: 'rajesh@mail.com', photo: '', plan: 'monthly', startDate: d(-35), endDate: d(-5), active: false },
        { id: 'm2', username: '9001001002', password: 'member123', role: 'member', name: 'Priya Sharma', phone: '9001001002', email: 'priya@mail.com', photo: '', plan: 'quarterly', startDate: d(-90), endDate: d(0), active: false },
        { id: 'm3', username: '9001001003', password: 'member123', role: 'member', name: 'Vikram Singh', phone: '9001001003', email: 'vikram@mail.com', photo: '', plan: 'monthly', startDate: d(-27), endDate: d(3), active: true },
        { id: 'm4', username: '9001001004', password: 'member123', role: 'member', name: 'Anita Reddy', phone: '9001001004', email: 'anita@mail.com', photo: '', plan: 'halfyearly', startDate: d(-150), endDate: d(30), active: true },
        { id: 'm5', username: '9001001005', password: 'member123', role: 'member', name: 'Suresh Patil', phone: '9001001005', email: 'suresh@mail.com', photo: '', plan: 'annual', startDate: d(-320), endDate: d(45), active: true }
      ];

      const attendance = [
        { memberId: 'm1', date: d(-6), time: '07:15 AM' },
        { memberId: 'm1', date: d(-7), time: '06:45 AM' },
        { memberId: 'm2', date: d(-1), time: '08:00 AM' },
        { memberId: 'm3', date: d(-1), time: '06:30 AM' },
        { memberId: 'm3', date: d(-2), time: '07:00 AM' },
        { memberId: 'm4', date: d(-1), time: '09:15 AM' },
        { memberId: 'm4', date: d(-2), time: '09:00 AM' },
        { memberId: 'm4', date: d(-3), time: '08:45 AM' },
        { memberId: 'm5', date: d(-1), time: '05:30 AM' },
        { memberId: 'm5', date: d(-2), time: '05:45 AM' }
      ];

      const notifications = [];
      const smsLog = [];

      // Generate expiry notifications for expired/expiring members
      users.filter(u => u.role === 'member').forEach(m => {
        const end = new Date(m.endDate);
        const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        if (diff <= 0) {
          notifications.push({
            id: 'n_' + m.id,
            type: 'expired',
            memberId: m.id,
            memberName: m.name,
            memberPhone: m.phone,
            memberPhoto: m.photo,
            message: `${m.name}'s membership has EXPIRED on ${formatDate(m.endDate)}`,
            date: today.toISOString(),
            read: false
          });
          smsLog.push({
            to: m.phone,
            name: m.name,
            message: `Dear ${m.name}, your GymPro membership has expired on ${formatDate(m.endDate)}. Please renew to continue your fitness journey!`,
            date: today.toISOString()
          });
        } else if (diff <= 3) {
          notifications.push({
            id: 'n_' + m.id,
            type: 'expiring',
            memberId: m.id,
            memberName: m.name,
            memberPhone: m.phone,
            memberPhoto: m.photo,
            message: `${m.name}'s membership expires in ${diff} day(s) on ${formatDate(m.endDate)}`,
            date: today.toISOString(),
            read: false
          });
          smsLog.push({
            to: m.phone,
            name: m.name,
            message: `Dear ${m.name}, your GymPro membership expires in ${diff} day(s) on ${formatDate(m.endDate)}. Renew now to avoid interruption!`,
            date: today.toISOString()
          });
        }
      });

      DB.set('users', users);
      DB.set('attendance', attendance);
      DB.set('notifications', notifications);
      DB.set('smsLog', smsLog);
      DB.set('initialized', true);
    }
  };

  // ---- Helpers ----
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  }

  function getAvatarHtml(user, size) {
    if (user.photo) {
      return `<img src="${user.photo}" alt="${user.name}" style="width:${size || '100%'};height:${size || '100%'};object-fit:cover;border-radius:inherit">`;
    }
    return `<div class="initials" style="font-size:${parseInt(size || 14) * 0.4}px">${getInitials(user.name)}</div>`;
  }

  function getDaysLeft(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }

  function getStatusInfo(endDate) {
    const days = getDaysLeft(endDate);
    if (days < 0) return { label: 'Expired', cls: 'expired', days };
    if (days <= 5) return { label: 'Expiring Soon', cls: 'expiring', days };
    return { label: 'Active', cls: 'active', days };
  }

  function getMemberById(id) {
    return DB.get('users').find(u => u.id === id);
  }

  function toast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100px)'; setTimeout(() => el.remove(), 300); }, 3500);
  }

  function $(id) { return document.getElementById(id); }

  // ---- Navigation Items by Role ----
  const NAV = {
    owner: [
      { id: 'overview',       icon: '📊', label: 'Overview' },
      { id: 'alerts',         icon: '🚨', label: 'Expiry Alerts', badge: true },
      { id: 'members',        icon: '👥', label: 'Members' },
      { id: 'scanner',        icon: '📷', label: 'Scan Attendance' },
      { id: 'subscriptions',  icon: '💎', label: 'Subscription Plans' },
      { id: 'attendance-log', icon: '📋', label: 'Attendance Log' },
      { id: 'sms-log',        icon: '💬', label: 'SMS Log' },
      { id: 'notifications',  icon: '🔔', label: 'Notifications' }
    ],
    trainer: [
      { id: 'overview',       icon: '📊', label: 'Overview' },
      { id: 'alerts',         icon: '🚨', label: 'Expiry Alerts', badge: true },
      { id: 'members',        icon: '👥', label: 'Members' },
      { id: 'scanner',        icon: '📷', label: 'Scan Attendance' },
      { id: 'attendance-log', icon: '📋', label: 'Attendance Log' },
      { id: 'notifications',  icon: '🔔', label: 'Notifications' }
    ],
    member: [
      { id: 'my-qr',          icon: '🔳', label: 'My QR Code' },
      { id: 'my-status',      icon: '📊', label: 'Membership Status' },
      { id: 'my-attendance',   icon: '📋', label: 'My Attendance' },
      { id: 'payment',        icon: '💳', label: 'Renew / Pay' },
      { id: 'notifications',  icon: '🔔', label: 'Notifications' },
      { id: 'settings',       icon: '⚙️', label: 'Settings' }
    ]
  };

  // ---- Auth ----
  function login() {
    const username = $('login-username').value.trim();
    const password = $('login-password').value.trim();
    if (!username || !password) return toast('Please fill all fields', 'warning');
    const users = DB.get('users');
    const user = users.find(u => (u.username === username || u.phone === username) && u.password === password);
    if (!user) return toast('Invalid credentials', 'error');
    currentUser = user;
    sessionStorage.setItem('gym_session', user.id);
    showDashboard();
    toast(`Welcome, ${user.name}!`, 'success');
  }

  function demoLogin(role, memberId) {
    const users = DB.get('users');
    let user;
    if (role === 'member' && memberId) {
      user = users.find(u => u.id === memberId);
    } else {
      user = users.find(u => u.role === role);
    }
    if (user) {
      currentUser = user;
      sessionStorage.setItem('gym_session', user.id);
      showDashboard();
      toast(`Welcome, ${user.name}!`, 'success');
    }
  }

  function logout() {
    if (qrScanner) { try { qrScanner.stop(); } catch(e) {} qrScanner = null; }
    currentUser = null;
    sessionStorage.removeItem('gym_session');
    $('view-login').classList.remove('hidden');
    $('view-dashboard').classList.add('hidden');
    $('login-username').value = '';
    $('login-password').value = '';
  }

  function checkSession() {
    const sid = sessionStorage.getItem('gym_session');
    if (sid) {
      const users = DB.get('users');
      currentUser = users.find(u => u.id === sid);
      if (currentUser) { showDashboard(); return; }
    }
    $('view-login').classList.remove('hidden');
  }

  // ---- Dashboard Setup ----
  function showDashboard() {
    $('view-login').classList.add('hidden');
    $('view-dashboard').classList.remove('hidden');

    // Sidebar user info
    $('sidebar-name').textContent = currentUser.name;
    $('sidebar-role').textContent = currentUser.role;
    $('sidebar-avatar').innerHTML = getAvatarHtml(currentUser);

    // Build navigation
    buildNav();

    // Update notification badge
    updateNotifBadge();

    // Show default panel
    const defaultPanel = currentUser.role === 'member' ? 'my-qr' : 'overview';
    navigate(defaultPanel);
  }

  function buildNav() {
    const nav = $('sidebar-nav');
    const items = NAV[currentUser.role];
    const notifications = DB.get('notifications') || [];
    const unread = notifications.filter(n => !n.read).length;
    const expired = notifications.filter(n => n.type === 'expired').length;
    const expiring = notifications.filter(n => n.type === 'expiring').length;
    const alertCount = expired + expiring;

    let html = '<div class="nav-section"><div class="nav-section-title">Menu</div>';
    items.forEach(item => {
      let badge = '';
      if (item.id === 'alerts' && item.badge && alertCount > 0) {
        badge = `<span class="nav-badge">${alertCount}</span>`;
      }
      if (item.id === 'notifications' && unread > 0) {
        badge = `<span class="nav-badge">${unread}</span>`;
      }
      html += `<button class="nav-item ${currentPanel === item.id ? 'active' : ''}" onclick="App.navigate('${item.id}')">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
        ${badge}
      </button>`;
    });
    html += '</div>';
    nav.innerHTML = html;
  }

  function updateNotifBadge() {
    const notifications = DB.get('notifications') || [];
    const unread = notifications.filter(n => !n.read).length;
    const badge = $('notif-count');
    if (unread > 0) {
      badge.textContent = unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function navigate(panel) {
    // Stop QR scanner if leaving scanner panel
    if (currentPanel === 'scanner' && qrScanner) {
      try { qrScanner.stop(); } catch (e) {}
      qrScanner = null;
    }
    currentPanel = panel;
    buildNav();

    const titles = {
      'overview': 'Dashboard Overview',
      'alerts': 'Expiry Alerts',
      'members': 'Members Management',
      'scanner': 'Scan Attendance',
      'subscriptions': 'Subscription Plans',
      'attendance-log': 'Attendance Log',
      'sms-log': 'SMS Log',
      'notifications': 'Notifications',
      'my-qr': 'My QR Code',
      'my-status': 'Membership Status',
      'my-attendance': 'My Attendance',
      'payment': 'Renew Membership',
      'settings': 'Settings'
    };

    $('page-title').textContent = titles[panel] || 'Dashboard';

    const renderers = {
      'overview': renderOverview,
      'alerts': renderAlerts,
      'members': renderMembers,
      'scanner': renderScanner,
      'subscriptions': renderSubscriptions,
      'attendance-log': renderAttendanceLog,
      'sms-log': renderSmsLog,
      'notifications': renderNotifications,
      'my-qr': renderMyQR,
      'my-status': renderMyStatus,
      'my-attendance': renderMyAttendance,
      'payment': renderPayment,
      'settings': renderSettings
    };

    if (renderers[panel]) renderers[panel]();

    // Close sidebar on mobile
    $('sidebar').classList.remove('open');
    $('sidebar-overlay').classList.remove('show');
  }

  function toggleSidebar() {
    $('sidebar').classList.toggle('open');
    $('sidebar-overlay').classList.toggle('show');
  }

  // ======== RENDER FUNCTIONS ========

  // ---- Overview ----
  function renderOverview() {
    const users = DB.get('users');
    const members = users.filter(u => u.role === 'member');
    const attendance = DB.get('attendance') || [];
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today).length;

    let expired = 0, expiring = 0, active = 0;
    members.forEach(m => {
      const s = getStatusInfo(m.endDate);
      if (s.cls === 'expired') expired++;
      else if (s.cls === 'expiring') expiring++;
      else active++;
    });

    let html = `
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon blue">👥</div>
          <div class="stat-value">${members.length}</div>
          <div class="stat-label">Total Members</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">✅</div>
          <div class="stat-value">${active}</div>
          <div class="stat-label">Active Members</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon orange">⚠️</div>
          <div class="stat-value">${expiring}</div>
          <div class="stat-label">Expiring Soon</div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon red">❌</div>
          <div class="stat-value">${expired}</div>
          <div class="stat-label">Expired</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="panel">
          <div class="panel-header">
            <h3>📅 Today's Attendance</h3>
            <span style="font-size:24px;font-weight:800;color:var(--accent)">${todayAttendance}</span>
          </div>
          <div class="panel-body">
            ${todayAttendance === 0
              ? '<div class="empty-state"><div class="empty-icon">📋</div><p>No attendance recorded today</p></div>'
              : renderTodayAttendanceList(attendance, today, users)
            }
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>🚨 Recent Alerts</h3>
            <button class="btn btn-sm btn-secondary" onclick="App.navigate('alerts')">View All</button>
          </div>
          <div class="panel-body">
            ${renderRecentAlerts()}
          </div>
        </div>
      </div>
    `;

    if (currentUser.role === 'member') {
      // Member sees their own overview
      const s = getStatusInfo(currentUser.endDate);
      const daysLeft = s.days;
      html = `
        <div class="stats-grid">
          <div class="stat-card ${s.cls === 'active' ? 'green' : s.cls === 'expiring' ? 'orange' : 'red'}">
            <div class="stat-icon ${s.cls === 'active' ? 'green' : s.cls === 'expiring' ? 'orange' : 'red'}">${s.cls === 'active' ? '✅' : s.cls === 'expiring' ? '⚠️' : '❌'}</div>
            <div class="stat-value">${daysLeft > 0 ? daysLeft : 0}</div>
            <div class="stat-label">Days Remaining</div>
          </div>
          <div class="stat-card blue">
            <div class="stat-icon blue">📋</div>
            <div class="stat-value">${(DB.get('attendance') || []).filter(a => a.memberId === currentUser.id).length}</div>
            <div class="stat-label">Total Check-ins</div>
          </div>
        </div>
      `;
    }

    $('content-area').innerHTML = html;
  }

  function renderTodayAttendanceList(attendance, today, users) {
    const todayRecs = attendance.filter(a => a.date === today);
    return '<div class="attendance-list">' + todayRecs.map(a => {
      const member = users.find(u => u.id === a.memberId);
      return `<div class="attendance-item">
        <div class="member-row-avatar">${member ? getAvatarHtml(member) : '<div class="initials">?</div>'}</div>
        <div>
          <div class="attendance-date">${member ? member.name : 'Unknown'}</div>
          <div class="attendance-time">${a.time}</div>
        </div>
        <div class="attendance-status">✓ Present</div>
      </div>`;
    }).join('') + '</div>';
  }

  function renderRecentAlerts() {
    const notifs = (DB.get('notifications') || []).slice(0, 3);
    if (notifs.length === 0) return '<div class="empty-state"><p>No alerts</p></div>';
    return notifs.map(n => {
      const member = getMemberById(n.memberId);
      return `<div class="alert-card ${n.type === 'expired' ? '' : 'warning'}" style="margin-bottom:10px">
        <div class="alert-photo">${member ? getAvatarHtml(member) : '<div class="initials">?</div>'}</div>
        <div class="alert-content">
          <div class="alert-name">${n.memberName}</div>
          <div class="alert-detail">${n.message}</div>
          <div class="alert-meta">
            <span class="alert-tag ${n.type}">${n.type === 'expired' ? 'EXPIRED' : 'EXPIRING SOON'}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ---- Expiry Alerts ----
  function renderAlerts() {
    const notifications = DB.get('notifications') || [];
    const alertNotifs = notifications.filter(n => n.type === 'expired' || n.type === 'expiring');

    if (alertNotifs.length === 0) {
      $('content-area').innerHTML = `
        <div class="panel"><div class="panel-body">
          <div class="empty-state">
            <div class="empty-icon">🎉</div>
            <h4>All Clear!</h4>
            <p>No membership expiry alerts at this time.</p>
          </div>
        </div></div>`;
      return;
    }

    const html = `
      <div class="panel">
        <div class="panel-header">
          <h3>⚠️ Members with Expired/Expiring Memberships</h3>
          <span style="font-size:13px;color:var(--text-muted)">${alertNotifs.length} alert(s)</span>
        </div>
        <div class="panel-body">
          <div class="alert-list">
            ${alertNotifs.map(n => {
              const member = getMemberById(n.memberId);
              const plan = member ? PLANS[member.plan] : null;
              return `<div class="alert-card ${n.type === 'expired' ? '' : 'warning'}">
                <div class="alert-photo" style="width:72px;height:72px">
                  ${member ? getAvatarHtml(member, '72px') : '<div class="initials">?</div>'}
                </div>
                <div class="alert-content">
                  <div class="alert-name">${n.memberName}</div>
                  <div class="alert-detail">
                    📞 ${n.memberPhone}<br>
                    ${n.message}
                  </div>
                  <div class="alert-meta">
                    <span class="alert-tag ${n.type}">${n.type === 'expired' ? '🔴 EXPIRED' : '🟡 EXPIRING SOON'}</span>
                    ${plan ? `<span class="alert-tag plan">${plan.icon} ${plan.name} Plan</span>` : ''}
                  </div>
                </div>
                <div class="alert-actions">
                  <button class="btn btn-sm btn-primary" onclick="App.sendReminder('${n.memberId}')">📩 Send Reminder</button>
                  <button class="btn btn-sm btn-secondary" onclick="App.viewMemberProfile('${n.memberId}')">👁️ View Profile</button>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:20px">
        <div class="panel-header">
          <h3>📱 SMS Sent to Members</h3>
        </div>
        <div class="panel-body">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
            These members have been automatically notified via SMS about their membership status.
          </p>
          <div class="sms-log">
            ${(DB.get('smsLog') || []).map(s => `
              <div class="sms-item">
                <div class="sms-to">📱 To: ${s.name} (${s.to})</div>
                <div style="margin:6px 0">${s.message}</div>
                <div class="sms-time">Sent: ${new Date(s.date).toLocaleString('en-IN')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    $('content-area').innerHTML = html;
  }

  // ---- Members ----
  function renderMembers() {
    const users = DB.get('users');
    const members = users.filter(u => u.role === 'member');

    const html = `
      <div class="panel">
        <div class="panel-header">
          <h3>👥 All Members (${members.length})</h3>
          ${currentUser.role === 'owner' ? '<button class="btn btn-sm btn-primary" onclick="App.openModal(\'modal-add-member\')">+ Add Member</button>' : ''}
        </div>
        <div class="panel-body">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Search members by name or phone..." oninput="App.filterMembers(this.value)">
          </div>
        </div>
        <div class="panel-body no-pad">
          <div style="overflow-x:auto">
            <table class="member-table" id="members-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${members.map(m => {
                  const s = getStatusInfo(m.endDate);
                  const plan = PLANS[m.plan];
                  return `<tr data-name="${m.name.toLowerCase()}" data-phone="${m.phone}">
                    <td>
                      <div class="member-row-info">
                        <div class="member-row-avatar">${getAvatarHtml(m)}</div>
                        <div>
                          <div class="member-row-name">${m.name}</div>
                          <div class="member-row-phone">📱 ${m.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>${plan ? plan.name : m.plan}</td>
                    <td>${formatDate(m.endDate)}</td>
                    <td><span class="status-badge ${s.cls}"><span class="status-dot"></span>${s.label}</span></td>
                    <td>
                      <div class="flex gap-sm">
                        <button class="btn btn-sm btn-secondary" onclick="App.viewMemberProfile('${m.id}')">View</button>
                        ${currentUser.role === 'owner' ? `<button class="btn btn-sm btn-danger" onclick="App.deleteMember('${m.id}')">Remove</button>` : ''}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    $('content-area').innerHTML = html;
  }

  function filterMembers(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#members-table tbody tr').forEach(row => {
      const name = row.dataset.name || '';
      const phone = row.dataset.phone || '';
      row.style.display = (name.includes(q) || phone.includes(q)) ? '' : 'none';
    });
  }

  // ---- QR Scanner ----
  function renderScanner() {
    $('content-area').innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>📷 Scan Member QR for Attendance</h3>
        </div>
        <div class="panel-body">
          <div class="scanner-container">
            <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px">
              Point the camera at a member's QR code to mark their attendance.
            </p>
            <div id="qr-reader" style="width:100%"></div>
            <div id="scan-result" class="hidden"></div>
            <div style="margin-top:16px">
              <button class="btn btn-primary" id="btn-start-scan" onclick="App.startScanner()">📷 Start Scanner</button>
              <button class="btn btn-secondary hidden" id="btn-stop-scan" onclick="App.stopScanner()">⏹ Stop Scanner</button>
            </div>
            <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--glass-border)">
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Or enter Member ID manually:</p>
              <div class="flex gap-sm">
                <input type="text" id="manual-member-id" class="form-input" placeholder="Enter Member ID (e.g., m1, m2)">
                <button class="btn btn-primary btn-sm" onclick="App.manualAttendance()">Mark</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function startScanner() {
    const reader = document.getElementById('qr-reader');
    $('btn-start-scan').classList.add('hidden');
    $('btn-stop-scan').classList.remove('hidden');
    $('scan-result').classList.add('hidden');

    qrScanner = new Html5Qrcode('qr-reader');
    qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        markAttendance(decodedText);
        stopScanner();
      },
      (err) => { /* ignore scan errors */ }
    ).catch(err => {
      toast('Camera access denied or unavailable. Use manual entry.', 'error');
      $('btn-start-scan').classList.remove('hidden');
      $('btn-stop-scan').classList.add('hidden');
    });
  }

  function stopScanner() {
    if (qrScanner) {
      try { qrScanner.stop(); } catch(e) {}
      qrScanner = null;
    }
    $('btn-start-scan').classList.remove('hidden');
    $('btn-stop-scan').classList.add('hidden');
  }

  function manualAttendance() {
    const id = $('manual-member-id').value.trim();
    if (!id) return toast('Enter a member ID', 'warning');
    markAttendance(id);
    $('manual-member-id').value = '';
  }

  function markAttendance(memberId) {
    const member = getMemberById(memberId);
    if (!member || member.role !== 'member') {
      $('scan-result').innerHTML = `
        <div class="scan-result error">
          <div class="scan-result-icon">❌</div>
          <div class="scan-result-name">Invalid Member</div>
          <div class="scan-result-time">No member found with ID: ${memberId}</div>
        </div>`;
      $('scan-result').classList.remove('hidden');
      toast('Member not found!', 'error');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    const attendance = DB.get('attendance') || [];

    // Check already marked today
    const alreadyMarked = attendance.find(a => a.memberId === memberId && a.date === today);
    if (alreadyMarked) {
      $('scan-result').innerHTML = `
        <div class="scan-result" style="background:var(--warning-bg);border-color:rgba(245,158,11,0.2)">
          <div class="scan-result-icon">⚠️</div>
          <div class="scan-result-name">${member.name}</div>
          <div class="scan-result-time">Already marked present today at ${alreadyMarked.time}</div>
        </div>`;
      $('scan-result').classList.remove('hidden');
      toast(`${member.name} already marked today`, 'warning');
      return;
    }

    attendance.push({ memberId, date: today, time: now });
    DB.set('attendance', attendance);

    $('scan-result').innerHTML = `
      <div class="scan-result">
        <div class="scan-result-icon">✅</div>
        <div style="margin-bottom:12px">
          <div class="member-row-avatar" style="width:60px;height:60px;border-radius:50%;margin:0 auto 10px;overflow:hidden">
            ${getAvatarHtml(member, '60px')}
          </div>
        </div>
        <div class="scan-result-name">${member.name}</div>
        <div class="scan-result-time">Attendance marked at ${now}</div>
      </div>`;
    $('scan-result').classList.remove('hidden');
    toast(`✅ ${member.name} - Attendance marked!`, 'success');
  }

  // ---- Subscription Plans ----
  function renderSubscriptions() {
    const html = `
      <div class="plans-grid">
        ${Object.entries(PLANS).map(([key, plan], i) => `
          <div class="plan-card ${i === 1 ? 'popular' : ''}">
            <div class="plan-icon">${plan.icon}</div>
            <div class="plan-name">${plan.name}</div>
            <div class="plan-price">₹${plan.price.toLocaleString('en-IN')} <span>/ ${plan.days} days</span></div>
            <div class="plan-duration">${Math.round(plan.price / plan.days)} ₹/day</div>
            <ul class="plan-features">
              <li>Full Gym Access</li>
              <li>Locker Room Access</li>
              ${plan.days >= 90 ? '<li>Personal Trainer (2 sessions/week)</li>' : '<li>Group Training Sessions</li>'}
              ${plan.days >= 180 ? '<li>Diet Plan Consultation</li>' : ''}
              ${plan.days >= 365 ? '<li>Free Merchandise</li>' : ''}
            </ul>
            <button class="btn btn-primary btn-block" onclick="App.openPaymentForPlan('${key}')">Select Plan</button>
          </div>
        `).join('')}
      </div>
    `;
    $('content-area').innerHTML = html;
  }

  // ---- Attendance Log ----
  function renderAttendanceLog() {
    const attendance = DB.get('attendance') || [];
    const users = DB.get('users');
    const sorted = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));

    $('content-area').innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>📋 Attendance Records</h3>
          <span style="font-size:13px;color:var(--text-muted)">${sorted.length} record(s)</span>
        </div>
        <div class="panel-body">
          ${sorted.length === 0 ? '<div class="empty-state"><div class="empty-icon">📋</div><p>No attendance records yet</p></div>' : `
            <div class="attendance-list">
              ${sorted.map(a => {
                const member = users.find(u => u.id === a.memberId);
                return `<div class="attendance-item">
                  <div class="member-row-avatar" style="width:36px;height:36px">${member ? getAvatarHtml(member) : '<div class="initials">?</div>'}</div>
                  <div>
                    <div class="attendance-date">${member ? member.name : a.memberId}</div>
                    <div class="attendance-time">${a.time}</div>
                  </div>
                  <div class="attendance-date" style="margin-left:auto;text-align:right">
                    ${formatDate(a.date)}
                  </div>
                  <div class="attendance-status">✓</div>
                </div>`;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ---- SMS Log ----
  function renderSmsLog() {
    const smsLog = DB.get('smsLog') || [];

    $('content-area').innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>💬 SMS Message Log</h3>
          <span style="font-size:13px;color:var(--text-muted)">${smsLog.length} message(s)</span>
        </div>
        <div class="panel-body">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;padding:12px;background:rgba(99,102,241,0.08);border-radius:var(--radius-xs)">
            ℹ️ These are the SMS messages automatically sent to members when their membership expires or is about to expire. 
            In production, these would be sent via Twilio or a similar SMS gateway.
          </p>
          ${smsLog.length === 0 ? '<div class="empty-state"><p>No SMS sent yet</p></div>' : `
            <div class="sms-log">
              ${smsLog.map(s => `
                <div class="sms-item">
                  <div class="sms-to">📱 To: ${s.name} (${s.to})</div>
                  <div style="margin:6px 0;color:var(--text-primary)">${s.message}</div>
                  <div class="sms-time">📅 ${new Date(s.date).toLocaleString('en-IN')}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ---- Notifications ----
  function renderNotifications() {
    const notifications = DB.get('notifications') || [];

    // Mark all as read
    notifications.forEach(n => n.read = true);
    DB.set('notifications', notifications);
    updateNotifBadge();
    buildNav();

    const memberNotifs = currentUser.role === 'member'
      ? notifications.filter(n => n.memberId === currentUser.id)
      : notifications;

    $('content-area').innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>🔔 Notifications</h3>
        </div>
        <div class="panel-body">
          ${memberNotifs.length === 0
            ? '<div class="empty-state"><div class="empty-icon">🔔</div><h4>No Notifications</h4><p>You\'re all caught up!</p></div>'
            : `<div class="alert-list">${memberNotifs.map(n => {
                const member = getMemberById(n.memberId);
                const showPhoto = currentUser.role !== 'member';
                return `<div class="alert-card ${n.type === 'expired' ? '' : 'warning'}">
                  ${showPhoto ? `<div class="alert-photo" style="width:56px;height:56px">${member ? getAvatarHtml(member, '56px') : '<div class="initials">?</div>'}</div>` : ''}
                  <div class="alert-content">
                    <div class="alert-name">${n.memberName}</div>
                    <div class="alert-detail">${n.message}</div>
                    <div class="alert-meta">
                      <span class="alert-tag ${n.type}">${n.type === 'expired' ? 'EXPIRED' : 'EXPIRING'}</span>
                    </div>
                  </div>
                </div>`;
              }).join('')}</div>`
          }
        </div>
      </div>
    `;
  }

  // ---- Member: My QR Code ----
  function renderMyQR() {
    $('content-area').innerHTML = `
      <div class="qr-card">
        <div class="qr-card-header">
          <h3>🏋️ GymPro Membership Card</h3>
          <p>Scan this QR code at the gym entrance</p>
        </div>
        <div class="qr-card-body">
          <div class="qr-code-wrapper" id="qr-code-display"></div>
          <div class="qr-card-name">${currentUser.name}</div>
          <div class="qr-card-id">ID: ${currentUser.id} | 📱 ${currentUser.phone}</div>
          <div style="margin-top:12px">
            <span class="status-badge ${getStatusInfo(currentUser.endDate).cls}">
              <span class="status-dot"></span>${getStatusInfo(currentUser.endDate).label}
            </span>
          </div>
        </div>
      </div>
    `;

    // Generate QR Code
    const qrContainer = document.getElementById('qr-code-display');
    if (qrContainer && typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: currentUser.id,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }

  // ---- Member: My Status ----
  function renderMyStatus() {
    // Refresh user data
    const freshUser = getMemberById(currentUser.id);
    if (freshUser) currentUser = freshUser;

    const s = getStatusInfo(currentUser.endDate);
    const plan = PLANS[currentUser.plan];
    const totalDays = plan ? plan.days : 30;
    const startDate = new Date(currentUser.startDate);
    const endDate = new Date(currentUser.endDate);
    const now = new Date();
    const elapsed = Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
    const pct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
    const progressCls = s.cls === 'active' ? 'good' : s.cls === 'expiring' ? 'warning' : 'danger';

    $('content-area').innerHTML = `
      <div class="membership-status">
        <div class="flex items-center justify-between" style="margin-bottom:16px">
          <div class="membership-plan-name">${plan ? plan.icon + ' ' + plan.name + ' Plan' : currentUser.plan}</div>
          <span class="status-badge ${s.cls}"><span class="status-dot"></span>${s.label}</span>
        </div>

        <div class="progress-bar">
          <div class="progress-fill ${progressCls}" style="width:${pct}%"></div>
        </div>

        <div class="membership-dates">
          <span>Start: ${formatDate(currentUser.startDate)}</span>
          <span>End: ${formatDate(currentUser.endDate)}</span>
        </div>

        <div class="membership-countdown">
          ${s.days > 0 ? s.days : 0}
          <span>${s.days > 0 ? 'Days Remaining' : s.days === 0 ? 'Expires Today!' : `Expired ${Math.abs(s.days)} days ago`}</span>
        </div>

        ${s.cls !== 'active' ? `
          <div style="text-align:center;margin-top:24px">
            <button class="btn btn-primary" onclick="App.navigate('payment')">💳 Renew Now</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ---- Member: My Attendance ----
  function renderMyAttendance() {
    const attendance = (DB.get('attendance') || []).filter(a => a.memberId === currentUser.id);
    const sorted = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));

    $('content-area').innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>📋 My Attendance History</h3>
          <span style="font-size:13px;color:var(--text-muted)">${sorted.length} check-in(s)</span>
        </div>
        <div class="panel-body">
          ${sorted.length === 0 ? '<div class="empty-state"><div class="empty-icon">📋</div><p>No attendance recorded yet</p></div>' : `
            <div class="attendance-list">
              ${sorted.map(a => `
                <div class="attendance-item">
                  <div style="font-size:24px">📅</div>
                  <div>
                    <div class="attendance-date">${formatDate(a.date)}</div>
                    <div class="attendance-time">Checked in at ${a.time}</div>
                  </div>
                  <div class="attendance-status">✓ Present</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ---- Payment ----
  function renderPayment() {
    // Member views all plans for renewal
    const html = `
      <div style="margin-bottom:24px">
        <p style="font-size:14px;color:var(--text-secondary)">Choose a plan to renew your membership:</p>
      </div>
      <div class="plans-grid">
        ${Object.entries(PLANS).map(([key, plan], i) => `
          <div class="plan-card ${i === 1 ? 'popular' : ''}">
            <div class="plan-icon">${plan.icon}</div>
            <div class="plan-name">${plan.name}</div>
            <div class="plan-price">₹${plan.price.toLocaleString('en-IN')} <span>/ ${plan.days} days</span></div>
            <div class="plan-duration">${Math.round(plan.price / plan.days)} ₹/day</div>
            <ul class="plan-features">
              <li>Full Gym Access</li>
              <li>Locker Room Access</li>
              ${plan.days >= 90 ? '<li>Personal Trainer Sessions</li>' : '<li>Group Training</li>'}
              ${plan.days >= 180 ? '<li>Diet Plan Consultation</li>' : ''}
            </ul>
            <button class="btn btn-primary btn-block" onclick="App.openPaymentForPlan('${key}')">💳 Pay ₹${plan.price.toLocaleString('en-IN')}</button>
          </div>
        `).join('')}
      </div>
    `;
    $('content-area').innerHTML = html;
  }

  // ---- Payment Gateway ----
  let activePaymentMethod = 'qr';

  function openPaymentForPlan(planKey) {
    const plan = PLANS[planKey];
    if (!plan) return;
    activePaymentMethod = 'qr';

    const memberId = currentUser.role === 'member' ? currentUser.id : null;
    const memberName = currentUser.role === 'member' ? currentUser.name : 'Selected Member';

    renderPaymentModal(planKey);
    $('modal-payment').classList.add('show');
  }

  function renderPaymentModal(planKey) {
    const plan = PLANS[planKey];
    const memberName = currentUser.role === 'member' ? currentUser.name : 'Selected Member';

    $('payment-modal-body').innerHTML = `
      <div id="payment-form-section">
        <div class="payment-total">
          <div>
            <div class="label">Plan: ${plan.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${plan.days} days access</div>
          </div>
          <div class="amount">₹${plan.price.toLocaleString('en-IN')}</div>
        </div>

        ${currentUser.role !== 'member' ? `
          <div class="form-group">
            <label>Select Member</label>
            <select id="payment-member-select" class="form-select">
              <option value="">Select a member...</option>
              ${DB.get('users').filter(u => u.role === 'member').map(m => `<option value="${m.id}">${m.name} (${m.phone})</option>`).join('')}
            </select>
          </div>
        ` : ''}

        <!-- Payment Method Tabs -->
        <div class="pay-method-tabs">
          <button class="pay-method-tab ${activePaymentMethod === 'qr' ? 'active' : ''}" onclick="App.switchPaymentMethod('qr','${planKey}')">
            <span class="pay-tab-icon">📱</span>
            <span>PhonePe QR</span>
          </button>
          <button class="pay-method-tab ${activePaymentMethod === 'cash' ? 'active' : ''}" onclick="App.switchPaymentMethod('cash','${planKey}')">
            <span class="pay-tab-icon">💵</span>
            <span>Cash</span>
          </button>
          <button class="pay-method-tab ${activePaymentMethod === 'card' ? 'active' : ''}" onclick="App.switchPaymentMethod('card','${planKey}')">
            <span class="pay-tab-icon">💳</span>
            <span>Card</span>
          </button>
        </div>

        <!-- QR Payment Section -->
        <div id="pay-section-qr" class="pay-section ${activePaymentMethod === 'qr' ? '' : 'hidden'}">
          <div class="qr-pay-container">
            <div class="qr-pay-header">
              <div class="phonepe-brand">
                <span class="phonepe-logo">पे</span>
                <span class="phonepe-text">PhonePe</span>
              </div>
              <div class="qr-accepted-badge">✅ ACCEPTED HERE</div>
            </div>
            <p style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:16px">Scan & Pay Using PhonePe App</p>
            <div class="qr-pay-image-wrapper">
              <div class="qr-pay-amount-overlay">₹${plan.price.toLocaleString('en-IN')}</div>
              <div id="phonepe-qr-display" style="background:#fff;padding:12px;border-radius:12px;display:inline-block"></div>
            </div>
            <div class="qr-pay-name">DHANRAJ KANU</div>
            <div class="qr-pay-steps">
              <div class="qr-step"><span class="qr-step-num">1</span> Open PhonePe App</div>
              <div class="qr-step"><span class="qr-step-num">2</span> Scan this QR Code</div>
              <div class="qr-step"><span class="qr-step-num">3</span> Pay ₹${plan.price.toLocaleString('en-IN')}</div>
            </div>
            <button class="btn btn-primary btn-block" onclick="App.confirmQRPayment('${planKey}')" id="btn-qr-confirm" style="margin-top:16px">
              ✅ I've Completed the Payment
            </button>
            <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:10px">
              After scanning and paying, click the button above to activate your membership
            </p>
          </div>
        </div>

        <!-- Cash Payment Section -->
        <div id="pay-section-cash" class="pay-section ${activePaymentMethod === 'cash' ? '' : 'hidden'}">
          <div class="cash-pay-container">
            <div class="cash-pay-icon">💵</div>
            <h4 class="cash-pay-title">Pay with Cash</h4>
            <p class="cash-pay-desc">Hand over <strong>₹${plan.price.toLocaleString('en-IN')}</strong> in cash to the gym reception desk.</p>
            
            <div class="cash-pay-info-card">
              <div class="cash-info-row">
                <span class="cash-info-label">Plan</span>
                <span class="cash-info-value">${plan.name}</span>
              </div>
              <div class="cash-info-row">
                <span class="cash-info-label">Duration</span>
                <span class="cash-info-value">${plan.days} Days</span>
              </div>
              <div class="cash-info-row">
                <span class="cash-info-label">Amount</span>
                <span class="cash-info-value" style="color:var(--accent);font-weight:800;font-size:18px">₹${plan.price.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div class="form-group" style="margin-top:16px">
              <label>Receipt / Reference Number (Optional)</label>
              <input type="text" class="form-input" placeholder="Enter receipt number if available" id="cash-receipt-no">
            </div>

            <button class="btn btn-primary btn-block" onclick="App.processCashPayment('${planKey}')" id="btn-cash-pay" style="margin-top:8px">
              💵 Confirm Cash Payment - ₹${plan.price.toLocaleString('en-IN')}
            </button>
            <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:10px">
              ${currentUser.role === 'member' ? '⚠️ Cash payment will be verified by the gym owner/staff' : '✅ As the owner, your confirmation will immediately activate the membership'}
            </p>
          </div>
        </div>

        <!-- Card Payment Section -->
        <div id="pay-section-card" class="pay-section ${activePaymentMethod === 'card' ? '' : 'hidden'}">
          <div class="payment-form">
            <div class="form-group">
              <label>Card Number</label>
              <input type="text" class="form-input" placeholder="4242 4242 4242 4242" maxlength="19" id="card-number"
                oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/(.{4})/g,'$1 ').trim()">
            </div>
            <div class="card-row">
              <div class="form-group">
                <label>Expiry</label>
                <input type="text" class="form-input" placeholder="MM/YY" maxlength="5" id="card-expiry"
                  oninput="if(this.value.length===2&&!this.value.includes('/'))this.value+='/'">
              </div>
              <div class="form-group">
                <label>CVV</label>
                <input type="password" class="form-input" placeholder="•••" maxlength="3" id="card-cvv">
              </div>
            </div>
            <div class="form-group">
              <label>Cardholder Name</label>
              <input type="text" class="form-input" placeholder="Name on card" id="card-name" value="${memberName}">
            </div>

            <button class="btn btn-primary btn-block" onclick="App.processPayment('${planKey}')" id="btn-pay" style="margin-top:8px">
              🔒 Pay ₹${plan.price.toLocaleString('en-IN')}
            </button>

            <p style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:12px">
              🔒 Your payment is secured with 256-bit SSL encryption
            </p>
          </div>
        </div>
      </div>
    `;

    // Generate PhonePe QR code if qrcodejs is available
    if (activePaymentMethod === 'qr') {
      setTimeout(() => {
        const qrEl = document.getElementById('phonepe-qr-display');
        if (qrEl && typeof QRCode !== 'undefined') {
          new QRCode(qrEl, {
            text: 'upi://pay?pa=dhanrajkanu@ybl&pn=DHANRAJ%20KANU&am=' + plan.price + '&cu=INR',
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
        }
      }, 100);
    }
  }

  function switchPaymentMethod(method, planKey) {
    activePaymentMethod = method;
    // Re-render the whole modal to keep member select state
    renderPaymentModal(planKey);
    // Re-generate QR if switching to QR tab
    if (method === 'qr') {
      const plan = PLANS[planKey];
      setTimeout(() => {
        const qrEl = document.getElementById('phonepe-qr-display');
        if (qrEl && typeof QRCode !== 'undefined') {
          new QRCode(qrEl, {
            text: 'upi://pay?pa=dhanrajkanu@ybl&pn=DHANRAJ%20KANU&am=' + plan.price + '&cu=INR',
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
        }
      }, 100);
    }
  }

  function confirmQRPayment(planKey) {
    const plan = PLANS[planKey];
    let memberId = currentUser.role === 'member' ? currentUser.id : null;

    if (currentUser.role !== 'member') {
      const sel = document.getElementById('payment-member-select');
      if (!sel || !sel.value) return toast('Please select a member', 'warning');
      memberId = sel.value;
    }

    const btn = document.getElementById('btn-qr-confirm');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Verifying Payment...';

    setTimeout(() => {
      activateMembership(memberId, planKey, 'PhonePe QR');
    }, 2000);
  }

  function processCashPayment(planKey) {
    const plan = PLANS[planKey];
    let memberId = currentUser.role === 'member' ? currentUser.id : null;

    if (currentUser.role !== 'member') {
      const sel = document.getElementById('payment-member-select');
      if (!sel || !sel.value) return toast('Please select a member', 'warning');
      memberId = sel.value;
    }

    const receiptNo = document.getElementById('cash-receipt-no')?.value.trim() || 'N/A';

    const btn = document.getElementById('btn-cash-pay');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing...';

    setTimeout(() => {
      activateMembership(memberId, planKey, 'Cash', receiptNo);
    }, 1500);
  }

  function activateMembership(memberId, planKey, paymentMethod, receiptNo) {
    const plan = PLANS[planKey];
    const users = DB.get('users');
    const member = users.find(u => u.id === memberId);
    if (member) {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + plan.days);
      member.plan = planKey;
      member.startDate = today.toISOString().split('T')[0];
      member.endDate = endDate.toISOString().split('T')[0];
      member.active = true;
      DB.set('users', users);

      // Remove related notifications
      const notifs = DB.get('notifications') || [];
      const filtered = notifs.filter(n => n.memberId !== memberId);
      DB.set('notifications', filtered);

      // Update current user if member
      if (currentUser.id === memberId) {
        currentUser = member;
      }
    }

    const txnId = 'TXN' + Date.now().toString(36).toUpperCase();

    // Show success
    $('payment-modal-body').innerHTML = `
      <div class="payment-success">
        <div class="success-icon">✅</div>
        <div class="success-title">Payment Successful!</div>
        <div class="success-msg">
          ${plan.name} plan activated for ${member ? member.name : 'member'}.<br>
          Valid until ${formatDate(member.endDate)}<br><br>
          <div class="payment-receipt-card">
            <div class="receipt-row"><span>Payment Method</span><span class="receipt-method-badge">${paymentMethod === 'PhonePe QR' ? '📱 PhonePe QR' : paymentMethod === 'Cash' ? '💵 Cash' : '💳 Card'}</span></div>
            <div class="receipt-row"><span>Transaction ID</span><span>${txnId}</span></div>
            ${receiptNo && receiptNo !== 'N/A' ? `<div class="receipt-row"><span>Receipt No.</span><span>${receiptNo}</span></div>` : ''}
            <div class="receipt-row"><span>Amount Paid</span><span style="color:var(--success);font-weight:800">₹${plan.price.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="App.closePayment();App.navigate(App.currentUser.role==='member'?'my-status':'members')" style="margin-top:20px">
          Continue
        </button>
      </div>
    `;

    toast(`💳 Payment successful via ${paymentMethod}!`, 'success');
  }

  function processPayment(planKey) {
    const plan = PLANS[planKey];
    let memberId = currentUser.role === 'member' ? currentUser.id : null;

    if (currentUser.role !== 'member') {
      const sel = document.getElementById('payment-member-select');
      if (!sel || !sel.value) return toast('Please select a member', 'warning');
      memberId = sel.value;
    }

    const cardNum = document.getElementById('card-number').value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvv = document.getElementById('card-cvv').value;

    if (cardNum.length < 16) return toast('Enter valid card number', 'warning');
    if (!cardExpiry || cardExpiry.length < 5) return toast('Enter valid expiry', 'warning');
    if (!cardCvv || cardCvv.length < 3) return toast('Enter valid CVV', 'warning');

    // Show processing
    const btn = document.getElementById('btn-pay');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing...';

    setTimeout(() => {
      activateMembership(memberId, planKey, 'Card');
    }, 2000);
  }

  function closePayment() {
    $('modal-payment').classList.remove('show');
  }

  // ---- Member Management ----
  function addMember() {
    const name = $('new-member-name').value.trim();
    const phone = $('new-member-phone').value.trim();
    const email = $('new-member-email').value.trim();
    const password = $('new-member-password').value.trim();
    const plan = $('new-member-plan').value;

    if (!name || !phone) return toast('Name and phone are required', 'warning');
    if (!password || password.length < 4) return toast('Set a password (min 4 characters)', 'warning');

    const users = DB.get('users');
    if (users.find(u => u.phone === phone)) return toast('Phone number already exists', 'error');

    const photo = document.getElementById('photo-preview').src;
    const isPhotoSet = !document.getElementById('photo-preview').classList.contains('hidden');

    const id = 'm' + Date.now().toString(36);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + PLANS[plan].days);

    const newMember = {
      id,
      username: phone,
      password: password,
      role: 'member',
      name,
      phone,
      email,
      photo: isPhotoSet ? photo : '',
      plan,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      active: true
    };

    users.push(newMember);
    DB.set('users', users);

    // Reset form
    $('new-member-name').value = '';
    $('new-member-phone').value = '';
    $('new-member-email').value = '';
    $('new-member-password').value = '';
    $('new-member-plan').value = 'monthly';
    $('photo-preview').classList.add('hidden');
    $('photo-preview').src = '';
    $('upload-icon').classList.remove('hidden');

    closeModal('modal-add-member');
    
    // Show credentials summary so owner can share with member
    toast(`✅ ${name} added! Login: Phone: ${phone} | Password: ${password}`, 'success');
    
    // Show a credential card in the content area
    $('content-area').innerHTML = `
      <div class="panel" style="max-width:500px;margin:0 auto">
        <div class="panel-header" style="background:rgba(16,185,129,0.1)">
          <h3>✅ Member Added Successfully!</h3>
        </div>
        <div class="panel-body" style="text-align:center">
          <div style="font-size:48px;margin-bottom:16px">🎉</div>
          <h3 style="font-size:20px;font-weight:700;margin-bottom:20px">${name}</h3>
          
          <div style="background:var(--bg-input);border:1px solid var(--glass-border);border-radius:var(--radius-sm);padding:20px;margin-bottom:20px;text-align:left">
            <h4 style="font-size:14px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">📋 Login Credentials (Share with Member)</h4>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
              <span style="color:var(--text-secondary)">Username (Phone)</span>
              <span style="font-weight:700;color:var(--accent);font-size:16px">${phone}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0">
              <span style="color:var(--text-secondary)">Password</span>
              <span style="font-weight:700;color:var(--accent);font-size:16px">${password}</span>
            </div>
          </div>
          
          <p style="font-size:13px;color:var(--warning);margin-bottom:20px">⚠️ Share these credentials with the member. They can change their password after logging in from Settings.</p>
          
          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn btn-primary" onclick="App.navigate('members')">👥 View Members</button>
            <button class="btn btn-secondary" onclick="App.openModal('modal-add-member')">+ Add Another</button>
          </div>
        </div>
      </div>
    `;
  }

  // ---- Generate Random Password ----
  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    $('new-member-password').value = pw;
    toast('🔑 Password generated! Note it down.', 'info');
  }

  // ---- Change Password ----
  function changePassword() {
    const currentPw = $('change-current-pw').value.trim();
    const newPw = $('change-new-pw').value.trim();
    const confirmPw = $('change-confirm-pw').value.trim();

    if (!currentPw) return toast('Enter your current password', 'warning');
    if (!newPw || newPw.length < 6) return toast('New password must be at least 6 characters', 'warning');
    if (newPw !== confirmPw) return toast('Passwords do not match', 'error');
    if (currentPw === newPw) return toast('New password must be different', 'warning');

    // Verify current password
    const users = DB.get('users');
    const user = users.find(u => u.id === currentUser.id);
    if (!user || user.password !== currentPw) {
      return toast('Current password is incorrect', 'error');
    }

    // Update password
    user.password = newPw;
    DB.set('users', users);
    currentUser = user;

    // Clear form and close modal
    $('change-current-pw').value = '';
    $('change-new-pw').value = '';
    $('change-confirm-pw').value = '';
    closeModal('modal-change-password');

    toast('🔒 Password changed successfully!', 'success');
  }

  // ---- Settings Panel (Member) ----
  function renderSettings() {
    $('content-area').innerHTML = `
      <div class="panel" style="max-width:600px">
        <div class="panel-header">
          <h3>⚙️ Account Settings</h3>
        </div>
        <div class="panel-body">
          <div style="display:flex;align-items:center;gap:16px;padding:20px;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-sm);margin-bottom:20px">
            <div class="user-avatar" style="width:56px;height:56px;border-radius:14px;font-size:20px">
              ${getAvatarHtml(currentUser, '56px')}
            </div>
            <div>
              <div style="font-size:18px;font-weight:700">${currentUser.name}</div>
              <div style="font-size:13px;color:var(--text-muted)">📱 ${currentUser.phone} | ✉️ ${currentUser.email || 'No email'}</div>
            </div>
          </div>

          <h4 style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:16px">🔐 Security</h4>
          
          <div style="padding:20px;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-sm)">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <div style="font-weight:600;margin-bottom:4px">🔒 Change Password</div>
                <div style="font-size:13px;color:var(--text-muted)">Update your login password for better security</div>
              </div>
              <button class="btn btn-sm btn-primary" onclick="App.openModal('modal-change-password')">Change</button>
            </div>
          </div>

          <h4 style="font-size:14px;font-weight:600;color:var(--text-secondary);margin:20px 0 16px">📋 Account Info</h4>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Member ID</div>
              <div style="font-weight:600">${currentUser.id}</div>
            </div>
            <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Username</div>
              <div style="font-weight:600">${currentUser.username}</div>
            </div>
            <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Plan</div>
              <div style="font-weight:600">${PLANS[currentUser.plan] ? PLANS[currentUser.plan].name : currentUser.plan}</div>
            </div>
            <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Joined</div>
              <div style="font-weight:600">${formatDate(currentUser.startDate)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function deleteMember(id) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    const users = DB.get('users').filter(u => u.id !== id);
    DB.set('users', users);

    // Clean up related data
    const attn = (DB.get('attendance') || []).filter(a => a.memberId !== id);
    DB.set('attendance', attn);
    const notifs = (DB.get('notifications') || []).filter(n => n.memberId !== id);
    DB.set('notifications', notifs);

    toast('Member removed', 'success');
    navigate('members');
  }

  function viewMemberProfile(id) {
    const member = getMemberById(id);
    if (!member) return;
    const s = getStatusInfo(member.endDate);
    const plan = PLANS[member.plan];
    const attendance = (DB.get('attendance') || []).filter(a => a.memberId === id);

    $('member-profile-body').innerHTML = `
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:100px;height:100px;border-radius:50%;margin:0 auto 16px;overflow:hidden;border:3px solid var(--glass-border)">
          ${getAvatarHtml(member, '100px')}
        </div>
        <h3 style="font-size:20px;font-weight:700">${member.name}</h3>
        <p style="font-size:13px;color:var(--text-muted);margin-top:4px">ID: ${member.id}</p>
        <div style="margin-top:10px">
          <span class="status-badge ${s.cls}"><span class="status-dot"></span>${s.label}</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">📱 Phone</div>
          <div style="font-weight:600">${member.phone}</div>
        </div>
        <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">📧 Email</div>
          <div style="font-weight:600">${member.email || 'N/A'}</div>
        </div>
        <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">💎 Plan</div>
          <div style="font-weight:600">${plan ? plan.name : member.plan}</div>
        </div>
        <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">📅 Expiry</div>
          <div style="font-weight:600">${formatDate(member.endDate)}</div>
        </div>
        <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">📋 Check-ins</div>
          <div style="font-weight:600">${attendance.length}</div>
        </div>
        <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--glass-border)">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">⏳ Days Left</div>
          <div style="font-weight:600;color:${s.cls === 'active' ? 'var(--success)' : s.cls === 'expiring' ? 'var(--warning)' : 'var(--danger)'}">${s.days > 0 ? s.days + ' days' : 'Expired'}</div>
        </div>
      </div>

      ${s.cls !== 'active' ? `
        <button class="btn btn-primary btn-block" onclick="App.closeModal('modal-member-profile');App.openPaymentForPlan('${member.plan}')">
          💳 Renew Membership
        </button>
      ` : ''}
    `;

    $('modal-member-profile').classList.add('show');
  }

  function sendReminder(memberId) {
    const member = getMemberById(memberId);
    if (!member) return;

    const smsLog = DB.get('smsLog') || [];
    const s = getStatusInfo(member.endDate);
    smsLog.push({
      to: member.phone,
      name: member.name,
      message: `Dear ${member.name}, your GymPro membership has ${s.cls === 'expired' ? 'expired' : 'is expiring soon'}. Please visit the gym or renew online. Contact: 9876543210`,
      date: new Date().toISOString()
    });
    DB.set('smsLog', smsLog);
    toast(`📩 Reminder SMS sent to ${member.name} (${member.phone})`, 'success');
  }

  // ---- Photo Upload ----
  function previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      $('photo-preview').src = e.target.result;
      $('photo-preview').classList.remove('hidden');
      $('upload-icon').classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  // ---- Modal Control ----
  function openModal(id) {
    $(id).classList.add('show');
  }
  function closeModal(id) {
    $(id).classList.remove('show');
  }

  // ---- Check & Refresh Expiry ----
  function checkExpiries() {
    const users = DB.get('users');
    const members = users.filter(u => u.role === 'member');
    const notifications = DB.get('notifications') || [];
    const smsLog = DB.get('smsLog') || [];
    const today = new Date();

    members.forEach(m => {
      const diff = getDaysLeft(m.endDate);
      const existingNotif = notifications.find(n => n.memberId === m.id);

      if (diff <= 0 && !existingNotif) {
        notifications.push({
          id: 'n_' + m.id + '_' + Date.now(),
          type: 'expired',
          memberId: m.id,
          memberName: m.name,
          memberPhone: m.phone,
          memberPhoto: m.photo,
          message: `${m.name}'s membership has EXPIRED on ${formatDate(m.endDate)}`,
          date: today.toISOString(),
          read: false
        });
        smsLog.push({
          to: m.phone,
          name: m.name,
          message: `Dear ${m.name}, your GymPro membership has expired on ${formatDate(m.endDate)}. Please renew!`,
          date: today.toISOString()
        });
        // Update member as inactive
        m.active = false;
      } else if (diff > 0 && diff <= 3 && !existingNotif) {
        notifications.push({
          id: 'n_' + m.id + '_' + Date.now(),
          type: 'expiring',
          memberId: m.id,
          memberName: m.name,
          memberPhone: m.phone,
          memberPhoto: m.photo,
          message: `${m.name}'s membership expires in ${diff} day(s) on ${formatDate(m.endDate)}`,
          date: today.toISOString(),
          read: false
        });
        smsLog.push({
          to: m.phone,
          name: m.name,
          message: `Dear ${m.name}, your GymPro membership expires in ${diff} day(s). Renew now!`,
          date: today.toISOString()
        });
      }
    });

    DB.set('users', users);
    DB.set('notifications', notifications);
    DB.set('smsLog', smsLog);
  }

  // ---- Init ----
  function init() {
    DB.init();
    checkExpiries();
    checkSession();

    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
      });
    });
  }

  window.addEventListener('DOMContentLoaded', init);

  // ---- Public API ----
  return {
    login, demoLogin, logout, navigate, toggleSidebar,
    startScanner, stopScanner, manualAttendance,
    openPaymentForPlan, processPayment, closePayment,
    switchPaymentMethod, confirmQRPayment, processCashPayment,
    addMember, deleteMember, viewMemberProfile,
    sendReminder, previewPhoto, filterMembers,
    openModal, closeModal, generatePassword, changePassword,
    get currentUser() { return currentUser; }
  };
})();
