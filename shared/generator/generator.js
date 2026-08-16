/* ═══════════════════════════════════════════════════════════════
   Генератор — переиспользуемый модуль.

   Экран нужен не только сам по себе: его встраивает онбординг, на
   нём же будут работать другие здания. Поэтому механика живёт здесь,
   а страницы остаются тонкими.

   createGenerator(host, {
     assets,   путь к папке с картинками
     storeKey, ключ хранилища — свой у каждого прототипа
     v,        1 (по умолчанию) | 2 — поколение механики, см. флаг V2
     version,  'tool' | 'direct' | 'select'
     mode,     'single' | 'overflow'
     cells,    сколько ячеек в блоке (по умолчанию 25 — сетка 5×5)
     types,    свой набор ресурсов вместо стандартного
     title,    заголовок экрана (по умолчанию «Генератор»)
     hero,     разметка сцены над грядками (что происходит внутри здания)
     chrome    false — спрятать служебную кнопку версий
     back      false — спрятать «‹»: у хоста своя
   }) → API

   API: .stats() .cells() .on('change',cb) .setVersion() .setMode() .reset()
        .setCells() .highlight(idx) .el
   ═══════════════════════════════════════════════════════════════ */

const GENERATOR_MARKUP = String.raw`<div id="phone">
  <div class="statusbar">
    <div id="time">9:41</div>
    <div id="sysicons">▪▪▪ ⌁ ▰</div>
  </div>

  <div class="appbar">
  <button id="back" aria-label="Назад">‹</button>

  <button id="devbtn" title="Настройки прототипа">версия <b id="devver">A</b></button>

  <div id="widget">
    <div class="badge"><i class="i-gem"></i><span>500</span></div>
    <div class="badge"><i class="i-coin"></i><span>5 000</span></div>
    <div id="ring">
      <svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="12.5" fill="none"
        stroke="var(--tui-status-info)" stroke-width="2" stroke-linecap="round"
        stroke-dasharray="78.5" stroke-dashoffset="24"/></svg><b>10</b>
    </div>
  </div>
  </div>

  <div class="titlewrap">
    <div id="title">Генератор</div>
    <div id="desc">Доступно <span id="free">0</span> ячеек</div>
  </div>

  <!-- сцена над грядками: у преобразователя тут показывают, что происходит
       внутри здания. Пустая — схлопывается и места не занимает -->
  <div id="hero"></div>

  <div id="stage">
    <div id="scroller"></div>
    <button class="fade l" aria-label="Предыдущий блок"></button>
    <button class="fade r" aria-label="Следующий блок"></button>
  </div>

  <div class="controls">
    <div id="pager"></div>
    <button id="collect" title="Сбор: провести по готовым ячейкам">👋</button>
  </div>

  <div id="actionbar" hidden>
    <div class="n"><span id="selN">Выбрано 0</span><small id="selHint"></small></div>
    <button class="go" id="doCollect">Собрать</button>
    <button class="clr" id="doClear">Снять</button>
  </div>

  <div id="tray"></div>
  <div id="homebar"></div>

  <div id="tip"></div>
  <div id="skeleton"></div>

  <div id="settings" hidden>
    <div class="head">
      <h2>Настройки прототипа</h2>
      <button class="close" aria-label="Закрыть">✕</button>
    </div>
    <div class="body">

      <div class="row">
        <div class="label">ВЕРСИЯ СБОРА</div>
        <div class="seg">
          <button data-set="collect:tool">A · ручкой</button>
          <button data-set="collect:direct">B · забиранием</button>
          <button data-set="collect:select">C · выделением</button>
        </div>
        <div class="hint" id="collectHint"></div>
      </div>


      <div class="row" id="directRow" hidden>
        <div class="label">КАК ОТЛИЧАТЬ СБОР ОТ ПРОКРУТКИ</div>
        <div class="seg">
          <button data-set="direct:free">Водишь пальцем</button>
          <button data-set="direct:start">С готовой</button>
          <button data-set="direct:hold">Удержание</button>
        </div>
        <div class="hint" id="directHint"></div>
      </div>

      <div class="row">
        <div class="label">СКОЛЬКО БЛОКОВ</div>
        <div class="seg">
          <button data-mode="single">1 блок · 25</button>
          <button data-mode="overflow">4 блока · 100</button>
        </div>
      </div>

      <div class="row">
        <button class="danger" id="reset">Очистить все грядки</button>
      </div>

      <div class="note">
        Служебный экран для тестов. Переключение применяется сразу —
        закрой настройки и пробуй, грядки не сбрасываются.
      </div>
    </div>
  </div>
</div>

<div id="ghost"><img alt=""><span></span></div>`;

