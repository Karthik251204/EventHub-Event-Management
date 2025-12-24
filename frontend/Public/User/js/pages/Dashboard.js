import { getUserBookings, getOrganizerAnalytics } from '../services/api.js';
import { getCurrentUser } from '../services/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const stats = document.getElementById('stats');
  const bookingsList = document.getElementById('bookings-list');
  const user = getCurrentUser();

  if (!user) {
    window.location.href = '/frontend/pages/login-register.html';
    return;
  }

  async function loadDashboard() {
    try {
      if (user.role === 'organizer') {
        await loadOrganizerDashboard(user.id);
      } else {
        await loadUserDashboard(user.id);
      }
    } catch (error) {
      console.error('Dashboard load failed:', error);
    }
  }

  async function loadUserDashboard(userId) {
    const bookings = await getUserBookings(userId);
    bookingsList.innerHTML = `
      <h2>Your Bookings</h2>
      ${bookings.map(booking => `
        <div class="event-card">
          <h3>${booking.eventName}</h3>
          <p>${booking.date} | Seat: ${booking.seatNumber}</p>
          <p>Status: ${booking.status}</p>
        </div>
      `).join('')}
    `;
  }

  async function loadOrganizerDashboard(organizerId) {
    const analytics = await getOrganizerAnalytics(organizerId);
    stats.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">₹${analytics.totalRevenue}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${analytics.totalRegistrations}</div>
        <div class="stat-label">Registrations</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${analytics.noShowRate}%</div>
        <div class="stat-label">No-Show Rate</div>
      </div>
    `;
  }

  loadDashboard();
});
