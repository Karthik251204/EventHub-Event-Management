document.addEventListener('DOMContentLoaded', () => {
    loadBookings();
    
    // Tab switching logic
    window.filterBookings = (type) => {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (type === 'all' && tab.textContent.includes('All')) tab.classList.add('active');
            if (type === 'upcoming' && tab.textContent.includes('Upcoming')) tab.classList.add('active');
            if (type === 'past' && tab.textContent.includes('Past')) tab.classList.add('active');
        });

        const cards = document.querySelectorAll('.booking-card');
        cards.forEach(card => {
            if (type === 'all') {
                card.style.display = 'flex';
            } else {
                card.style.display = card.dataset.type === type ? 'flex' : 'none';
            }
        });
    };
});

async function loadBookings() {
    const container = document.getElementById('bookingContainer');
    const API_BASE = 'http://localhost:3000/api';
    const SERVER_URL = 'http://localhost:3000';
    
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('eventhub_token') ||
                  localStorage.getItem('auth_token');

    if (!token) {
        window.location.href = '/Public/auth/pages/login.html';
        return;
    }

    container.innerHTML = '<p style="text-align:center; padding: 2rem;">Loading your bookings...</p>';

    try {
        const response = await fetch(`${API_BASE}/bookings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const bookings = data.bookings || [];

            if (bookings.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 4rem 2rem;">
                        <i class="fas fa-ticket-alt" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                        <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">No bookings yet</h3>
                        <p style="color: #64748b; margin-bottom: 2rem;">You haven't booked any events yet.</p>
                        <a href="dashboard.html#events" class="btn btn-primary">Browse Events</a>
                    </div>
                `;
                return;
            }

            container.innerHTML = bookings.map(booking => {
                // Backend returns flat structure with joined event fields, so fallback to booking object
                const event = booking.event || booking;
                // Determine if event is past or upcoming based on event date
                const eventDate = new Date(event.event_date || event.date || booking.booking_date);
                const isPast = eventDate < new Date();
                const type = isPast ? 'past' : 'upcoming';
                
                // Handle image URL
                let imageUrl = (event.images && event.images.length > 0) ? event.images[0] : (event.image_url || event.image || 'https://via.placeholder.com/500x300');
                if (imageUrl && !imageUrl.startsWith('http')) {
                    if (!imageUrl.startsWith('/')) imageUrl = '/' + imageUrl;
                    imageUrl = `${SERVER_URL}${imageUrl}`;
                }

                const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : (booking.status === 'pending' ? 'status-pending' : 'status-past');
                const statusText = booking.status ? booking.status.toUpperCase() : (isPast ? 'ATTENDED' : 'CONFIRMED');

                return `
                    <div class="booking-card" data-type="${type}">
                        <div class="event-img" style="background-image: url('${imageUrl}');"></div>
                        <div class="booking-details">
                            <div class="booking-top">
                                <div>
                                    <h3 class="event-name">${event.title || event.name || 'Event Name Unavailable'}</h3>
                                    <div class="event-meta">
                                        <span><i class="far fa-calendar"></i> ${eventDate.toLocaleDateString()} ${eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span><i class="fas fa-map-marker-alt"></i> ${event.location || 'Location TBD'}</span>
                                    </div>
                                </div>
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </div>
                            <div class="booking-footer">
                                <div>
                                    <span style="font-size: 0.8rem; color: var(--gray); display: block;">Ticket ID</span>
                                    <span class="ticket-id">#${booking.transaction_id || booking.id}</span>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button class="btn btn-primary" onclick="window.location.href='confirmation.html?bookingId=${booking.id}'">View Ticket</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            throw new Error('Failed to fetch bookings');
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="text-align:center; color: red;">Error loading bookings. Please try again later.</p>';
    }
}