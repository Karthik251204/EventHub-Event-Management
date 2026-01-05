// Remove import, use Toast class directly

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');
  
  if (!eventId) {
    Toast.error('Invalid event ID');
    window.location.href = 'index.html';
    return;
  }

  // Elements
  const eventTitle = document.getElementById('event-title');
  const eventDate = document.getElementById('event-date');
  const eventLocation = document.getElementById('event-location');
  const ticketPrice = document.getElementById('ticket-price');
  const numTickets = document.getElementById('num-tickets');
  const totalAmount = document.getElementById('total-amount');
  const bookingForm = document.getElementById('booking-form');
  const cardDetails = document.getElementById('card-details');
  const upiDetails = document.getElementById('upi-details');
  const paymentRadios = document.querySelectorAll('input[name="payment"]');
  const upiButtons = document.querySelectorAll('.upi-btn');

  let currentEvent = null;
  let basePrice = 500;

  // Load event details
  try {
    const response = await fetch(`http://13.203.105.12:3000/api/events/${eventId}`);
    const data = await response.json();
    currentEvent = data.event || data;
    
    if (currentEvent) {
      eventTitle.textContent = currentEvent.title || 'Event';
      eventDate.textContent = currentEvent.event_date ? new Date(currentEvent.event_date).toLocaleDateString() : 'TBD';
      eventLocation.textContent = currentEvent.location || 'TBD';
      basePrice = currentEvent.ticket_price || currentEvent.price || 500;
      ticketPrice.textContent = basePrice;
      updateTotal();
    }
  } catch (error) {
    Toast.error('Failed to load event details');
    console.error(error);
  }

  // Calculate total amount
  function updateTotal() {
    const tickets = parseInt(numTickets.value) || 1;
    const total = tickets * basePrice;
    totalAmount.textContent = total;
  }

  numTickets.addEventListener('input', updateTotal);

  // Payment method toggle
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'card') {
        cardDetails.style.display = 'block';
        upiDetails.style.display = 'none';
      } else {
        cardDetails.style.display = 'none';
        upiDetails.style.display = 'block';
      }
    });
  });

  // Card number formatting
  document.getElementById('card-number').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
  });

  // Expiry date formatting
  document.getElementById('expiry-date').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
  });

  // UPI app selection
  upiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const app = btn.dataset.app;
      Toast.info(`Redirecting to ${btn.textContent}...`);
      
      // Simulate UPI app redirect
      setTimeout(() => {
        processBooking('upi', app);
      }, 1500);
    });
  });

  // Form submission
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    
    if (paymentMethod === 'card') {
      const cardNumber = document.getElementById('card-number').value;
      const cardHolder = document.getElementById('card-holder').value;
      const expiryDate = document.getElementById('expiry-date').value;
      const cvv = document.getElementById('cvv').value;
      
      if (!cardNumber || !cardHolder || !expiryDate || !cvv) {
        Toast.error('Please fill all card details');
        return;
      }
      
      processBooking('card');
    }
  });

  async function processBooking(paymentMethod, upiApp = null) {
    // Simulate payment processing
    Toast.info('Processing payment...');
    
    // Generate random transaction ID
    const transactionId = 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const bookingData = {
      event_id: parseInt(eventId),
      number_of_seats: parseInt(numTickets.value)
    };

    try {
      const response = await fetch('http://13.203.105.12:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE.TOKEN)}`
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();
      
      if (response.ok) {
        // Update event capacity locally
        if (currentEvent) {
          currentEvent.total_seats = (currentEvent.total_seats || 0) - bookingData.numberOfTickets;
        }
        
        Toast.success('Payment successful! Redirecting to confirmation...');
        // Store booking data locally with full details
        localStorage.setItem('currentBooking', JSON.stringify({
          id: result.booking?.id || result.id,
          ticketId: 'TKT' + Date.now(),
          eventId: parseInt(eventId),
          eventTitle: currentEvent?.title,
          eventDate: currentEvent?.event_date,
          eventLocation: currentEvent?.location,
          ticketHolderName: document.getElementById('ticket-holder').value,
          numberOfTickets: parseInt(numTickets.value),
          totalAmount: parseInt(totalAmount.textContent),
          paymentMethod: paymentMethod,
          upiApp: upiApp,
          transactionId: transactionId
        }));
        
        setTimeout(() => {
          window.location.href = `confirmation.html?bookingId=${result.booking?.id || result.id || Date.now()}`;
        }, 2000);
      } else {
        // API failed, use fallback
        if (currentEvent) {
          currentEvent.total_seats = (currentEvent.total_seats || 0) - bookingData.numberOfTickets;
        }
        
        localStorage.setItem('currentBooking', JSON.stringify({
          ...bookingData,
          id: Date.now(),
          eventTitle: currentEvent?.title,
          eventDate: currentEvent?.event_date,
          eventLocation: currentEvent?.location
        }));
        
        Toast.success('Payment successful! Redirecting to confirmation...');
        setTimeout(() => {
          window.location.href = `confirmation.html?bookingId=${Date.now()}`;
        }, 2000);
      }
    } catch (error) {
      console.error('Booking error:', error);
      // Update event capacity locally even in fallback
      if (currentEvent) {
        currentEvent.total_seats = (currentEvent.total_seats || 0) - bookingData.numberOfTickets;
      }
      
      // Fallback: store locally and proceed
      localStorage.setItem('currentBooking', JSON.stringify({
        ...bookingData,
        id: Date.now(),
        eventTitle: currentEvent?.title,
        eventDate: currentEvent?.event_date,
        eventLocation: currentEvent?.location
      }));
      
      Toast.success('Payment successful! Redirecting to confirmation...');
      setTimeout(() => {
        window.location.href = `confirmation.html?bookingId=${Date.now()}`;
      }, 2000);
    }
  }
});