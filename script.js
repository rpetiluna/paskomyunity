// script.js (module) — FULL COMPLETE: Firebase Auth + Realtime DB + Admin Key
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ----------------- Firebase config ----------------- */
const firebaseConfig = {
  apiKey: "AIzaSyBWxiw46sXM8_bQTVjAZIblYeTQth2-RjY",
  authDomain: "paskomyunity-db.firebaseapp.com",
  databaseURL: "https://paskomyunity-db-default-rtdb.firebaseio.com/",
  projectId: "paskomyunity-db",
  storageBucket: "paskomyunity-db.firebasestorage.app",
  messagingSenderId: "907277048788",
  appId: "1:907277048788:web:0ce58bb6dbfca1527c9441"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

/* ----------------- Realtime refs ----------------- */
const usersRef = ref(db, "users");
const announcementsRef = ref(db, "announcements");
const reportsRef = ref(db, "reports");
const chatsRef = ref(db, "chatMessages");

/* ----------------- Local caches ----------------- */
let users = [];
let announcements = [];
let reports = [];
let chatMessages = [];

/* ----------------- App state ----------------- */
const ADMIN_KEY = "12345";
let currentUser = null;

/* ----------------- Helpers ----------------- */
function snapshotToArray(snapshotVal) {
  if (!snapshotVal) return [];
  return Object.entries(snapshotVal).map(([key, val]) => ({ key, ...val }));
}
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
function timeString(ts) {
  if (!ts && ts !== 0) return '';
  try {
    const d = new Date(Number(ts));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) { return ''; }
}
function byId(id) { return document.getElementById(id); }

/* ----------------- Realtime listeners ----------------- */
onValue(usersRef, snap => {
  users = snapshotToArray(snap.val());
  if (currentUser) {
    const fresh = users.find(u => u.email === currentUser.email);
    if (fresh) currentUser = fresh;
  }
  refreshVisibleContent();
});
onValue(announcementsRef, snap => {
  announcements = snapshotToArray(snap.val());
  refreshVisibleContent();
});
onValue(reportsRef, snap => {
  reports = snapshotToArray(snap.val());
  refreshVisibleContent();
});
onValue(chatsRef, snap => {
  chatMessages = snapshotToArray(snap.val());
  refreshVisibleContent();
});

/* ----------------- Page navigation ----------------- */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = byId(id);
  if (el) el.classList.add('active');
}

byId('btnFrontUser').onclick = () => showPage('pageUserLogin');
byId('btnFrontAdmin').onclick = () => showPage('pageAdminLogin');
byId('userBackBtn').onclick = () => showPage('pageHome');
byId('adminBackBtn').onclick = () => showPage('pageHome');

/* ----------------- User Authentication ----------------- */
byId('userLoginBtn').onclick = async () => {
  const email = byId('userEmail').value.trim();
  const pass = byId('userPassword').value.trim();
  if (!email || !pass) return alert("Enter email and password");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    currentUser = userCredential.user;

    const snap = await get(usersRef);
    const list = snapshotToArray(snap.val());
    let dbUser = list.find(u => u.email === email);

    if (!dbUser) {
      const p = push(usersRef);
      await set(p, {
        email,
        username: email.split('@')[0],
        name: '',
        age: '',
        profile: '',
        banned: false,
        createdAt: Date.now()
      });
      const updatedSnap = await get(usersRef);
      dbUser = snapshotToArray(updatedSnap.val()).find(u => u.email === email);
    }

    currentUser = dbUser;
    loadUserPage(email);
    showPage('pageUserArea');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const p = push(usersRef);
        await set(p, {
          email,
          username: email.split('@')[0],
          name: '',
          age: '',
          profile: '',
          banned: false,
          createdAt: Date.now()
        });
        const snap = await get(usersRef);
        currentUser = snapshotToArray(snap.val()).find(u => u.email === email);
        loadUserPage(email);
        showPage('pageUserArea');
      } catch (err) {
        alert(err.message);
      }
    } else {
      alert(error.message);
    }
  }

  byId('userEmail').value = '';
  byId('userPassword').value = '';
};

/* ----------------- User Logout ----------------- */
byId('userSignOut').onclick = async () => {
  await signOut(auth);
  currentUser = null;
  byId('userContent').innerHTML = '';
  showPage('pageHome');
};

