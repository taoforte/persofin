// Global variables
let transactions = [];
let editingId = null;
let deletingId = null;
let filteredTransactions = [];

// Category colors mapping
const categoryColors = {
    'Food & Dining': 'category-food',
    'Transportation': 'category-transportation',
    'Entertainment': 'category-entertainment',
    'Shopping': 'category-shopping',
    'Healthcare': 'category-healthcare',
    'Utilities': 'category-utilities',
    'Housing': 'category-housing',
    'Income': 'category-income',
    'Other': 'category-other'
};



// Expense categories (exclude Income)
const expenseCategories = ['Food & Dining', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare', 'Utilities', 'Housing', 'Other'];

// DOM elements - will be initialized after DOM loads
let transactionForm, transactionsTable, transactionsTableBody, loadingMessage, errorMessage, noTransactionsMessage;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing elements...');
    // Initialize DOM elements
    transactionForm = document.getElementById('transactionForm');
    transactionsTable = document.getElementById('transactionsTable');
    transactionsTableBody = document.getElementById('transactionsTableBody');
    loadingMessage = document.getElementById('loadingMessage');
    errorMessage = document.getElementById('errorMessage');
    noTransactionsMessage = document.getElementById('noTransactionsMessage');
    
    console.log('DOM elements initialized:', {
        transactionForm: !!transactionForm,
        transactionsTable: !!transactionsTable,
        transactionsTableBody: !!transactionsTableBody,
        loadingMessage: !!loadingMessage,
        errorMessage: !!errorMessage,
        noTransactionsMessage: !!noTransactionsMessage
    });
    
    loadTransactions();
    setupEventListeners();
    setupNavigation();
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Search and filter
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const amountFilter = document.getElementById('amountFilter');
    const clearFilters = document.getElementById('clearFilters');
    
    if (searchInput) searchInput.addEventListener('input', filterTransactions);
    if (categoryFilter) categoryFilter.addEventListener('change', filterTransactions);
    if (dateFrom) dateFrom.addEventListener('change', filterTransactions);
    if (dateTo) dateTo.addEventListener('change', filterTransactions);
    if (amountFilter) amountFilter.addEventListener('change', filterTransactions);
    if (clearFilters) clearFilters.addEventListener('click', function() { 
        // Clear all filters
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('amountFilter').value = '';
        filterTransactions();
    });
    
    // Export
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    
    // Delete modal
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

// Load transactions from backend
// Load transactions from backend
async function loadTransactions() {
    try {
        showLoading(true);
        const response = await fetch('backend/api.php?action=get');
        const data = await response.json();
        
        if (data.success) {
            transactions = data.transactions;
            filteredTransactions = [...transactions];
            displayTransactions();
            updateStatistics();
        } else {
            showError('Failed to load transactions: ' + data.message);
        }
    } catch (error) {
        showError('Error loading transactions: ' + error.message);
    } finally {
        showLoading(false);
    }
}



// Display transactions in table
function displayTransactions() {
    if (!transactionsTable || !transactionsTableBody || !noTransactionsMessage) {
        return; // DOM elements not ready yet
    }
    
    if (filteredTransactions.length === 0) {
        transactionsTable.style.display = 'none';
        noTransactionsMessage.style.display = 'block';
        return;
    }
    
    transactionsTable.style.display = 'table';
    noTransactionsMessage.style.display = 'none';
    
    transactionsTableBody.innerHTML = '';
    
    filteredTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        const categoryClass = categoryColors[transaction.category] || 'category-other';
        
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td class="${parseFloat(transaction.amount) >= 0 ? 'positive' : 'negative'}">
                $${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
            </td>
            <td>${transaction.vendor}</td>
            <td><span class="category-badge ${categoryClass}">${transaction.category}</span></td>
            <td>${transaction.description}</td>
            <td>
                <button class="btn btn-edit" onclick="editTransaction('${transaction.id}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteTransaction('${transaction.id}')">Delete</button>
            </td>
        `;
        
        transactionsTableBody.appendChild(row);
    });
}

// Handle form submission

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(transactionForm);
    const transactionData = {
        date: formData.get('date'),
        amount: formData.get('amount'),
        vendor: formData.get('vendor'),
        category: formData.get('category'),
        description: formData.get('description')
    };
    
    // Validation
    if (!transactionData.date || !transactionData.amount || !transactionData.vendor || !transactionData.category) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        const action = editingId ? 'update' : 'add';
        const url = `backend/api.php?action=${action}`;
        
        if (editingId) {
            transactionData.id = editingId;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactionData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadTransactions();
            resetForm();
            showSuccess(editingId ? 'Transaction updated successfully!' : 'Transaction added successfully!');
        } else {
            showError('Failed to save transaction: ' + data.message);
        }
    } catch (error) {
        showError('Error saving transaction: ' + error.message);
    }
}




// Edit transaction
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    editingId = id;
    
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    
    if (formTitle) formTitle.textContent = 'Edit Transaction';
    if (submitBtn) submitBtn.textContent = 'Update Transaction';
    
    // Populate form
    const dateInput = document.getElementById('date');
    const amountInput = document.getElementById('amount');
    const vendorInput = document.getElementById('vendor');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    
    if (dateInput) dateInput.value = transaction.date;
    if (amountInput) amountInput.value = transaction.amount;
    if (vendorInput) vendorInput.value = transaction.vendor;
    if (categoryInput) categoryInput.value = transaction.category || '';
    if (descriptionInput) descriptionInput.value = transaction.description;
    
    // Scroll to form
    const formSection = document.querySelector('.add-transaction');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete transaction
function deleteTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    deletingId = id;
    
    // Show confirmation modal
    const modal = document.getElementById('deleteModal');
    if (!modal) return;
    
    // Populate modal with transaction details
    const deleteDate = document.getElementById('deleteDate');
    const deleteAmount = document.getElementById('deleteAmount');
    const deleteVendor = document.getElementById('deleteVendor');
    const deleteCategory = document.getElementById('deleteCategory');
    const deleteDescription = document.getElementById('deleteDescription');
    
    if (deleteDate) deleteDate.textContent = formatDate(transaction.date);
    if (deleteAmount) deleteAmount.textContent = `$${Math.abs(parseFloat(transaction.amount)).toFixed(2)}`;
    if (deleteVendor) deleteVendor.textContent = transaction.vendor;
    if (deleteCategory) deleteCategory.textContent = transaction.category || 'N/A';
    if (deleteDescription) deleteDescription.textContent = transaction.description;
    
    modal.style.display = 'block';
}

// Confirm delete
// Confirm delete
async function confirmDelete() {
    if (!deletingId) return;
    
    try {
        const response = await fetch('backend/api.php?action=delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: deletingId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadTransactions();
            showSuccess('Transaction deleted successfully!');
        } else {
            showError('Failed to delete transaction: ' + data.message);
        }
    } catch (error) {
        showError('Error deleting transaction: ' + error.message);
    } finally {
        closeDeleteModal();
        deletingId = null;
    }
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.style.display = 'none';
    }
    deletingId = null;
}

// Reset form
function resetForm() {
    if (transactionForm) {
        transactionForm.reset();
    }
    editingId = null;
    
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    
    if (formTitle) formTitle.textContent = 'Add New Transaction';
    if (submitBtn) submitBtn.textContent = 'Add Transaction';
}

// Filter transactions
function filterTransactions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const amountFilter = document.getElementById('amountFilter').value;
    
    filteredTransactions = transactions.filter(transaction => {
        // Search filter
        const matchesSearch = !searchTerm || 
            transaction.vendor.toLowerCase().includes(searchTerm) ||
            transaction.description.toLowerCase().includes(searchTerm);
        
        // Category filter
        const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
        
        // Date filter
        const matchesDate = (!dateFrom || transaction.date >= dateFrom) && 
                           (!dateTo || transaction.date <= dateTo);
        
        // Amount filter
        let matchesAmount = true;
        if (amountFilter === 'income') {
            matchesAmount = parseFloat(transaction.amount) > 0;
        } else if (amountFilter === 'expense') {
            matchesAmount = parseFloat(transaction.amount) < 0;
        }
        
        return matchesSearch && matchesCategory && matchesDate && matchesAmount;
    });
    
    displayTransactions();
    updateStatistics();
}

// Clear filters
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('amountFilter').value = '';
    
    filteredTransactions = [...transactions];
    displayTransactions();
    updateStatistics();
}

// Update statistics
function updateStatistics() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // This Month calculations
    const monthlyTransactions = filteredTransactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyIncome = monthlyTransactions.filter(t => parseFloat(t.amount) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const monthlyExpenses = monthlyTransactions.filter(t => parseFloat(t.amount) < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    const monthlyNet = monthlyIncome - monthlyExpenses;

    // Overall calculations (all filtered transactions)
    const totalIncome = filteredTransactions.filter(t => parseFloat(t.amount) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = filteredTransactions.filter(t => parseFloat(t.amount) < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    const totalBalance = totalIncome - totalExpenses;

    // Averages (for this month)
    const averageTransaction = monthlyTransactions.length > 0 
        ? (monthlyIncome + monthlyExpenses) / monthlyTransactions.length 
        : 0;

    // Update DOM
    // This Month
    const monthlyIncomeEl = document.getElementById('monthlyIncome');
    const monthlyExpensesEl = document.getElementById('monthlyExpenses');
    const monthlyNetEl = document.getElementById('monthlyNet');
    if (monthlyIncomeEl) monthlyIncomeEl.textContent = `$${monthlyIncome.toFixed(2)}`;
    if (monthlyExpensesEl) monthlyExpensesEl.textContent = `$${monthlyExpenses.toFixed(2)}`;
    if (monthlyNetEl) monthlyNetEl.textContent = `$${monthlyNet.toFixed(2)}`;

    // Overall
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const totalBalanceEl = document.getElementById('totalBalance');
    if (totalIncomeEl) totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
    if (totalExpensesEl) totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
    if (totalBalanceEl) totalBalanceEl.textContent = `$${totalBalance.toFixed(2)}`;

    // Averages (for this month)
    const avgTransactionEl = document.getElementById('avgTransaction');
    const totalTransactionsEl = document.getElementById('totalTransactions');
    if (avgTransactionEl) avgTransactionEl.textContent = `$${averageTransaction.toFixed(2)}`;
    if (totalTransactionsEl) totalTransactionsEl.textContent = monthlyTransactions.length;

    // Update category breakdown (for this month)
    updateCategoryBreakdown(filteredTransactions);
}

// Update category breakdown
function updateCategoryBreakdown(transactions) {
    const categoryTotals = {};
    
    transactions.forEach(transaction => {
        const amount = Math.abs(parseFloat(transaction.amount));
        if (parseFloat(transaction.amount) < 0) { // Only expenses
            categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + amount;
        }
    });
    
    const breakdownContainer = document.getElementById('categoryBreakdown');
    if (!breakdownContainer) return;
    breakdownContainer.innerHTML = '';
    
    Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, amount]) => {
            const categoryClass = categoryColors[category] || 'category-other';
            const percentage = transactions.length > 0 ? ((amount / Object.values(categoryTotals).reduce((a, b) => a + b, 0)) * 100).toFixed(1) : 0;
            
            breakdownContainer.innerHTML += `
                <div class="category-item">
                    <span class="category-badge ${categoryClass}">${category}</span>
                    <span class="category-amount">$${amount.toFixed(2)}</span>
                    <span class="category-percentage">${percentage}%</span>
                </div>
            `;
        });
}



// Export data
function exportData() {
    const exportFrom = document.getElementById('exportDateFrom');
    const exportTo = document.getElementById('exportDateTo');
    const exportCategory = document.getElementById('exportCategory');
    
    if (!exportFrom || !exportTo || !exportCategory) {
        showError('Export elements not found');
        return;
    }
    
    const fromDate = exportFrom.value;
    const toDate = exportTo.value;
    const category = exportCategory.value;
    
    let dataToExport = [...transactions];
    
    // Apply filters
    if (fromDate) {
        dataToExport = dataToExport.filter(t => t.date >= fromDate);
    }
    if (toDate) {
        dataToExport = dataToExport.filter(t => t.date <= toDate);
    }
    if (category) {
        dataToExport = dataToExport.filter(t => t.category === category);
    }
    
    // Create CSV content
    const headers = ['Date', 'Amount', 'Vendor', 'Category', 'Description'];
    const csvContent = [
        headers.join(','),
        ...dataToExport.map(t => [
            t.date,
            t.amount,
            `"${t.vendor}"`,
            t.category,
            `"${t.description}"`
        ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Data exported successfully!');
}





// Utility functions
function showLoading(show) {
    if (loadingMessage) {
        loadingMessage.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    console.log('showError called with:', message);
    console.log('errorMessage element:', errorMessage);
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => errorMessage.style.display = 'none', 4000);
    } else {
        console.error('Error:', message);
    }
}

function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        setTimeout(() => successMessage.style.display = 'none', 3000);
    } else {
        console.log('Success:', message);
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

// Navigation functionality
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Add click event listeners for smooth scrolling
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update active navigation link
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Update active navigation based on scroll position
    window.addEventListener('scroll', function() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// Expose functions for inline event handlers
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;