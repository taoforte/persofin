<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuration
$transactionsFile = 'transactions.json';

// Get the action from query parameter
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get':
            getTransactions($transactionsFile);
            break;
        case 'add':
            addTransaction($transactionsFile);
            break;
        case 'update':
            updateTransaction($transactionsFile);
            break;
        case 'delete':
            deleteTransaction($transactionsFile);
            break;
        case 'getBudgets':
            getBudgets($transactionsFile);
            break;
        case 'saveBudgets':
            saveBudgets($transactionsFile);
            break;
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

// Function to get all transactions
function getTransactions($file) {
    if (!file_exists($file)) {
        // Create empty file if it doesn't exist
        file_put_contents($file, '[]');
    }
    
    $content = file_get_contents($file);
    $transactions = json_decode($content, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data in transactions file');
    }
    
    echo json_encode([
        'success' => true,
        'transactions' => $transactions
    ]);
}

// Function to add a new transaction
function addTransaction($file) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed for adding transactions');
    }
    
    // Get JSON input
    $input = file_get_contents('php://input');
    $transaction = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    //$requiredFields = ['date', 'amount', 'vendor', 'description'];
    
    $requiredFields = ['date', 'amount', 'vendor', 'category', 'description'];

    foreach ($requiredFields as $field) {
        if (!isset($transaction[$field]) || empty($transaction[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Validate amount is numeric
    if (!is_numeric($transaction['amount'])) {
        throw new Exception('Amount must be a number');
    }
    
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $transaction['date'])) {
        throw new Exception('Invalid date format. Use YYYY-MM-DD');
    }
    
    // Load existing transactions
    if (!file_exists($file)) {
        $transactions = [];
    } else {
        $content = file_get_contents($file);
        $transactions = json_decode($content, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON data in transactions file');
        }
    }
    
    // Add unique ID to transaction
    $transaction['id'] = uniqid();
    $transaction['created_at'] = date('Y-m-d H:i:s');
    
    // Add transaction to array
    $transactions[] = $transaction;
    
    // Save back to file with file locking
    $fp = fopen($file, 'w');
    if (!$fp) {
        throw new Exception('Cannot open transactions file for writing');
    }
    
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        throw new Exception('Cannot lock transactions file');
    }
    
    $result = fwrite($fp, json_encode($transactions, JSON_PRETTY_PRINT));
    flock($fp, LOCK_UN);
    fclose($fp);
    
    if ($result === false) {
        throw new Exception('Failed to write to transactions file');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Transaction added successfully',
        'transaction' => $transaction
    ]);
}

// Function to update an existing transaction
function updateTransaction($file) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed for updating transactions');
    }
    
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    // $requiredFields = ['id', 'date', 'amount', 'vendor', 'description'];
    $requiredFields = ['id', 'date', 'amount', 'vendor', 'category', 'description'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Validate amount is numeric
    if (!is_numeric($data['amount'])) {
        throw new Exception('Amount must be a number');
    }
    
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['date'])) {
        throw new Exception('Invalid date format. Use YYYY-MM-DD');
    }
    
    // Load existing transactions
    if (!file_exists($file)) {
        throw new Exception('Transactions file not found');
    }
    
    $content = file_get_contents($file);
    $transactions = json_decode($content, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data in transactions file');
    }
    
    // Find the transaction to update
    $transactionIndex = -1;
    foreach ($transactions as $index => $transaction) {
        if ($transaction['id'] === $data['id']) {
            $transactionIndex = $index;
            break;
        }
    }
    
    if ($transactionIndex === -1) {
        throw new Exception('Transaction not found');
    }
    
    // Update the transaction
    $transactions[$transactionIndex]['date'] = $data['date'];
    $transactions[$transactionIndex]['amount'] = $data['amount'];
    $transactions[$transactionIndex]['vendor'] = $data['vendor'];
    $transactions[$transactionIndex]['category'] = $data['category'];
    $transactions[$transactionIndex]['description'] = $data['description'];
    $transactions[$transactionIndex]['updated_at'] = date('Y-m-d H:i:s');
    
    // Save back to file with file locking
    $fp = fopen($file, 'w');
    if (!$fp) {
        throw new Exception('Cannot open transactions file for writing');
    }
    
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        throw new Exception('Cannot lock transactions file');
    }
    
    $result = fwrite($fp, json_encode($transactions, JSON_PRETTY_PRINT));
    flock($fp, LOCK_UN);
    fclose($fp);
    
    if ($result === false) {
        throw new Exception('Failed to write to transactions file');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Transaction updated successfully',
        'transaction' => $transactions[$transactionIndex]
    ]);
}

// Function to delete a transaction
function deleteTransaction($file) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed for deleting transactions');
    }
    
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    if (!isset($data['id']) || empty($data['id'])) {
        throw new Exception('Missing transaction ID');
    }
    
    // Load existing transactions
    if (!file_exists($file)) {
        throw new Exception('Transactions file not found');
    }
    
    $content = file_get_contents($file);
    $transactions = json_decode($content, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data in transactions file');
    }
    
    // Find the transaction to delete
    $transactionIndex = -1;
    $transactionToDelete = null;
    foreach ($transactions as $index => $transaction) {
        if ($transaction['id'] === $data['id']) {
            $transactionIndex = $index;
            $transactionToDelete = $transaction;
            break;
        }
    }
    
    if ($transactionIndex === -1) {
        throw new Exception('Transaction not found');
    }
    
    // Remove the transaction from the array
    array_splice($transactions, $transactionIndex, 1);
    
    // Save back to file with file locking
    $fp = fopen($file, 'w');
    if (!$fp) {
        throw new Exception('Cannot open transactions file for writing');
    }
    
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        throw new Exception('Cannot lock transactions file');
    }
    
    $result = fwrite($fp, json_encode($transactions, JSON_PRETTY_PRINT));
    flock($fp, LOCK_UN);
    fclose($fp);
    
    if ($result === false) {
        throw new Exception('Failed to write to transactions file');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Transaction deleted successfully',
        'deleted_transaction' => $transactionToDelete
    ]);
}


// Function to get budgets
function getBudgets($file) {
    $budgetsFile = 'budgets.json';
    
    if (!file_exists($budgetsFile)) {
        echo json_encode([
            'success' => true,
            'budgets' => []
        ]);
        return;
    }
    
    $content = file_get_contents($budgetsFile);
    $budgets = json_decode($content, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data in budgets file');
    }
    
    echo json_encode([
        'success' => true,
        'budgets' => $budgets
    ]);
}

// Function to save budgets
function saveBudgets($file) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed for saving budgets');
    }
    
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input');
    }
    
    if (!isset($data['budgets']) || !is_array($data['budgets'])) {
        throw new Exception('Invalid budgets data');
    }
    
    $budgetsFile = 'budgets.json';
    
    // Save budgets to file
    $fp = fopen($budgetsFile, 'w');
    if (!$fp) {
        throw new Exception('Cannot open budgets file for writing');
    }
    
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        throw new Exception('Cannot lock budgets file');
    }
    
    $result = fwrite($fp, json_encode($data['budgets'], JSON_PRETTY_PRINT));
    flock($fp, LOCK_UN);
    fclose($fp);
    
    if ($result === false) {
        throw new Exception('Failed to write to budgets file');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Budgets saved successfully',
        'budgets' => $data['budgets']
    ]);
}
?>