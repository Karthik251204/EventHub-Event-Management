/**
 * API Service
 * Handles all communication with the backend
 */

class ApiService {
  constructor() {
    this.baseURL = CONFIG.API.BASE_URL;
    this.timeout = CONFIG.API.TIMEOUT;
  }

  /**
   * Get Authorization Header
   */
  getAuthHeader() {
    const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
    if (!token) return {};
    
    // Check if token is expired
    if (Utils.isTokenExpired(token)) {
      this.logout();
      throw new Error('Session expired. Please login again.');
    }
    
    return {
      Authorization: `Bearer ${token}`
    };
  }

  /**
   * Make API Request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      ...options.headers,
      ...this.getAuthHeader()
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeout)
    };

    try {
      const response = await fetch(url, config);
      
      // Handle errors
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new ApiError(
          response.status,
          error.error || error.message || 'An error occurred',
          error
        );
      }

      // Handle success
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }

      if (error instanceof TypeError) {
        throw new ApiError(0, CONFIG.MESSAGES.NETWORK_ERROR);
      }

      throw error;
    }
  }

  /**
   * GET Request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * POST Request
   */
  async post(endpoint, data, options = {}) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body
    });
  }

  /**
   * PUT Request
   */
  async put(endpoint, data, options = {}) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body
    });
  }

  /**
   * DELETE Request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }

  /**
   * ===== AUTHENTICATION =====
   */

  /**
   * Signup
   */
  async signup(data) {
    const response = await this.post('/auth/signup', {
      name: data.name,
      mobile: data.mobile,
      role: data.role,
      email: data.email,
      password: data.password
    });

    // Save token and user
    if (response.token) {
      this.saveAuth(response.token, response.user);
    }

    return response;
  }

  /**
   * Login
   */
  async login(email, password) {
    const response = await this.post('/auth/login', { email, password });

    // Save token and user
    if (response.token) {
      this.saveAuth(response.token, response.user);
    }

    return response;
  }

  /**
   * Get Profile
   */
  async getProfile() {
    return this.get('/auth/profile');
  }

  /**
   * Save Authentication
   */
  saveAuth(token, user) {
    localStorage.setItem(CONFIG.STORAGE.TOKEN, token);
    localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(user));
  }

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.USER);
    Utils.redirect(CONFIG.PAGES.LOGIN);
  }

  /**
   * ===== EVENTS =====
   */

  /**
   * Get All Events
   */
  async getEvents(params = {}) {
    let endpoint = '/events';
    if (Object.keys(params).length > 0) {
      const query = new URLSearchParams(params).toString();
      endpoint += `?${query}`;
    }
    return this.get(endpoint);
  }

  /**
   * Get Event By ID
   */
  async getEventById(eventId) {
    return this.get(`/events/${eventId}`);
  }

  /**
   * Create Event (Organizer only)
   */
  async createEvent(data) {
    return this.post('/events', data);
  }

  /**
   * Update Event (Organizer only)
   */
  async updateEvent(eventId, data) {
    return this.put(`/events/${eventId}`, data);
  }

  /**
   * Delete Event (Organizer only)
   */
  async deleteEvent(eventId) {
    return this.delete(`/events/${eventId}`);
  }

  /**
   * ===== BOOKINGS =====
   */

  /**
   * Get User Bookings
   */
  async getBookings() {
    return this.get('/bookings');
  }

  /**
   * Get Booking By ID
   */
  async getBookingById(bookingId) {
    return this.get(`/bookings/${bookingId}`);
  }

  /**
   * Create Booking
   */
  async createBooking(data) {
    return this.post('/bookings', data);
  }

  /**
   * Cancel Booking
   */
  async cancelBooking(bookingId) {
    return this.put(`/bookings/${bookingId}/cancel`, {});
  }

  /**
   * Check In to Event
   */
  async checkInEvent(bookingId, data = {}) {
    return this.post(`/bookings/${bookingId}/checkin`, data);
  }

  /**
   * Get Check-ins for Booking
   */
  async getCheckIns(bookingId) {
    return this.get(`/bookings/${bookingId}/checkins`);
  }

  /**
   * ===== PAYMENTS =====
   */

  /**
   * Get Payment History
   */
  async getPayments() {
    return this.get('/payments');
  }

  /**
   * Record Payment
   */
  async recordPayment(data) {
    return this.post('/payments', data);
  }

  /**
   * Get Organizer Bank Details
   */
  async getOrganizerDetails() {
    return this.get('/payments/organizer/details');
  }

  /**
   * Set Organizer Bank Details
   */
  async setOrganizerDetails(data) {
    return this.post('/payments/organizer/details', data);
  }
}

/**
 * API Error Class
 */
class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Create singleton instance
const api = new ApiService();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiService, ApiError };
}
