import { getOrganizerBookings } from '../../../User/js/services/api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize dashboard tabs
    setupTabs();
    
    // Check if we should load bookings initially (e.g. hash is #bookings)
    if (window.location.hash === '#bookings') {
        const tab = document.querySelector('[data-target="bookings"]');
        if (tab) tab.click();
    } else {
        // Default to loading bookings if the section is active by default
        const bookingsSection = document.getElementById('bookings');
        if (bookingsSection && bookingsSection.classList.contains('active')) {
            loadBookings();
        }
    }
});

function setupTabs() {
    // Assuming your tabs have class 'tab-btn' and data-target attribute
    const tabs = document.querySelectorAll('.tab-btn, .sidebar-link'); 
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Prevent default if it's a link
            if (e.target.tagName === 'A') e.preventDefault();

            const targetId = tab.dataset.target || tab.getAttribute('href')?.substring(1);
            if (!targetId) return;
            
            // Load data based on tab
            if (targetId === 'bookings') {
                loadBookings();
            }
        });
    });
}

async function loadBookings() {
    // Ensure you have a <tbody> with id="bookings-table-body" in your HTML
    const container = document.getElementById('bookings-table-body'); 
    if (!container) {
        console.warn('Bookings table body not found (id="bookings-table-body")');
        return;
    }
    
    container.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Loading bookings...</td></tr>';
    
    try {
        const bookings = await getOrganizerBookings();
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No bookings found for your events.</td></tr>';
            return;
        }
        
        container.innerHTML = bookings.map(booking => `
            <tr>
                <td>#${booking.id}</td>
                <td>${booking.event_title || 'N/A'}</td>
                <td>
                    <div style="font-weight:500">${booking.ticket_holder_name || booking.user_name}</div>
                    <div style="font-size:0.85em; color:#666">${booking.ticket_holder_email || booking.user_email}</div>
                </td>
                <td>${booking.number_of_seats}</td>
                <td>₹${booking.total_price}</td>
                <td>${new Date(booking.created_at).toLocaleDateString()}</td>
                <td>
                    <span class="status-badge ${booking.status}">${booking.status}</span>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        container.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding: 20px;">Error loading bookings.</td></tr>';
    }
}