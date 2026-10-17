// Concept 1, The part: pinned part states, menu overlay, part search demo, quote form.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 860px)');

  /* ---------- the part: state follows the chapter in view (desktop), cycles on its own (mobile) ---------- */
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

  let cycle;
  const startCycle = () => {
    clearInterval(cycle);
    if (!small.matches || still) return;
    let n = +stage.dataset.state;
    cycle = setInterval(() => { n = n % 4 + 1; setState(n); }, 2600);
  };
  small.addEventListener('change', () => { startCycle(); frame(); });
  startCycle();

  /* ---------- active nav link ---------- */
  const links = $$('.nav-links a');
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
    const t = $(a.getAttribute('href'));
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

  /* ---------- part number search: demo result, clearly sample ---------- */
  const search = $('[data-search]'), input = $('#pn'), msg = $('#pn-msg'), result = $('[data-result]');
  search.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim().toUpperCase();
    if (q.length < 3) {
      search.classList.add('is-error');
      input.setAttribute('aria-invalid', 'true');
      msg.textContent = q ? 'Part numbers are at least three characters.' : 'Enter a part number to search.';
      result.hidden = true;
      input.focus();
      return;
    }
    search.classList.remove('is-error');
    input.removeAttribute('aria-invalid');
    msg.textContent = '';
    $('[data-result-q]', result).textContent = q;
    result.hidden = false;
    result.style.animation = 'none'; result.offsetHeight; result.style.animation = '';
  });
  input.addEventListener('input', () => { if (search.classList.contains('is-error')) { search.classList.remove('is-error'); msg.textContent = ''; } });
  $('[data-quote-from-search]').addEventListener('click', () => { $('#q-pn').value = input.value.trim().toUpperCase(); });

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
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = Object.keys(checks).filter(n => !validate(n));
    if (bad.length) { form.elements[bad[0]].focus(); return; }
    $$('.field, .qform-foot', form).forEach(f => { f.hidden = true; });
    done.hidden = false;
    done.focus();
  });

  /* ---------- quiet reveal for the bands below the part ---------- */
  if (still || !('IntersectionObserver' in window)) return;
  const els = $$('.band .statement, .band .body, .band .rows, .gold-statement, .search, .engine-names, .process-wall, .year-num, .year-line, .careers-sites, .finale-media, .qform');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => { el.classList.add('rv'); io.observe(el); });
})();
