(function () {
  'use strict';
  var KEY = 'my-expenses-v1';
  var CATS = ['خوراک و مواد غذایی', 'حمل‌ونقل', 'خرید', 'قبوض', 'تفریح', 'سلامت و درمان', 'آموزش', 'سایر'];
  var SAMPLES = [
    ['خرید سوپرمارکت', 850000, 0], ['هزینه تاکسی', 120000, 1], ['خرید ناهار', 280000, 0],
    ['قبض اینترنت', 450000, 3], ['خرید پوشاک', 1900000, 2], ['هزینه دارو', 340000, 5],
    ['خرید کتاب', 520000, 6], ['قهوه و پذیرایی', 190000, 4]
  ];
  var $ = function (id) { return document.getElementById(id); };
  var expenses = [];
  var pendingDelete = null, toastTimer;

  var fa = function (n) { return Math.round(n).toLocaleString('fa-IR'); };
  var norm = function (s) { return String(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase(); };
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var fmt = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric' });
  function jMonth(d) {
    var p = {}; fmt.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return (p.relatedYear || p.year) + '-' + p.month;
  }
  var parse = function (s) { return new Date(s + 'T12:00:00'); };
  var showDate = function (s) { return parse(s).toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }); };

  function load() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = ''; }
    if (raw === null) { var s = seed(); persist(s); return s; }   // first launch only
    try { var a = JSON.parse(raw); return Array.isArray(a) ? a.filter(valid) : []; } catch (e) { return []; }
  }
  function valid(x) { return x && typeof x.id === 'string' && typeof x.title === 'string' && x.amount > 0 && /^\d{4}-\d\d-\d\d$/.test(x.date) && CATS.indexOf(x.category) > -1; }
  function persist(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { toast('ذخیره‌سازی در مرورگر ممکن نیست.'); return false; }
  }
  function seed() {
    var now = new Date(), m = jMonth(now), back = 0, d = new Date(now);
    for (;;) { d.setDate(d.getDate() - 1); if (jMonth(d) !== m) break; back++; }  // days elapsed this Jalali month
    return SAMPLES.map(function (s, i) {
      var day = new Date(now); day.setDate(now.getDate() - (i % (back + 1)));
      return { id: 'demo' + i, title: s[0], amount: s[1], date: iso(day), category: CATS[s[2]], createdAt: now.getTime() - i };
    });
  }

  function fillSelects() {
    $('cat').innerHTML = '<option value="">انتخاب کنید</option>' + CATS.map(function (c) { return '<option>' + c + '</option>'; }).join('');
    $('fcat').innerHTML = '<option value="">همه دسته‌بندی‌ها</option>' + CATS.map(function (c) { return '<option>' + c + '</option>'; }).join('');
  }

  function renderStats() {
    var m = jMonth(new Date()), total = 0, monthSum = 0;
    expenses.forEach(function (e) { total += e.amount; if (jMonth(parse(e.date)) === m) monthSum += e.amount; });
    $('sMonth').textContent = fa(monthSum);
    $('sCount').textContent = fa(expenses.length);
    $('sAvg').textContent = fa(expenses.length ? total / expenses.length : 0);
  }

  function renderList() {
    var q = norm($('q').value), c = $('fcat').value, ul = $('list');
    var rows = expenses.filter(function (e) { return (!c || e.category === c) && (!q || norm(e.title).indexOf(q) > -1); })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt; });
    ul.innerHTML = '';
    rows.forEach(function (e) {
      var li = document.createElement('li'); li.className = 'item';
      li.innerHTML = '<span class="t"></span><span class="amt"></span><button class="del" type="button"></button>' +
        '<span class="meta"><span class="chip"></span><span class="d"></span></span>';
      li.querySelector('.t').textContent = e.title;
      li.querySelector('.amt').textContent = fa(e.amount) + ' تومان';
      li.querySelector('.chip').textContent = e.category;
      li.querySelector('.d').textContent = showDate(e.date);
      var b = li.querySelector('.del'); b.textContent = 'حذف'; b.setAttribute('aria-label', 'حذف ' + e.title);
      b.onclick = function () { askDelete(e); };
      ul.appendChild(li);
    });
    var empty = $('empty'); empty.hidden = rows.length > 0;
    empty.textContent = expenses.length ? 'هزینه‌ای با این جستجو پیدا نشد.' : 'هنوز هزینه‌ای ثبت نکرده‌اید. از فرم کنار، اولین هزینه را اضافه کنید.';
  }
  function render() { renderStats(); renderList(); }

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function toLatin(s) { return s.replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }); }
  function setErr(id, inputId, msg) { $(id).textContent = msg; $(inputId).classList.toggle('bad', !!msg); }

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var title = $('title').value.trim(), cat = $('cat').value;
    var cleaned = toLatin($('amount').value).replace(/[,٬،\s]/g, '');
    var amount = /^\d+$/.test(cleaned) ? Number(cleaned) : NaN;
    var t = title.length < 2 ? 'عنوان باید حداقل ۲ حرف باشد.' : '';
    var a = !(amount > 0) || !Number.isSafeInteger(amount) ? 'مبلغ باید عددی بزرگ‌تر از صفر باشد.' : '';
    var c = !cat ? 'یک دسته‌بندی انتخاب کنید.' : '';
    setErr('eTitle', 'title', t); setErr('eAmount', 'amount', a); setErr('eCat', 'cat', c);
    if (t || a || c) { (t ? $('title') : a ? $('amount') : $('cat')).focus(); return; }
    var item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: title, amount: amount, date: iso(new Date()), category: cat, createdAt: Date.now() };
    var next = expenses.concat(item);
    if (!persist(next)) return;
    expenses = next; render(); this.reset();
    $('title').focus(); toast('هزینه با موفقیت ثبت شد.');
  });

  function askDelete(e) {
    pendingDelete = e.id;
    $('dlgText').textContent = 'آیا «' + e.title + '» به مبلغ ' + fa(e.amount) + ' تومان حذف شود؟';
    $('dlg').showModal();
  }
  $('dlg').addEventListener('close', function () {
    if ($('dlg').returnValue === 'ok' && pendingDelete) {
      var next = expenses.filter(function (e) { return e.id !== pendingDelete; });
      if (persist(next)) { expenses = next; render(); toast('هزینه حذف شد.'); }
    }
    pendingDelete = null; $('dlg').returnValue = '';
  });

  $('q').addEventListener('input', renderList);
  $('fcat').addEventListener('change', renderList);
  var now0 = new Date();
  $('today').textContent = now0.toLocaleDateString('fa-IR-u-ca-persian', { weekday: 'long' }) + ' ' + showDate(iso(now0));
  expenses = load(); fillSelects(); render();
})();