window.createGenerator = function createGenerator(host, opts = {}){
  const ASSETS = opts.assets || 'assets';
  const $ = sel => host.querySelector(sel);

  host.innerHTML = GENERATOR_MARKUP;

  const listeners = {};
  const emit = (name, data) => (listeners[name] || []).forEach(fn => fn(data));

  // объявлена функцией, чтобы её можно было звать из save() до создания api
  function stats(){
    const c = state.cells;
    return {
      empty:   c.filter(x => x.state === 'empty').length,
      growing: c.filter(x => x.state === 'growing').length,
      ready:   c.filter(x => x.state === 'ready').length,
      total:   c.length
    };
  }



/* ═══════════ КОНФИГ ═══════════ */

/* Набор ресурсов можно подменить: кофейня переваривает зёрна в американо,
   и ей нужен свой лоток, а не грядки из генератора. */
const RESOURCE_TYPES = opts.types || [
  { id:'strawberry', name:'Клубника', growMs:10*1000, image: ASSETS + '/img.png' },
  { id:'banana',     name:'Банан',    growMs:20*1000, image: ASSETS + '/imgb.png' },
  { id:'coffee',     name:'Кофе',     growMs:40*1000, image: ASSETS + '/imgcoffe.png' },
];

/* Поколение генератора. Модуль общий на все прототипы, но развивать мы
   хотим только страницу /generator/, а онбординги должны остаться ровно
   такими, какими их отдали на тест. Поэтому любая новая правка механики
   идёт под этим флагом:

     if(V2){ ...новое... } else { ...как было... }

   По умолчанию v = 1: кто не просил, тот ничего не заметил. Явное `v:2`
   ставит только generator/index.html. На #phone вешается класс v2, чтобы
   так же ветвиться в CSS, не трогая общие правила. */
const V2 = opts.v === 2;

const CELLS_PER_BLOCK = opts.cells || 25;
const GRID_COLS = Math.min(5, CELLS_PER_BLOCK);
const GRID_ROWS = Math.ceil(CELLS_PER_BLOCK / GRID_COLS);
const MODES = { single:1, overflow:4 };
const SKELETON_MS = 600;
const DOUBLE_TAP_MS = 300;
const CIRC = 2 * Math.PI * 24;           // дуга прогресса в ячейке 56px

const byId = id => RESOURCE_TYPES.find(t => t.id === id);

/* ═══════════ СОСТОЯНИЕ ═══════════ */

const STORE = opts.storeKey || 'generator-proto-v2';
let state = load() || fresh('single');

function fresh(mode){
  return { mode, cells: Array.from({length: MODES[mode]*CELLS_PER_BLOCK}, () => ({state:'empty'})) };
}
function load(){
  try{
    const r = JSON.parse(localStorage.getItem(STORE));
    if(!r || !MODES[r.mode] || !Array.isArray(r.cells)) return null;
    if(r.cells.length !== MODES[r.mode]*CELLS_PER_BLOCK) return null;
    const now = Date.now();
    r.cells.forEach(c => { if(c.state==='growing' && c.endsAt<=now) c.state='ready'; });
    return r;
  }catch{ return null; }
}
const save = () => { localStorage.setItem(STORE, JSON.stringify(state)); emit('change', stats()); };

/* ═══════════ DOM ═══════════ */

const phone = $('#phone'), scroller = $('#scroller'), pager = $('#pager');
const tray = $('#tray'), tip = $('#tip'), ghost = $('#ghost');
const ghostImg = ghost.querySelector('img'), ghostEmoji = ghost.querySelector('span');
const skeleton = $('#skeleton');
const freeEl = $('#free'), collectTool = $('#collect');
const cellEls = [];

/* Макет свёрстан в координатах 360×780 и целиком масштабируется под экран:
   на телефоне растягивается во весь экран, на десктопе ужимается. */
const DESIGN_W = 360;
let uiScale = 1;         // текущий масштаб «телефона», см. fit()
/* Полная обвязка (статус-бар, app bar, заголовок, контролы, лоток, home bar)
   съедает 430 единиц. Сетке нужно 288 плюс поля 32 — значит полный вариант
   имеет смысл только от 750. Ниже переключаемся на компактный, иначе на
   границе ячейки становились мельче, чем в компактном режиме. */
const COMPACT_H = 750;
const MIN_H = 560;       // минимальная высота в единицах макета, ниже не ужимаемся
const CELL_MAX = 56;     // размер из макета — потолок, а не константа
const CELL_MIN = 34;

const stage = $('#stage');
const root = document.documentElement;

function fit(){
  const vv = window.visualViewport;
  const w = vv ? vv.width  : innerWidth;
  const h = vv ? vv.height : innerHeight;

  // Тянемся по ширине, но не настолько, чтобы высоты осталось меньше MIN_H:
  // иначе в широком окне десктопа «телефон» раздувался бы на весь экран.
  const s = Math.min(w / DESIGN_W, h / MIN_H);
  const layoutH = h / s;                    // высота экрана в единицах макета

  phone.classList.toggle('compact', layoutH < COMPACT_H);
  phone.style.height = layoutH + 'px';
  phone.style.left = Math.round((w - DESIGN_W * s) / 2) + 'px';
  phone.style.transform = `scale(${s})`;
  uiScale = s;              // ручка версии B живёт вне #phone и масштабируется сама

  sizeGrid();
}

/* Ячейка подгоняется под то, что осталось между шапкой и лотком.
   Сетка целиком помещается — без обрезки и без упирания в подзаголовок.
   Рядов не всегда пять: онбординг берёт всего 5 ячеек, и высоту блока
   считаем по факту, иначе одинокий ряд висел бы посреди пустоты.
   Поля --stage-pad уже вычтены самим stage. */
function sizeGrid(){
  const avail = stage.clientHeight;          // padding уже учтён в clientHeight
  const pad = parseFloat(getComputedStyle(stage).paddingTop) * 2;
  const usable = avail - pad;

  const gap = 2;
  let cell = Math.floor((usable - gap * (GRID_ROWS - 1)) / GRID_ROWS);
  cell = Math.max(CELL_MIN, Math.min(CELL_MAX, cell));

  const blockW = cell * GRID_COLS + gap * (GRID_COLS - 1);
  const blockH = cell * GRID_ROWS + gap * (GRID_ROWS - 1);
  root.style.setProperty('--grid-cols', GRID_COLS);
  root.style.setProperty('--cell-size', cell + 'px');
  root.style.setProperty('--block-w', blockW + 'px');
  root.style.setProperty('--block-h', blockH + 'px');
  root.style.setProperty('--grid-left', Math.round((DESIGN_W - blockW) / 2) + 'px');
}
addEventListener('resize', fit);
addEventListener('orientationchange', fit);
window.visualViewport?.addEventListener('resize', fit);

/* ─── сетка ─── */

function buildGrid(){
  scroller.innerHTML = '';
  cellEls.length = 0;
  const blocks = MODES[state.mode];
  scroller.classList.toggle('one', blocks === 1);

  for(let b = 0; b < blocks; b++){
    const block = document.createElement('div');
    block.className = 'block';
    for(let i = 0; i < CELLS_PER_BLOCK; i++){
      const idx = b*CELLS_PER_BLOCK + i;
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.idx = idx;
      el.innerHTML =
        `<svg class="arc" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none"
          stroke="#fff" stroke-width="2" stroke-linecap="round"
          stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg><img alt="" hidden>`;
      block.appendChild(el);
      cellEls[idx] = el;
    }
    scroller.appendChild(block);
  }

  pager.innerHTML = '';
  pager.classList.toggle('hide', blocks === 1);
  for(let b = 0; b < blocks; b++) pager.appendChild(document.createElement('i'));
  updatePager();
  paintAll();
}

function paintCell(idx){
  const c = state.cells[idx], el = cellEls[idx];
  if(!el) return;
  const img = el.querySelector('img'), arc = el.querySelector('.arc circle');

  el.classList.toggle('growing', c.state === 'growing');
  el.classList.toggle('ready',   c.state === 'ready');

  if(c.state === 'empty'){
    img.hidden = true;
    arc.style.strokeDashoffset = CIRC;
    return;
  }
  const t = byId(c.typeId);
  if(!img.src.endsWith(t.image)) img.src = t.image;
  img.hidden = false;
  arc.style.strokeDashoffset = c.state === 'growing'
    ? CIRC * ((c.endsAt - Date.now()) / t.growMs)
    : CIRC;
}

const countFree = () => { freeEl.textContent = state.cells.filter(c => c.state==='empty').length; };
function paintAll(){ state.cells.forEach((_,i) => paintCell(i)); countFree(); }

/* ─── лоток ─── */

let selectedType = RESOURCE_TYPES[0].id;

function buildTray(){
  tray.innerHTML = '';
  const open = opts.unlocked || null;          // null — открыто всё
  RESOURCE_TYPES.forEach(t => {
    const locked = open && !open.includes(t.id);
    const el = document.createElement('div');
    el.className = 'seed' + (t.id === selectedType && !locked ? ' sel' : '') + (locked ? ' locked' : '');
    el.dataset.type = t.id;
    el.title = locked ? `${t.name} — закрыт` : `${t.name} · ${t.growMs/1000} сек`;
    el.innerHTML = `<img src="${t.image}" alt="${t.name}">` + (locked ? '<span class="lock">🔒</span>' : '');
    tray.appendChild(el);
  });
  if(open && !open.includes(selectedType)) selectedType = open[0];
}

/* ═══════════ ПЕРЕТАСКИВАНИЕ ═══════════
   Два режима, оба массовые: ведёшь пальцем — обрабатываются все ячейки под ним.
   'seed'    — сажает во все пустые
   'collect' — собирает со всех готовых                                        */

let drag = null;      // { kind, typeId, srcEl }
let selCell = null;   // предварительно выбранная ячейка (см. примечания в макете)
let hov = null;       // ячейка под пальцем — для фидбека поджатием

/* Выбор ячейки тапом. Пока выбранная ячейка не обработана и не отжата —
   остальные ячейки на перетаскивание не реагируют. */
function selectCell(idx){
  if(selCell !== null) cellEls[selCell]?.classList.remove('sel');
  selCell = (selCell === idx) ? null : idx;          // повторный тап — «отжата»
  if(selCell !== null) cellEls[selCell].classList.add('sel');
}
function clearSel(){
  if(selCell !== null) cellEls[selCell]?.classList.remove('sel');
  selCell = null;
}

function startDrag(kind, srcEl, typeId, e){
  hideTip();
  drag = { kind, typeId, srcEl };
  phone.classList.add('dragging');
  srcEl.classList.add('lifted');
  srcEl.setPointerCapture?.(e.pointerId);

  if(kind === 'seed'){
    ghostEmoji.hidden = true;
    ghostImg.hidden = false;
    ghostImg.src = byId(typeId).image;
  } else {
    ghostImg.hidden = true;
    ghostEmoji.hidden = false;
    ghostEmoji.textContent = '👋';
  }
  ghost.style.display = 'block';
  moveGhost(e.clientX, e.clientY);
  apply(e.clientX, e.clientY);
}

tray.addEventListener('pointerdown', e => {
  const seed = e.target.closest('.seed');
  if(!seed || seed.classList.contains('locked')) return;
  e.preventDefault();
  selectedType = seed.dataset.type;
  tray.querySelectorAll('.seed').forEach(s => s.classList.toggle('sel', s === seed));
  // версия C с выделением: ресурс не тащат, по нему жмут — засеется всё выбранное
  if(cfg.collect === 'select' && picked.size) return;
  startDrag('seed', seed, selectedType, e);
});

tray.addEventListener('click', e => {
  const seed = e.target.closest('.seed');
  if(!seed || cfg.collect !== 'select' || !picked.size) return;
  seedPicked(seed.dataset.type);
});

collectTool.addEventListener('pointerdown', e => {
  // Версия A — ручкой заметают всегда. Во второй версии ручка есть ещё и в B
  // с удержанием: раз она лежит на экране, её пробуют взять, и упираться
  // тут нечего. Получаются два пути к одному сбору: взял ручку и повёл или
  // задержал палец на ячейке.
  const holdHand = V2 && cfg.collect === 'direct' && cfg.direct === 'hold';
  if(cfg.collect !== 'tool' && !holdHand) return;
  e.preventDefault();
  startDrag('collect', collectTool, null, e);
});


document.addEventListener('pointermove', e => {
  if(!drag) return;
  e.preventDefault();
  moveGhost(e.clientX, e.clientY);
  apply(e.clientX, e.clientY);

  // держим ресурс у края — блоки листаются, не отрывая палец
  const pr = phone.getBoundingClientRect();
  edgeScroll((e.clientX - pr.left) / (pr.width / 360));
}, {passive:false});

/* ═══ автопрокрутка у края во время перетаскивания ═══
   Подвёл ресурс/инструмент к краевой зоне и держишь — через 400 мс
   листается блок, дальше каждые 700 мс, пока не увёл палец.        */

const EDGE_DELAY = 400, EDGE_REPEAT = 700;
let edgeTimer = null, edgeDir = 0;

function edgeScroll(x){
  // работает и при перетаскивании ресурса, и при заметании сбора
  const active = drag || (dc && dc.sweeping);
  if(!active || MODES[state.mode] === 1) return stopEdgeScroll();

  let dir = x <= 36 ? -1 : x >= 324 ? 1 : 0;

  // листать некуда — зону не взводим, иначе мигает впустую на крайних блоках
  if(dir){
    const next = anchorBlock + dir;
    if(next < 0 || next > MODES[state.mode] - 1) dir = 0;
  }

  if(dir === edgeDir) return;                 // направление не изменилось
  stopEdgeScroll();
  edgeDir = dir;
  if(!dir) return;

  const zone = $(dir < 0 ? '.fade.l' : '.fade.r');
  zone.classList.add('armed');
  const step = () => {
    const next = anchorBlock + edgeDir;
    if(next < 0 || next > MODES[state.mode] - 1) return stopEdgeScroll();
    goToBlock(next);
    // на крайнем блоке дальше не тикаем — подсветка гаснет сама
    if(next === 0 || next === MODES[state.mode] - 1) return stopEdgeScroll();
    edgeTimer = setTimeout(step, EDGE_REPEAT);
  };
  edgeTimer = setTimeout(step, EDGE_DELAY);
}

function stopEdgeScroll(){
  clearTimeout(edgeTimer);
  edgeTimer = null; edgeDir = 0;
  document.querySelectorAll('.fade').forEach(f => f.classList.remove('armed'));
}

function endDrag(){
  if(!drag) return;
  ghost.style.display = 'none';
  phone.classList.remove('dragging');
  drag.srcEl.classList.remove('lifted');
  if(hov !== null){ cellEls[hov]?.classList.remove('hov'); hov = null; }
  drag = null;
  stopEdgeScroll();
  save();
}
/* Снимаем перетаскивание при любом завершении, не только по pointerup:
   иначе оборванный жест навсегда оставлял краевые зоны отключёнными. */
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
addEventListener('blur', endDrag);

function moveGhost(x, y){ ghost.style.transform = `translate(${x-32}px, ${y-32}px)`; }

/* Ячейка под пальцем — и действие над ней. Правила из примечаний макета:
   1. ресурс на пустую ячейку → запускается генерация;
      инструмент сбора на готовую → производится сбор;
   2. если ячейка была выбрана заранее — процесс идёт только с неё,
      остальные не активируются, пока она не обработана или не отжата;
   3. попадание на ячейку «в процессе» — ничего не происходит.        */
function apply(x, y){
  ghost.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  ghost.style.display = 'block';
  const cell = el && el.closest ? el.closest('.cell') : null;

  // фидбек: поджимаем ячейку под пальцем
  const over = cell ? +cell.dataset.idx : null;
  if(over !== hov){
    if(hov !== null) cellEls[hov]?.classList.remove('hov');
    hov = over;
    if(hov !== null) cellEls[hov].classList.add('hov');
  }
  if(!cell) return;

  const idx = +cell.dataset.idx;

  // правило 2: блокировка на выбранной ячейке
  if(selCell !== null && idx !== selCell) return;

  const c = state.cells[idx];

  if(drag.kind === 'seed'){
    if(c.state !== 'empty') return;                       // правило 3
    const t = byId(drag.typeId);
    state.cells[idx] = { state:'growing', typeId:drag.typeId, endsAt: Date.now() + t.growMs };
  } else {
    if(c.state !== 'ready') return;                       // правило 3
    state.cells[idx] = { state:'empty' };
  }

  if(idx === selCell) clearSel();   // выбранная обработана — замок снят
  paintCell(idx);
  countFree();
}

/* ═══════════ СБОР ТАПОМ ═══════════ */

let lastTap = {idx:-1, at:0};

scroller.addEventListener('click', e => {
  if(swallowClick){ swallowClick = false; return; }   // уже обработали этим же касанием
  if(cfg.collect === 'select') return;                // в версии C выделением занимаются указатели
  const cell = e.target.closest('.cell');
  if(!cell) return;
  const idx = +cell.dataset.idx, now = Date.now();

  if(lastTap.idx === idx && now - lastTap.at < DOUBLE_TAP_MS){
    lastTap = {idx:-1, at:0};
    if(state.cells[idx].state === 'ready') return collect(idx);
  }
  lastTap = {idx, at:now};

  selectCell(idx);   // тап выбирает ячейку / отжимает её
  setTimeout(() => { if(lastTap.idx === idx) showTip(idx, cell); }, DOUBLE_TAP_MS);
});

function collect(idx){
  state.cells[idx] = {state:'empty'};
  if(idx === selCell) clearSel();
  paintCell(idx); countFree(); hideTip(); save();
}

/* ═══════════ ТУЛТИП ═══════════ */

function showTip(idx, cell){
  const c = state.cells[idx];
  if(c.state === 'empty') return hideTip();
  const t = byId(c.typeId);

  tip.innerHTML = c.state === 'growing'
    ? `<b>${t.name}</b><br>осталось ${Math.max(0, Math.ceil((c.endsAt-Date.now())/1000))} сек`
    : `<b>${t.name}</b><br>готово к сбору<button data-c="${idx}">Собрать</button>`;

  tip.style.display = 'block';
  const cr = cell.getBoundingClientRect(), pr = phone.getBoundingClientRect();
  const sc = pr.width / 360;
  let left = (cr.left - pr.left)/sc + cr.width/sc/2 - tip.offsetWidth/2;
  tip.style.left = Math.max(8, Math.min(left, 360 - tip.offsetWidth - 8)) + 'px';
  tip.style.top = ((cr.top - pr.top)/sc - tip.offsetHeight - 8) + 'px';
  tip.dataset.idx = idx;
}
const hideTip = () => { tip.style.display='none'; tip.dataset.idx=''; };

tip.addEventListener('click', e => {
  const b = e.target.closest('[data-c]');
  if(b) collect(+b.dataset.c);
});
document.addEventListener('pointerdown', e => {
  if(!e.target.closest('#tip') && !e.target.closest('.cell')) hideTip();
});
let settleTimer = null;
scroller.addEventListener('scroll', () => {
  hideTip();
  updatePager();
  // прокрутка улеглась — подтягиваем якорь под факт (свайп, жест пейджера)
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { anchorBlock = currentBlock(); }, 140);
}, {passive:true});

