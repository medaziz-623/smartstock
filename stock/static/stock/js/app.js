/* Global variable to hold items in the inventory */
let items = [];
let selectedItem = null;

/* Threshold values for each item type (A, B, C) */
const thresholds = {
  A: 100,
  B: 50,
  C: 20
};

/* Helper function to get CSRF token */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/* Function to fetch items from the backend */
function fetchItems() {
  fetch('/stock/api/items/')
    .then(response => response.json())
    .then(data => {
      items = data;
      updateUI();
    });
}

/* Function to add an item to the inventory */
function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const quantity = parseInt(document.getElementById('quantity').value);
  const type = document.getElementById('itemType').value;

  // Clear previous errors
  document.getElementById('itemError').textContent = '';

  if (!name) {
    alert("Veuillez entrer un nom d'article.");
    return;
  }
  if (isNaN(quantity) || quantity <= 0) {
    alert("Veuillez entrer une quantité valide.");
    return;
  }

  const item = { name, quantity, item_type: type };

  fetch('/stock/api/items/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify(item),
  })
    .then(response => {
    if (!response.ok) {
      return response.json().then(err => { throw err; });
    }
    return response.json();
  })
  .then(data => {
    console.log('Item added:', data);
    fetchItems(); // Refresh the item list
    document.getElementById('itemName').value = ''; // Clear input
  })
  .catch(error => {
    console.error('Error:', error);
    showError(error.name || "This item already exists.");
  });
}

// Add this helper function
function showError(message) {
  const errorElement = document.getElementById('itemError');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  setTimeout(() => errorElement.style.display = 'none', 3000);
}

