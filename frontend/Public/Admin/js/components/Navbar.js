const navbar = document.getElementById('navbar');

function renderNavbar() {
  const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
  const userJSON = localStorage.getItem(CONFIG.STORAGE.USER);
  const user = token && userJSON ? JSON.parse(userJSON) : null;
  const isSpecialPage = window.location.pathname.endsWith('profile.html') || window.location.pathname.endsWith('edit.html');

  let navContent = '';
  
  if (token && user) {
    if (isSpecialPage) {
      // User is logged in and on the profile page
      navContent = `
        <div class="nav-inner container">
          <div class="nav-logo">
            <span>EventHub Admin</span>
          </div>
          <div class="nav-actions">
            <button id="back-btn" class="btn btn-primary">Back</button>
            <button id="logout-btn" class="btn btn-primary">Logout</button>
          </div>
        </div>
      `;
    } else {
      // User is logged in but not on the profile page
      navContent = `
        <div class="nav-inner container">
          <div class="nav-logo">
            <span>EventHub Admin</span>
          </div>
          <div class="nav-actions">
            <button id="profile-btn" class="btn btn-primary">Profile</button>
            <button id="logout-btn" class="btn btn-primary">Logout</button>
          </div>
        </div>
      `;
    }
  } else {
    // User is not logged in
    navContent = `
      <div class="nav-inner container">
        <div class="nav-logo">
          <span>EventHub Admin</span>
        </div>
        <div class="nav-actions">
          <a href="/Public/auth/pages/login.html" class="btn btn-primary">Login</a>
        </div>
      </div>
    `;
  }

  navbar.innerHTML = navContent;

  if (token && user) {
    if (isSpecialPage) {
      const backBtn = document.getElementById('back-btn');
      const logoutBtn = document.getElementById('logout-btn');
      if (backBtn) backBtn.addEventListener('click', () => {
        window.history.back();
      });
      if (logoutBtn) logoutBtn.addEventListener('click', logout);
    } else {
      const profileBtn = document.getElementById('profile-btn');
      const logoutBtn = document.getElementById('logout-btn');
      if (profileBtn) profileBtn.addEventListener('click', viewProfile);
      if (logoutBtn) logoutBtn.addEventListener('click', logout);
    }
  }
}

function viewProfile() {
  window.location.href = './profile.html';
}

function logout() {
  localStorage.removeItem(CONFIG.STORAGE.TOKEN);
  localStorage.removeItem(CONFIG.STORAGE.USER);
  window.location.href = 'http://13.203.105.12:8001/';
}

document.addEventListener('DOMContentLoaded', renderNavbar);