/* ═══════════ ТИК ═══════════ */

setInterval(() => {
  const now = Date.now();
  let changed = false;
  state.cells.forEach((c,i) => {
    if(c.state !== 'growing') return;
    if(c.endsAt <= now){ c.state = 'ready'; changed = true; }
    paintCell(i);
  });
  if(tip.style.display === 'block' && tip.dataset.idx !== ''){
    const i = +tip.dataset.idx;
    if(state.cells[i].state !== 'empty') showTip(i, cellEls[i]);
  }
  if(changed){ countFree(); save(); }
}, 100);

/* ═══════════ ПРОКРУТКА ═══════════
   Три жеста из макета, у всех якорная позиция — блок встаёт по центру экрана:
   1. свайп по сетке (нативный скролл со снапом)
   2. тап по краю экрана — на один блок влево/вправо
   3. долгий тап на pager — он подрастает, дальше точная прокрутка пальцем  */

const maxScroll = () => scroller.scrollWidth - scroller.clientWidth;
const blockStep = () => {
  const n = MODES[state.mode];
  return n > 1 ? maxScroll() / (n - 1) : 0;
};
const currentBlock = () => {
  const s = blockStep();
  return s > 0 ? Math.round(scroller.scrollLeft / s) : 0;
};

/* Куда мы едем сейчас. Во время плавной прокрутки scrollLeft отстаёт,
   поэтому решения о границах принимаем по якорю, а не по факту. */
