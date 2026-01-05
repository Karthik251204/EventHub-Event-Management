document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  
  if (!bookingId) {
    Toast.error('No booking ID found');
    window.location.href = 'index.html';
    return;
  }

  let bookingData;
  
  // Try to get from localStorage first (fallback)
  const localBooking = localStorage.getItem('currentBooking');
  if (localBooking) {
    bookingData = JSON.parse(localBooking);
  } else {
    // Try API if no local data
    try {
      const response = await fetch(`http://13.203.105.12:3000/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE.TOKEN)}`
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        bookingData = result.booking || result;
      } else {
        Toast.error('Failed to load booking details');
        window.location.href = 'index.html';
        return;
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      Toast.error('Failed to load booking details');
      window.location.href = 'index.html';
      return;
    }
  }

  // Populate ticket details (handle both API and localStorage formats)
  document.getElementById('ticket-id').textContent = bookingData.ticketId || bookingData.ticket_id || 'N/A';
  document.getElementById('event-name').textContent = bookingData.eventTitle || bookingData.event?.title || 'Event';
  document.getElementById('ticket-holder').textContent = bookingData.ticketHolderName || bookingData.ticket_holder_name || 'N/A';
  document.getElementById('num-tickets').textContent = bookingData.numberOfTickets || bookingData.number_of_tickets || '1';
  document.getElementById('event-date').textContent = bookingData.eventDate ? new Date(bookingData.eventDate).toLocaleDateString() : (bookingData.event?.event_date ? new Date(bookingData.event.event_date).toLocaleDateString() : 'TBD');
  document.getElementById('event-location').textContent = bookingData.eventLocation || bookingData.event?.location || 'TBD';
  document.getElementById('total-amount').textContent = bookingData.totalAmount || bookingData.total_amount || '0';
  
  const paymentMethod = bookingData.paymentMethod || bookingData.payment_method || 'card';
  const upiApp = bookingData.upiApp || bookingData.upi_app;
  const paymentText = paymentMethod === 'upi' 
    ? `UPI (${upiApp || 'App'})` 
    : 'Credit/Debit Card';
  document.getElementById('payment-method').textContent = paymentText;
  
  // Add transaction ID if available
  const transactionId = bookingData.transactionId || bookingData.transaction_id;
  if (transactionId) {
    const transactionRow = document.createElement('tr');
    transactionRow.innerHTML = `
      <td><strong>Transaction ID:</strong></td>
      <td>${transactionId}</td>
    `;
    document.querySelector('.details-table tbody').appendChild(transactionRow);
  }

  // Generate QR Code
  const qrData = {
    ticketId: bookingData.ticketId || bookingData.ticket_id || 'N/A',
    bookingId: bookingData.id || bookingId,
    eventId: bookingData.eventId || bookingData.event_id || 'N/A',
    eventTitle: bookingData.eventTitle || bookingData.event?.title || 'Event',
    ticketHolder: bookingData.ticketHolderName || bookingData.ticket_holder_name || 'N/A',
    numberOfTickets: bookingData.numberOfTickets || bookingData.number_of_tickets || '1',
    totalAmount: bookingData.totalAmount || bookingData.total_amount || '0',
    eventDate: bookingData.eventDate || bookingData.event?.event_date || 'TBD',
    eventLocation: bookingData.eventLocation || bookingData.event?.location || 'TBD'
  };

  const qrString = JSON.stringify(qrData);
  
  const qrContainer = document.getElementById('qr-code');
  if (qrContainer) {
    // Wait longer for QRCode library to load
    const generateQR = () => {
      if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(qrContainer, qrString, {
          width: 200,
          height: 200,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }, (error) => {
          if (error) {
            console.error('QR Code generation failed:', error);
            qrContainer.innerHTML = '<p style="color: #9ca3af;">QR Code unavailable</p>';
          }
        });
      } else {
        // Try again after 1 second
        setTimeout(generateQR, 1000);
      }
    };
    
    // Start trying to generate QR code
    setTimeout(generateQR, 100);
  }

  // Download ticket functionality
  const downloadBtn = document.getElementById('download-ticket');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const ticketId = bookingData.ticketId || bookingData.ticket_id || 'N/A';
      const eventTitle = bookingData.eventTitle || bookingData.event?.title || 'Event';
      const ticketHolder = bookingData.ticketHolderName || bookingData.ticket_holder_name || 'N/A';
      const numTickets = bookingData.numberOfTickets || bookingData.number_of_tickets || '1';
      const totalAmount = bookingData.totalAmount || bookingData.total_amount || '0';
      const eventDate = bookingData.eventDate || bookingData.event?.event_date;
      const eventLocation = bookingData.eventLocation || bookingData.event?.location || 'TBD';
      const transactionId = bookingData.transactionId || bookingData.transaction_id || 'N/A';
      
      const ticketContent = `
EVENTHUB TICKET
================
Ticket ID: ${ticketId}
Event: ${eventTitle}
Ticket Holder: ${ticketHolder}
Number of Tickets: ${numTickets}
Event Date: ${eventDate ? new Date(eventDate).toLocaleDateString() : 'TBD'}
Location: ${eventLocation}
Total Amount: ₹${totalAmount}
Payment Method: ${paymentText}
Transaction ID: ${transactionId}
Booking Date: ${new Date().toLocaleDateString()}

Please show this ticket and QR code at the event entrance.
================
      `;

      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Background gradient effect
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 297, 'F');
        
        // Main ticket container with rounded corners effect
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, 20, 180, 200, 8, 8, 'F');
        
        // Header section with colored background
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(15, 20, 180, 40, 8, 8, 'F');
        
        // EventHub logo/title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('EVENTHUB', 25, 35);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('DIGITAL TICKET', 25, 50);
        
        // Ticket ID in header
        doc.setFontSize(12);
        doc.text(`ID: ${ticketId}`, 140, 45);
        
        // Event title section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(eventTitle, 25, 80);
        
        // Decorative line
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(2);
        doc.line(25, 85, 185, 85);
        
        // Details section with icons (using symbols)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        // Ticket holder
        doc.setTextColor(100, 100, 100);
        doc.text('• TICKET HOLDER', 25, 105);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(ticketHolder, 25, 115);
        
        // Event date
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('• EVENT DATE', 25, 130);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(eventDate ? new Date(eventDate).toLocaleDateString() : 'TBD', 25, 140);
        
        // Location
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('• VENUE', 25, 155);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(eventLocation, 25, 165);
        
        // Tickets count
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('• TICKETS', 25, 180);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`${numTickets} Ticket(s)`, 25, 190);
        
        // QR Code section with border
        const qrCanvas = document.querySelector('#qr-code canvas');
        if (qrCanvas) {
          // QR background
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(125, 95, 60, 80, 4, 4, 'F');
          
          // QR border
          doc.setDrawColor(16, 185, 129);
          doc.setLineWidth(1);
          doc.roundedRect(125, 95, 60, 80, 4, 4, 'S');
          
          const qrDataURL = qrCanvas.toDataURL('image/png');
          doc.addImage(qrDataURL, 'PNG', 135, 105, 40, 40);
          
          // QR label
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(9);
          doc.text('SCAN QR CODE', 140, 155);
          doc.text('AT ENTRANCE', 142, 165);
        }
        
        // Payment info section
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 230, 180, 30, 4, 4, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Amount Paid: ₹${totalAmount}`, 25, 245);
        doc.text(`Payment: ${paymentText}`, 25, 255);
        doc.text(`Transaction: ${transactionId}`, 120, 245);
        
        // Footer with instructions
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text('Please present this ticket and QR code at the event entrance for verification.', 25, 275);
        doc.text('Keep this ticket safe and arrive 30 minutes before the event starts.', 25, 285);
        
        // Decorative border
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(3);
        doc.rect(10, 15, 190, 210, 'S');
        
        // Save PDF
        doc.save(`EventHub-Ticket-${ticketId}.pdf`);
        
        Toast.success('Ticket PDF downloaded successfully!');
      } catch (error) {
        console.error('PDF generation failed:', error);
        Toast.error('PDF generation failed. Please try again.');
      }
    });
  }

  // Back to home
  document.getElementById('back-home').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
});