/* ----------------- Admin Login ----------------- */
byId('adminLoginBtn').onclick = () => {
  const email = byId('adminEmail').value.trim();
  const pass = byId('adminPassword').value.trim();
  if (!email || !pass) return alert("Enter admin credentials");

  const key = prompt("Enter Admin Key:");
  if (key !== ADMIN_KEY) return alert("Incorrect Admin Key!");

  loadAdminPage();
  showPage('pageAdminArea');

  byId('adminEmail').value = '';
  byId('adminPassword').value = '';
};

byId('adminSignOut').onclick = () => {
  byId('adminContent').innerHTML = '';
  showPage('pageHome');
};

/* ----------------- UI refresh helpers ----------------- */
function refreshVisibleContent() {
  if (byId('pageUserArea')?.classList.contains('active') && currentUser) {
    const active = ['uAnnouncementsBtn','uReportsBtn','uGeneralBtn','uProfileBtn','uCommunityBtn']
      .find(id => byId(id)?.classList.contains('active'));
    if (active) byId(active).click();
  }
  if (byId('pageAdminArea')?.classList.contains('active')) {
    const active = ['aAnnouncementsBtn','aReportsBtn','aGeneralBtn','aCommunityBtn']
      .find(id => byId(id)?.classList.contains('active'));
    if (active) byId(active).click();
  }
}

/* ----------------- Load User Page ----------------- */
function loadUserPage(email) {
  const uContent = byId('userContent');
  const buttons = ['uAnnouncementsBtn','uReportsBtn','uGeneralBtn','uProfileBtn','uCommunityBtn'];

  buttons.forEach(btn => {
    const el = byId(btn);
    if (!el) return;
    el.onclick = () => {
      buttons.forEach(b => byId(b).classList.remove('active'));
      el.classList.add('active');

      if (btn === 'uAnnouncementsBtn') displayAnnouncements(uContent);
      else if (btn === 'uReportsBtn') userReports(uContent, email);
      else if (btn === 'uGeneralBtn') userChat(uContent, email);
      else if (btn === 'uProfileBtn') userProfile(uContent, email);
      else if (btn === 'uCommunityBtn') userCommunity(uContent, email);
    };
  });

  const defaultBtn = byId('uAnnouncementsBtn');
  if (defaultBtn) defaultBtn.click();
}

/* ----------------- Load Admin Page ----------------- */
function loadAdminPage() {
  const aContent = byId('adminContent');
  const buttons = ['aAnnouncementsBtn','aReportsBtn','aGeneralBtn','aCommunityBtn'];

  buttons.forEach(btn => {
    const el = byId(btn);
    if (!el) return;
    el.onclick = () => {
      buttons.forEach(b => byId(b).classList.remove('active'));
      el.classList.add('active');

      if (btn === 'aAnnouncementsBtn') manageAnnouncements(aContent);
      else if (btn === 'aReportsBtn') reviewReports(aContent);
      else if (btn === 'aGeneralBtn') adminChat(aContent);
      else if (btn === 'aCommunityBtn') adminCommunity(aContent);
    };
  });

  const defaultBtn = byId('aAnnouncementsBtn');
  if (defaultBtn) defaultBtn.click();
}

/* ----------------- Announcements (User) ----------------- */
function displayAnnouncements(container) {
  let html = '<h3>Announcements</h3>';
  if (!announcements || announcements.length === 0) html += '<p>No announcements yet.</p>';
  else {
    const sorted = [...announcements].sort((a,b) => (Number(a.time || a.createdAt || 0) - Number(b.time || b.createdAt || 0)));
    sorted.forEach(a => {
      const t = timeString(a.time ?? a.createdAt);
      html += `<div class="announcement">
        ${escapeHtml(a.text || '')} ${t ? `<span class="time">(${escapeHtml(t)})</span>` : ''}
        <small class="dev-key">ID: ${escapeHtml(a.key)}</small>
      </div>`;
    });
  }
  container.innerHTML = html;
}

/* ----------------- Announcements (Admin manage) ----------------- */
function manageAnnouncements(container) {
  container.innerHTML = `
    <h3>Manage Announcements</h3>
    <input type="text" id="announcementInput" placeholder="Write announcement">
    <button id="addAnnouncementBtn" class="btn">Add</button>
    <div id="announcementList"></div>
  `;
  const list = container.querySelector('#announcementList');

  function refresh() {
    list.innerHTML = '';
    const sorted = [...announcements].sort((a,b) => (Number(a.time || a.createdAt || 0) - Number(b.time || b.createdAt || 0)));
    sorted.forEach(a => {
      list.innerHTML += `<div>${escapeHtml(a.text)} ${a.time ? `<span class="time">(${escapeHtml(timeString(a.time))})</span>` : ''} <small class="dev-key">ID: ${escapeHtml(a.key)}</small>
        <button data-key="${a.key}" class="delBtn">Delete</button></div>`;
    });
    list.querySelectorAll('.delBtn').forEach(btn => {
      btn.onclick = async () => {
        const k = btn.dataset.key;
        if (!confirm('Delete announcement?')) return;
        await remove(ref(db, `announcements/${k}`));
      };
    });
  }
  refresh();

  container.querySelector('#addAnnouncementBtn').onclick = async () => {
    const val = container.querySelector('#announcementInput').value.trim();
    if (!val) return;
    const p = push(announcementsRef);
    await set(p, { text: val, time: Date.now() });
    container.querySelector('#announcementInput').value = '';
  };
}

