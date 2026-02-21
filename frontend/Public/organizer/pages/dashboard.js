const API_BASE = 'http://localhost:3000/api';
const SERVER_URL = 'http://localhost:3000';

// Helper to safely get token from various possible keys
function getToken() {
    return localStorage.getItem('token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('eventhub_token') ||
           localStorage.getItem('auth_token') ||
           (typeof CONFIG !== 'undefined' && CONFIG.STORAGE ? localStorage.getItem(CONFIG.STORAGE.TOKEN) : null);
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboardStats();
    loadMyEvents();
    
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Setup Form Submit
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSave);
    }
});

// --- Authentication & Navigation ---

function checkAuth() {
    const token = getToken();
    
    if (!token || token === 'null' || token === 'undefined') {
        console.warn('No valid token found, redirecting to login.');
        window.location.href = '/Public/auth/pages/login.html';
        return;
    }

    // Update UI with user info
    const userStr = localStorage.getItem('user') || 
                    localStorage.getItem('auth_user') ||
                    (typeof CONFIG !== 'undefined' && CONFIG.STORAGE ? localStorage.getItem(CONFIG.STORAGE.USER) : null);

    if (userStr) {
        const user = JSON.parse(userStr);
        const name = user.username || user.name || 'Organizer';
        
        document.getElementById('top-username').textContent = name;
        document.getElementById('drop-username').textContent = name;
        document.getElementById('top-email').textContent = user.email || '';
        document.getElementById('drop-email').textContent = user.email || '';
        
        const initial = name.charAt(0).toUpperCase();
        document.getElementById('user-initials').textContent = initial;
    }
}

// Global functions for HTML onclick attributes
window.showSection = function(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    // Show target section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`Section element not found: ${sectionId}-section`);
    }
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    const navLink = document.getElementById(`nav-${sectionId}`);
    if (navLink) navLink.classList.add('active');

    // Refresh data if needed
    if (sectionId === 'events') loadMyEvents();
    if (sectionId === 'dashboard') loadDashboardStats();
    if (sectionId === 'profile') loadProfile();
};

window.toggleDropdown = function() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('active');
};

window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('eventhub_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    if (typeof CONFIG !== 'undefined' && CONFIG.STORAGE) {
        localStorage.removeItem(CONFIG.STORAGE.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE.USER);
    }
    window.location.href = '/index.html';
};

// --- Dashboard Logic ---

async function loadDashboardStats() {
    const token = getToken();
    
    // Get User ID
    const userStr = localStorage.getItem('user') || 
                    localStorage.getItem('auth_user') ||
                    (typeof CONFIG !== 'undefined' && CONFIG.STORAGE ? localStorage.getItem(CONFIG.STORAGE.USER) : null);
    const userId = userStr ? JSON.parse(userStr).id : null;

    try {
        // Try to fetch count. If backend /count endpoint is missing/broken, fallback to fetching all.
        const url = userId ? `${API_BASE}/events?organizer=${userId}` : `${API_BASE}/events`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const events = data.events || data; // Handle {events: []} or []
            
            // Update Stats
            document.getElementById('stat-events').textContent = events.length || 0;
            
            // Calculate Revenue (Mock logic as example)
            const totalRevenue = events.reduce((acc, ev) => acc + (ev.ticket_price * (ev.booked_seats || 0)), 0);
            // document.querySelector('.stat-card:nth-child(2) h3').textContent = `₹${totalRevenue}`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// --- Events Management ---

async function loadMyEvents() {
    const container = document.getElementById('events-list-container');
    const token = getToken();
    
    // Get User ID
    const userStr = localStorage.getItem('user') || 
                    localStorage.getItem('auth_user') ||
                    (typeof CONFIG !== 'undefined' && CONFIG.STORAGE ? localStorage.getItem(CONFIG.STORAGE.USER) : null);
    const userId = userStr ? JSON.parse(userStr).id : null;
    
    container.innerHTML = '<p>Loading...</p>';

    try {
        const url = userId ? `${API_BASE}/events?organizer=${userId}` : `${API_BASE}/events`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const events = data.events || data;

            if (events.length === 0) {
                container.innerHTML = '<p>No events found. Create one!</p>';
                return;
            }

            container.innerHTML = events.map(ev => {
                // Handle both new 'images' array and old 'image_url' format
                let displayImage = (ev.images && ev.images.length > 0) ? ev.images[0] : (ev.image_url || 'https://via.placeholder.com/150');
                if (displayImage && displayImage.startsWith('/')) {
                    displayImage = `${SERVER_URL}${displayImage}`;
                }
                return `
                <div class="event-card">
                    <img src="${displayImage}" alt="Event">
                    <div class="event-details">
                        <h3>${ev.title}</h3>
                        <p><strong>Date:</strong> ${new Date(ev.event_date).toLocaleDateString()}</p>
                        <p><strong>Location:</strong> ${ev.location}</p>
                        <p><strong>Price:</strong> ₹${ev.price || ev.ticket_price} | <strong>Seats:</strong> ${ev.total_seats}</p>
                    </div>
                </div>
            `}).join('');
        } else {
            container.innerHTML = '<p style="color:red">Failed to load events.</p>';
        }
    } catch (error) {
        console.error('Error loading events:', error);
        container.innerHTML = '<p style="color:red">Connection error.</p>';
    }
}

async function handleEventSave(e) {
    e.preventDefault();
    const token = getToken();
    const saveBtn = document.getElementById('save-btn');
    
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    const formData = new FormData();
    formData.append('title', document.getElementById('ev-title').value);
    formData.append('category', document.getElementById('ev-cat').value);
    formData.append('event_date', document.getElementById('ev-date').value);
    formData.append('location', document.getElementById('ev-loc').value);
    formData.append('ticket_price', document.getElementById('ev-price').value);
    formData.append('total_seats', document.getElementById('ev-seats').value);
    formData.append('description', document.getElementById('ev-desc').value);
    
    const fileInput = document.getElementById('ev-files');
    if (fileInput.files.length > 0) {
        formData.append('image', fileInput.files[0]);
    }

    try {
        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Content-Type is automatically set for FormData
            },
            body: formData
        });

        if (response.ok) {
            alert('Event created successfully!');
            document.getElementById('event-form').reset();
            showSection('events');
        } else {
            let errorMsg = 'Failed to save';
            try {
                const err = await response.json();
                errorMsg = err.message || errorMsg;
            } catch (e) {
                errorMsg = `Server Error: ${response.status} ${response.statusText}`;
            }
            alert('Error: ' + errorMsg);
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('Connection failed');
    } finally {
        saveBtn.textContent = 'Save Event';
        saveBtn.disabled = false;
    }
}

async function loadProfile() {
    const token = getToken();
    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const user = data.user || data;

            const nameEl = document.getElementById('prof-name');
            const emailEl = document.getElementById('prof-email');
            const mobileEl = document.getElementById('prof-mobile');
            const roleEl = document.getElementById('prof-role');

            if (nameEl) nameEl.value = user.username || user.name || '';
            if (emailEl) emailEl.value = user.email || '';
            if (mobileEl) mobileEl.value = user.mobile || '';
            if (roleEl) roleEl.value = user.role || 'Organizer';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}