// main.js
// Bootstraps the application: sets up event listeners for the DOM and modal,
// and saves schedule data by calling the Express route.

import { initCalendar } from "./calendar.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize the calendar UI
  initCalendar();

  // Global variable to store the card element for which the schedule is being set.
  window.currentScheduleCard = null;

  // When the schedule modal is shown, set the default datetime to now.
  const scheduleModalEl = document.getElementById("scheduleModal");
  scheduleModalEl.addEventListener("show.bs.modal", function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const localDatetime = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById("scheduleDateTime").value = localDatetime;
  });

  // Attach event listener to the Confirm button in the modal.
  document.getElementById("confirmSchedule").addEventListener("click", async function () {
    const scheduleInput = document.getElementById("scheduleDateTime");
    const scheduleValue = scheduleInput.value;
    
    if (scheduleValue && window.currentScheduleCard) {
      // Update the scheduled text in the card
      const scheduledEl = window.currentScheduleCard.querySelector(".scheduled");
      scheduledEl.textContent = `Scheduled: ${scheduleValue}`;

      // Retrieve object_id and month from the card's data attributes.
      const objectId = window.currentScheduleCard.dataset.objectId;
      const month = window.currentScheduleCard.dataset.month;

      // Create the schedule object.
      const scheduleData = {
        object_id: objectId,
        datetime: scheduleValue,
        month: month
      };

      // Save schedule data by calling the Express route.
      try {
        const response = await fetch('/calendar/saveSchedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(scheduleData)
        });
        if (!response.ok) {
          throw new Error(`Error saving schedule: ${response.status}`);
        }
        const result = await response.json();
        console.log('Schedule saved:', result);
      } catch (error) {
        console.error('Error saving schedule:', error);
      }
    }
    
    // Clear the input.
    scheduleInput.value = "";

    // Remove focus from any element inside the modal before hiding it.
    document.activeElement.blur();
    
    // Hide the modal.
    const modalInstance = bootstrap.Modal.getInstance(scheduleModalEl);
    modalInstance.hide();
  });
});
