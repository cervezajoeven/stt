$(document).ready(function () {
  console.log("Document ready. Initializing event listeners...");

  // Initialize Select2 dropdowns for batch, send_to, and invoice_to
  $('#stt_batch_id, #send_to_dropdown, #invoice_to_dropdown').select2({
    theme: 'bootstrap',
    placeholder: "Select an option",
    allowClear: true,
    width: '100%'
  });

  // Hide email input fields initially; the dropdowns are visible by default (maropost_id is selected)
  $('#send_to_email, #invoice_to_email').hide();

  // Attach event listeners for changes
  $(document).on('change', '#send_to_type', toggleSendToField);
  $(document).on('change', '#invoice_to_type', toggleInvoiceToField);
  $(document).on('change', '#entry_type', toggleEntryType);

  // Initialize fields on page load
  toggleSendToField();
  toggleInvoiceToField();
  toggleEntryType();

  // Fetch customers from the Neto (Maropost) API and populate dropdowns
  // Update the URL to remove the "/api" prefix
  $.ajax({
    url: '/stt/customers',
    method: 'GET',
    success: function (data) {
      console.log("Received customers:", data);

      // If the response has a Customer property, use that array.
      let customersArray = [];
      if (data.Customer && Array.isArray(data.Customer)) {
        customersArray = data.Customer;
      } else if (Array.isArray(data)) {
        customersArray = data;
      } else {
        customersArray = Object.values(data);
      }

      console.log("Number of customers:", customersArray.length);

      customersArray.forEach(customer => {
        // Extract the billing company from BillingAddress using "BillCompany"
        const billCompany = (customer.BillingAddress && customer.BillingAddress.BillCompany) || "No Company";
        // Use the customer's email address for display purposes
        const email = customer.EmailAddress || "No Email";
        // Display text: "{BillCompany} - {EmailAddress}"
        const displayText = `${billCompany} - ${email}`;
        // The option value should be the customer's username
        const optionValue = customer.Username || "";

        // Create a new option element with displayText as text and username as value
        const option = new Option(displayText, optionValue, false, false);
        // Append the option to both dropdowns
        $('#send_to_dropdown').append(option);
        $('#invoice_to_dropdown').append(option.cloneNode(true));
      });

      console.log("Final send_to_dropdown HTML:", $('#send_to_dropdown').html());

      // Destroy and reinitialize Select2 so that it picks up the new options
      $('#send_to_dropdown, #invoice_to_dropdown').select2('destroy');
      $('#send_to_dropdown, #invoice_to_dropdown').select2({
        theme: 'bootstrap',
        placeholder: "Select an option",
        allowClear: true,
        width: '100%'
      });
    },
    error: function (error) {
      console.error("Error fetching customers:", error);
    }
  });

  // Fetch available STT Batch entries and populate the stt_batch_id dropdown
  $.ajax({
    url: '/stt_batch/list/json',
    method: 'GET',
    success: function (data) {
      console.log("Received STT Batch data:", data);
      let batchesArray = [];
      if (Array.isArray(data)) {
        batchesArray = data;
      } else {
        batchesArray = Object.values(data);
      }
      
      // Populate the stt_batch_id dropdown
      batchesArray.forEach(batch => {
        // Option text can be adjusted as needed. Here, we show "Company Name (Start Month)"
        const optionText = `${batch.company_name} (${batch.month_start})`;
        const optionValue = batch.id; // Using the batch's id as the value
        const option = new Option(optionText, optionValue, false, false);
        $('#stt_batch_id').append(option);
      });
      
      // Destroy and reinitialize Select2 to update the dropdown
      $('#stt_batch_id').select2('destroy');
      $('#stt_batch_id').select2({
        theme: 'bootstrap',
        placeholder: "Select Batch ID",
        allowClear: true,
        width: '100%'
      });
    },
    error: function (error) {
      console.error("Error fetching STT Batch data:", error);
    }
  });
});

function toggleEntryType() {
  console.log("Toggling entry type...");
  const entryType = $('#entry_type').val();
  const batchGroup = $('#stt_batch_id_group');
  const newFields = $('#new_entry_fields');

  if (entryType === 'new') {
    batchGroup.hide();
    newFields.show();
    // Add required attribute to new fields when visible
    $('#frequency, #month_start').attr('required', true);
  } else if (entryType === 'old') {
    batchGroup.show();
    newFields.hide();
    // Remove required attribute from new fields when hidden
    $('#frequency, #month_start').removeAttr('required');
    resetNewFields();
  } else {
    batchGroup.hide();
    newFields.hide();
    $('#frequency, #month_start').removeAttr('required');
  }
}

function toggleSendToField() {
  console.log("Send To Type changed...");
  const sendToType = $('#send_to_type').val();
  const sendToGroup = $('#send_to_group'); // Container for Send To section
  const sendToDropdown = $('#send_to_dropdown');
  const sendToEmail = $('#send_to_email');

  if (sendToType === 'maropost_id') {
    console.log("Showing Maropost User dropdown.");
    sendToGroup.show();
    sendToDropdown.show().attr('required', 'required');
    sendToDropdown.next('.select2-container').show();
    sendToEmail.hide().removeAttr('required');
  } else if (sendToType === 'email') {
    console.log("Showing Email input field.");
    sendToGroup.show();
    sendToEmail.show().attr('required', 'required');
    sendToDropdown.hide().removeAttr('required');
    sendToDropdown.next('.select2-container').hide();
  } else {
    console.log("No selection. Hiding both fields.");
    sendToGroup.hide();
    sendToDropdown.hide().removeAttr('required');
    sendToDropdown.next('.select2-container').hide();
    sendToEmail.hide().removeAttr('required');
  }
}

function toggleInvoiceToField() {
  console.log("Invoice To Type changed...");
  const invoiceToType = $('#invoice_to_type').val();
  const invoiceToGroup = $('#invoice_to_group'); // Container for Invoice To section
  const invoiceToDropdown = $('#invoice_to_dropdown');
  const invoiceToEmail = $('#invoice_to_email');

  if (invoiceToType === 'maropost_id') {
    console.log("Showing Invoice Maropost User dropdown.");
    invoiceToGroup.show();
    invoiceToDropdown.show().attr('required', 'required');
    invoiceToDropdown.next('.select2-container').show();
    invoiceToEmail.hide().removeAttr('required');
  } else if (invoiceToType === 'email') {
    console.log("Showing Invoice Email input field.");
    invoiceToGroup.show();
    invoiceToEmail.show().attr('required', 'required');
    invoiceToDropdown.hide().removeAttr('required');
    invoiceToDropdown.next('.select2-container').hide();
  } else {
    console.log("No selection. Hiding both fields.");
    invoiceToGroup.hide();
    invoiceToDropdown.hide().removeAttr('required');
    invoiceToDropdown.next('.select2-container').hide();
    invoiceToEmail.hide().removeAttr('required');
  }
}

function resetNewFields() {
  console.log("Resetting new entry fields...");
  $('#send_to_type').val('');
  $('#invoice_to_type').val('');
  $('#frequency, #month_start').val('').removeAttr('required');
  $('#send_to_group, #invoice_to_group').hide();
  $('#send_to_email, #invoice_to_email, #send_to_dropdown, #invoice_to_dropdown')
    .removeAttr('required')
    .hide();
  $('#send_to_dropdown').next('.select2-container').hide();
  $('#invoice_to_dropdown').next('.select2-container').hide();
}
