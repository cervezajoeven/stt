// api.js
// Contains functions for making API calls.

export async function fetchCustomerInfo(maropostId) {
  try {
    const response = await fetch("/calendar/getCustomer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Filter: {
          Username: [maropostId],
          Active: true,
          OutputSelector: ["Username", "EmailAddress", "BillingAddress"]
        }
      })
    });
    return await response.json();
  } catch (err) {
    console.error("Error fetching customer info:", err);
    throw err;
  }
}

export async function fetchBatchData(batchId) {
  console.log(`[STT_BATCH] Initiating fetch for batchId: ${batchId}`);
  try {
    const response = await fetch("/stt_batch/multiple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchIds: batchId })
    });
    console.log(`[STT_BATCH] Received response for batchId ${batchId}:`, response);
    const jsonData = await response.json();
    console.log(`[STT_BATCH] JSON data for batchId ${batchId}:`, jsonData);
    return jsonData;
  } catch (err) {
    console.error(`[STT_BATCH] Error fetching batch data for batchId ${batchId}:`, err);
    throw err;
  }
}
