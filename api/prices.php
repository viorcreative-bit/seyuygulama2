<?php
/*
 * Herkese açık: panelden kaydedilen fiyatları döndürür.
 * Site (assets/js/prices.js) bu fiyatları menu.js'teki fiyatların yerine kullanır.
 *
 * Yanıt: { "prices": { "kategori::ürün adı": 1180, ... }, "version": 3, "updatedAt": "2026-10-21T10:00:00+00:00" }
 */
declare(strict_types=1);

require __DIR__ . '/lib.php';

header('Cache-Control: no-cache, must-revalidate');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail('method', 'Yalnızca GET desteklenir.', 405);
}

$pdo = db();
$prices = [];
foreach ($pdo->query('SELECT item_key, price FROM ' . t('prices')) as $row) {
    $prices[$row['item_key']] = (int)$row['price'];
}
$state = $pdo->query('SELECT version, updated_at FROM ' . t('state') . ' WHERE id = 1')->fetch() ?: ['version' => 0, 'updated_at' => null];

json_out([
    'prices' => (object)$prices,
    'version' => (int)$state['version'],
    'updatedAt' => $state['updated_at'] ? gmdate('c', (int)$state['updated_at']) : null,
]);