let anchorBlock = 0;

function goToBlock(i){
  const n = MODES[state.mode];
  anchorBlock = Math.max(0, Math.min(n - 1, i));
  scroller.scrollTo({ left: anchorBlock * blockStep(), behavior:'smooth' });
}

/* — жест 2: тап по краю — */
$('.fade.l').addEventListener('click', () => goToBlock(currentBlock() - 1));
$('.fade.r').addEventListener('click', () => goToBlock(currentBlock() + 1));

/* — жест 3: долгий тап на pager + точная прокрутка — */
let fast = null;   // { timer, active }

pager.addEventListener('pointerdown', e => {
  if(MODES[state.mode] === 1) return;
  e.preventDefault();
  pager.setPointerCapture?.(e.pointerId);
  fast = { active:false, timer: setTimeout(() => {
    fast.active = true;
    pager.classList.add('zoom');
    scroller.classList.add('nosnap');
  }, 320) };
});

pager.addEventListener('pointermove', e => {
  if(!fast || !fast.active) return;
  e.preventDefault();
  const pr = phone.getBoundingClientRect(), sc = pr.width / 360;
  const x = (e.clientX - pr.left) / sc;                 // координата в макете 0..360
  const t = Math.max(0, Math.min(1, (x - 36) / (360 - 72)));   // рабочая зона между краями
  scroller.scrollLeft = t * maxScroll();
  updatePager();
});