/* Function to remove the selected item */
function removeItem() {
  if (selectedItem) {
    const confirmDelete = confirm("Voulez-vous vraiment supprimer cet article ?");
    if (confirmDelete) {
      fetch(`/stock/api/items/${selectedItem.dataset.id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
        },
      })
        .then(response => {
          if (response.ok) {
            console.log('Item deleted');
            fetchItems(); // Refresh the item list
          }
        });
    }
  }
}

function adjustQuantity(amount) {
  if (!selectedItem) {
    alert("No item selected!");
    return;
  }

  const adjustValue = parseInt(document.getElementById('adjustQuantity').value) || 1;
  const itemId = selectedItem.dataset.id;
  const item = items.find(item => item.id == itemId);

  if (!item) {
    alert("Item not found in current data!");
    return;
  }

  const newQuantity = item.quantity + (amount * adjustValue);

  if (newQuantity < 0) {
    alert("Cannot reduce stock below 0!");
    return;
  }

  fetch(`/stock/api/items/${itemId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify({ quantity: newQuantity })
  })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(updatedItem => {
    console.log("Update successful:", updatedItem);
    // Update local items array
    const index = items.findIndex(i => i.id == itemId);
    if (index !== -1) items[index] = updatedItem;
    updateUI();
  })
  .catch(error => {
    console.error("Update failed:", error);
    alert(`Update failed: ${error.message}`);
  });
}

function increaseQuantity() { adjustQuantity(1); }
function decreaseQuantity() { adjustQuantity(-1); }

/* Function to reset the entire inventory list with confirmation */
function resetList() {
  const confirmReset = confirm("Êtes-vous sûr de vouloir réinitialiser la base de données ?");
  if (!confirmReset) return;

  fetch('/stock/api/reset/', {
    method: 'DELETE',
    headers: {
      'X-CSRFToken': getCookie('csrftoken'),
    },
  })
    .then(response => {
      if (response.ok) {
        console.log('Inventory reset');
        fetchItems(); // Refresh the item list
      } else {
        throw new Error('Failed to reset inventory');
      }
    })
    .catch(error => {
      console.error('Error resetting inventory:', error);
      alert("Une erreur est survenue lors de la réinitialisation de l'inventaire.");
    });
}

/* Function to refresh the item list displayed on the page */
function refreshItemList() {
  const list = document.getElementById('itemList');
  list.innerHTML = "";

  let lowStockItems = [];

  items.forEach(item => {
    const div = document.createElement('div');
    div.textContent = `${item.name} (Type ${item.item_type}): ${item.quantity} | Rest: ${item.quantity}`;

    const threshold = thresholds[item.item_type] || 100;
    if (item.quantity < threshold) {
      div.style.color = '#dc3545'; // Red text
      div.style.fontWeight = 'bold';
      div.style.borderLeft = '4px solid #dc3545'; // Red accent border
      lowStockItems.push(item); // Store the entire item object
    }

    div.dataset.id = item.id;
    div.onclick = () => selectItem(div);
    list.appendChild(div);
  });

   // Update dashboard alert table
   const dashboardAlert = document.getElementById('dashboardAlert');
   const dashboardAlertBody = document.getElementById('dashboardAlertBody');

   if (lowStockItems.length > 0) {
     dashboardAlert.style.display = 'block';
     dashboardAlertBody.innerHTML = ""; // Clear previous content

     lowStockItems.forEach(item => {
       const row = document.createElement('tr');
       row.innerHTML = `
         <td>${item.name}</td>
         <td>${item.quantity}</td>
         <td>${thresholds[item.item_type]}</td>
       `;
       dashboardAlertBody.appendChild(row);
     });
   } else {
     dashboardAlert.style.display = 'none';
   }

   // Update inventory alert area (simplified)
   const alertArea = document.getElementById('alertArea');
   if (lowStockItems.length > 0) {
     alertArea.style.display = 'block';
     alertArea.textContent = `Alerte : ${lowStockItems.length} article(s) en stock bas.`;
   } else {
     alertArea.style.display = 'none';
   }
 }

/* Function to select an item from the list */
function selectItem(div) {
  document.querySelectorAll('.item-list div').forEach(el => el.classList.remove('selected'));
  div.classList.add('selected');
  selectedItem = div;
}

/* Function to switch between sections in the sidebar */
function showSection(sectionId) {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => section.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
}

/* ==== Dashboard Search Functionality ==== */
function filterDashboardItems() {
  const searchValue = document.getElementById('dashboardSearchInput').value.toLowerCase();
  const resultsContainer = document.getElementById('dashboardSearchResults');
  resultsContainer.innerHTML = "";
  let found = false;
  items.forEach(item => {
    if (item.name.toLowerCase().includes(searchValue)) {
      found = true;
      const div = document.createElement('div');
      div.textContent = `${item.name} : ${item.quantity}`;
      div.dataset.id = item.id;
      div.ondblclick = function() {
        redirectToInventory(item.id);
      };
      resultsContainer.appendChild(div);
    }
  });
  if (!found) {
    const noResults = document.createElement('div');
    noResults.textContent = 'No items found';
    resultsContainer.appendChild(noResults);
  }
}

function redirectToInventory(itemId) {
  showSection('inventory');
  setTimeout(() => {
    const inventoryItems = document.querySelectorAll('.item-list div');
    inventoryItems.forEach(div => {
      if (div.dataset.id == itemId) {
        selectItem(div);
      }
    });
  }, 100);
}

/* Function to update the stock table */
function updateStockTable() {
  const tableBody = document.getElementById('stockTableBody');
  tableBody.innerHTML = "<tr><td colspan='6'>Chargement des données...</td></tr>";

  fetch('/stock/api/stock_movements/')
    .then(response => response.json())
    .then(data => {
      tableBody.innerHTML = '';

      data.forEach(item => {
        const row = document.createElement('tr');
        const isLowStock = item.current_stock < item.alert_threshold;

        // Update dates in table headers
        document.getElementById('currentMonthStart').textContent = item.month_start;
        document.getElementById('currentMonthEnd').textContent = item.month_end;

        row.innerHTML = `
          <td style="${isLowStock ? 'color: red; font-weight: bold;' : ''}">${item.name}</td>
          <td>${item.opening_stock}</td>
          <td>${item.current_added}</td>
          <td>${item.current_removed}</td>
          <td>${item.current_stock}</td>
          <td>${item.alert_threshold}</td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch(error => {
      console.error("Error loading stock data:", error);
      tableBody.innerHTML = `<tr><td colspan="6">Erreur: ${error.message}</td></tr>`;
    });
}

// Add daily update check
setInterval(() => {
  const now = new Date();
  if(now.getHours() === 0 && now.getMinutes() === 0) {
    updateStockTable();
  }
}, 60000); // Check every minute if it's midnight
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function addTableRow(tableBody, item, movement) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${item.name}</td>
    <td>${movement ? (movement.quantity_added || 0) : 'N/A'}</td>
    <td>${movement ? (movement.quantity_removed || 0) : 'N/A'}</td>
    <td>${movement ? (movement.remaining_stock !== undefined ? movement.remaining_stock : item.quantity) : item.quantity}</td>
  `;
  tableBody.appendChild(row);
}


/* Function to print the stock overview page */
function printPage() {
  const printContent = document.getElementById('stockTable').outerHTML;
  const printWindow = window.open('', '', 'height=800,width=1000');
  printWindow.document.write('<html><head><title>Stock Overview</title>');
  printWindow.document.write('<style>');
  printWindow.document.write('body{font-family: Arial, sans-serif;}');
  printWindow.document.write('table{border-collapse: collapse; width: 100%;}');
  printWindow.document.write('th, td{border: 1px solid #ddd; padding: 8px; text-align: center;}');
  printWindow.document.write('th{background-color: #f2f2f2;}');
  printWindow.document.write('@media print { body * { visibility: hidden; } #stockTable, #stockTable * { visibility: visible; } }');
  printWindow.document.write('</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(printContent);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}

/* Function to update the UI */
function updateUI() {
  requestAnimationFrame(() => {
    refreshItemList();
    updateStockTable();
  });
}

/* Debounce function for searchItems */
let debounceTimeout;
function searchItems() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.item-list div').forEach(div => {
      div.style.display = div.textContent.toLowerCase().includes(searchValue) ? "block" : "none";
    });
  }, 300);
}

/* -------------------------- PASSWORD SYSTEM FUNCTIONS -------------------------- */

/* Check password when app loads */
function checkPassword() {
  // Set a default password if none exists
  let storedPassword = localStorage.getItem('appPassword');
  if (!storedPassword) {
    localStorage.setItem('appPassword', "admin");
    storedPassword = "admin";
  }
  const enteredPassword = document.getElementById('passwordInput').value;
  if (enteredPassword === storedPassword) {
    document.getElementById('passwordModal').style.display = 'none';
  } else {
    document.getElementById('passwordError').style.display = 'block';
  }
}

/* Update the app password from Settings */
function updatePassword() {
  const oldPass = document.getElementById('oldPassword').value;
  const newPass = document.getElementById('newPassword').value;
  let storedPassword = localStorage.getItem('appPassword') || "admin";
  if (oldPass === storedPassword) {
    localStorage.setItem('appPassword', newPass);
    document.getElementById('updateMessage').textContent = "Password updated successfully.";
    document.getElementById('updateMessage').style.display = 'block';
  } else {
    alert("Old password is incorrect.");
  }
}

/* Load items and display password modal on window load */
window.onload = function() {
  fetchItems(); // Fetch items from the backend
  // The password modal remains visible until the correct password is entered.
}