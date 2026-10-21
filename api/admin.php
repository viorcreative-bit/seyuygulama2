<?php
/*
 * Fiyat yönetim paneli (admin.html) için sunucu uçları.
 *
 *   GET  ?action=me                     oturum bilgisi ve CSRF anahtarı
 *   POST {action:"login", username, password, remember}
 *   POST {action:"logout"}                                  (oturum + CSRF)
 *   POST {action:"save", version, prices:{anahtar:fiyat}}    (oturum + CSRF)
 *   POST {action:"password", current, password}             (oturum + CSRF)
 *   POST {action:"forgot"}               admin e-postasına 6 haneli kod gönderir
 *   POST {action:"reset", code, password} kodla yeni şifre belirler
 */
declare(strict_types=1);

require __DIR__ . '/lib.php';

header('Cache-Control: no-store');

db(); // kurulum yapılmamışsa panel "not_installed" yanıtıyla kurulum sayfasına yönlendirir

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$input = $method === 'POST' ? read_json() : [];
$action = (string)($method === 'POST' ? ($input['action'] ?? '') : ($_GET['action'] ?? ''));

if ($method === 'GET' && $action === 'me') {
    $s = require_session(false);
    json_out(['user' => ['username' => $s['username'], 'email' => mask_email($s['email'])], 'csrf' => $s['csrf']]);
}

if ($method !== 'POST') {
    fail('method', 'Geçersiz istek.', 405);
}

switch ($action) {
    case 'login':
        action_login($input);
        break;
    case 'logout':
        require_session();
        end_session();
        json_out(['ok' => true]);
        break;
    case 'save':
        action_save(require_session(), $input);
        break;
    case 'password':
        action_password(require_session(), $input);
        break;
    case 'forgot':
        action_forgot();
        break;
    case 'reset':
        action_reset($input);
        break;
    default:
        fail('action', 'Bilinmeyen işlem.', 400);
}

/* ---------- Giriş ---------- */

function action_login(array $in): void
{
    $username = mb_strtolower(trim((string)($in['username'] ?? '')));
    $password = (string)($in['password'] ?? '');
    if ($username === '' || $password === '') {
        fail('invalid', 'Kullanıcı adı ve şifreyi girin.', 400);
    }
    // Aynı IP'den ya da aynı kullanıcı adına 15 dakikada en fazla 8 hatalı deneme.
    $ipKey = 'ip:' . client_ip();
    $userKey = 'user:' . $username;
    if (too_many('login', $ipKey, 8, 900) || too_many('login', $userKey, 8, 900)) {
        fail('rate', 'Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin ya da "Şifremi unuttum" ile şifrenizi sıfırlayın.', 429);
    }

    $st = db()->prepare('SELECT id, username, email, password_hash FROM ' . t('users') . ' WHERE LOWER(username) = ? OR LOWER(email) = ?');
    $st->execute([$username, $username]);
    $user = $st->fetch();

    // Kullanıcı yoksa da aynı sürede yanıt vermek için sahte doğrulama yapılır.
    $hash = $user['password_hash'] ?? '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
    if (!password_verify($password, $hash) || !$user) {
        record_attempt('login', $ipKey);
        record_attempt('login', $userKey);
        fail('credentials', 'Kullanıcı adı ya da şifre hatalı.', 401);
    }

    clear_attempts('login', $userKey);
    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        db()->prepare('UPDATE ' . t('users') . ' SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
    }
    $csrf = create_session((int)$user['id'], !empty($in['remember']));
    json_out(['user' => ['username' => $user['username'], 'email' => mask_email($user['email'])], 'csrf' => $csrf]);
}

/* ---------- Fiyatları kaydet ---------- */

