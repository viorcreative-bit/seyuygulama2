/*
 * ARK Dental asistanını herhangi bir web sitesine eklemek için:
 *   <script src="https://SITENIZ.com/kaptan-ark/embed.js" defer></script>
 * Sağ alt köşede maskot düğmesi çıkar, tıklanınca sohbet penceresi açılır.
 */
(() => {
  if (window.__arkDentalWidget) return;
  window.__arkDentalWidget = true;

  const script = document.currentScript;
  const base = new URL('.', script ? script.src : location.href).href;
  const greeting = script?.dataset.greeting ?? "ARK Dental'e hoş geldiniz! 👋";

  const css = `
  .arkdw-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:76px;height:76px;border-radius:50%;border:0;cursor:pointer;
    background:#fff url(${base}img/mascot-avatar.webp) center/cover no-repeat;box-shadow:0 10px 30px -8px rgba(11,70,80,.55),0 0 0 4px #17a6a6;
    animation:arkdw-bob 3s ease-in-out infinite;transition:transform .2s}
  .arkdw-btn:hover{transform:scale(1.06)}
  .arkdw-tip{position:fixed;right:108px;bottom:38px;z-index:2147483000;max-width:240px;padding:12px 16px;border-radius:18px 18px 4px 18px;
    background:#fff;color:#1b2a35;font:600 15px/1.4 Nunito,system-ui,sans-serif;box-shadow:0 12px 30px -12px rgba(11,70,80,.45);
    opacity:0;transform:translateY(8px);transition:.35s;cursor:pointer}
  .arkdw-tip.show{opacity:1;transform:none}
  .arkdw-frame{position:fixed;right:20px;bottom:108px;z-index:2147483000;width:min(400px,calc(100vw - 24px));height:min(680px,calc(100vh - 130px));
    border:0;border-radius:22px;box-shadow:0 24px 60px -18px rgba(11,70,80,.55);background:#fff;opacity:0;transform:translateY(16px) scale(.98);
    pointer-events:none;transition:opacity .25s,transform .25s}
  .arkdw-frame.open{opacity:1;transform:none;pointer-events:auto}
  @media (max-width:480px){.arkdw-frame{right:12px;left:12px;width:auto;bottom:100px;height:calc(100vh - 120px)}}
  @keyframes arkdw-bob{0%,100%{translate:0 0}50%{translate:0 -4px}}
  @media (prefers-reduced-motion:reduce){.arkdw-btn{animation:none}}`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  const btn = document.createElement('button');
  btn.className = 'arkdw-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'ARK Dental asistanı ile sohbet et');

  const tip = document.createElement('div');
  tip.className = 'arkdw-tip';
  tip.textContent = greeting;

  let frame = null;
  let open = false;

  function toggle() {
    tip.classList.remove('show');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.className = 'arkdw-frame';
      frame.title = 'ARK Dental asistanı';
      frame.allow = 'microphone; autoplay';
      frame.src = `${base}index.html?embed=1`;
      document.body.append(frame);
      void frame.offsetWidth;
    }
    open = !open;
    frame.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  }

  btn.addEventListener('click', toggle);
  tip.addEventListener('click', toggle);
  document.body.append(tip, btn);
  setTimeout(() => !open && tip.classList.add('show'), 1800);
  setTimeout(() => tip.classList.remove('show'), 12000);
})();
