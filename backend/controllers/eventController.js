const pool = require('../db');

// Create a new event
const createEvent = async (req, res) => {
  try {
    const { title, category, event_date, location, ticket_price, total_seats, description } = req.body;
    // Assuming req.user is populated by your auth middleware
    const organizer_id = req.user ? req.user.id : null;
    
    // Parse numbers to ensure valid data types
    const priceVal = parseFloat(ticket_price);
    const seatsVal = parseInt(total_seats);
    const availableVal = seatsVal; // Initially, available = total

    // Handle image upload (if multer is used)
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    // Schema expects images as TEXT[]
    const images = image_url ? [image_url] : [];

    const query = `
      INSERT INTO events (organizer_id, title, category, event_date, location, ticket_price, total_seats, available_seats, description, image_url, images)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    
    // Map ticket_price to ticket_price column, and include image_url for compatibility
    const values = [organizer_id, title, category, event_date, location, priceVal, seatsVal, availableVal, description, image_url, images];
    const result = await pool.query(query, values);
    
    res.status(201).json({ message: 'Event created successfully', event: result.rows[0] });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all events (or filter by organizer if needed)
const getEvents = async (req, res) => {
  try {
    let query = 'SELECT * FROM events';
    const values = [];

    // Support filtering by organizer (used by analytics)
    if (req.query.organizer) {
      query += ' WHERE organizer_id = $1';
      values.push(req.query.organizer);
    }

    query += ' ORDER BY event_date DESC';
    const result = await pool.query(query, values);
    res.status(200).json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single event by ID
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM events WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createEvent, getEvents, getEventById };