// Tüm SQL dosyalarını yerel (bellek içi) bir Postgres'te çalıştırır ve güvenlik kurallarını dener.
// Kullanım: npm run test:sql
import { spawnSync } from 'node:child_process';
const sonuc = spawnSync(process.execPath, [new URL('./guvenlik.test.mjs', import.meta.url).pathname], { stdio: 'inherit' });
process.exit(sonuc.status ?? 1);