function endFast(){
  if(!fast) return;
  clearTimeout(fast.timer);
  if(fast.active){
    pager.classList.remove('zoom');
    scroller.classList.remove('nosnap');
    goToBlock(currentBlock());        // возврат к якорной позиции
  }
  fast = null;
}
pager.addEventListener('pointerup', endFast);
pager.addEventListener('pointercancel', endFast);

function updatePager(){
  if(MODES[state.mode] === 1) return;
  const active = currentBlock();
  [...pager.children].forEach((d,i) => d.classList.toggle('on', i === active));
  $('.fade.l').disabled = active === 0;
  $('.fade.r').disabled = active === MODES[state.mode] - 1;
}

/* ═══════════ ВЕРСИИ И НАСТРОЙКИ ═══════════
   A — сбор ручкой: инструмент берут и ведут по готовым ячейкам.
   B — прямой сбор: ячейку трогают пальцем. Здесь появляется конфликт
       с горизонтальной прокруткой, поэтому есть три способа развязки. */

// настройки свои у каждого прототипа: иначе онбординг перезаписывал
// версию сбора в отдельно живущем генераторе
const CFG_KEY = 'generator-cfg-' + (opts.storeKey || 'default');
const settings = $('#settings');

let cfg = { collect:'tool', direct:'free' };
try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY)) || {}); } catch {}
// убранные варианты («тап», «направление») переезжают на свободное заметание
if(!['free','start','hold'].includes(cfg.direct)) cfg.direct = 'free';

const saveCfg = () => localStorage.setItem(CFG_KEY, JSON.stringify(cfg));

const HINTS = {
  collect: {
      tool:   'Как в макете: берёшь ручку снизу справа и ведёшь по готовым ячейкам.',
    direct: 'Ручки нет, ячейку трогаешь напрямую. Ниже — чем отличать сбор от прокрутки.',
    select: 'Как выбор фото в айфоне: отмечаешь ячейки — тапом или проводя пальцем, — а потом одним действием собираешь или засеиваешь всё выделенное. Выделение живёт между блоками.'
  },
  direct: {
    free: 'Ведёшь пальцем по сетке — собирается всё готовое под ним. Свайп по сетке больше не листает: блоки переключаются краями экрана и пейджером.',
    start:'Начал с готовой ячейки — собираешь заметанием. Начал с пустой или растущей — обычный свайп листает блоки.',
    hold: 'Задержал палец на ячейке — прокрутка блокируется, дальше ведёшь и собираешь пачкой. Быстрый тап собирает одну.'
  }
};

/* во второй версии два режима ведут себя иначе — и подписи на служебном
   экране должны это отражать, иначе тестировщик ищет галочки */
const HINTS2 = {
  collect: {
    select: 'Долгое удержание включает режим сбора: готовые ячейки начинают дёргаться, как иконки на домашнем экране. Дальше тапаешь по ним или ведёшь пальцем.'
  },
  direct: {
    hold: 'Ручка стоит на месте, как в версии A, и её можно просто взять. Либо держишь палец на ячейке — заряжается кольцо, ручка сама улетает на палец, дальше ведёшь и собираешь пачкой.'
  }
};

function applyCfg(){
  const direct = cfg.collect === 'direct';
  const select = cfg.collect === 'select';
  phone.dataset.ver = cfg.collect;
  $('#directRow').hidden = !direct;
  // ручка живёт в версии A, а во второй версии ещё и в B с удержанием:
  // там она стоит на своём месте всегда и улетает на палец, когда режим взвёлся
  const holdHand = V2 && direct && cfg.direct === 'hold';
  collectTool.hidden = (direct || select) && !holdHand;
  $('#devver').textContent = select ? 'C' : direct ? 'B' : 'A';
  if(!select) clearPicked();
  if(V2){ stopJiggle(); disarmHarvest(); }
  $('#collectHint').textContent = (V2 && HINTS2.collect[cfg.collect]) || HINTS.collect[cfg.collect];
  $('#directHint').textContent = (V2 && HINTS2.direct[cfg.direct]) || HINTS.direct[cfg.direct];

  settings.querySelectorAll('[data-set]').forEach(b => {
    const [k, v] = b.dataset.set.split(':');
    b.classList.toggle('on', cfg[k] === v);
  });
  settings.querySelectorAll('[data-mode]').forEach(b =>
    b.classList.toggle('on', b.dataset.mode === state.mode));
}

$('#devbtn').addEventListener('click', () => { settings.hidden = false; applyCfg(); });
settings.querySelector('.close').addEventListener('click', () => { settings.hidden = true; });

settings.addEventListener('click', e => {
  const b = e.target.closest('button');
  if(!b) return;

  if(b.id === 'reset'){ state = fresh(state.mode); save(); render(); settings.hidden = true; return; }

  if(b.dataset.mode){
    if(b.dataset.mode !== state.mode){ state = fresh(b.dataset.mode); save(); render(); }
    applyCfg();
    return;
  }

  if(b.dataset.set){
    const [k, v] = b.dataset.set.split(':');
    cfg[k] = v;
    saveCfg();
    applyCfg();
  }
});

/* ═══════════ ВЕРСИЯ C: ВЫДЕЛЕНИЕ, КАК В ФОТОПЛЁНКЕ ═══════════
   Выбор и действие разведены во времени: сперва отмечаешь ячейки
   тапом или проводя пальцем, потом применяешь действие ко всем сразу.
   Выделение переживает переключение блоков.                        */

const picked = new Set();
const actionbar = $('#actionbar');
let paint = null;   // { add: true|false } — красим выделение или снимаем

function paintCell2(idx, add){
  if(add === picked.has(idx)) return false;
  add ? picked.add(idx) : picked.delete(idx);
  cellEls[idx]?.classList.toggle('sel', add);
  return true;
}

function clearPicked(){
  picked.forEach(i => cellEls[i]?.classList.remove('sel'));
  picked.clear();
  renderActionbar();
}

