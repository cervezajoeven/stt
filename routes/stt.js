const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db/firebase'); // Firebase setup
require('dotenv').config();
const axios = require('axios');

// Create an axios instance for the Neto API
const netoApi = axios.create({
  baseURL: process.env.NETO_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'NETOAPI_USERNAME': process.env.NETO_API_USERNAME,
    'NETOAPI_KEY': process.env.NETO_API_KEY
  }
});

// Helper function to generate a unique ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/** ====================
 * Serve Static STT List Page at GET /stt
 * ==================== */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/list_stt.html'));
});

/** ====================
 * Serve Static Create STT Form
 * (GET /stt/create)
 * ==================== */
router.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/create_stt.html'));
});

/** ====================
 * Create New STT Entry
 * (POST /stt/create)
 * ==================== */
router.post('/create', async (req, res) => {
  try {
    const {
      machine_sku,
      machine_name,
      send_to,
      invoice_to,
      stt_batch_id,
      frequency,
      month_start, // new field for start month
      send_to_type,
      invoice_to_type,
      entry_type,
      stt_notes  // Extract notes from req.body
    } = req.body;

    // Validate required fields based on entry type
    if (
      (entry_type === 'new' && (!frequency || !send_to || !invoice_to || !send_to_type || !invoice_to_type || !month_start)) ||
      (entry_type === 'old' && !stt_batch_id)
    ) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const stt_id = generateId();
    const newSttData = {
      stt_id,
      machine_sku,
      machine_name,
      entry_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: false,
      deleted_at: null,
      stt_notes: stt_notes || ""
    };

    if (entry_type === 'new') {
      // Ensure send_to and invoice_to come as strings (if they are arrays, take the first non-empty element)
      let finalSendTo = send_to;
      if (send_to_type === 'maropost_id' && Array.isArray(send_to)) {
        finalSendTo = send_to.find(item => item.trim() !== "") || "";
      }
      let finalInvoiceTo = invoice_to;
      if (invoice_to_type === 'maropost_id' && Array.isArray(invoice_to)) {
        finalInvoiceTo = invoice_to.find(item => item.trim() !== "") || "";
      }

      Object.assign(newSttData, { 
        frequency, 
        month_start: parseInt(month_start),
        send_to: finalSendTo, 
        invoice_to: finalInvoiceTo, 
        send_to_type, 
        invoice_to_type 
      });
    } else {
      newSttData.stt_batch_id = stt_batch_id;
    }

    await db.ref('stt').push().set(newSttData);
    // After successful creation, redirect to /stt (the list page)
    res.redirect('/stt');
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create STT", error: error.message });
  }
});

/** ====================
 * Fetch STT List (JSON) in sorted order (newest first)
 * (GET /stt/list/json)
 * ==================== */
router.get('/list/json', async (req, res) => {
  try {
    const snapshot = await db.ref('stt').orderByChild('deleted').equalTo(false).once('value');
    const data = snapshot.val() || {};
    
    // Convert object to array
    let stts = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    
    // Sort so that the newest (based on created_at) appears first
    stts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(stts);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch STTs", error: error.message });
  }
});

/** ====================
 * (Optional) Serve Static STT List Page at GET /stt/list
 * ==================== */
router.get('/list', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/list_stt.html'));
});

/** ====================
 * Update STT Entry
 * (PUT /stt/:id)
 * ==================== */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = { ...req.body, updated_at: new Date().toISOString() };

    await db.ref(`stt/${id}`).update(updatedData);
    res.json({ success: true, message: "STT entry updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update STT entry", error: error.message });
  }
});

/** ====================
 * Soft Delete STT Entry
 * (DELETE /stt/:id)
 * ==================== */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.ref(`stt/${id}`).update({
      deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({ success: true, message: "STT entry soft deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete STT entry", error: error.message });
  }
});

/** ====================
 * Fetch Customers from Neto (Maropost) API
 * (GET /stt/customers)
 * ==================== */
router.get('/customers', async (req, res) => {
  try {
    const requestBody = {
      Filter: {
        Active: true,
        OutputSelector: [
          "Username",
          "EmailAddress",
          "BillingAddress"
        ]
      }
    };

    const response = await netoApi.post('', requestBody, {
      headers: { NETOAPI_ACTION: "GetCustomer" }
    });

    // Return the Customer array if available
    const customers = response.data.Customer || response.data;
    res.json(customers);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch customers", error: error.message });
  }
});

module.exports = router;
