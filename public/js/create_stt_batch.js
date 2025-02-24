$(document).ready(function() {
    // Initialize Select2 for month dropdown
    $('#month_start').select2({
      theme: 'bootstrap',
      placeholder: "Select Start Month",
      allowClear: true,
      width: '100%'
    });
  
    // Fetch customers from the STT customers endpoint and populate dropdowns
    $.ajax({
      url: '/stt/customers',
      method: 'GET',
      success: function(data) {
        let customersArray = [];
        if (data.Customer && Array.isArray(data.Customer)) {
          customersArray = data.Customer;
        } else if (Array.isArray(data)) {
          customersArray = data;
        } else {
          customersArray = Object.values(data);
        }
  
        // Populate the send_to_dropdown and invoice_to_dropdown
        customersArray.forEach(customer => {
          const billFirst = customer.BillingAddress && customer.BillingAddress.BillFirstName ? customer.BillingAddress.BillFirstName : '';
          const billLast = customer.BillingAddress && customer.BillingAddress.BillLastName ? customer.BillingAddress.BillLastName : '';
          const email = customer.EmailAddress || '';
          const displayText = `${billFirst} ${billLast} - ${email}`;
          const username = customer.Username || '';
  
          $('#send_to_dropdown').append(new Option(displayText, username));
          $('#invoice_to_dropdown').append(new Option(displayText, username));
        });
  
        // Reinitialize Select2 for customer dropdowns after adding options
        $('#send_to_dropdown, #invoice_to_dropdown').select2({
          theme: 'bootstrap',
          placeholder: "Select a customer",
          allowClear: true,
          width: '100%'
        });
      },
      error: function(error) {
        console.error("Error fetching customers:", error);
      }
    });
  });
  
  function toggleSendToField() {
    const sendToType = document.getElementById('send_to_type').value;
    const sendToGroup = document.getElementById('send_to_group');
    const sendToDropdown = document.getElementById('send_to_dropdown');
    const sendToEmail = document.getElementById('send_to_email');
  
    // Show send_to group and adjust field type based on send_to_type
    sendToGroup.style.display = 'block';
    if (sendToType === 'maropost_id') {
      sendToDropdown.style.display = 'block';
      sendToDropdown.setAttribute('required', 'required');
      sendToEmail.style.display = 'none';
      sendToEmail.removeAttribute('required');
      // Reinitialize Select2 for send_to dropdown
      $('#send_to_dropdown').select2({
        theme: 'bootstrap',
        placeholder: "Select a customer",
        allowClear: true,
        width: '100%'
      });
    } else if (sendToType === 'email') {
      sendToEmail.style.display = 'block';
      sendToEmail.setAttribute('required', 'required');
      sendToDropdown.style.display = 'none';
      sendToDropdown.removeAttribute('required');
      // Destroy Select2 when showing email field
      if ($('#send_to_dropdown').data('select2')) {
        $('#send_to_dropdown').select2('destroy');
      }
    } else {
      sendToGroup.style.display = 'none';
      sendToEmail.removeAttribute('required');
      sendToDropdown.removeAttribute('required');
    }
  }
  
  function toggleInvoiceToField() {
    const invoiceToType = document.getElementById('invoice_to_type').value;
    const invoiceToGroup = document.getElementById('invoice_to_group');
    const invoiceToDropdown = document.getElementById('invoice_to_dropdown');
    const invoiceToEmail = document.getElementById('invoice_to_email');
  
    // Show invoice_to group and adjust field type based on invoice_to_type
    invoiceToGroup.style.display = 'block';
    if (invoiceToType === 'maropost_id') {
      invoiceToDropdown.style.display = 'block';
      invoiceToDropdown.setAttribute('required', 'required');
      invoiceToEmail.style.display = 'none';
      invoiceToEmail.removeAttribute('required');
      // Reinitialize Select2 for invoice_to dropdown
      $('#invoice_to_dropdown').select2({
        theme: 'bootstrap',
        placeholder: "Select a customer",
        allowClear: true,
        width: '100%'
      });
    } else if (invoiceToType === 'email') {
      invoiceToEmail.style.display = 'block';
      invoiceToEmail.setAttribute('required', 'required');
      invoiceToDropdown.style.display = 'none';
      invoiceToDropdown.removeAttribute('required');
      // Destroy Select2 when showing email field
      if ($('#invoice_to_dropdown').data('select2')) {
        $('#invoice_to_dropdown').select2('destroy');
      }
    } else {
      invoiceToGroup.style.display = 'none';
      invoiceToEmail.removeAttribute('required');
      invoiceToDropdown.removeAttribute('required');
    }
  }
  