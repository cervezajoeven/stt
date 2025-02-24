const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db/firebase'); // Firebase setup
require('dotenv').config();
const axios = require('axios');

// Helper function to generate a unique ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

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

/** ====================
 * Redirect root of stt_batch to list page
 * (GET /stt_batch/)
 * ==================== */
router.get('/', (req, res) => {
  res.redirect('/stt_batch/list');
});

/** ====================
 * 📝 Serve Static Create STT Batch Form
 * (GET /stt_batch/create)
 * Assumes you have a file "create_stt_batch.html" in your public folder
 * ==================== */
router.get('/create', async (req, res) => {
  try {
    // Call the Neto API to fetch active customer data
    const netoResponse = await netoApi.post(
      '',
      {
        Filter: {
          Active: true,
          OutputSelector: ["Username", "EmailAddress", "BillingAddress"]
        }
      },
      { headers: { NETOAPI_ACTION: "GetCustomer" } }
    );

    // Transform customer data to desired format
    const customers = (netoResponse.data.Customer || []).map(customer => ({
      username: customer.Username,
      email_address: customer.EmailAddress,
      bill_firstname: customer.BillingAddress?.BillFirstName,
      bill_lastname: customer.BillingAddress?.BillLastName
    }));

    // For simplicity, serve a static HTML file.
    res.sendFile(path.join(__dirname, '../public/create_stt_batch.html'));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load create form', error: error.message });
  }
});

/** ====================
 * 📌 Create New STT Batch Entry (Single or Multiple)
 * (POST /stt_batch/create)
 *
 * If sending multiple entries, the JSON body should include an array under "batches".
 * If no "batches" key is provided, the request body is assumed to be a single entry.
 * ==================== */
router.post('/create', async (req, res) => {
  let { batches } = req.body;
  const isBatchOperation = Array.isArray(batches);

  // If batches is not provided, assume single entry creation.
  if (!batches) {
    batches = [req.body];
  } else if (!isBatchOperation) {
    batches = [batches];
  }

  if (batches.length === 0) {
    const response = { success: false, error: 'No batch data provided' };
    return res.status(400).json(response);
  }

  try {
    const createdBatches = [];
    const errors = [];

    for (const [index, batch] of batches.entries()) {
      try {
        let {
          company_name,
          send_to_type,
          invoice_to_type,
          send_to,
          invoice_to,
          frequency,
          stt_batch_notes,
          month_start
        } = batch;

        // Validate required fields
        const missingFields = [];
        if (!company_name) missingFields.push('company_name');
        if (!send_to) missingFields.push('send_to');
        if (!invoice_to) missingFields.push('invoice_to');
        if (frequency === undefined || frequency === null || frequency === '') missingFields.push('frequency');
        if (!month_start) missingFields.push('month_start');

        if (missingFields.length > 0) {
          errors.push({ index, error: 'Missing required fields', fields: missingFields, data: batch });
          continue;
        }

        // Clean up send_to and invoice_to values:
        send_to = Array.isArray(send_to) ? send_to[0] : send_to.split(',')[0];
        invoice_to = Array.isArray(invoice_to) ? invoice_to[0] : invoice_to.split(',')[0];

        const stt_batch_id = generateId();
        const newSttBatchData = {
          stt_batch_id,
          company_name,
          send_to_type,
          invoice_to_type,
          send_to: send_to.trim(),
          invoice_to: invoice_to.trim(),
          frequency: parseInt(frequency),
          stt_batch_notes,
          month_start: parseInt(month_start),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted: false,
          deleted_at: null
        };

        const newSttBatchRef = db.ref('stt_batches').push();
        await newSttBatchRef.set(newSttBatchData);
        createdBatches.push({ id: newSttBatchRef.key, ...newSttBatchData });
      } catch (error) {
        errors.push({ index, error: error.message || 'Failed to process batch entry', data: batch });
      }
    }

    const response = {
      success: createdBatches.length > 0,
      total_submitted: batches.length,
      total_created: createdBatches.length,
      total_failed: errors.length,
      created_batches: createdBatches,
      errors: errors.length > 0 ? errors : undefined
    };

    res.status(errors.length === batches.length ? 400 : 207).json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to process STT Batch entries' });
  }
});

/** ====================
 * 📌 Update STT Batch Entry
 * (PUT /stt_batch/:id)
 * ==================== */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    company_name,
    send_to_type,
    invoice_to_type,
    send_to,
    invoice_to,
    frequency,
    stt_batch_notes,
    month_start
  } = req.body;

  try {
    await db.ref(`stt_batches/${id}`).update({
      company_name,
      send_to_type,
      invoice_to_type,
      send_to,
      invoice_to,
      frequency,
      stt_batch_notes,
      month_start: parseInt(month_start),
      updated_at: new Date().toISOString()
    });
    res.json({ success: true, message: 'STT Batch entry updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update STT Batch entry', error: error.message });
  }
});