function action_save(array $s, array $in): void
{
    $prices = $in['prices'] ?? null;
    if (!is_array($prices) || !$prices || count($prices) > 2000) {
        fail('invalid', 'Fiyat listesi geçersiz.', 400);
    }
    $clean = [];
    foreach ($prices as $key => $value) {
        $key = (string)$key;
        if ($key === '' || mb_strlen($key) > 191) {
            fail('invalid', 'Geçersiz ürün anahtarı.', 400);
        }
        if (!is_int($value) && !(is_string($value) && ctype_digit($value))) {
            fail('invalid', '"' . $key . '" için fiyat tam sayı olmalı.', 400);
        }
        $value = (int)$value;
        if ($value < 1 || $value >= MAX_PRICE) {
            fail('invalid', '"' . $key . '" için fiyat geçersiz.', 400);
        }
        $clean[$key] = $value;
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        // Başka bir cihaz bu arada kaydettiyse üzerine yazma.
        $lock = is_sqlite() ? '' : ' FOR UPDATE';
        $current = (int)($pdo->query('SELECT version FROM ' . t('state') . ' WHERE id = 1' . $lock)->fetchColumn() ?: 0);
        if ((int)($in['version'] ?? -1) !== $current) {
            $pdo->rollBack();
            fail('conflict', 'Fiyatlar siz düzenlerken başka bir yerden değiştirildi.', 409);
        }
        $pdo->exec('DELETE FROM ' . t('prices'));
        $ins = $pdo->prepare('INSERT INTO ' . t('prices') . ' (item_key, price) VALUES (?, ?)');
        foreach ($clean as $key => $value) {
            $ins->execute([$key, $value]);
        }
        $now = time();
        $pdo->prepare('UPDATE ' . t('state') . ' SET version = ?, updated_at = ?, updated_by = ? WHERE id = 1')
            ->execute([$current + 1, $now, $s['username']]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Nonna save: ' . $e->getMessage());
        fail('db', 'Fiyatlar kaydedilemedi.', 500);
    }
    json_out(['ok' => true, 'version' => $current + 1, 'updatedAt' => gmdate('c', $now)]);
}

/* ---------- Şifre değiştir ---------- */

function action_password(array $s, array $in): void
{
    $current = (string)($in['current'] ?? '');
    $new = (string)($in['password'] ?? '');
    if (mb_strlen($new) < MIN_PASSWORD) {
        fail('weak', 'Yeni şifre en az ' . MIN_PASSWORD . ' karakter olmalı.', 400);
    }
    $st = db()->prepare('SELECT password_hash FROM ' . t('users') . ' WHERE id = ?');
    $st->execute([$s['user_id']]);
    if (!password_verify($current, (string)$st->fetchColumn())) {
        fail('credentials', 'Mevcut şifre hatalı.', 400);
    }
    set_password((int)$s['user_id'], $new, $s['token_hash']);
    json_out(['ok' => true]);
}

// Şifreyi değiştirir ve (varsa bu oturum hariç) bütün oturumları kapatır.
function set_password(int $userId, string $password, ?string $keepSession = null): void
{
    $pdo = db();
    $pdo->prepare('UPDATE ' . t('users') . ' SET password_hash = ?, updated_at = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), time(), $userId]);
    if ($keepSession) {
        $pdo->prepare('DELETE FROM ' . t('sessions') . ' WHERE user_id = ? AND token_hash <> ?')->execute([$userId, $keepSession]);
    } else {
        $pdo->prepare('DELETE FROM ' . t('sessions') . ' WHERE user_id = ?')->execute([$userId]);
    }
}

/* ---------- Şifremi unuttum: e-postaya kod ---------- */

function admin_user(): ?array
{
    $row = db()->query('SELECT id, username, email FROM ' . t('users') . ' ORDER BY id LIMIT 1')->fetch();
    return $row ?: null;
}

function action_forgot(): void
{
    $user = admin_user();
    if (!$user) {
        fail('not_installed', 'Admin hesabı yok. Kurulumu tamamlayın.', 503);
    }
    // Saatte en fazla 3 kod (aynı IP'den 10 istek).
    $userKey = 'user:' . $user['id'];
    $ipKey = 'ip:' . client_ip();
    if (too_many('forgot', $userKey, 3, 3600) || too_many('forgot', $ipKey, 10, 3600)) {
        fail('rate', 'Kısa sürede çok fazla kod istendi. Bir saat sonra tekrar deneyin ya da son gelen kodu kullanın.', 429);
    }
    record_attempt('forgot', $userKey);
    record_attempt('forgot', $ipKey);

    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $pdo = db();
    $now = time();
    $pdo->prepare('UPDATE ' . t('resets') . ' SET used = 1 WHERE user_id = ? AND used = 0')->execute([$user['id']]);
    $pdo->prepare('INSERT INTO ' . t('resets') . ' (user_id, code_hash, expires_at, attempts, used, created_at) VALUES (?, ?, ?, 0, 0, ?)')
        ->execute([$user['id'], password_hash($code, PASSWORD_DEFAULT), $now + 900, $now]);

    $site = preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? 'site'));
    $body = "Merhaba,\n\n"
        . "Nonna fiyat yönetim paneli için şifre sıfırlama kodunuz:\n\n"
        . "    $code\n\n"
        . "Kod 15 dakika geçerlidir. Paneldeki \"Şifremi unuttum\" ekranına bu kodu ve yeni şifrenizi yazın.\n\n"
        . "Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın; şifreniz değişmez.\n\n"
        . "Kullanıcı adı: {$user['username']}\n"
        . "Site: $site\n";
    if (!send_mail($user['email'], 'Nonna panel şifre sıfırlama kodu: ' . $code, $body)) {
        fail('mail', 'E-posta gönderilemedi. Hosting e-posta ayarlarını kontrol edin.', 500);
    }
    json_out(['ok' => true, 'email' => mask_email($user['email'])]);
}

function action_reset(array $in): void
{
    $code = preg_replace('/\D/', '', (string)($in['code'] ?? ''));
    $new = (string)($in['password'] ?? '');
    if (strlen($code) !== 6) {
        fail('invalid', 'E-postadaki 6 haneli kodu girin.', 400);
    }
    if (mb_strlen($new) < MIN_PASSWORD) {
        fail('weak', 'Yeni şifre en az ' . MIN_PASSWORD . ' karakter olmalı.', 400);
    }
    $user = admin_user();
    if (!$user) {
        fail('not_installed', 'Admin hesabı yok.', 503);
    }
    $pdo = db();
    $st = $pdo->prepare('SELECT id, code_hash, expires_at, attempts FROM ' . t('resets') . ' WHERE user_id = ? AND used = 0 ORDER BY id DESC LIMIT 1');
    $st->execute([$user['id']]);
    $reset = $st->fetch();
    if (!$reset || (int)$reset['expires_at'] < time() || (int)$reset['attempts'] >= 5) {
        fail('expired', 'Kodun süresi dolmuş ya da çok fazla yanlış deneme yapılmış. Yeni kod isteyin.', 400);
    }
    if (!password_verify($code, $reset['code_hash'])) {
        $pdo->prepare('UPDATE ' . t('resets') . ' SET attempts = attempts + 1 WHERE id = ?')->execute([$reset['id']]);
        $left = 4 - (int)$reset['attempts'];
        fail('code', $left > 0 ? "Kod hatalı. $left deneme hakkınız kaldı." : 'Kod hatalı. Yeni kod isteyin.', 400);
    }
    $pdo->prepare('UPDATE ' . t('resets') . ' SET used = 1 WHERE id = ?')->execute([$reset['id']]);
    set_password((int)$user['id'], $new);
    clear_attempts('login', 'user:' . mb_strtolower($user['username']));
    json_out(['ok' => true, 'username' => $user['username']]);
}
