<?php
// --- GANTI BAGIAN INI DENGAN DATA LO SENDIRI ---
$api_key = 'ISI_API_KEY_LO';
$email = 'EMAIL_CLOUDFLARE_LO';
$zone_id = 'ZONE_ID_DOMAIN_LO';

// --- Ambil data dari form ---
$name = $_POST['name'];
$content = $_POST['content'];
$type = $_POST['type'];

// --- Validasi sederhana ---
if (!$name || !$content || !$type) {
  die("Semua field wajib diisi!");
}

// --- Siapkan data untuk request ---
$data = [
  'type' => $type,
  'name' => $name,
  'content' => $content,
  'ttl' => 1,
  'proxied' => true
];

// --- Kirim ke Cloudflare API ---
$ch = curl_init("https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "X-Auth-Email: $email",
  "X-Auth-Key: $api_key",
  "Content-Type: application/json"
]);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);

// --- Tampilkan hasil ---
if ($result['success']) {
  echo "<h2 style='color:green;text-align:center;'>✅ DNS berhasil ditambahkan!</h2>";
  echo "<p style='text-align:center;'>Record: <strong>$name ➜ $content</strong></p>";
} else {
  echo "<h2 style='color:red;text-align:center;'>❌ Gagal menambahkan DNS!</h2>";
  echo "<pre>" . print_r($result['errors'], true) . "</pre>";
}
?>
