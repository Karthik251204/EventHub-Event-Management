const express = require('express');
const pool = require('../db');
const { verifyToken } = require('./auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimeType && extname) {
      return cb(null, true);
    }
    cb('Error: File type not allowed!');
  }
});

// CREATE EVENT (organizer only)
router.post('/', verifyToken, upload.single('event-cover'), async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ error: 'Only organizers can create events' });
    }

    const {
      title,
      description,
      location,
      event_date,
      ticket_price,
      total_seats,
      category,
    } = req.body;

    // The image_url will come from the uploaded file
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!title || !location || !event_date || !ticket_price || !total_seats) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await client.query(
      `INSERT INTO events 
       (organizer_id, title, description, location, event_date, ticket_price, total_seats, available_seats, image_url, category) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        req.user.userId,
        title,
        description || null,
        location,
        event_date,
        ticket_price,
        total_seats,
        total_seats,
        imageUrl,
        category || null,
      ]
    );

    res.status(201).json({
      message: 'Event created successfully',
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    client.release();
  }
});

// GET ALL EVENTS (public)
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { category, search, limit = 20, offset = 0 } = req.query;

    const queryParams = [];
    let baseQuery = 'FROM events WHERE event_date >= NOW()';

    if (category) {
      baseQuery += ` AND category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }

    if (search) {
      baseQuery += ` AND (title ILIKE $${queryParams.length + 1} OR description ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }
    
    // Count total results using the built-up filters
    const countQuery = `SELECT COUNT(*)::int ${baseQuery}`;
    const countResult = await client.query(countQuery, queryParams);
    const total = countResult.rows[0].count;

    // Get paginated results
    const dataParams = [...queryParams]; // Clone params for the data query
    const dataQuery = `SELECT * ${baseQuery} ORDER BY event_date ASC LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`;
    dataParams.push(limit, offset); // Add pagination params only to the data query

    const result = await client.query(dataQuery, dataParams);
    
    res.json({ events: result.rows, total });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  } finally {
    client.release();
  }
});

// GET SINGLE EVENT (public)
router.get('/:id', async (req, res) => {
  console.log('GET /api/events/:id');
  const client = await pool.connect();
  try {
    const { id } = req.params;
    console.log(`Fetching event with id: ${id}`);

    const result = await client.query(
      `SELECT e.*, u.name as organizer_name, u.email as organizer_email 
       FROM events e 
       LEFT JOIN users u ON e.organizer_id = u.id 
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`Event with id: ${id} not found`);
      return res.status(404).json({ error: 'Event not found' });
    }

    console.log(`Event with id: ${id} found`, result.rows[0]);
    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  } finally {
    client.release();
  }
});

// UPDATE EVENT (organizer only)
router.put('/:id', verifyToken, upload.single('event-cover'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { title, category, event_date, location, ticket_price, total_seats, description } = req.body;

    // Check if event exists and user is organizer
    const checkEvent = await client.query('SELECT organizer_id, image_url FROM events WHERE id = $1', [id]);

    if (checkEvent.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (checkEvent.rows[0].organizer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const currentEvent = checkEvent.rows[0];
    const newImageUrl = req.file ? `/uploads/${req.file.filename}` : currentEvent.image_url;

    // Build the update query dynamically
    const updateFields = {
      title,
      category,
      event_date,
      location,
      ticket_price,
      total_seats,
      description,
      image_url: newImageUrl,
    };

    const querySet = [];
    const queryParams = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        querySet.push(`${key} = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
    }

    if (querySet.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    queryParams.push(id); // Add the event ID for the WHERE clause

    const result = await client.query(
      `UPDATE events 
       SET ${querySet.join(', ')},
           updated_at = NOW() 
       WHERE id = $${paramIndex}
       RETURNING *`,
      queryParams
    );

    res.json({
      message: 'Event updated successfully',
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  } finally {
    client.release();
  }
});

// DELETE EVENT (organizer only)
router.delete('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const checkEvent = await client.query('SELECT organizer_id FROM events WHERE id = $1', [id]);

    if (checkEvent.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (checkEvent.rows[0].organizer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await client.query('DELETE FROM events WHERE id = $1', [id]);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  } finally {
    client.release();
  }
});

module.exports = router;