function renderActionbar(){
  // во второй версии панель обслуживает режим дёрганья, а не выделение
  if(V2 && cfg.collect === 'select'){
    if(!jiggling){ actionbar.hidden = true; return; }
    actionbar.hidden = false;
    const ready = readyCount();
    $('#selN').textContent = 'Режим сбора';
    $('#selHint').textContent = ready
      ? `готовых ${ready} — тапай или веди пальцем`
      : 'готовых нет';
    const btn = $('#doCollect');
    btn.disabled = !ready;
    btn.textContent = ready ? `Собрать всё · ${ready}` : 'Собрать всё';
    $('#doClear').textContent = 'Готово';
    return;
  }
  if(cfg.collect !== 'select' || picked.size === 0){ actionbar.hidden = true; return; }
  actionbar.hidden = false;
  const arr = [...picked];
  const ready = arr.filter(i => state.cells[i].state === 'ready').length;
  const empty = arr.filter(i => state.cells[i].state === 'empty').length;
  $('#selN').textContent = `Выбрано ${picked.size}`;
  $('#selHint').textContent = ready || empty
    ? [ready && `готовых ${ready}`, empty && `пустых ${empty}`].filter(Boolean).join(' · ')
    : 'все ячейки заняты';
  const btn = $('#doCollect');
  btn.disabled = ready === 0;
  btn.textContent = ready ? `Собрать ${ready}` : 'Собрать';
}

/* сбор всего выделенного */
$('#doCollect').addEventListener('click', () => {
  // в режиме дёрганья выделения нет: собираем всё готовое на всех блоках
  if(V2 && cfg.collect === 'select'){
    let k = 0;
    state.cells.forEach((c, i) => {
      if(c.state !== 'ready') return;
      state.cells[i] = { state:'empty' }; paintCell(i); k++;
    });
    if(k){ countFree(); save(); }
    stopJiggle();
    return;
  }
  let n = 0;
  picked.forEach(i => {
    if(state.cells[i].state !== 'ready') return;
    state.cells[i] = { state:'empty' };
    paintCell(i);
    n++;
  });
  if(n){ countFree(); save(); }
  clearPicked();
});

$('#doClear').addEventListener('click', () => {
  if(V2 && cfg.collect === 'select') return stopJiggle();   // это «Готово»
  clearPicked();
});

/* посев всего выделенного: тап по ресурсу в лотке */
function seedPicked(typeId){
  const t = byId(typeId);
  let n = 0;
  picked.forEach(i => {
    if(state.cells[i].state !== 'empty') return;
    state.cells[i] = { state:'growing', typeId, endsAt: Date.now() + t.growMs };
    paintCell(i);
    n++;
  });
  if(n){ countFree(); save(); }
  clearPicked();
  return n;
}

/* ═══════════ ВЕРСИЯ B: ПРЯМОЙ СБОР ═══════════ */

const MOVE_TOL = 10;    // порог, после которого движение считается прокруткой
const HOLD_MS  = 250;

/* Во второй версии удержание чуть длиннее: за 250 мс индикатор зарядки
   не успевает прочитаться, палец уже уехал. 320 — всё ещё быстро, но
   кольцо видно и понятно, что идёт взвод режима. */
const HOLD_V2  = 320;
const JIGGLE_MS = 450;  // версия C: вход в режим сбора, как на домашнем экране

let dc = null;          // текущее касание сетки
let swallowClick = false;

scroller.addEventListener('pointerdown', e => {
  if(drag) return;
  const cell = e.target.closest('.cell');
  if(!cell) return;

  // версия C во второй версии: галок и выделения нет. Пока режим сбора
  // не взведён — сетка живёт обычной жизнью, свайп листает блоки, а долгое
  // удержание включает «дёрганье», как на домашнем экране айфона.
  if(V2 && cfg.collect === 'select'){
    const i = +cell.dataset.idx;
    dc = { idx:i, x:e.clientX, y:e.clientY, moved:false, sweeping:false, timer:null };
    if(jiggling){
      // режим уже включён: касание сразу собирает, дальше можно вести пальцем
      e.preventDefault();          // и никакой инерции прокрутки от этого касания
      dc.sweeping = true;
      lockScroll(true);
      sweepAt(e.clientX, e.clientY);
    } else {
      hold(cell, JIGGLE_MS);
      dc.timer = setTimeout(() => { if(dc && !dc.moved) startJiggle(); }, JIGGLE_MS);
    }
    return;
  }

  // версия C: начинаем красить выделение — добавляем или снимаем,
  // как в фотоплёнке, направление задаёт первая тронутая ячейка
  if(cfg.collect === 'select'){
    const i = +cell.dataset.idx;
    paint = { add: !picked.has(i) };
    paintCell2(i, paint.add);
    renderActionbar();
    lockScroll(true);
    dc = { idx:i, x:e.clientX, y:e.clientY, moved:false, sweeping:true, timer:null };
    return;
  }

  if(cfg.collect !== 'direct') return;
  const idx = +cell.dataset.idx;
  dc = { idx, x:e.clientX, y:e.clientY, moved:false, sweeping:false, timer:null };

  if(cfg.direct === 'free'){
    // сетка целиком отдана под сбор, листание — краями и пейджером
    startSweep();
  } else if(cfg.direct === 'start'){
    // решает стартовая ячейка: готовая — собираем, любая другая — листаем
    if(state.cells[idx].state === 'ready') startSweep();
  } else {
    // во второй версии удержание видно: на ячейке заряжается кольцо
    if(V2) hold(cell, HOLD_V2);
    dc.timer = setTimeout(() => { if(dc && !dc.moved) startSweep(); }, V2 ? HOLD_V2 : HOLD_MS);
  }
});

/* слушаем на документе: палец при заметании уходит за пределы сетки,
   и на самой сетке отпускание можно не поймать */
document.addEventListener('pointermove', e => {
  if(!dc) return;
  const dx = e.clientX - dc.x, dy = e.clientY - dc.y;

  if(!dc.moved && Math.hypot(dx, dy) > MOVE_TOL){
    dc.moved = true;
    clearTimeout(dc.timer);   // сдвинулся раньше задержки — это прокрутка
    clearHolding();           // зарядка кольца оборвалась вместе с удержанием
  }
  if(dc.sweeping){
    e.preventDefault();
    handyTo(e.clientX, e.clientY);
    sweepAt(e.clientX, e.clientY);
    // у края блоки листаются, не отрывая палец — как при посеве
    const pr = phone.getBoundingClientRect();
    edgeScroll((e.clientX - pr.left) / (pr.width / 360));
  }
}, {passive:false});

/* Блокировка прокрутки на время заметания. Позицию сохраняем руками:
   смена overflow сбрасывает scrollLeft, и сетка прыгала бы на первый блок. */
