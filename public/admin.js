const $ = (s) => document.querySelector(s);
let password = '';
try {
  password = sessionStorage.getItem('ark-admin') ?? '';
} catch {
  /* yok say */
}
let data = { today: '', items: [] };

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { authorization: `Bearer ${password}`, ...(options.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.message ?? 'Hata'), { status: res.status });
  return body;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

function td(text, cls) {
  const el = document.createElement('td');
  el.textContent = text ?? '';
  if (cls) el.className = cls;
  return el;
}

function render() {
  const filter = $('#filter').value;
  const q = $('#search').value.trim().toLocaleLowerCase('tr');
  let items = data.items;
  if (filter === 'upcoming') items = items.filter((a) => a.status === 'confirmed' && a.date >= data.today);
  if (filter === 'today') items = items.filter((a) => a.date === data.today);
  if (filter === 'cancelled') items = items.filter((a) => a.status === 'cancelled');
  if (q) {
    items = items.filter((a) =>
      [a.fullName, a.phone, a.code, a.service].some((v) => String(v).toLocaleLowerCase('tr').includes(q)),
    );
  }
  $('#count').textContent = `${items.length} randevu`;
  const rows = items.map((a) => {
    const tr = document.createElement('tr');
    if (a.status === 'cancelled') tr.className = 'cancelled';
    else if (a.date === data.today) tr.className = 'today';
    const phone = document.createElement('td');
    const link = Object.assign(document.createElement('a'), { href: `tel:${a.phone}`, textContent: a.phone });
    phone.append(link);
    const code = td('');
    code.append(Object.assign(document.createElement('code'), { textContent: a.code }));
    const action = td('');
    if (a.status === 'confirmed') {
      const b = Object.assign(document.createElement('button'), { className: 'btn ghost', type: 'button', textContent: 'İptal et' });
      b.addEventListener('click', async () => {
        if (!confirm(`${a.fullName} – ${formatDate(a.date)} ${a.time} randevusu iptal edilsin mi?`)) return;
        try {
          await api(`api/admin/appointments/${encodeURIComponent(a.id)}/cancel`, { method: 'POST' });
          await load();
        } catch (err) {
          alert(err.message);
        }
      });
      action.append(b);
    } else {
      action.append(Object.assign(document.createElement('span'), { className: 'tag', textContent: 'İptal' }));
    }
    tr.append(td(formatDate(a.date)), td(a.time), td(a.fullName), phone, td(a.service), code, td(a.note, 'note'), action);
    return tr;
  });
  if (!rows.length) {
    const tr = document.createElement('tr');
    const cell = td('Gösterilecek randevu yok.', 'empty');
    cell.colSpan = 8;
    tr.append(cell);
    rows.push(tr);
  }
  $('#rows').replaceChildren(...rows);
}

async function load() {
  data = await api('api/admin/appointments');
  render();
}

async function enter() {
  try {
    await load();
    try {
      sessionStorage.setItem('ark-admin', password);
    } catch {
      /* yok say */
    }
    $('#login').hidden = true;
    $('#list').hidden = false;
    $('#logout').hidden = false;
  } catch (err) {
    $('#loginErr').textContent = err.message;
    $('#login').hidden = false;
    $('#list').hidden = true;
  }
}

$('#login').addEventListener('submit', (e) => {
  e.preventDefault();
  password = $('#pw').value;
  $('#loginErr').textContent = '';
  enter();
});
$('#logout').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('ark-admin');
  } catch {
    /* yok say */
  }
  location.reload();
});
$('#filter').addEventListener('change', render);
$('#search').addEventListener('input', render);
$('#refresh').addEventListener('click', () => load().catch((e) => alert(e.message)));

if (password) enter();
