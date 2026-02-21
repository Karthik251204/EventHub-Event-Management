const express = require('express');
const pool = require('../db');
const {authenticateToken}= require('../middleware/authmiddleware');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// --- 1. LOGGING MIDDLEWARE ---
// This will print the request body to your console for every request to this route
const logRequestBody = (req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] 📩 Incoming ${req.method} request to ${req.originalUrl}`);
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    next();
};

// GET ORGANIZER BOOKINGS (Bookings for events hosted by the logged-in organizer)
router.get('/organizer', authenticateToken, async (req, res) => {
  try {
    const organizerId = req.user.userId || req.user.id;
    const result = await pool.query(
      `SELECT b.*, e.title as event_title, e.event_date, u.name as user_name, u.email as user_email 
       FROM bookings b 
       JOIN events e ON b.event_id = e.id 
       JOIN users u ON b.user_id = u.id 
       WHERE e.organizer_id = $1 
       ORDER BY b.created_at DESC`,
      [organizerId]
    );
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Error fetching organizer bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET USER BOOKINGS
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await pool.query(
      `SELECT b.*, e.title, e.event_date, e.location, e.image_url 
       FROM bookings b 
       LEFT JOIN events e ON b.event_id = e.id 
       WHERE b.user_id = $1 
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ bookings: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// CANCEL BOOKING
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    const bookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    if (booking.booking_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Already cancelled' });
    }

    await client.query(
      "UPDATE bookings SET booking_status = 'cancelled' WHERE id = $1",
      [id]
    );

    await client.query(
      'UPDATE events SET available_seats = available_seats + $1 WHERE id = $2',
      [booking.seats_booked, booking.event_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Cancellation failed' });
  } finally {
    client.release();
  }
});

// --- 2. VALIDATION RULES ---
const validateBooking = [
    body('user_id')
        .notEmpty().withMessage('user_id is missing')
        .isInt().withMessage('user_id must be an integer'),
    
    body('event_id')
        .notEmpty().withMessage('event_id is missing')
        .isInt().withMessage('event_id must be an integer'),
    
    body('number_of_seats')
        .notEmpty().withMessage('number_of_seats is missing')
        .isInt({ min: 1 }).withMessage('number_of_seats must be at least 1'),
    
    body('total_price')
        .notEmpty().withMessage('total_price is missing')
        .isFloat({ min: 0 }).withMessage('total_price must be a positive number'),
    
    body('ticket_holder_name')
        .notEmpty().withMessage('ticket_holder_name is missing')
        .isString().withMessage('ticket_holder_name must be a string'),
    
    body('ticket_holder_email')
        .notEmpty().withMessage('ticket_holder_email is missing')
        .isEmail().withMessage('ticket_holder_email must be a valid email'),
    
    body('ticket_holder_mobile')
        .notEmpty().withMessage('ticket_holder_mobile is missing'),

    // Payment fields (required for your logic, even if not in bookings table)
    body('payment_method').notEmpty().withMessage('payment_method is missing'),
    body('transaction_id').notEmpty().withMessage('transaction_id is missing')
];

// --- 3. Apply Middleware and Validation ---
router.post('/', logRequestBody, authenticateToken, validateBooking, async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('❌ Validation Failed:', errors.array());
        return res.status(400).json({ 
            error: 'Missing required fields', 
            details: errors.array() // This sends the specific missing field back to frontend
        });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { 
            user_id, event_id, number_of_seats, total_price, status,
            ticket_holder_name, ticket_holder_email, ticket_holder_mobile,
            payment_method, transaction_id, amount
        } = req.body;

        // 1. Insert into bookings table
        const bookingQuery = `
            INSERT INTO bookings (
                user_id, event_id, number_of_seats, total_price, status, 
                ticket_holder_name, ticket_holder_email, ticket_holder_mobile, 
                booking_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *;
        `;
        
        const bookingValues = [
            user_id, event_id, number_of_seats, total_price, status || 'confirmed',
            ticket_holder_name, ticket_holder_email, ticket_holder_mobile
        ];

        const bookingResult = await client.query(bookingQuery, bookingValues);
        const newBooking = bookingResult.rows[0];

        // 2. Insert into payments table
        const paymentQuery = `
            INSERT INTO payments (
                booking_id, amount, payment_method, transaction_id, status
            )
            VALUES ($1, $2, $3, $4, 'completed')
            RETURNING *;
        `;
        
        // Use amount from body or fallback to total_price
        const paymentAmount = amount || total_price;
        await client.query(paymentQuery, [newBooking.id, paymentAmount, payment_method, transaction_id]);

        // 3. Update available seats
        await client.query(
            'UPDATE events SET available_seats = available_seats - $1 WHERE id = $2',
            [number_of_seats, event_id]
        );

        await client.query('COMMIT');

        console.log('✅ Booking created successfully:', newBooking.id);
        res.status(201).json({ 
            message: 'Booking confirmed', 
            booking: newBooking 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Database Error:', err);
        res.status(500).json({ error: 'Server error processing booking' });
    } finally {
        client.release();
    }
});

module.exports = router;