function lockScroll(on){
  const x = scroller.scrollLeft;
  scroller.style.overflowX = on ? 'hidden' : '';
  scroller.scrollLeft = x;
  // Одного overflow мало: сафари решает, что жест — это прокрутка, раньше
  // чем до нас доходит pointermove, и дальше листает блок, что бы мы ни
  // делали. Панорамирование надо запрещать самому браузеру, через
  // touch-action, — тогда сбор ведением не превращается в скролл.
  if(V2) scroller.classList.toggle('nopan', on);
}

function startSweep(){
  dc.sweeping = true;
  lockScroll(true);
  clearHolding();
  // Взвод режима в версии B нечем было заметить: сбор просто начинал
  // работать. Теперь на палец прилетает ручка и подсвечиваются готовые —
  // жест читается как «держи и веди, собираю пачкой».
  if(V2 && cfg.collect === 'direct' && cfg.direct === 'hold') armHarvest(dc.x, dc.y);
  sweepAt(dc.x, dc.y);
}

function sweepAt(x, y){
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest ? el.closest('.cell') : null;
  if(!cell) return;
  const i = +cell.dataset.idx;

  if(V2 && cfg.collect === 'select'){     // версия C: в режиме дёрганья сразу собираем
    if(jiggling && state.cells[i].state === 'ready'){ popCollect(i); swallowClick = true; }
    return;
  }
  if(cfg.collect === 'select'){          // версия C: красим выделение
    if(paintCell2(i, paint.add)) renderActionbar();
    swallowClick = true;
    return;
  }
  if(state.cells[i].state === 'ready'){ collect(i); swallowClick = true; }
}

function endDirect(){
  if(!dc) return;
  clearTimeout(dc.timer);
  clearHolding();
  paint = null;
  disarmHarvest();
  // тап без движения — собираем одну ячейку.
  // В версии C это делает только включённый режим сбора: до него короткий
  // тап ничего не значит, иначе дёрганье теряет смысл.
  const tap = !dc.moved && !dc.sweeping;
  if(V2 && cfg.collect === 'select'){
    if(tap && jiggling && state.cells[dc.idx].state === 'ready'){
      popCollect(dc.idx);
      swallowClick = true;
    }
  } else if(tap && state.cells[dc.idx].state === 'ready'){
    collect(dc.idx);
    swallowClick = true;
  }
  lockScroll(false);
  dc = null;
  stopEdgeScroll();
}
document.addEventListener('pointerup', endDirect);
document.addEventListener('pointercancel', endDirect);
addEventListener('blur', endDirect);

/* ═══════════ V2: ФИДБЕК УДЕРЖАНИЯ (B) И РЕЖИМ ДЁРГАНЬЯ (C) ═══════════

   Обе версии страдали одним и тем же: режим включался молча. В B ты
   держал палец и не знал, взвелось ли; в C галочки говорили «выбрано»,
   но не говорили «можно собирать», и требовали второй шаг кнопкой.

   B · удержание. Ручка из версии A стоит на своём месте всегда — экран
   сразу говорит, чем тут собирают. Пока держишь палец, на ячейке заряжается
   кольцо; взвелось — ручка улетает с кнопки на палец и остаётся на нём,
   пока ведёшь. Взять её и повести руками тоже можно: два пути к одному
   сбору, и ни один не упирается в «так нельзя».

   C · дёрганье. Галок нет. Долгое удержание включает режим сбора, и все
   готовые ячейки начинают дёргаться, как иконки на домашнем экране.
   Дальше тапаешь по ним или ведёшь пальцем — они выщёлкиваются по одной.
   Режим гаснет сам, когда собирать больше нечего.                      */

/* зарядка под пальцем: пятно растёт ровно столько, сколько длится
   удержание в этом режиме — в B это 320 мс, в C 450 */
function hold(cell, ms){
  cell.style.setProperty('--hold-ms', ms + 'ms');
  cell.classList.add('holding');
}

/* кольцо зарядки под пальцем — снимаем при любом исходе удержания */
function clearHolding(){
  if(!V2) return;
  scroller.querySelectorAll('.cell.holding').forEach(el => el.classList.remove('holding'));
}

/* ─── ручка, прилетающая на палец ─── */

let handy = null;

function handyEl(){
  if(handy) return handy;
  handy = document.createElement('div');
  handy.id = 'handy';
  handy.textContent = '👋';
  // рядом с #ghost, а не внутрь #phone: телефон масштабируется трансформом
  // и обрезает overflow — фиксированная ручка внутри него уезжала за край
  host.appendChild(handy);
  return handy;
}

/* откуда вылетает и куда возвращается: место ручки в версии A.
   Кнопка в этом режиме на экране, так что берём её собственные координаты */
function parkPoint(){
  const el = collectTool.hidden ? $('.controls') : collectTool;
  const r = el.getBoundingClientRect();
  return collectTool.hidden
    ? { x: r.right - r.width * 0.12, y: r.top + r.height / 2 }
    : { x: r.left + r.width / 2,     y: r.top + r.height / 2 };
}

/* Плавность нужна ровно на двух перелётах — с кнопки на палец и обратно.
   Пока ручка на пальце, её быть не должно: с transition на transform
   каждое движение пальца ручка «доезжает» за 220 мс и волочится следом.
   Поэтому перелёты — с анимацией, слежение за пальцем — без. */
const HANDY_FLY = 220;
const HANDY_EASE = `transform ${HANDY_FLY}ms cubic-bezier(.22,1.4,.5,1), opacity .18s ease`;
let handyTimer = null;

/* translate3d, а не translate: сафари так держит ручку на своём слое
   и не перерисовывает её вместе с сеткой на каждом кадре */
const handyAt = (x, y, k) =>
  `translate3d(${x-28}px, ${y-28}px, 0) scale(${uiScale*k})`;

/* pointermove на айфоне сыпется чаще кадров, а сам обработчик и так
   дёргает elementFromPoint по сетке. Позицию ручки копим и красим один
   раз за кадр — иначе на сафари это выглядит как заедание. */
let handyRaf = 0, handyXY = null;

function handyPaint(){
  handyRaf = 0;
  if(!handyXY || !handy || !handy.classList.contains('on')) return;
  handy.style.transform = handyAt(handyXY.x, handyXY.y, 1);
}

