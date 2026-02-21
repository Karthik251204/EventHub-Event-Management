document.addEventListener('DOMContentLoaded', async () => {
  // Get the event ID from the URL query parameters (support both 'id' and 'eventId')
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id') || urlParams.get('eventId');

  console.log('Booking Page Loaded. Event ID:', eventId);

  // API Base URL
  const API_BASE = 'http://localhost:3000/api';
  const SERVER_URL = 'http://localhost:3000';

  // DOM Elements - Support multiple common ID naming conventions
  // Helper to find elements by ID or Class
  const getElement = (selectors) => {
    for (const selector of selectors) {
      // Try ID first, then Class
      const el = document.getElementById(selector) || document.querySelector(`.${selector}`);
      if (el) return el;
    }
    return null;
  };

  const eventNameEl = getElement(['event-name', 'event-title', 'title', 'event_title']);
  const eventDateEl = getElement(['event-date', 'event-time', 'event-date-time', 'date', 'time', 'event_date']);
  const eventLocationEl = getElement(['event-location', 'event-venue', 'location', 'venue', 'event_location']);
  const eventDescriptionEl = getElement(['event-description', 'event-desc', 'description', 'desc', 'event_description']);
  const eventPriceEl = getElement(['event-price', 'event-cost', 'price', 'cost', 'ticket-price']);
  const eventImageEl = getElement(['event-image', 'event-img', 'image', 'img', 'event_image']);
  
  // Store price for calculation
  let currentTicketPrice = 0;
  let currentEventDate = new Date().toISOString(); // Default fallback
  let currentOrganizerId = null;

  console.log('Booking Page Elements Found:', { eventNameEl, eventDateEl, eventLocationEl });

  // --- DYNAMICALLY ADD MISSING INPUT FIELDS (Name, Email, Mobile) ---
  // This ensures the form has all required inputs even if the HTML is incomplete
  const bookingForm = document.getElementById('booking-form') || document.querySelector('form');
  const submitBtn = document.getElementById('submit-btn') || document.querySelector('button[type="submit"]');

  if (bookingForm && submitBtn) {
      const missingFieldsContainer = document.createElement('div');
      missingFieldsContainer.style.marginBottom = '1rem';
      let fieldsHtml = '';

      // Check and add Name field if missing
      if (!document.getElementById('ticket-holder')) {
          fieldsHtml += `
              <div style="margin-bottom: 1rem;">
                  <label for="ticket-holder" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Ticket Holder Name</label>
                  <input type="text" id="ticket-holder" required 
                      style="display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem;"
                      placeholder="Enter full name">
              </div>`;
      }

      // Check and add Email field if missing
      if (!document.getElementById('ticket-email')) {
          fieldsHtml += `
              <div style="margin-bottom: 1rem;">
                  <label for="ticket-email" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Email Address</label>
                  <input type="email" id="ticket-email" required 
                      style="display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem;"
                      placeholder="Enter email address">
              </div>`;
      }

      // Check and add Mobile field if missing
      if (!document.getElementById('ticket-mobile')) {
          fieldsHtml += `
              <div style="margin-bottom: 1rem;">
                  <label for="ticket-mobile" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Mobile Number</label>
                  <input type="tel" id="ticket-mobile" required 
                      style="display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem;"
                      placeholder="Enter mobile number">
              </div>`;
      }

      if (fieldsHtml) {
          missingFieldsContainer.innerHTML = fieldsHtml;
          // Insert fields before the submit button
          submitBtn.parentElement.insertBefore(missingFieldsContainer, submitBtn);
      }
  }
  // -----------------------------------------------------

  // Show loading state to indicate script is active
  if (eventNameEl) eventNameEl.textContent = 'Loading Event Details...';
  if (eventDateEl) eventDateEl.textContent = '';
  if (eventLocationEl) eventLocationEl.textContent = 'Please wait...';
  if (eventDescriptionEl) eventDescriptionEl.textContent = '';
  if (eventPriceEl) eventPriceEl.textContent = '';

  if (!eventId) {
    console.error('No event ID found in URL');
    if (typeof Toast !== 'undefined') Toast.error('Invalid Event URL');
    return;
  }

  try {
    // Fetch event details from the database via API
    console.log(`Fetching event details for ID: ${eventId}...`);
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      // Handle response structure: { event: {...} } or just {...}
      const event = data.event || data; 
      console.log('Event data received:', event);

      // Populate the page with event details
      if (eventNameEl) eventNameEl.textContent = event.title || event.name || 'N/A';
      
      if (eventDateEl) {
        const dateStr = event.event_date || event.date;
        if (dateStr) currentEventDate = dateStr;
        eventDateEl.textContent = dateStr ? new Date(dateStr).toLocaleString() : 'Date TBD';
      }

      if (eventLocationEl) eventLocationEl.textContent = event.location || 'N/A';
      if (eventDescriptionEl) eventDescriptionEl.textContent = event.description || '';
      
      // Extract price and update global state regardless of UI element presence
      const price = (event.ticket_price !== undefined) ? event.ticket_price : event.price;
      currentTicketPrice = price || 0;
      // Improved organizer ID extraction to handle various API response formats
      currentOrganizerId = event.organizer_id || event.organizerId || (event.organizer ? (event.organizer.id || event.organizer._id) : null);

      if (eventPriceEl) {
        eventPriceEl.textContent = (price && price > 0) ? `₹${price}` : 'Free';
      }

      // Update global price for calculation in booking.html
      if (typeof window.updateBookingPrice === 'function') {
        window.updateBookingPrice(price || 0);
      }
      
      // If there is an image element and the event has an image URL
      let imageUrl = (event.images && event.images.length > 0) ? event.images[0] : (event.image_url || event.image);
      if (eventImageEl && imageUrl) {
        if (!imageUrl.startsWith('http')) {
            if (!imageUrl.startsWith('/')) imageUrl = '/' + imageUrl;
            imageUrl = `${SERVER_URL}${imageUrl}`;
        }
        eventImageEl.src = imageUrl;
        eventImageEl.alt = event.title || event.name || 'Event Image';
      }

      // Pre-fill user details if logged in
      const userJSON = localStorage.getItem('user') || localStorage.getItem('auth_user');
      if (userJSON) {
          try {
              const u = JSON.parse(userJSON);
              if (document.getElementById('ticket-email') && u.email) document.getElementById('ticket-email').value = u.email;
              if (document.getElementById('ticket-mobile') && (u.mobile || u.phone)) document.getElementById('ticket-mobile').value = u.mobile || u.phone;
              if (document.getElementById('ticket-holder') && u.name) document.getElementById('ticket-holder').value = u.name;
          } catch(e) {}
      }
    } else {
      throw new Error('Event not found');
    }
  } catch (error) {
    console.error('Error fetching event data:', error);
    if (typeof Toast !== 'undefined') Toast.error('Could not load event details.');
  }

  // Handle Booking Form Submission
  if (bookingForm) { // Use the form reference we got earlier
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('submit-btn') || bookingForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Processing...';

      try {
        const token = localStorage.getItem('token') || 
                      localStorage.getItem('authToken') || 
                      localStorage.getItem('eventhub_token') ||
                      localStorage.getItem('auth_token');

        if (!token) {
          alert('Please login to book tickets');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          return;
        }

        const numTicketsInput = document.getElementById('num-tickets');
        const numTickets = numTicketsInput ? (parseInt(numTicketsInput.value) || 1) : 1;
        // Ensure ticket holder name is not empty
        const ticketHolderInput = document.getElementById('ticket-holder');
        const ticketHolder = ticketHolderInput ? (ticketHolderInput.value.trim() || 'Demo User') : 'Demo User';
        
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'card';
        const totalAmount = numTickets * currentTicketPrice;

        // Get user ID from local storage
        const userJSON = localStorage.getItem('user') || localStorage.getItem('auth_user');
        const user = userJSON ? JSON.parse(userJSON) : null;
        const userId = user ? (user.id || user.userId) : null;

        if (!userId) {
          alert('User session invalid. Please login again.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          return;
        }
        
        // Demo Mode: Payment is simulated
        console.log('Processing payment (Demo Mode)...');

        const transactionId = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const ticketId = 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        // Get values from the newly injected fields or fallbacks
        const ticketEmail = document.getElementById('ticket-email')?.value.trim() || (user && user.email) || 'user@example.com';
        const ticketMobile = document.getElementById('ticket-mobile')?.value.trim() || (user && (user.mobile || user.phone)) || '9999999999';

        // 1. Prepare API Payload - Reordered and Comprehensive
        const apiPayload = {
            // --- Database Columns (bookings table) ---
            event_id: !isNaN(Number(eventId)) ? Number(eventId) : eventId,
            user_id: !isNaN(Number(userId)) ? Number(userId) : userId,
            number_of_seats: Number(numTickets),
            total_price: Number(totalAmount),
            status: 'confirmed',
            booking_date: new Date().toISOString(),
            ticket_holder_name: ticketHolder,
            ticket_holder_email: ticketEmail,
            ticket_holder_mobile: ticketMobile,
            
            // --- Payment Details (payments table) ---
            payment_method: paymentMethod,
            transaction_id: transactionId,
            amount: Number(totalAmount),
            
            // --- Common API Requirements (Aliases & Fallbacks) ---
            organizer_id: currentOrganizerId ? Number(currentOrganizerId) : 1, // Fallback to 1 to prevent 400 error
            ticket_id: ticketId,
            quantity: Number(numTickets),
            mobile: ticketMobile,
            email: ticketEmail,
            name: ticketHolder,
            
            // --- Dummy Payment Data (To pass strict validators) ---
            card_number: '1234567812345678',
            cvv: '123',
            expiry_date: '12/25',
            billing_name: ticketHolder,
            billing_email: ticketEmail,
            billing_phone: ticketMobile,
            billing_address: 'Demo Address',
            zip_code: '100001',
            country: 'India',
            
            // --- Redundant Aliases (To handle different backend naming conventions) ---
            eventId: !isNaN(Number(eventId)) ? Number(eventId) : eventId,
            userId: !isNaN(Number(userId)) ? Number(userId) : userId,
            organizerId: currentOrganizerId ? Number(currentOrganizerId) : 1,
            customerId: !isNaN(Number(userId)) ? Number(userId) : userId,
            number_of_tickets: Number(numTickets),
            tickets: Number(numTickets),
            total_amount: Number(totalAmount),
            ticket_price: Number(currentTicketPrice),
            unit_price: Number(currentTicketPrice),
            bookingDate: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            ticketId: ticketId,
            ticketHolderName: ticketHolder,
            customer_name: ticketHolder,
            customer_email: ticketEmail,
            phone_number: ticketMobile,
            customer_phone: ticketMobile,
            ticket_holder_phone: ticketMobile,
        };

        // 2. Prepare Frontend Data - For confirmation page & localStorage
        const frontendData = {
            ...apiPayload,
            booking_date: new Date().toISOString(),
            payment_method: paymentMethod,
            transaction_id: transactionId,
            ticket_holder_name: ticketHolder,
            ticket_holder_email: ticketEmail,
            ticket_holder_mobile: ticketMobile,
            event_date: currentEventDate,
            eventTitle: eventNameEl ? eventNameEl.textContent : 'Event',
            eventLocation: eventLocationEl ? eventLocationEl.textContent : 'Location',
            ticketId: ticketId
        };

        // Save to localStorage for confirmation page fallback
        localStorage.setItem('currentBooking', JSON.stringify(frontendData));

        // --- DEBUG: Print all required fields to console to find missing ones ---
        console.group('%c🔍 Payload Validation Check', 'color: blue; font-weight: bold; font-size: 12px;');
        const debugFields = [
            'user_id', 'event_id', 'number_of_seats', 'total_price', 
            'ticket_holder_name', 'ticket_holder_email', 'ticket_holder_mobile',
            'payment_method', 'transaction_id', 'organizer_id'
        ];
        
        debugFields.forEach(field => {
            const val = apiPayload[field];
            // Check if value is null, undefined, or empty string (allow 0 for IDs)
            const isPresent = val !== null && val !== undefined && val !== '';
            const status = isPresent ? '✅ OK' : '❌ MISSING';
            console.log(`${field.padEnd(25)}: ${val} [${status}]`);
        });
        console.groupEnd();
        // -----------------------------------------------------------------------

        console.log('Sending API Payload:', apiPayload);

        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(apiPayload)
        });

        const result = await response.json();

        if (response.ok) {
           const bookingId = result.booking ? result.booking.id : (result.id || result.bookingId);
           
           if (!bookingId) {
             console.warn('Success response but no booking ID:', result);
           } else {
             console.log('✅ Booking created in DB with ID:', bookingId);
           }
           
           // Update localStorage with the real ID from DB
           frontendData.id = bookingId;
           localStorage.setItem('currentBooking', JSON.stringify(frontendData));

           // Success UI
           submitBtn.innerHTML = 'Payment Done';
           submitBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
           submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');

           setTimeout(() => {
               window.location.href = `confirmation.html?bookingId=${bookingId}`;
           }, 1000);
        } else {
           console.error('Server Error:', result);
           alert('Booking Failed: ' + (result.message || result.error || 'Unknown error'));
           submitBtn.disabled = false;
           submitBtn.innerHTML = originalBtnText;
        }
      } catch (error) {
        console.error('Booking Process Error:', error);
        alert('An error occurred: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
});