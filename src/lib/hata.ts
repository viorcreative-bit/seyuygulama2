// Teknik hata sebebi yalnızca geliştirme sırasında kullanıcıya gösterilir.
// Yayındaki uygulamada kullanıcı sadece anlaşılır bir mesaj görür.
export function sebep(e: unknown): string {
  if (!__DEV__) return '';
  const m = (e as { message?: string } | null)?.message;
  return m ? ` (Sebep: ${m})` : '';
}