function armHarvest(x, y){
  const h = handyEl(), p = parkPoint();
  // пока ручка на пальце, кнопку прячем: иначе рук на экране две
  collectTool.classList.add('handoff');
  clearTimeout(handyTimer);
  h.style.transition = 'none';                 // ставим в парковку без анимации
  h.style.transform = handyAt(p.x, p.y, .4);
  h.classList.add('on');
  void h.offsetWidth;                          // и только потом отпускаем к пальцу
  h.style.transition = HANDY_EASE;
  handyXY = { x, y };
  h.style.transform = handyAt(x, y, 1);
  // долетела — снимаем плавность, дальше ручка сидит ровно под пальцем
  handyTimer = setTimeout(() => { h.style.transition = ''; }, HANDY_FLY);
  phone.classList.add('harvest');
}

function handyTo(x, y){
  if(!handy || !handy.classList.contains('on')) return;
  handyXY = { x, y };
  if(!handyRaf) handyRaf = requestAnimationFrame(handyPaint);
}

function disarmHarvest(){
  if(!phone.classList.contains('harvest')) return;
  phone.classList.remove('harvest');
  if(!handy) return;
  clearTimeout(handyTimer);
  cancelAnimationFrame(handyRaf); handyRaf = 0; handyXY = null;
  const p = parkPoint();
  handy.style.transition = HANDY_EASE;          // обратный перелёт снова плавный
  handy.style.transform = handyAt(p.x, p.y, .4);
  handy.classList.remove('on');
  // кнопку возвращаем, когда ручка долетела до места — иначе они мигнут вдвоём
  setTimeout(() => collectTool.classList.remove('handoff'), HANDY_FLY);
}

/* ─── режим дёрганья ─── */

let jiggling = false;

const readyCount = () => state.cells.filter(c => c.state === 'ready').length;

function startJiggle(){
  clearHolding();
  // собирать нечего — режим не включаем, иначе дёрганья нет и экран врёт
  if(!readyCount()) return;
  jiggling = true;
  phone.classList.add('jiggle');
  desyncJiggle();
  renderActionbar();
  // палец не отрывали: продолжаем тем же касанием, как долгий тап с ведением
  if(dc){
    dc.sweeping = true;
    lockScroll(true);
    sweepAt(dc.x, dc.y);
  }
}

function stopJiggle(){
  if(!jiggling) return;
  jiggling = false;
  phone.classList.remove('jiggle');
  renderActionbar();
}

/* иконки на домашнем экране дёргаются вразнобой — иначе сетка пульсирует
   одним куском и читается как мигание, а не как «живые» ячейки */
function desyncJiggle(){
  cellEls.forEach(el => {
    if(el) el.style.setProperty('--jd', (-Math.random() * 400 | 0) + 'ms');
  });
}

/* сбор одной ячейки в режиме дёрганья: с выщелкиванием */
function popCollect(idx){
  const el = cellEls[idx];
  collect(idx);
  if(el){
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), 280);
  }
  readyCount() ? renderActionbar() : stopJiggle();
}

/* тап мимо сетки закрывает режим — как тап по обоям на домашнем экране */
document.addEventListener('pointerdown', e => {
  if(!V2 || !jiggling) return;
  if(e.target.closest('.cell') || e.target.closest('#actionbar') || e.target.closest('#tray')) return;
  stopJiggle();
});

/* ═══════════ СКЕЛЕТОН + СТАРТ ═══════════ */

function buildSkeleton(){
  skeleton.innerHTML = '';
  const add = (css) => {
    const d = document.createElement('div');
    d.className = 'sk'; d.style.cssText = css; skeleton.appendChild(d); return d;
  };
  add('position:absolute;left:16px;top:96px;width:200px;height:34px;border-radius:8px');
  add('position:absolute;left:16px;top:148px;width:140px;height:18px;border-radius:5px');
  // скелетон повторяет реальную сетку: у онбординга ячеек меньше,
  // и квадрат 5×5 схлопывался бы в один ряд прямо на глазах
  const g = add('position:absolute;left:var(--grid-left);top:50%;transform:translateY(-50%);' +
                'width:var(--block-w);height:var(--block-h);background:none');
  g.style.cssText += ';display:grid;grid-template-columns:repeat(var(--grid-cols,5),var(--cell-size));' +
                     'grid-auto-rows:var(--cell-size);gap:2px';
  g.className = '';
  for(let i=0;i<CELLS_PER_BLOCK;i++){
    const c = document.createElement('div');
    c.className='sk'; c.style.animationDelay=(i*16)+'ms';
    g.appendChild(c);
  }
  add('position:absolute;left:40px;top:618px;width:80px;height:80px;border-radius:12px');
  add('position:absolute;left:132px;top:618px;width:80px;height:80px;border-radius:12px');
  add('position:absolute;left:224px;top:618px;width:80px;height:80px;border-radius:12px');
}

function render(){
  hideTip();
  selCell = null;
  picked.clear();               // сетка пересобирается — старые ссылки на ячейки не годятся
  anchorBlock = 0;
  stopEdgeScroll();
  buildSkeleton();
  skeleton.classList.add('on');
  buildGrid();
  buildTray();
  applyCfg();
  renderActionbar();
  scroller.scrollLeft = 0;
  fit();
  setTimeout(() => skeleton.classList.remove('on'), SKELETON_MS);
}

  const api = {
    el: host,
    stats,
    cells(){ return state.cells.map(c => ({ ...c })); },
    on(name, cb){ (listeners[name] ||= []).push(cb); return api; },
    setVersion(v){ cfg.collect = v; saveCfg(); applyCfg(); return api; },
    setMode(m){ if(m !== state.mode){ state = fresh(m); save(); render(); } return api; },
    reset(){ state = fresh(state.mode); save(); render(); return api; },
    setCells(list){
      list.forEach(({ index, ...rest }) => { if(state.cells[index]) state.cells[index] = rest; });
      paintAll(); save();
      return api;
    },
    highlight(idx){
      host.querySelectorAll('.cell.hint').forEach(el => el.classList.remove('hint'));
      if(idx != null) cellEls[idx]?.classList.add('hint');
      return api;
    }
  };

  // настройки из opts применяем до первой отрисовки, чтобы не мигать
  if(V2) $('#phone').classList.add('v2');
  if(opts.version){ cfg.collect = opts.version; saveCfg(); }
  if(opts.mode && opts.mode !== state.mode) state = fresh(opts.mode);
  if(opts.chrome === false) $('#devbtn').style.display = 'none';
  // встраиваемому генератору своя «‹» не нужна: у хоста она уже есть,
  // и две стрелки наезжали друг на друга в углу
  if(opts.back === false) $('#back').style.display = 'none';
  if(opts.title) $('#title').textContent = opts.title;
  if(opts.hero){ $('#hero').innerHTML = opts.hero; $('#phone').classList.add('withhero'); }
  if(opts.dim) $('#phone').classList.add('dim');

  render();
  return api;
};
