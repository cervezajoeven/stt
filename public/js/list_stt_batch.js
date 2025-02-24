let dataTable; // To hold the DataTable instance

// Function to load STT Batch data and populate the table
function loadSttBatches() {
  $.ajax({
    url: '/stt_batch/list/json',
    method: 'GET',
    dataType: 'json',
    success: function(batches) {
      // Clear existing table body
      const tbody = $('#batchTable tbody');
      tbody.empty();

      if (!batches || batches.length === 0) {
        $('#message-container').html(
          `<div class="alert alert-warning text-center" role="alert">
            No STT Batch records found.
          </div>`
        );
      } else {
        $('#message-container').empty();
      }

      // Populate table rows
      batches.forEach(batch => {
        const truncatedNotes = batch.stt_batch_notes && batch.stt_batch_notes.length > 50
          ? `<span title="${batch.stt_batch_notes}">${batch.stt_batch_notes.substr(0, 50)}...</span>`
          : (batch.stt_batch_notes || '');
        const rowHtml = `
          <tr id="stt_batch_${batch.id}">
            <td>${batch.company_name}</td>
            <td>${batch.send_to_type}</td>
            <td>${batch.invoice_to_type}</td>
            <td>${batch.send_to}</td>
            <td>${batch.invoice_to}</td>
            <td>${batch.frequency}</td>
            <td>${batch.month_start}</td>
            <td class="notes-column">${truncatedNotes}</td>
            <td class="text-center action-buttons">
              <a href="/stt_batch/update/${batch.id}" class="btn btn-warning btn-sm" title="Update">
                <i class="fas fa-edit"></i>
              </a>
              <button class="btn btn-danger btn-sm" onclick="deleteSttBatch('${batch.id}')" title="Delete">
                <i class="fas fa-trash-alt"></i>
              </button>
            </td>
          </tr>
        `;
        tbody.append(rowHtml);
      });

      // Initialize or reinitialize DataTable
      if ( $.fn.DataTable.isDataTable('#batchTable') ) {
        dataTable.clear().destroy();
      }
      dataTable = $('#batchTable').DataTable({
        pageLength: 10,
        order: [[0, 'desc']],
        columnDefs: [
          { orderable: false, targets: -1 }, // Disable sorting on Actions column
          { 
            targets: 7, // Notes column
            render: function(data, type) {
              if (type === 'display' && data != null && data.length > 50) {
                return `<span title="${data}">${data.substr(0, 50)}...</span>`;
              }
              return data;
            }
          }
        ],
        language: {
          search: "Search:",
          lengthMenu: "Show _MENU_ entries per page",
          info: "Showing _START_ to _END_ of _TOTAL_ entries",
          paginate: {
            first: "First",
            last: "Last",
            next: "Next",
            previous: "Previous"
          }
        },
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
        responsive: true
      });
    },
    error: function(error) {
      console.error("Error fetching STT Batch data:", error);
      $('#message-container').html(
        `<div class="alert alert-danger text-center" role="alert">
          Failed to load STT Batch records.
        </div>`
      );
    }
  });
}

// Function to delete a specific STT Batch entry
function deleteSttBatch(id) {
  if (confirm('Are you sure you want to delete this STT Batch entry?')) {
    fetch(`/stt_batch/${id}`, { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Remove the row from DataTable and show success message
        const row = $(`#stt_batch_${id}`);
        dataTable.row(row).remove().draw();
        $('#message-container').html(
          `<div class="alert alert-success alert-dismissible fade show" role="alert">
            STT Batch entry deleted successfully.
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>`
        );
      } else {
        alert('Failed to delete STT Batch entry');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while deleting the STT Batch entry');
    });
  }
}

// On document ready, load the STT Batch data
$(document).ready(function() {
  loadSttBatches();
});