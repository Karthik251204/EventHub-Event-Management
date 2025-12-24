const express = require('express');
const pool = require('../db');
const { verifyToken } = require('./auth');

const router = express.Router();

// CREATE PAYMENT
router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { booking_id, payment_method, transaction_id } = req.body;

    if (!booking_id || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get booking details
    const bookingResult = await client.query(
      'SELECT id, user_id, total_price FROM bookings WHERE id = $1',
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status) 
       VALUES ($1, $2, $3, $4, 'completed') 
       RETURNING *`,
      [booking_id, booking.total_price, payment_method, transaction_id || null]
    );

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    client.release();
  }
});

// GET PAYMENT HISTORY
router.get('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT p.*, b.event_id, e.title as event_title 
       FROM payments p 
       LEFT JOIN bookings b ON p.booking_id = b.id 
       LEFT JOIN events e ON b.event_id = e.id 
       WHERE b.user_id = $1 
       ORDER BY p.created_at DESC`,
      [req.user.userId]
    );

    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  } finally {
    client.release();
  }
});

// ORGANIZER: SET PAYMENT DETAILS
router.post('/organizer/details', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ error: 'Only organizers can set payment details' });
    }

    const { account_holder_name, account_number, bank_name, ifsc_code } = req.body;

    if (!account_holder_name || !account_number || !bank_name || !ifsc_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert or update payment details
    const result = await client.query(
      `INSERT INTO organizer_payments (organizer_id, account_holder_name, account_number, bank_name, ifsc_code) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (organizer_id) 
       DO UPDATE SET account_holder_name = $2, account_number = $3, bank_name = $4, ifsc_code = $5, updated_at = NOW() 
       RETURNING *`,
      [req.user.userId, account_holder_name, account_number, bank_name, ifsc_code]
    );

    res.status(201).json({
      message: 'Payment details saved successfully',
      details: result.rows[0],
    });
  } catch (error) {
    console.error('Set payment details error:', error);
    res.status(500).json({ error: 'Failed to save payment details' });
  } finally {
    client.release();
  }
});

// ORGANIZER: GET PAYMENT DETAILS
router.get('/organizer/details', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ error: 'Only organizers can view payment details' });
    }

    const result = await client.query(
      'SELECT * FROM organizer_payments WHERE organizer_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment details not found' });
    }

    res.json({ details: result.rows[0] });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  } finally {
    client.release();
  }
});

module.exports = router;
