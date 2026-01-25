<?php
// Contact Form Handler
// This script processes the contact form submission

// Enable error reporting for development (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set response header
header('Content-Type: application/json');

// Check if form was submitted via POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Neteisingas užklausos metodas']);
    exit;
}

// Sanitize and validate input
function sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Get form data
$name = isset($_POST['name']) ? sanitize_input($_POST['name']) : '';
$email = isset($_POST['email']) ? sanitize_input($_POST['email']) : '';
$phone = isset($_POST['phone']) ? sanitize_input($_POST['phone']) : '';
$subject = isset($_POST['subject']) ? sanitize_input($_POST['subject']) : '';
$message = isset($_POST['message']) ? sanitize_input($_POST['message']) : '';

// Validation
$errors = [];

if (empty($name)) {
    $errors[] = 'Vardas/Įmonė yra privalomas laukas';
}

if (empty($email)) {
    $errors[] = 'El. paštas yra privalomas laukas';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Neteisingas el. pašto formatas';
}

if (empty($subject)) {
    $errors[] = 'Tema yra privalomas laukas';
}

if (empty($message)) {
    $errors[] = 'Žinutė yra privaloma';
}

// If there are validation errors, return them
if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => implode(', ', $errors)]);
    exit;
}

// Prepare email
$to = 'info@miltegona.lt'; // Change this to your email
$subject_map = [
    'quote' => 'Kainos pasiūlymas',
    'consultation' => 'Konsultacija',
    'order' => 'Užsakymas',
    'other' => 'Kita'
];
$email_subject = 'Nauja žinutė iš svetainės: ' . ($subject_map[$subject] ?? 'Kita');

// Email body
$email_body = "Nauja kontaktinė žinutė iš svetainės\n\n";
$email_body .= "Vardas ir pavardė: $name\n";
$email_body .= "El. paštas: $email\n";
$email_body .= "Telefonas: " . ($phone ?: 'Nenurodytas') . "\n";
$email_body .= "Tema: " . ($subject_map[$subject] ?? 'Kita') . "\n\n";
$email_body .= "Žinutė:\n$message\n\n";
$email_body .= "---\n";
$email_body .= "Išsiųsta: " . date('Y-m-d H:i:s') . "\n";
$email_body .= "IP adresas: " . $_SERVER['REMOTE_ADDR'] . "\n";

// Email headers
$headers = "From: $name <$email>\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// Send email
$mail_sent = mail($to, $email_subject, $email_body, $headers);

if ($mail_sent) {
    // Optionally, save to database or log file
    // log_contact_form($name, $email, $phone, $subject, $message);
    
    echo json_encode([
        'success' => true,
        'message' => 'Jūsų žinutė sėkmingai išsiųsta! Susisieksime su jumis artimiausiu metu.'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Klaida siunčiant žinutę. Bandykite dar kartą arba susisiekite tiesiogiai telefonu.'
    ]);
}

// Optional: Save to database
function log_contact_form($name, $email, $phone, $subject, $message) {
    // Example database connection (adjust credentials)
    try {
        $pdo = new PDO('mysql:host=localhost;dbname=miltegona', 'username', 'password');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $stmt = $pdo->prepare("INSERT INTO contact_messages (name, email, phone, subject, message, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$name, $email, $phone, $subject, $message]);
    } catch(PDOException $e) {
        // Log error but don't expose to user
        error_log("Database error: " . $e->getMessage());
    }
}
?>
