const express = require('express');
const pool = require('../db');
const { verifyToken } = require('./auth');

const router = express.Router();

// CREATE BOOKING
router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { event_id, number_of_seats } = req.body;

    if (!event_id || !number_of_seats) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (number_of_seats < 1) {
      return res.status(400).json({ error: 'At least 1 seat required' });
    }

    // Get event details
    const eventResult = await client.query(
      'SELECT id, ticket_price, available_seats FROM events WHERE id = $1',
      [event_id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    if (event.available_seats < number_of_seats) {
      return res.status(400).json({ 
        error: `Not enough seats available. Available: ${event.available_seats}` 
      });
    }

    // Calculate total price
    const totalPrice = event.ticket_price * number_of_seats;

    // Create booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, event_id, number_of_seats, total_price, status) 
       VALUES ($1, $2, $3, $4, 'confirmed') 
       RETURNING *`,
      [req.user.userId, event_id, number_of_seats, totalPrice]
    );

    // Update available seats
    await client.query(
      'UPDATE events SET available_seats = available_seats - $1 WHERE id = $2',
      [number_of_seats, event_id]
    );

    res.status(201).json({
      message: 'Booking created successfully',
      booking: bookingResult.rows[0],
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  } finally {
    client.release();
  }
});

// GET USER BOOKINGS
router.get('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT b.*, e.title, e.event_date, e.location, e.image_url 
       FROM bookings b 
       LEFT JOIN events e ON b.event_id = e.id 
       WHERE b.user_id = $1 
       ORDER BY b.created_at DESC`,
      [req.user.userId]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  } finally {
    client.release();
  }
});

// GET SINGLE BOOKING
router.get('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(
      `SELECT b.*, e.title, e.event_date, e.location, e.image_url 
       FROM bookings b 
       LEFT JOIN events e ON b.event_id = e.id 
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  } finally {
    client.release();
  }
});

// CANCEL BOOKING
router.put('/:id/cancel', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Get booking details
    const bookingResult = await client.query(
      'SELECT id, user_id, event_id, number_of_seats, status FROM bookings WHERE id = $1',
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    // Update booking status
    await client.query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', id]
    );

    // Release seats back to event
    await client.query(
      'UPDATE events SET available_seats = available_seats + $1 WHERE id = $2',
      [booking.number_of_seats, booking.event_id]
    );

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

// CHECK-IN
router.post('/:id/checkin', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { qr_code } = req.body;

    // Verify booking belongs to user
    const bookingResult = await client.query(
      'SELECT id FROM bookings WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Create check-in record
    const checkinResult = await client.query(
      `INSERT INTO checkins (booking_id, qr_code) 
       VALUES ($1, $2) 
       RETURNING *`,
      [id, qr_code || null]
    );

    res.status(201).json({
      message: 'Check-in successful',
      checkin: checkinResult.rows[0],
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  } finally {
    client.release();
  }
});

// GET CHECK-INS FOR BOOKING
router.get('/:id/checkins', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Verify booking
    const bookingCheck = await client.query(
      'SELECT user_id FROM bookings WHERE id = $1',
      [id]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (bookingCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await client.query(
      'SELECT * FROM checkins WHERE booking_id = $1 ORDER BY checkin_time DESC',
      [id]
    );

    res.json({ checkins: result.rows });
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  } finally {
    client.release();
  }
});

module.exports = router;
