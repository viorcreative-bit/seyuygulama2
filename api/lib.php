<?php
/*
 * Nonna sunucu tarafı: ortak yardımcılar.
 * Veritabanı, oturum, deneme sınırı, JSON yanıtları ve e-posta.
 * Doğrudan çağrılmaz; prices.php, admin.php ve install.php tarafından kullanılır.
 */
declare(strict_types=1);

const NONNA_CONFIG = __DIR__ . '/config.php';
const NONNA_COOKIE = 'nonna_admin';
const SESSION_HOURS = 12;       // "beni hatırla" seçilmezse oturum süresi
const REMEMBER_DAYS = 30;       // "beni hatırla" seçilirse
const MAX_PRICE = 1000000;
const MIN_PASSWORD = 8;

/* ---------- Ayarlar ve veritabanı ---------- */

function nonna_config(): ?array
{
    static $cfg = null;
    if ($cfg === null) {
        $cfg = is_file(NONNA_CONFIG) ? require NONNA_CONFIG : false;
    }
    return is_array($cfg) ? $cfg : null;
}

function db_connect(array $d): PDO
{
    if (($d['driver'] ?? 'mysql') === 'sqlite') {
        $pdo = new PDO('sqlite:' . $d['path']);
    } else {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $d['host'], (int)($d['port'] ?? 3306), $d['name']);
        $pdo = new PDO($dsn, $d['user'], $d['pass'], [PDO::ATTR_TIMEOUT => 5]);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $cfg = nonna_config();
        if (!$cfg) {
            fail('not_installed', 'Kurulum yapılmamış. Tarayıcıda api/install.php adresini açın.', 503);
        }
        try {
            $pdo = db_connect($cfg['db']);
        } catch (PDOException $e) {
            error_log('Nonna DB: ' . $e->getMessage());
            fail('db', 'Veritabanına bağlanılamadı.', 500);
        }
    }
    return $pdo;
}

function is_sqlite(): bool
{
    return (nonna_config()['db']['driver'] ?? 'mysql') === 'sqlite';
}

// Tablo adları önekle oluşturulur (ör. nonna_prices); aynı veritabanını kullanan başka sistemlerle çakışmaz.
function t(string $name): string
{
    $prefix = nonna_config()['db']['prefix'] ?? 'nonna_';
    return preg_replace('/[^A-Za-z0-9_]/', '', $prefix) . $name;
}

/* Tablolar: tarihler Unix zaman damgası (saniye) olarak tutulur. */
function schema(string $driver, string $prefix): array
{
    $p = preg_replace('/[^A-Za-z0-9_]/', '', $prefix);
    if ($driver === 'sqlite') {
        $id = 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $tail = '';
        $bin = '';
    } else {
        $id = 'INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
        $tail = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
        // Ürün anahtarları birebir karşılaştırılır ("Çay" ile "Cay" ayrı ürünlerdir).
        $bin = ' COLLATE utf8mb4_bin';
    }
    return [
        "CREATE TABLE IF NOT EXISTS {$p}users (
            id $id,
            username VARCHAR(64) NOT NULL UNIQUE,
            email VARCHAR(191) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at INT NOT NULL,
            updated_at INT NOT NULL
        )$tail",
        "CREATE TABLE IF NOT EXISTS {$p}sessions (
            token_hash CHAR(64) NOT NULL PRIMARY KEY,
            user_id INT NOT NULL,
            csrf CHAR(64) NOT NULL,
            expires_at INT NOT NULL,
            created_at INT NOT NULL
        )$tail",
        "CREATE TABLE IF NOT EXISTS {$p}prices (
            item_key VARCHAR(191)$bin NOT NULL PRIMARY KEY,
            price INT NOT NULL
        )$tail",
        "CREATE TABLE IF NOT EXISTS {$p}state (
            id INT NOT NULL PRIMARY KEY,
            version INT NOT NULL,
            updated_at INT NULL,
            updated_by VARCHAR(64) NULL
        )$tail",
        "CREATE TABLE IF NOT EXISTS {$p}resets (
            id $id,
            user_id INT NOT NULL,
            code_hash VARCHAR(255) NOT NULL,
            expires_at INT NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            used INT NOT NULL DEFAULT 0,
            created_at INT NOT NULL
        )$tail",
        "CREATE TABLE IF NOT EXISTS {$p}attempts (
            id $id,
            kind VARCHAR(16) NOT NULL,
            subject VARCHAR(191) NOT NULL,
            created_at INT NOT NULL
        )$tail",
    ];
}

/* ---------- JSON ---------- */

function json_out(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $code, string $message, int $status): void
{
    json_out(['error' => $code, 'message' => $message], $status);
}

