let sttTable;

// Helper function to convert a numeric month to its name
function getMonthName(monthNumber) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return monthNames[monthNumber - 1] || "";
}

// Fetch STT records and populate the table
function loadSttList() {
  $.ajax({
    url: '/stt/list/json',
    method: 'GET',
    dataType: 'json',
    success: function(data) {
      // The data returned from Firebase is an object with keys as record IDs.
      // Convert it to an array.
      let stts = [];
      if (Array.isArray(data)) {
        stts = data;
      } else {
        stts = Object.keys(data).map(key => {
          return { id: key, ...data[key] };
        });
      }

      const tbody = $('#sttTable tbody');
      tbody.empty();

      stts.forEach(stt => {
        const startMonth = stt.month_start ? getMonthName(stt.month_start) : "";
        // For "old" entries, display the stt_batch_id in the Batch ID column
        const batchId = stt.entry_type === 'old' ? (stt.stt_batch_id || "") : "";
        const row = `
          <tr id="stt_${stt.id}">
            <td>${stt.machine_sku || ""}</td>
            <td>${stt.machine_name || ""}</td>
            <td>${stt.send_to || ""}</td>
            <td>${stt.invoice_to || ""}</td>
            <td>${stt.frequency || ""}</td>
            <td>${startMonth}</td>
            <td>${stt.entry_type || ""}</td>
            <td class="text-center">
              <button class="btn btn-danger btn-sm" onclick="deleteStt('${stt.id}')" title="Delete">
                <i class="fas fa-trash-alt"></i>
              </button>
            </td>
          </tr>
        `;
        tbody.append(row);
      });

      // Initialize or reinitialize DataTable
      if ($.fn.DataTable.isDataTable('#sttTable')) {
        sttTable.clear().destroy();
      }
      sttTable = $('#sttTable').DataTable({
        pageLength: 10,
        ordering: false, // Disable client-side ordering so server order is preserved
        responsive: true,
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
        }
      });      
    },
    error: function(err) {
      console.error("Error fetching STT list:", err);
      $('#notification').html(`
        <div class="alert alert-danger" role="alert">
          Failed to load STT records.
        </div>
      `);
    }
  });
}

// Delete an STT record
function deleteStt(id) {
  if (confirm("Are you sure you want to delete this STT entry?")) {
    fetch(`/stt/${id}`, {
      method: 'DELETE'
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          const row = $(`#stt_${id}`);
          sttTable.row(row).remove().draw();
          $('#notification').html(`
            <div class="alert alert-success" role="alert">
              STT entry deleted successfully.
            </div>
          `);
        } else {
          alert("Failed to delete STT entry.");
        }
      })
      .catch(err => {
        console.error("Error deleting STT:", err);
        alert("Error occurred while deleting STT entry.");
      });
  }
}

$(document).ready(function() {
  loadSttList();

  // Automatically hide notifications after 3 seconds
  setTimeout(() => {
    $('#notification').fadeOut();
  }, 3000);
});
