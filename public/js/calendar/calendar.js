// calendar.js
// Handles calendar initialization, updating UI, filtering data, and merging batch info.

import { fetchCustomerInfo, fetchBatchData } from "./api.js";

// Helper function to convert month number to month name
function getMonthName(monthNumber) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  // Adjust for zero-based index (assuming monthNumber is 1-12)
  return monthNames[parseInt(monthNumber, 10) - 1] || "Unknown";
}

export async function initCalendar() {
  // Get DOM elements
  const currentMonthEl = document.getElementById("currentMonth");
  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");
  const calendarContainer = document.getElementById("calendarData");
  const cardTemplate = document.getElementById("calendarCardTemplate");
  let currentDate = new Date();
  let allSttData = []; // Will store all fetched data

  // Update the month display and filter calendar data
  function updateMonthDisplay() {
    const options = { month: "long", year: "numeric" };
    currentMonthEl.textContent = currentDate.toLocaleDateString("en-US", options);
    updateCalendarData();
  }

  // Filter STT data based on the current month
  function updateCalendarData() {
    const currentMonthNumber = currentDate.getMonth() + 1;
    const filteredData = allSttData.filter(item => {
      if (item.entry_type === "old") {
        if (item.batch_month_start && item.batch_frequency) {
          const start = parseInt(item.batch_month_start, 10);
          const freq = parseInt(item.batch_frequency, 10);
          const diff = (currentMonthNumber - start + 12) % 12;
          return diff % freq === 0;
        }
        return false;
      } else {
        const start = parseInt(item.month_start, 10);
        const freq = parseInt(item.frequency, 10);
        const diff = (currentMonthNumber - start + 12) % 12;
        return diff % freq === 0;
      }
    });
    displayCalendarData(filteredData);
  }

  // Merge batch info for "old" entries if available
  async function mergeOldEntriesWithBatchInfo(data) {
    const oldEntries = data.filter(item => item.entry_type === "old" && item.stt_batch_id);
    await Promise.all(
      oldEntries.map(async item => {
        try {
          const batchResponse = await fetchBatchData(item.stt_batch_id);
          if (
            batchResponse.success &&
            batchResponse.results &&
            batchResponse.results.length > 0
          ) {
            const batchInfo = batchResponse.results[0];
            item.batch_month_start = batchInfo.month_start;
            item.batch_frequency = batchInfo.frequency;
            item.send_to = batchInfo.send_to;
            item.send_to_type = batchInfo.send_to_type;
            item.invoice_to = batchInfo.invoice_to;
            item.invoice_to_type = batchInfo.invoice_to_type;
            item.batch_info = batchInfo;
            console.log(
              `[MERGE] Merged batch info into ${item.machine_sku}:`,
              batchInfo
            );
          } else {
            console.warn(
              `[MERGE] No batch data found for batch id: ${item.stt_batch_id} for ${item.machine_sku}.`
            );
          }
        } catch (err) {
          console.error(
            `[MERGE] Error fetching batch data for ${item.machine_sku}:`,
            err
          );
        }
      })
    );
  }

  // Month navigation events
  prevMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateMonthDisplay();
  });
  nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateMonthDisplay();
  });

  updateMonthDisplay();

  // Fetch STT data
  try {
    const response = await fetch("/stt/list/json");
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    allSttData = await response.json();
    await mergeOldEntriesWithBatchInfo(allSttData);
    updateCalendarData();
  } catch (error) {
    console.error("Error fetching STT data:", error);
  }

  // Build cards from filtered data
  function displayCalendarData(data) {
    calendarContainer.innerHTML = "";
    if (data.length === 0) {
      calendarContainer.textContent = "No STT entries for this month.";
      return;
    }

    data.forEach(item => {
      // Clone the card template
      const cardClone = document.importNode(cardTemplate.content, true);
      const card = cardClone.querySelector(".card");
      const statusBar = card.querySelector(".status-bar");

      // For demonstration, we use a static scheduled value ("No")
      const scheduledValue = "No";
      if (scheduledValue === "No") {
        statusBar.classList.add("red");
        card.classList.add("border-red");
      } else {
        statusBar.classList.add("green");
        card.classList.add("border-green");
      }

      // Populate left column (static info)
      cardClone.querySelector(".sku").textContent = `SKU: ${item.machine_sku}`;
      if (item.entry_type === "old" && item.batch_info && item.batch_info.company_name) {
        cardClone.querySelector(".name").textContent = `Company: ${item.batch_info.company_name}`;
      } else {
        cardClone.querySelector(".name").textContent = `Machine Name: ${item.machine_name}`;
      }
      if (item.entry_type === "old" && item.batch_frequency) {
        cardClone.querySelector(".recurrence").textContent = `Recurrence: ${item.batch_frequency}`;
      } else {
        cardClone.querySelector(".recurrence").textContent = `Recurrence: ${item.frequency}`;
      }
      // Updated: Show month name instead of number and set as data attribute
      if (item.entry_type === "old" && item.batch_month_start) {
        cardClone.querySelector(".month-start").textContent = `Month Start: ${getMonthName(item.batch_month_start)}`;
        card.dataset.month = getMonthName(item.batch_month_start);
      } else {
        cardClone.querySelector(".month-start").textContent = `Month Start: ${getMonthName(item.month_start)}`;
        card.dataset.month = getMonthName(item.month_start);
      }

      // Set a data attribute for object id (for example, machine_sku)
      card.dataset.objectId = item.machine_sku;

      // Populate right column (API details)
      const sendToP = cardClone.querySelector(".send-to");
      if (item.send_to_type === "maropost_id") {
        sendToP.textContent = `Maropost Send To: ${item.send_to}`;
      } else {
        sendToP.textContent = `Send Email: ${item.send_to}`;
      }
      const invoiceP = cardClone.querySelector(".invoice");
      if (item.invoice_to_type === "email") {
        invoiceP.textContent = `Invoice Email: ${item.invoice_to}`;
      } else if (item.invoice_to_type === "maropost_id") {
        invoiceP.textContent = `Maropost Invoice: ${item.invoice_to}`;
      } else {
        invoiceP.textContent = `Invoice: ${item.invoice_to}`;
      }
      cardClone.querySelector(".scheduled").textContent = `Scheduled: ${scheduledValue}`;

      // Append the card to the container
      calendarContainer.appendChild(cardClone);

      // Add event listener for the "Set Schedule" button on this card
      const setScheduleBtn = card.querySelector(".set-schedule");
      setScheduleBtn.addEventListener("click", () => {
        // Store reference to this card so we can update its schedule later
        window.currentScheduleCard = card;
        const scheduleModalEl = document.getElementById("scheduleModal");
        const scheduleModal = new bootstrap.Modal(scheduleModalEl);
        scheduleModal.show();
      });

      // Reference the loader overlay inside the card (for API calls)
      const overlay = card.querySelector(".card-loader-overlay");
      let apiPromises = [];
      if (item.entry_type === "old") {
        if (item.stt_batch_id && item.send_to_type === "maropost_id") {
          overlay.style.display = "flex";
          const promise = fetchCustomerInfo(item.send_to)
            .then(apiResponse => {
              if (apiResponse.Customer && apiResponse.Customer.length > 0) {
                const customer = apiResponse.Customer[0];
                sendToP.textContent = `Maropost Send To Email: ${customer.EmailAddress}`;
              }
            })
            .catch(err => console.error("Error fetching batch send_to customer info:", err));
          apiPromises.push(promise);
        }
      } else {
        if (
          item.send_to_type === "maropost_id" &&
          item.invoice_to_type === "maropost_id" &&
          item.send_to === item.invoice_to
        ) {
          overlay.style.display = "flex";
          const promise = fetchCustomerInfo(item.send_to)
            .then(apiResponse => {
              if (apiResponse.Customer && apiResponse.Customer.length > 0) {
                const customer = apiResponse.Customer[0];
                sendToP.textContent = `Maropost Send To Email: ${customer.EmailAddress}`;
                invoiceP.textContent = `Maropost Invoice Email: ${customer.EmailAddress}`;
              }
            })
            .catch(err => console.error("Error fetching customer info:", err));
          apiPromises.push(promise);
        } else {
          if (item.send_to_type === "maropost_id") {
            overlay.style.display = "flex";
            const promise = fetchCustomerInfo(item.send_to)
              .then(apiResponse => {
                if (apiResponse.Customer && apiResponse.Customer.length > 0) {
                  const customer = apiResponse.Customer[0];
                  sendToP.textContent = `Maropost Send To Email: ${customer.EmailAddress}`;
                }
              })
              .catch(err => console.error("Error fetching send_to customer info:", err));
            apiPromises.push(promise);
          }
          if (item.invoice_to_type === "maropost_id") {
            overlay.style.display = "flex";
            const promise = fetchCustomerInfo(item.invoice_to)
              .then(apiResponse => {
                if (apiResponse.Customer && apiResponse.Customer.length > 0) {
                  const customer = apiResponse.Customer[0];
                  invoiceP.textContent = `Maropost Invoice Email: ${customer.EmailAddress}`;
                }
              })
              .catch(err => console.error("Error fetching invoice_to customer info:", err));
            apiPromises.push(promise);
          }
        }
      }
      if (apiPromises.length > 0) {
        Promise.all(apiPromises).then(() => {
          overlay.style.display = "none";
        });
      }
    });
  }
}