function read_json(): array
{
    $data = json_decode((string)file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function client_ip(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

/* ---------- Oturum ---------- */

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
        || (string)($_SERVER['SERVER_PORT'] ?? '') === '443';
}

function set_session_cookie(string $value, int $expires): void
{
    setcookie(NONNA_COOKIE, $value, [
        'expires' => $expires,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function create_session(int $userId, bool $remember): string
{
    $pdo = db();
    $now = time();
    $pdo->prepare('DELETE FROM ' . t('sessions') . ' WHERE expires_at < ?')->execute([$now]);
    $token = bin2hex(random_bytes(32));
    $csrf = bin2hex(random_bytes(32));
    $expires = $now + ($remember ? REMEMBER_DAYS * 86400 : SESSION_HOURS * 3600);
    $pdo->prepare('INSERT INTO ' . t('sessions') . ' (token_hash, user_id, csrf, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([hash('sha256', $token), $userId, $csrf, $expires, $now]);
    // "Beni hatırla" yoksa tarayıcı kapanınca çerez silinir.
    set_session_cookie($token, $remember ? $expires : 0);
    return $csrf;
}

function current_session(): ?array
{
    $token = (string)($_COOKIE[NONNA_COOKIE] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return null;
    }
    $st = db()->prepare(
        'SELECT s.token_hash, s.user_id, s.csrf, u.username, u.email FROM ' . t('sessions') . ' s
         JOIN ' . t('users') . ' u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?'
    );
    $st->execute([hash('sha256', $token), time()]);
    $row = $st->fetch();
    return $row ?: null;
}

function require_session(bool $checkCsrf = true): array
{
    $s = current_session();
    if (!$s) {
        fail('unauthorized', 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.', 401);
    }
    if ($checkCsrf && !hash_equals($s['csrf'], (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
        fail('csrf', 'Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.', 403);
    }
    return $s;
}

function end_session(): void
{
    $token = (string)($_COOKIE[NONNA_COOKIE] ?? '');
    if ($token !== '') {
        db()->prepare('DELETE FROM ' . t('sessions') . ' WHERE token_hash = ?')->execute([hash('sha256', $token)]);
    }
    set_session_cookie('', time() - 3600);
}

/* ---------- Deneme sınırı ---------- */

function too_many(string $kind, string $subject, int $max, int $windowSeconds): bool
{
    $st = db()->prepare('SELECT COUNT(*) FROM ' . t('attempts') . ' WHERE kind = ? AND subject = ? AND created_at > ?');
    $st->execute([$kind, $subject, time() - $windowSeconds]);
    return (int)$st->fetchColumn() >= $max;
}

function record_attempt(string $kind, string $subject): void
{
    $pdo = db();
    $pdo->prepare('INSERT INTO ' . t('attempts') . ' (kind, subject, created_at) VALUES (?, ?, ?)')->execute([$kind, $subject, time()]);
    // Bir günden eski kayıtları temizle.
    $pdo->prepare('DELETE FROM ' . t('attempts') . ' WHERE created_at < ?')->execute([time() - 86400]);
}

function clear_attempts(string $kind, string $subject): void
{
    db()->prepare('DELETE FROM ' . t('attempts') . ' WHERE kind = ? AND subject = ?')->execute([$kind, $subject]);
}

/* ---------- E-posta ---------- */

function mask_email(string $email): string
{
    $at = strpos($email, '@');
    if ($at === false || $at < 2) {
        return $email;
    }
    return mb_substr($email, 0, 1) . str_repeat('•', max(3, $at - 1)) . substr($email, $at);
}

// $cfg verilmezse config.php kullanılır (kurulum sırasında henüz dosya yokken install.php kendi ayarını verir).
function send_mail(string $to, string $subject, string $body, ?array $cfg = null): bool
{
    $cfg = $cfg ?? (nonna_config() ?: []);
    $host = preg_replace('/^www\./', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $from = (string)($cfg['mail_from'] ?? '') ?: 'no-reply@' . preg_replace('/:\d+$/', '', $host);

    // Yerel denemeler için: e-posta göndermek yerine dosyaya yaz.
    if (($cfg['mail_transport'] ?? 'mail') === 'log') {
        $line = json_encode(['to' => $to, 'from' => $from, 'subject' => $subject, 'body' => $body], JSON_UNESCAPED_UNICODE);
        return file_put_contents($cfg['mail_log'], $line . "\n", FILE_APPEND) !== false;
    }

    $headers = implode("\r\n", [
        'From: Nonna <' . $from . '>',
        'Reply-To: ' . $from,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    // Bazı hostingler -f parametresine izin vermez; o durumda parametresiz tekrar dene.
    if (@mail($to, $encodedSubject, $body, $headers, '-f' . $from)) {
        return true;
    }
    return @mail($to, $encodedSubject, $body, $headers);
}
