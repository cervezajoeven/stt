// /routes/calendar.js

// Import required modules
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Create an Express router
const router = express.Router();

// Enable CORS for this router (or configure it globally in your app)
router.use(cors());

// Create an Axios instance for the Neto API
const netoApi = axios.create({
  baseURL: process.env.NETO_URL, // e.g., "https://www.yourdomain.com/do/WS/NetoAPI"
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'NETOAPI_ACTION': 'GetCustomer',
    'NETOAPI_USERNAME': process.env.NETO_API_USERNAME,
    'NETOAPI_KEY': process.env.NETO_API_KEY,
  }
});

/** 
 * GET /calendar
 * Serves the static calendar page (list_calendar.html)
 */
router.get('/', (req, res) => {
  // Adjust the path if your HTML file is in a different location.
  res.sendFile(path.join(__dirname, '../public/list_calendar.html'));
});

/**
 * POST /calendar/getCustomer
 * Proxy route for the Neto API to get customer information.
 *
 * The client sends a POST request with a JSON body containing a Filter.
 * This route forwards that request to the Neto API and returns the response.
 */
router.post('/getCustomer', async (req, res) => {
  try {
    // Forward the request body to the Neto API.
    const response = await netoApi.post('', req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Error calling Neto API:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer info from Neto API",
      error: error.message
    });
  }
});

module.exports = router;
