<?php
/*
 * Nonna kurulum sihirbazı: bir kez çalıştırılır.
 *
 * Tarayıcıda https://alanadiniz/api/install.php adresini açın, hostingde oluşturduğunuz
 * MySQL veritabanının bilgilerini ve admin hesabını girin. Sihirbaz tabloları oluşturur,
 * admin hesabını ekler ve bağlantı bilgilerini api/config.php dosyasına yazar.
 * Kurulumdan sonra bu dosyayı sunucudan silin.
 */
declare(strict_types=1);

require __DIR__ . '/lib.php';

header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('Content-Type: text/html; charset=utf-8');

function h($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function requirements(): array
{
    $missing = [];
    if (PHP_VERSION_ID < 70300) {
        $missing[] = 'PHP 7.3 ya da üstü (sunucudaki sürüm: ' . PHP_VERSION . ')';
    }
    foreach (['pdo_mysql' => 'PDO MySQL', 'mbstring' => 'mbstring', 'json' => 'JSON'] as $ext => $label) {
        if (!extension_loaded($ext)) {
            $missing[] = $label . ' eklentisi';
        }
    }
    return $missing;
}

function config_text(array $cfg): string
{
    return "<?php\n"
        . "// Nonna ayarları: api/install.php tarafından " . date('d.m.Y H:i') . " tarihinde oluşturuldu.\n"
        . "// Veritabanı şifresini içerir. Kimseyle paylaşmayın, GitHub gibi herkese açık bir yere yüklemeyin.\n"
        . 'return ' . var_export($cfg, true) . ";\n";
}

function install(array $in, array &$errors): ?array
{
    $f = [];
    foreach (['db_host', 'db_port', 'db_name', 'db_user', 'db_pass', 'prefix', 'admin_user', 'admin_email', 'admin_pass', 'admin_pass2', 'mail_from'] as $k) {
        $f[$k] = $k === 'db_pass' || $k === 'admin_pass' || $k === 'admin_pass2' ? (string)($in[$k] ?? '') : trim((string)($in[$k] ?? ''));
    }
    if ($f['db_host'] === '') $f['db_host'] = 'localhost';
    if ($f['db_port'] === '') $f['db_port'] = '3306';

    if ($f['db_name'] === '' || $f['db_user'] === '') $errors[] = 'Veritabanı adını ve kullanıcısını girin.';
    if (!ctype_digit($f['db_port'])) $errors[] = 'Port bir sayı olmalı (genellikle 3306).';
    if (!preg_match('/^[A-Za-z0-9_]{0,20}$/', $f['prefix'])) $errors[] = 'Tablo öneki yalnızca harf, rakam ve alt çizgi içerebilir.';
    if (!preg_match('/^[A-Za-z0-9._-]{3,64}$/', $f['admin_user'])) $errors[] = 'Admin kullanıcı adı 3-64 karakter olmalı; harf, rakam, nokta, tire ve alt çizgi kullanılabilir.';
    if (!filter_var($f['admin_email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'Geçerli bir admin e-posta adresi girin. Şifre sıfırlama kodu bu adrese gider.';
    if ($f['mail_from'] !== '' && !filter_var($f['mail_from'], FILTER_VALIDATE_EMAIL)) $errors[] = 'Gönderen e-posta adresi geçerli değil.';
    if (mb_strlen($f['admin_pass']) < MIN_PASSWORD) $errors[] = 'Admin şifresi en az ' . MIN_PASSWORD . ' karakter olmalı.';
    elseif ($f['admin_pass'] !== $f['admin_pass2']) $errors[] = 'İki admin şifresi aynı değil.';
    if ($errors) return null;

    $db = [
        'driver' => 'mysql',
        'host' => $f['db_host'],
        'port' => (int)$f['db_port'],
        'name' => $f['db_name'],
        'user' => $f['db_user'],
        'pass' => $f['db_pass'],
        'prefix' => $f['prefix'],
    ];
    try {
        $pdo = db_connect($db);
    } catch (PDOException $e) {
        $errors[] = 'Veritabanına bağlanılamadı. Bilgileri kontrol edin. (' . $e->getMessage() . ')';
        return null;
    }

    $p = $f['prefix'];
    try {
        foreach (schema('mysql', $p) as $sql) {
            $pdo->exec($sql);
        }
        if (!$pdo->query("SELECT COUNT(*) FROM {$p}state WHERE id = 1")->fetchColumn()) {
            $pdo->exec("INSERT INTO {$p}state (id, version) VALUES (1, 0)");
        }
        $existing = (int)$pdo->query("SELECT COUNT(*) FROM {$p}users")->fetchColumn() > 0;
        if (!$existing) {
            $now = time();
            $pdo->prepare("INSERT INTO {$p}users (username, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
                ->execute([$f['admin_user'], $f['admin_email'], password_hash($f['admin_pass'], PASSWORD_DEFAULT), $now, $now]);
        }
    } catch (PDOException $e) {
        $errors[] = 'Tablolar oluşturulamadı. Veritabanı kullanıcısının bu veritabanında tüm yetkileri (ALL PRIVILEGES) olmalı. (' . $e->getMessage() . ')';
        return null;
    }

    $cfg = ['db' => $db, 'mail_from' => $f['mail_from'], 'mail_transport' => 'mail'];
    $text = config_text($cfg);
    $written = @file_put_contents(NONNA_CONFIG, $text, LOCK_EX) !== false;
    if ($written) {
        @chmod(NONNA_CONFIG, 0640);
    }

    $mail = null;
    if (!empty($in['test_mail'])) {
        $to = $existing ? (string)$pdo->query("SELECT email FROM {$p}users ORDER BY id LIMIT 1")->fetchColumn() : $f['admin_email'];
        $mail = send_mail($to, 'Nonna panel kurulumu tamamlandı', "Merhaba,\n\nNonna fiyat yönetim paneli kuruldu. Bu e-posta geldiyse şifre sıfırlama kodları da bu adrese ulaşır.\n", $cfg);
    }

    return ['written' => $written, 'text' => $text, 'existing' => $existing, 'mail' => $mail];
}

$missing = requirements();
$installed = is_file(NONNA_CONFIG);
$errors = [];
$result = null;
$in = $_POST;

if (!$installed && !$missing && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $result = install($in, $errors);
}

$v = function (string $key, string $default = '') use ($in): string {
    return h(isset($in[$key]) ? $in[$key] : $default);
};
?>
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Kurulum | Nonna</title>
  <link rel="icon" href="../assets/brand/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@500;600&amp;family=Newsreader:opsz,wght@6..72,400;6..72,500&amp;display=swap" rel="stylesheet">
  <style>
    :root { --ink: #2A211B; --paper: #FFFCF6; --cream: #F4ECDF; --red: #C8102E; --rule: rgba(42, 33, 27, .14); --ok: #2E6B30; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--cream); color: var(--ink); font: 400 1.05rem/1.55 "Newsreader", Georgia, serif; }
    header { background: #1E1814; padding: 18px 16px; }
    header img { display: block; width: 110px; height: auto; margin: 0 auto; }
    main { max-width: 720px; margin: 0 auto; padding: 36px 16px 64px; }
    h1, h2, legend { font-family: "Antonio", Impact, sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: .02em; line-height: 1.1; }
    h1 { font-size: clamp(2rem, 6vw, 2.8rem); margin: 0 0 8px; }
    h2 { font-size: 1.4rem; margin: 28px 0 8px; }
    p { margin: 0 0 12px; }
    fieldset { margin: 24px 0 0; padding: 20px; border: 1px solid var(--rule); border-radius: 10px; background: var(--paper); }
    legend { padding: 0 6px; font-size: 1.25rem; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .full { grid-column: 1 / -1; }
    label { display: block; font-family: "Antonio", Impact, sans-serif; font-size: 1.02rem; margin-bottom: 4px; }
    input[type="text"], input[type="password"], input[type="email"], input[type="number"] {
      width: 100%; min-height: 46px; padding: 8px 12px; border: 1.5px solid rgba(42, 33, 27, .3); border-radius: 8px; background: #fff; font: inherit; color: inherit;
    }
    input:focus-visible { outline: 3px solid rgba(200, 16, 46, .35); outline-offset: 1px; border-color: var(--red); }
    .hint { margin: 4px 0 0; font-size: .92rem; color: rgba(42, 33, 27, .72); }
    .check { display: flex; gap: 10px; align-items: flex-start; margin-top: 18px; }
    .check input { width: 18px; height: 18px; margin-top: 4px; accent-color: var(--red); }
    .check label { font-family: inherit; font-size: 1rem; margin: 0; }
    button, .btn { display: inline-block; margin-top: 24px; padding: 13px 26px; border: 0; border-radius: 999px; background: var(--red); color: #fff; font: 600 1.05rem "Antonio", Impact, sans-serif; letter-spacing: .04em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
    .box { margin-top: 20px; padding: 16px 18px; border-radius: 10px; border: 1px solid var(--rule); background: var(--paper); }
    .box.error { border-color: rgba(200, 16, 46, .45); background: #FFF1F1; }
    .box.ok { border-color: rgba(46, 107, 48, .4); background: #F1F8EF; }
    .box ul { margin: 0; padding-left: 1.2em; }
    code { font-size: .92em; background: rgba(42, 33, 27, .07); padding: 1px 5px; border-radius: 4px; }
    textarea { width: 100%; min-height: 220px; margin-top: 8px; padding: 10px; font: .85rem/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; border: 1px solid var(--rule); border-radius: 8px; }
    ol { padding-left: 1.3em; }
    li { margin-bottom: 6px; }
    @media (max-width: 600px) { .grid { grid-template-columns: minmax(0, 1fr); } fieldset { padding: 16px; } }
  </style>
</head>
<body>
  <header><img src="../assets/brand/nonna-krem.svg" alt="Nonna" width="345" height="191"></header>
  <main>
<?php if ($result): ?>
    <h1>Kurulum tamamlandı</h1>
    <?php if ($result['written']): ?>
      <div class="box ok"><p>Tablolar oluşturuldu ve bağlantı bilgileri <code>api/config.php</code> dosyasına kaydedildi.</p></div>
    <?php else: ?>
      <div class="box error">
        <p><strong>Son bir adım:</strong> sunucu <code>api/config.php</code> dosyasını yazmaya izin vermedi. Hosting panelinizdeki Dosya Yöneticisi ile <code>api</code> klasöründe <code>config.php</code> adında bir dosya oluşturup aşağıdaki metnin tamamını içine yapıştırın.</p>
        <textarea readonly onclick="this.select()"><?= h($result['text']) ?></textarea>
      </div>
    <?php endif; ?>
    <?php if ($result['existing']): ?>
      <div class="box"><p>Veritabanında zaten bir admin hesabı vardı; o hesap ve şifresi korundu. Şifreyi bilmiyorsanız paneldeki <strong>Şifremi unuttum</strong> ile sıfırlayın.</p></div>
    <?php endif; ?>
    <?php if ($result['mail'] === true): ?>
      <div class="box ok"><p>Deneme e-postası gönderildi. Birkaç dakika içinde gelmezse gereksiz (spam) klasörüne bakın. Hiç gelmezse hostinginizin e-posta gönderimini kontrol edin; şifre sıfırlama kodları da aynı yolla gider.</p></div>
    <?php elseif ($result['mail'] === false): ?>
      <div class="box error"><p>Deneme e-postası gönderilemedi. Hostinginizde PHP <code>mail()</code> ile e-posta gönderimi kapalı olabilir; "Şifremi unuttum" kodunun ulaşması için hosting firmanızdan açtırın ya da gönderen adresi alan adınıza ait bir adres (ör. <code>bilgi@alanadiniz.com</code>) yapıp tekrar deneyin.</p></div>
    <?php endif; ?>
    <h2>Şimdi</h2>
    <ol>
      <li><strong>Güvenlik için <code>api/install.php</code> dosyasını sunucudan silin.</strong></li>
      <li>Paneli açın, belirlediğiniz kullanıcı adı ve şifreyle giriş yapın.</li>
    </ol>
    <a class="btn" href="../admin.html">Panele git</a>

<?php elseif ($installed): ?>
    <h1>Kurulum zaten yapılmış</h1>
    <div class="box"><p><code>api/config.php</code> dosyası mevcut, bu yüzden kurulum tekrar çalıştırılamaz.</p></div>
    <ol>
      <li><strong>Güvenlik için <code>api/install.php</code> dosyasını sunucudan silin.</strong></li>
      <li>Veritabanı bilgilerini değiştirmek isterseniz <code>api/config.php</code> dosyasını silip bu sayfayı tekrar açın. Kayıtlı fiyatlar ve admin hesabı silinmez.</li>
    </ol>
    <a class="btn" href="../admin.html">Panele git</a>

<?php elseif ($missing): ?>
    <h1>Sunucu uygun değil</h1>
    <div class="box error">
      <p>Panelin çalışması için sunucuda şunlar gerekli:</p>
      <ul><?php foreach ($missing as $m): ?><li><?= h($m) ?></li><?php endforeach; ?></ul>
      <p class="hint">Hosting panelinizdeki "PHP sürümü seç" (Select PHP Version) bölümünden PHP 8 sürümünü ve eksik eklentileri açabilirsiniz.</p>
    </div>

<?php else: ?>
    <h1>Nonna kurulumu</h1>
    <p>Hosting panelinizde (cPanel, Plesk vb.) bir <strong>MySQL veritabanı</strong> ve bu veritabanına <strong>tüm yetkilere</strong> sahip bir kullanıcı oluşturun, bilgilerini aşağıya yazın.</p>
    <?php if ($errors): ?>
      <div class="box error" role="alert"><ul><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul></div>
    <?php endif; ?>
    <form method="post" autocomplete="off">
      <fieldset>
        <legend>Veritabanı</legend>
        <div class="grid">
          <div>
            <label for="db_name">Veritabanı adı</label>
            <input id="db_name" name="db_name" type="text" value="<?= $v('db_name') ?>" required spellcheck="false" autocapitalize="none">
            <p class="hint">cPanel'de genellikle <code>kullaniciadi_nonna</code> biçimindedir.</p>
          </div>
          <div>
            <label for="db_user">Veritabanı kullanıcısı</label>
            <input id="db_user" name="db_user" type="text" value="<?= $v('db_user') ?>" required spellcheck="false" autocapitalize="none">
          </div>
          <div class="full">
            <label for="db_pass">Veritabanı şifresi</label>
            <input id="db_pass" name="db_pass" type="password" autocomplete="new-password">
          </div>
          <div>
            <label for="db_host">Sunucu</label>
            <input id="db_host" name="db_host" type="text" value="<?= $v('db_host', 'localhost') ?>" spellcheck="false" autocapitalize="none">
            <p class="hint">Hosting aksini söylemiyorsa <code>localhost</code>.</p>
          </div>
          <div>
            <label for="db_port">Port</label>
            <input id="db_port" name="db_port" type="text" inputmode="numeric" value="<?= $v('db_port', '3306') ?>">
          </div>
          <div class="full">
            <label for="prefix">Tablo öneki</label>
            <input id="prefix" name="prefix" type="text" value="<?= $v('prefix', 'nonna_') ?>" spellcheck="false" autocapitalize="none">
            <p class="hint">Tablolar bu önekle oluşturulur (ör. <code>nonna_prices</code>); veritabanını başka bir sistemle paylaşıyorsanız çakışmaz.</p>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Admin hesabı</legend>
        <div class="grid">
          <div>
            <label for="admin_user">Kullanıcı adı</label>
            <input id="admin_user" name="admin_user" type="text" value="<?= $v('admin_user', 'admin') ?>" required spellcheck="false" autocapitalize="none">
          </div>
          <div>
            <label for="admin_email">E-posta</label>
            <input id="admin_email" name="admin_email" type="email" value="<?= $v('admin_email') ?>" required spellcheck="false">
            <p class="hint">"Şifremi unuttum" kodu bu adrese gider.</p>
          </div>
          <div>
            <label for="admin_pass">Şifre</label>
            <input id="admin_pass" name="admin_pass" type="password" autocomplete="new-password" minlength="<?= MIN_PASSWORD ?>" required>
            <p class="hint">En az <?= MIN_PASSWORD ?> karakter.</p>
          </div>
          <div>
            <label for="admin_pass2">Şifre (tekrar)</label>
            <input id="admin_pass2" name="admin_pass2" type="password" autocomplete="new-password" minlength="<?= MIN_PASSWORD ?>" required>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>E-posta gönderimi</legend>
        <label for="mail_from">Gönderen adres (isteğe bağlı)</label>
        <input id="mail_from" name="mail_from" type="email" value="<?= $v('mail_from') ?>" placeholder="bilgi@alanadiniz.com" spellcheck="false">
        <p class="hint">Boş bırakılırsa <code>no-reply@alanadiniz</code> kullanılır. Alan adınızda açtığınız bir e-posta adresi yazarsanız kodlar spam klasörüne daha az düşer.</p>
        <div class="check">
          <input id="test_mail" name="test_mail" type="checkbox" value="1" <?= !$in || !empty($in['test_mail']) ? 'checked' : '' ?>>
          <label for="test_mail">Kurulumdan sonra admin e-postasına deneme e-postası gönder</label>
        </div>
      </fieldset>

      <button type="submit">Kurulumu tamamla</button>
    </form>
<?php endif; ?>
  </main>
</body>
</html>
