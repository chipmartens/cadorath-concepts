// Concept 1, The part: pinned part states (desktop), static per-chapter states (mobile), menu overlay, part search demo, quote form.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 860px)');

  /* ---------- the part: state follows the chapter in view (desktop only; mobile shows one still per chapter) ---------- */
  const pin = $('[data-pin]'), stage = $('[data-stage]'), nav = $('[data-nav]');
  const chaps = $$('[data-chap]');
  const label = $('[data-state-label]');
  const names = ['', 'Worn', 'Inspected', 'Plated', 'In service'];
  const setState = n => {
    if (stage.dataset.state === String(n)) return;
    stage.dataset.state = n;
    label.textContent = names[n];
  };

  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight, r = pin.getBoundingClientRect();
    nav.classList.toggle('is-solid', -r.top > vh * 0.35 || r.bottom < 80);
    if (small.matches) return;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    if (!still) stage.style.setProperty('--p', p.toFixed(4));
    let state = 1;
    for (const c of chaps) if (c.getBoundingClientRect().top < vh * 0.55) state = +c.dataset.chap;
    setState(state);
    stage.classList.toggle('is-moving', -r.top > vh * 0.35);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame);
  frame();

  small.addEventListener('change', frame);

  /* ---------- active nav link ---------- */
  const links = $$('.nav-links a[href^="#"]');  // in-page anchors only; stub links are not selectors
  const secIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const t = $(a.getAttribute('href')); if (t) secIO.observe(t); });

  /* ---------- menu overlay ---------- */
  const menu = $('[data-menu]'), openBtn = $('[data-menu-open]'), closeBtn = $('[data-menu-close]');
  const focusables = () => $$('a, button', menu);
  function openMenu() {
    menu.hidden = false;
    document.body.classList.add('menu-open');
    openBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => menu.classList.add('is-open'));
    closeBtn.focus();
  }
  function closeMenu(returnFocus = true) {
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    openBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { menu.hidden = true; }, still ? 0 : 300);
    if (returnFocus) openBtn.focus();
  }
  openBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', () => closeMenu());
  $$('[data-menu-link]', menu).forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    const t = href.startsWith('#') ? $(href) : null;
    if (!t) return closeMenu(false);
    e.preventDefault();
    closeMenu(false);
    history.pushState(null, '', a.getAttribute('href'));
    requestAnimationFrame(() => { t.scrollIntoView({ behavior: still ? 'auto' : 'smooth' }); t.focus?.({ preventScroll: true }); });
  }));
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') return closeMenu();
    if (e.key !== 'Tab') return;
    const f = focusables(), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- part number search: honest sample matching, clearly labelled ---------- */
  // ponytail: a handful of real prefixes and platform names; the live site queries Cadorath's repair tables.
  const PLATFORMS = {
    airbus: { name: 'Airbus Helicopters', option: 'Airbus Helicopters', approval: 'Airbus Helicopters D-Level approved repair centre' },
    bell: { name: 'Bell', option: 'Bell', approval: 'Transport Canada, FAA and EASA approved repairs' },
    rr: { name: 'Rolls-Royce M250 and RR300', option: 'Rolls-Royce M250 or RR300', approval: 'Rolls-Royce AMROC for M250 and RR300' },
    t56: { name: 'Rolls-Royce T56', option: 'Rolls-Royce T56', approval: 'Rolls-Royce Authorized Repair Facility, FIRST Network' },
    hw: { name: 'Honeywell T53, T55 and LTS101', option: 'Honeywell T53, T55 or LTS101', approval: 'Honeywell T53, T55 and LTS101 approvals' },
  };
  const AIRBUS_NAMES = ['AIRBUS', 'H125', 'AS350', 'AS355', 'H130', 'H135', 'H145', 'H155', 'AS365', 'EC120', 'H215', 'H225'];
  const normalise = v => v.toUpperCase().replace(/\s+/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  function match(raw) {
    const up = raw.toUpperCase().replace(/\s+/g, ''), n = normalise(raw);
    if (/^(T53|T55|LTS101|HONEYWELL)/.test(up)) return PLATFORMS.hw;
    if (/^350A/.test(n) || AIRBUS_NAMES.some(k => up.startsWith(k) || n.startsWith(normalise(k)))) return PLATFORMS.airbus;
    if (/^(206|407|412)-/.test(n) || /^BE11/.test(n) || up.startsWith('BELL')) return PLATFORMS.bell;
    if (/^(M250|RR300|250-C)/.test(n) || /^ROLLS/.test(up)) return PLATFORMS.rr;
    if (/^T56/.test(n)) return PLATFORMS.t56;
    return null;
  }
  const search = $('[data-search]'), input = $('#pn'), msg = $('#pn-msg'), result = $('[data-result]');
  const rq = $('[data-result-q]'), rt = $('[data-result-text]'), toQuote = $('[data-quote-from-search]');
  let lastHit = null;
  search.addEventListener('submit', e => {
    e.preventDefault();
    const raw = input.value.trim();
    if (raw.length < 3) {
      search.classList.add('is-error');
      input.setAttribute('aria-invalid', 'true');
      msg.textContent = raw ? 'Part numbers are at least three characters.' : 'Enter a part number or a platform, like 350A or M250.';
      result.hidden = true;
      input.focus();
      return;
    }
    search.classList.remove('is-error');
    input.removeAttribute('aria-invalid');
    msg.textContent = '';
    const up = raw.toUpperCase().replace(/\s+/g, '');
    const q = /^[A-Z]{3,}/.test(up) ? up : normalise(raw), hit = match(raw);  // names like LTS101 stay as typed
    lastHit = hit;
    rq.textContent = q;
    if (hit) {
      rt.textContent = `${hit.name}. Approval: ${hit.approval}.`;
      toQuote.firstChild.textContent = 'Quote this part ';
      result.classList.remove('is-miss');
    } else {
      rt.textContent = 'Not in this sample. Send it anyway.';
      toQuote.firstChild.textContent = 'Send it for a quote ';
      result.classList.add('is-miss');
    }
    result.hidden = false;
    result.style.animation = 'none'; result.offsetHeight; result.style.animation = '';
  });
  input.addEventListener('input', () => { if (search.classList.contains('is-error')) { search.classList.remove('is-error'); msg.textContent = ''; } });
  toQuote.addEventListener('click', () => {
    $('#q-pn').value = rq.textContent;
    $('#q-pl').value = lastHit ? lastHit.option : '';
  });
  const focusSearch = $('[data-focus-search]');
  if (focusSearch) focusSearch.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' }); input.focus({ preventScroll: true }); });

  /* ---------- quote form validation ---------- */
  const form = $('[data-quote]'), done = $('[data-done]', form);
  const checks = {
    pn: v => v.trim().length >= 3,
    pl: v => v !== '',
    em: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  };
  const fieldOf = name => form.elements[name].closest('.field');
  const validate = name => {
    const ok = checks[name](form.elements[name].value);
    fieldOf(name).classList.toggle('is-error', !ok);
    form.elements[name].setAttribute('aria-invalid', String(!ok));
    return ok;
  };
  Object.keys(checks).forEach(n => {
    const el = form.elements[n];
    el.addEventListener('blur', () => { if (el.value) validate(n); });
    el.addEventListener('input', () => { if (fieldOf(n).classList.contains('is-error')) validate(n); });
    el.addEventListener('change', () => { if (fieldOf(n).classList.contains('is-error')) validate(n); });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = Object.keys(checks).filter(n => !validate(n));
    if (bad.length) { form.elements[bad[0]].focus(); return; }
    $('[data-done-pn]', done).textContent = form.elements.pn.value.trim().toUpperCase();
    $('[data-done-pl]', done).textContent = form.elements.pl.value;
    $$('.field, .qform-foot', form).forEach(f => { f.hidden = true; });
    done.hidden = false;
    done.focus();
  });

  /* ---------- quiet reveal for the bands below the part ---------- */
  if (still || !('IntersectionObserver' in window)) return;
  const els = $$('.band .statement, .band .body, .band .rows, .gold-statement, .engine-names, .process-wall, .year-num, .year-line, .careers-sites, .finale-media, .qform');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => { el.classList.add('rv'); io.observe(el); });
})();
