/*
 * Kaptan Ark'ı herhangi bir web sitesine eklemek için:
 *   <script src="https://SITENIZ.com/kaptan-ark/embed.js" defer></script>
 * Sağ alt köşede animasyonlu maskot çıkar; tıklanınca sohbet penceresi açılır.
 * Asistan şeffaf bir çerçevede çalışır; çerçeve, sohbet açılıp kapandıkça büyüyüp küçülür.
 */
(() => {
  if (window.__kaptanArk) return;
  window.__kaptanArk = true;

  const script = document.currentScript;
  const base = new URL('.', script ? script.src : location.href);
  const page = script?.dataset.page ?? 'index.html';

  const frame = document.createElement('iframe');
  frame.src = new URL(`${page}?embed=1`, base).href;
  frame.title = 'Kaptan Ark – ARK Dental asistanı';
  frame.allow = 'microphone; autoplay';
  frame.setAttribute('allowtransparency', 'true');
  Object.assign(frame.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '190px',
    height: '180px',
    border: '0',
    background: 'transparent',
    colorScheme: 'normal',
    zIndex: '2147483000',
  });

  let state = { open: false, bubble: false };

  const tellFrame = () =>
    frame.contentWindow?.postMessage({ type: 'kaptan-ark:host', compact: window.innerWidth <= 640 }, '*');

  function layout() {
    const mobile = window.innerWidth <= 640;
    let w;
    let h;
    if (state.open) {
      // Açık: sohbet penceresi + maskot (mobilde tüm ekran)
      w = mobile ? window.innerWidth : Math.min(window.innerWidth, 680);
      h = window.innerHeight;
    } else if (state.bubble) {
      // Kapalı + karşılama baloncuğu
      w = Math.min(window.innerWidth, mobile ? 380 : 470);
      h = mobile ? 170 : 230;
    } else {
      // Sadece maskot
      w = mobile ? 130 : 190;
      h = mobile ? 120 : 175;
    }
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
  }

  window.addEventListener('message', (e) => {
    if (e.source !== frame.contentWindow || e.data?.type !== 'kaptan-ark:layout') return;
    state = { open: Boolean(e.data.open), bubble: Boolean(e.data.bubble) };
    layout();
    tellFrame();
  });
  window.addEventListener('resize', () => {
    layout();
    tellFrame();
  });
  frame.addEventListener('load', tellFrame);

  const mount = () => document.body.append(frame);
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