/** ====================
 * 📌 Fetch All Non-deleted STT Batch Entries (JSON)
 * (GET /stt_batch/list/json)
 * ==================== */
router.get('/list/json', async (req, res) => {
  try {
    const sttBatchList = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const snapshot = await db.ref('stt_batches').orderByChild('deleted').equalTo(false).once('value');
    snapshot.forEach(childSnapshot => {
      const batch = { id: childSnapshot.key, ...childSnapshot.val() };
      batch.month_start = monthNames[batch.month_start - 1] || 'Invalid Month';
      sttBatchList.push(batch);
    });
    res.json(sttBatchList);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch STT Batch entries', error: error.message });
  }
});

/** ====================
 * 📝 Serve Static STT Batch List Page
 * (GET /stt_batch/list)
 * Assumes you have a file "list_stt_batch.html" in your public folder.
 * ==================== */
router.get('/list', async (req, res) => {
  res.sendFile(path.join(__dirname, '../public/list_stt_batch.html'));
});

/** ====================
 * 📌 Fetch a Specific STT Batch Entry (JSON)
 * (GET /stt_batch/:id)
 * ==================== */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const snapshot = await db.ref(`stt_batches/${id}`).once('value');
    const sttBatchData = snapshot.val();
    if (!sttBatchData || sttBatchData.deleted) {
      return res.status(404).json({ success: false, message: 'STT Batch entry not found' });
    }
    res.json({ id, ...sttBatchData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch STT Batch entry', error: error.message });
  }
});

/** ====================
 * 📌 Soft Delete STT Batch Entry
 * (DELETE /stt_batch/:id)
 * ==================== */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.ref(`stt_batches/${id}`).update({
      deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    res.json({ success: true, message: 'STT Batch entry soft deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete STT Batch entry', error: error.message });
  }
});

/** ====================
 * 📝 Serve Static Update STT Batch Form
 * (GET /stt_batch/update/:id)
 * Assumes you have a file "update_stt_batch.html" in your public folder.
 * ==================== */
router.get('/update/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch batch data
    const snapshot = await db.ref(`stt_batches/${id}`).once('value');
    const sttBatchData = snapshot.val();
    if (!sttBatchData || sttBatchData.deleted) {
      return res.status(404).json({ success: false, message: 'STT Batch entry not found' });
    }

    // Optionally, fetch customer data from Neto API if needed for the update form
    const netoResponse = await netoApi.post(
      '',
      {
        Filter: {
          Active: true,
          OutputSelector: ["Username", "EmailAddress", "BillingAddress"]
        }
      },
      { headers: { NETOAPI_ACTION: "GetCustomer" } }
    );
    const customers = (netoResponse.data.Customer || []).map(customer => ({
      username: customer.Username,
      email_address: customer.EmailAddress,
      bill_firstname: customer.BillingAddress?.BillFirstName,
      bill_lastname: customer.BillingAddress?.BillLastName
    }));

    // For simplicity, serve a static HTML file.
    res.sendFile(path.join(__dirname, '../public/update_stt_batch.html'));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load update form', error: error.message });
  }
});

/**
 * Helper function to fetch a batch by its ID.
 * @param {string} batchId
 * @returns {Promise<object|null>}
 */
async function fetchBatchById(batchId) {
  const snapshot = await db.ref(`stt_batches/${batchId}`).once('value');
  const data = snapshot.val();
  return data && !data.deleted ? data : null;
}

/** ====================
 * 📌 Fetch Multiple STT Batch Data Using Batch IDs (JSON)
 * (POST /stt_batch/multiple)
 *
 * Expects a JSON body with:
 * {
 *   "batchIds": ["id1", "id2", ...]
 * }
 * or a comma-separated string:
 * {
 *   "batchIds": "id1, id2, id3"
 * }
 * ==================== */
router.post('/multiple', async (req, res) => {
  let { batchIds } = req.body;
  
  if (!batchIds) {
    return res.status(400).json({ success: false, message: 'No batch IDs provided' });
  }
  
  // If batchIds is a string, assume comma-separated and convert to an array.
  if (!Array.isArray(batchIds)) {
    batchIds = batchIds.split(',').map(id => id.trim());
  }
  
  const results = [];
  const errors = [];
  
  for (const id of batchIds) {
    try {
      const sttBatchData = await fetchBatchById(id);
      if (sttBatchData) {
        results.push({ id, ...sttBatchData });
      } else {
        errors.push({ id, message: 'STT Batch entry not found or is deleted' });
      }
    } catch (error) {
      errors.push({ id, message: error.message });
    }
  }
  
  res.json({
    success: results.length > 0,
    total_requested: batchIds.length,
    total_found: results.length,
    results,
    errors: errors.length > 0 ? errors : undefined
  });
});

module.exports = router;