/* ----------------- Chat (User) ----------------- */
function userChat(container, email) {
  container.innerHTML = `
    <h3>General Chat</h3>
    <div class="chatMessages" id="chatMessages"></div>
    <input type="text" id="chatInput" placeholder="Type a message">
    <button id="sendChatBtn" class="btn">Send</button>
  `;
  const chatBox = container.querySelector('#chatMessages');
  const user = users.find(u => u.email === email) || currentUser;

  function refresh() {
    chatBox.innerHTML = '';
    const sorted = [...chatMessages].sort((a,b) => (Number(a.time || 0) - Number(b.time || 0)));
    sorted.forEach(c => {
      const t = c.time ? timeString(c.time) : '';
      chatBox.innerHTML += `<p><b>${escapeHtml(c.userName)}:</b> ${escapeHtml(c.msg)} ${t ? `<span class="time">(${escapeHtml(t)})</span>` : ''} <small class="dev-key">ID: ${escapeHtml(c.key)}</small></p>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  refresh();

  container.querySelector('#sendChatBtn').onclick = async () => {
    const msg = container.querySelector('#chatInput').value.trim();
    if (!msg) return;
    const p = push(chatsRef);
    await set(p, { user: email, userName: user?.username || 'User', msg, time: Date.now() });
    container.querySelector('#chatInput').value = '';
  };
}

/* ----------------- Chat (Admin) ----------------- */
function adminChat(container) {
  container.innerHTML = `
    <h3>Manage General Chat</h3>
    <div class="chatMessages" id="chatMessages"></div>
    <input type="text" id="chatInput" placeholder="Type a message as Admin">
    <button id="sendChatBtn" class="btn">Send</button>
  `;
  const chatBox = container.querySelector('#chatMessages');

  function refresh() {
    chatBox.innerHTML = '';
    const sorted = [...chatMessages].sort((a,b) => (Number(a.time || 0) - Number(b.time || 0)));
    sorted.forEach(c => {
      const t = c.time ? timeString(c.time) : '';
      chatBox.innerHTML += `<p><b>${escapeHtml(c.userName)}:</b> ${escapeHtml(c.msg)} ${t ? `<span class="time">(${escapeHtml(t)})</span>` : ''} <button data-key="${c.key}" class="btn delBtn">Delete</button> <small class="dev-key">ID: ${escapeHtml(c.key)}</small></p>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;

    chatBox.querySelectorAll('.delBtn').forEach(btn => {
      btn.onclick = async () => {
        const k = btn.dataset.key;
        if (!confirm('Delete message?')) return;
        await remove(ref(db, `chatMessages/${k}`));
      };
    });
  }

  refresh();

  container.querySelector('#sendChatBtn').onclick = async () => {
    const msg = container.querySelector('#chatInput').value.trim();
    if (!msg) return;
    const p = push(chatsRef);
    await set(p, { user: 'admin', userName: 'Admin', msg, time: Date.now() });
    container.querySelector('#chatInput').value = '';
  };
}

/* ----------------- Profile (User) ----------------- */
function userProfile(container, email) {
  const user = users.find(u => u.email === email) || currentUser;
  if (!user) return container.innerHTML = '<p>User not found.</p>';

  container.innerHTML = `
    <h3>Profile Settings</h3>
    <img src="${escapeAttr(user.profile || 'https://via.placeholder.com/80')}" id="profilePreview" width="80" height="80" />
    <input type="text" id="profileName" placeholder="Name" value="${escapeAttr(user.name||'')}">
    <input type="text" id="profileAge" placeholder="Age" value="${escapeAttr(user.age||'')}">
    <input type="text" id="profileUsername" placeholder="Username" value="${escapeAttr(user.username||'')}">
    <input type="text" id="profilePic" placeholder="Profile Image URL" value="${escapeAttr(user.profile||'')}">
    <button id="saveProfileBtn" class="btn">Save</button>
    <div><small class="dev-key">ID: ${escapeHtml(user.key)}</small></div>
  `;

  const picInput = container.querySelector('#profilePic');
  const preview = container.querySelector('#profilePreview');
  picInput.oninput = e => preview.src = e.target.value || 'https://via.placeholder.com/80';

  container.querySelector('#saveProfileBtn').onclick = async () => {
    const updated = {
      name: container.querySelector('#profileName').value.trim(),
      age: container.querySelector('#profileAge').value.trim(),
      username: container.querySelector('#profileUsername').value.trim(),
      profile: container.querySelector('#profilePic').value.trim()
    };
    await update(ref(db, `users/${user.key}`), updated);
    alert('Profile saved!');
  };
}

/* ----------------- Community (User) ----------------- */
function userCommunity(container) {
  container.innerHTML = '<h3>Community Members</h3>';
  const sorted = [...users].sort((a,b) => (Number(a.createdAt || 0) - Number(b.createdAt || 0)));
  sorted.forEach(u => {
    if (u.banned) return;
    container.innerHTML += `<div class="member-item"><img src="${escapeAttr(u.profile||'https://via.placeholder.com/50')}" width="50" height="50"> ${escapeHtml(u.username)} ${u.name ? '('+escapeHtml(u.name)+')' : ''} <small class="dev-key">ID: ${escapeHtml(u.key)}</small></div>`;
  });
}

/* ----------------- Community (Admin) ----------------- */
function adminCommunity(container) {
  container.innerHTML = '<h3>Community Members</h3>';
  const sorted = [...users].sort((a,b) => (Number(a.createdAt || 0) - Number(b.createdAt || 0)));

  sorted.forEach(u => {
    container.innerHTML += `
      <div class="member-item">
        <img src="${escapeAttr(u.profile || 'https://via.placeholder.com/50')}" width="50" height="50">
        ${escapeHtml(u.username)} ${u.name ? '(' + escapeHtml(u.name) + ')' : ''}
        <button class="deleteUserBtn" data-key="${u.key}">Delete</button>
        <small class="dev-key">ID: ${escapeHtml(u.key)}</small>
      </div>
    `;
  });

  container.querySelectorAll('.deleteUserBtn').forEach(btn => {
    btn.onclick = async () => {
      const key = btn.dataset.key;
      if (!confirm("Are you sure you want to DELETE this user permanently?")) return;

      await remove(ref(db, `users/${key}`));

      alert("User deleted successfully.");
    };
  });
}

/* ----------------- Reports (User) ----------------- */
function userReports(container, email) {
  container.innerHTML = `
    <h3>Incident Reports</h3>
    <input type="text" id="reportInput" placeholder="Write report">
    <button id="sendReportBtn" class="btn">Send</button>
    <div id="reportList"></div>
  `;
  const list = container.querySelector('#reportList');

  function refresh() {
    list.innerHTML = '';
    const filtered = reports.filter(r=>r.user===email);
    filtered.forEach(r => {
      list.innerHTML += `<div>${escapeHtml(r.msg)} <small class="dev-key">ID: ${escapeHtml(r.key)}</small></div>`;
    });
  }
  refresh();

  container.querySelector('#sendReportBtn').onclick = async () => {
    const msg = container.querySelector('#reportInput').value.trim();
    if (!msg) return;
    const p = push(reportsRef);
    await set(p, { user: email, msg, time: Date.now() });
    container.querySelector('#reportInput').value = '';
  };
}

/* ----------------- Reports (Admin) ----------------- */
function reviewReports(container) {
  container.innerHTML = '<h3>Review Reports</h3>';
  const sorted = [...reports].sort((a,b)=>Number(a.time||0)-Number(b.time||0));
  sorted.forEach(r => {
    container.innerHTML += `<div>${escapeHtml(r.msg)} <b>by ${escapeHtml(r.user)}</b> <small class="dev-key">ID: ${escapeHtml(r.key)}</small></div>`;
  });
}

/* ----------------- Initial safety bindings ----------------- */
(function initUIBindings(){
  ['uGeneralBtn','uAnnouncementsBtn','uCommunityBtn','uReportsBtn','uProfileBtn','aGeneralBtn','aAnnouncementsBtn','aCommunityBtn','aReportsBtn']
    .forEach(id => { const el = document.getElementById(id); if(el&&!el.onclick) el.onclick=()=>{}; });
})();

