/* ═══════════════════════════════════════════════════════════════
   Ферма — движок онбординга.

   Карта, здания, экраны генератора, кофейни и заказов, уровни,
   размещение построек и проигрыватель сюжета. Всё, что одинаково
   у всех вариантов онбординга, живёт здесь.

   Вариант отличается только сценарием: массив шагов приходит
   снаружи. Так две версии для теста гарантированно отличаются
   ровно тем, что мы сравниваем, и ничем больше.

   createFarm({
     script,    массив шагов сюжета
     variant,   метка варианта: свои ключи хранилища
   })

   Шаг сценария:
     who/text            кто говорит и что
     wait                какого события ждём вместо тапа
     focus / pointAt     куда ведём камеру и стрелку
     gen / orders / level  экраны зданий, заказа и уровня
     spawn / showOldman / hint   что появляется на карте
   ═══════════════════════════════════════════════════════════════ */

const FARM_MARKUP = String.raw`
<div id="viewport"><div id="canvas">
  <img class="base" src="../assets/map/map2.webp" alt="">
  <div id="oldman"><span class="want">☕</span><img src="../assets/map/oldman on map.png" alt=""></div>
</div></div>

<div id="bar">
  <div class="money">
    <span class="pill"><i class="i-gem"></i>500</span>
    <span class="pill"><i class="i-coin"></i><b id="coins">5 000</b></span>
  </div>
  <span class="grow"></span>
  <button class="pill" id="reset">сброс</button>
</div>

<div id="hintline"></div>

<div id="dock">
  <button class="primary" id="openSheet">🔨 Постройки</button>
</div>

<div id="sheet" class="veil">
  <div class="sheetTop">
    <div class="row">
      <button class="back" aria-label="Назад">‹</button>
      <span class="pill"><i class="i-gem"></i>500</span>
      <span class="pill"><i class="i-coin"></i><b id="coins2">5 000</b></span>
    </div>
    <h2 id="sheetTitle">Постройки</h2>
  </div>
  <div id="cats"></div>
  <div id="items"></div>
</div>

<div id="confetti"></div>

<div id="tapcatch"></div>
<div id="story" class="veil">
  <div class="who"><img alt=""><span class="name"></span></div>
  <div class="bubble"><span class="text"></span><button class="next" aria-label="Дальше">▼</button></div>
</div>
<div id="point">⬇</div>

<div id="screen" class="veil">
  <button class="back" aria-label="Назад">‹</button>
  <div id="app" class="host"></div>
  <div id="app2" class="host"></div>
</div>
  <div id="genSpeech" class="veil"><img alt=""><div class="b"></div></div>
  <div id="genDemo"></div>

  <div id="boostTip">
    <div class="box">
      <span class="nose"></span>
      <b>Кофе</b>
      <span class="time">🕐 ещё 29 сек</span>
      <button class="boost">🪙 Бесплатно</button>
    </div>
  </div>

  <div id="intro" class="veil">
    <img class="hero" src="../assets/map/Cafe.png" alt="">
    <div class="logo">Т<b>-</b>Ферма</div>
    <p class="lead">Тестирование онбординга</p>
    <ol>
      <li><span>1</span>Пройти полностью путь</li>
      <li><span>2</span>Активно комментировать свои мысли и действия</li>
      <li><span>3</span>Финальная цель: выполнить заказ</li>
    </ol>
    <button class="go">Поехали</button>
  </div>

  <div id="orders" class="veil">
    <button class="back" aria-label="Назад">‹</button>
    <div class="obar">
      <span class="badge"><i class="i-gem"></i>500</span>
      <span class="badge"><i class="i-coin"></i>5 000</span>
      <span class="badge ring">10</span>
    </div>
    <h2>Заказы <i class="info">i</i></h2>

    <div class="clients">
      <button class="client on"><img src="../assets/onboarding/Granny.png" alt=""><span class="ok">✓</span></button>
      <button class="client"><img src="../assets/onboarding/oldman and cofe.png" alt=""><span class="ok">✓</span></button>
    </div>

    <div class="card">
      <div class="chead">Детали<button class="reroll" aria-label="Другой заказ">⟳</button></div>
      <div class="need">
        <div class="slot"><img alt=""><span class="ok">✓</span><b>5/1</b></div>
      </div>
      <div class="rewtitle"><span></span>Награда за выполнение<span></span></div>
      <div class="rewards">
        <b><i class="i-coin"></i>93</b>
        <b><i class="i-gem"></i>236</b>
      </div>
      <button class="send">Отправить заказ</button>
    </div>
  </div>

  <div id="finish" class="veil">
    <img class="pic" alt="">
    <h2>Спасибо!</h2>
    <p>Вы прошли весь путь и выполнили заказ. Деревня в надёжных руках</p>
    <button class="done">Готово</button>
  </div>

  <div id="level">
    <button class="close">Закрыть</button>
    <div class="medal"><img src="../assets/onboarding/Frame 2147224235.svg" alt=""><span>2</span></div>
    <h2>Новый уровень</h2>
    <p class="sub">Заберите награду:</p>
    <div class="reward">
      <b><i class="i-coin"></i>93</b>
      <b><i class="i-gem"></i>93</b>
    </div>
    <div class="got">Теперь вам доступны</div>
    <div class="items">
      <div><img src="../assets/map/Cafe.png" alt=""></div>
      <div>☕</div>
    </div>
    <button class="take">Забрать награду</button>
  </div>
`;

'use strict';

window.createFarm = function createFarm(opts){
opts = opts || {};

const VARIANT = opts.variant || 'v1';
document.body.insertAdjacentHTML('afterbegin', FARM_MARKUP);

/* ═══════════ ДАННЫЕ ═══════════ */

const BUILD_MS = 3000;                 // стройка идёт 3 секунды

const CATALOG = [
  { cat:'Преобразователи', icon:'../assets/map/Cafe.png', items:[
      // генератор нарисован на самой карте: картинки нет, поэтому зону
      // нажатия задаём вручную — по размеру спрайта на карте
      { id:'gen', name:'Генератор', price:0, opens:'generator', art:'', hidden:true,
        hit:{ w:135, h:113, dy:-13 } },
      { id:'coffee', name:'Кофейня', price:2000, opens:'cafe',
        art:'../assets/map/Cafe.png',
        artBuild:'../assets/map/Cafe-construction.png',
        artGift:'../assets/map/cafe-constructionend-open.png' },
      { id:'plant',  name:'Завод',   price:3500, art:'../assets/map/building-generator.png', opens:'generator' },
      { id:'orders', name:'Доска заказов', price:1500, opens:'orders',
        art:'../assets/map/building-order board.png' },
  ]},
  { cat:'Дома', icon:'../assets/map/building-barn.png', items:[
      { id:'house', name:'Домик', price:1200, art:'../assets/map/building-barn.png', locked:true },
  ]},
  { cat:'Декор', icon:'../assets/map/building-order board.png', items:[
      { id:'tree', name:'Дерево', price:300, art:'../assets/map/building-barn.png', locked:true },
  ]},
];
const itemById = id => CATALOG.flatMap(c => c.items).find(i => i.id === id);

/* Размеры зданий сняты с самой карты. У каждой картинки своя доля основания
   в общей ширине, поэтому масштаб считается не по картинке целиком, а по её
   основанию — тогда здания одного размера в тайлах выглядят одинаково:
     t   — сколько тайлов занимает основание;
     w   — ширина отрисовки, при которой основание встаёт ровно в t тайлов;
     off — на сколько низ картинки опускается ниже точки привязки, чтобы
           центр основания лёг на неё.

   Кофейня заметно выше остальных, поэтому при равном основании смотрелась
   громоздкой — ей три тайла против четырёх у приземистых завода и склада. */
const TILE_W = 31.8, TILE_H = 16.8;
const ART_FIT = {
  'Cafe.png':                      { t:3, w:114, off:32 },
  'Cafe-construction.png':         { t:3, w:96,  off:25 },
  'cafe-constructionend-open.png': { t:3, w:95,  off:25 },
  'building-generator.png':        { t:4, w:127, off:34 },
  'building-order board.png':      { t:4, w:132, off:44 },
  'building-barn.png':             { t:4, w:145, off:40 },
};
const fitOf = src => ART_FIT[src.split('/').pop()] || { t:4, w:127, off:34 };

/* Здания стоят где поставили: у каждого свои координаты на карте.
   Изометрия — ромбы, поэтому позицию притягиваем к решётке ромбов.

   Константы сняты с самой картинки, а не на глаз: линии сетки идут с
   наклоном 0.528 и шагом 44.1, то есть тайл 83.6×44.1. Фазы PU/PV
   ставят решётку на нарисованные линии — иначе здание вставало между
   ромбами и метка места выглядела случайной. */
const ISO_S = 0.528, ISO_P = 16.77, ISO_PU = 7.69, ISO_PV = 0.94;

/* Притягиваем к вершине решётки: метка занимает два тайла в каждую
   сторону, и на вершине она накрывает ровно четыре ромба. */
function snapIso(x, y){
  const u = ISO_PU + ISO_P * Math.round(((y - ISO_S*x) - ISO_PU) / ISO_P);
  const v = ISO_PV + ISO_P * Math.round(((y + ISO_S*x) - ISO_PV) / ISO_P);
  return { x: (v - u) / (2*ISO_S), y: (u + v) / 2 };
}

const KEY = 'farm-map-' + VARIANT;
let coins = 5000;
let built = [];        // { id, itemId, state, endsAt, flip, x, y }
let seq = 1;

function save(){ localStorage.setItem(KEY, JSON.stringify({coins, built, seq})); }
function load(){
  try{
    const r = JSON.parse(localStorage.getItem(KEY));
    if(r && typeof r === 'object'){
      coins = r.coins ?? 5000;
      built = Array.isArray(r.built) ? r.built : [];
      seq = r.seq || 1;
    }
  }catch{}
  // генератор нарисован на самой карте — запись нужна только чтобы по нему тапали.
  // Точка привязки — центр его каменной площадки, снятый с картинки: тогда
  // подпись и метка места ложатся так же, как у построенных зданий
  if(!built.some(b => b.id === 'gen'))
    built.unshift({ id:'gen', itemId:'gen', state:'ready', x:1360, y:1011 });
}
load();

/* ═══════════ ОТРИСОВКА КАРТЫ ═══════════ */

/* Дед стоит в одной точке и для камеры, и для отрисовки: раньше позиция
   была прописана дважды, в стилях и в наводке, и они разъезжались. */
const OLDMAN = { x:1392, y:1078 };

/* Обжитая часть острова. Центр карты приходится на лес, поэтому и общий
   план, и стартовая точка нового здания считаются отсюда. */
const HOME = { x:1420, y:1030 };
Object.assign(document.getElementById('oldman').style,
  { left: OLDMAN.x + 'px', top: OLDMAN.y + 'px' });

const canvas = document.getElementById('canvas');
const hintline = document.getElementById('hintline');
const coinsEl = document.getElementById('coins');
/* popId — здание, которое только что появилось: оно въезжает с отскоком.
   Остальные перерисовываются молча, иначе анимация играла бы на всех
   сразу при каждом обновлении карты. */
function paintAll(popId){
  // здания перерисовываем целиком: их немного, а код проще
  [...canvas.querySelectorAll('.plot')].forEach(el => el.remove());
  built.forEach(b => {
    const item = itemById(b.itemId);
    const el = document.createElement('div');
    el.className = 'plot';
    el.dataset.id = b.id;
    el.dataset.item = b.itemId;      // по нему сюжет наводит стрелку на здание
    el.dataset.state = b.state;
    el.style.left = b.x + 'px';
    el.style.top  = b.y + 'px';

    const src = b.state === 'building' ? (item.artBuild || item.art)
              : b.state === 'gift'     ? (item.artGift  || item.art)
              : item.art;
    const f = src ? fitOf(src) : { t:4 };
    // метка места и подпись идут по основанию: у зданий разный размер в тайлах
    const pad = `<div class="pad" style="width:${(f.t*TILE_W).toFixed(0)}px;height:${(f.t*TILE_H).toFixed(0)}px"></div>`;
    const labelTop = (f.t*TILE_H/2 + 4).toFixed(0);
    // чип висит внутри картинки — над крышей, а не над точкой привязки
    const chip = b.state === 'building' ? '<div class="chip">🕐 …</div>'
               : b.state === 'gift'     ? '<div class="chip unlock">🔓</div>'
               : b.order                ? '<div class="chip order">📦<i>✓</i></div>' : '';
    el.innerHTML = pad +
      (src ? `<div class="art" style="width:${f.w}px;bottom:${-f.off}px">
                <img src="${src}" alt="" style="transform:scaleX(${b.flip ? -1 : 1})">${chip}
              </div>`
           : `<div class="hit" style="width:${item.hit?.w || 127}px;height:${item.hit?.h || 67}px;
                   margin-top:${item.hit?.dy || 0}px"></div>${chip}`) +
      (chip ? '' : `<div class="label" style="top:${labelTop}px">${b.id === 'gen' ? 'Генератор' : item.name}</div>`);
    if(b.id === popId) el.classList.add('pop');
    canvas.appendChild(el);
  });
  coinsEl.textContent = coins.toLocaleString('ru');
}

/* ═══════════ ТАЙМЕР СТРОЙКИ ═══════════ */

setInterval(() => {
  const now = Date.now();
  built.forEach(b => {
    if(b.state !== 'building') return;
    const left = b.endsAt - now;
    if(left <= 0){
      b.state = 'gift';                 // достроилось — но сперва надо раскрыть
      paintAll(); save();
    } else {
      const chip = canvas.querySelector(`.plot[data-id="${b.id}"] .chip`);
      if(chip){
        const t = Math.ceil(left / 1000);
        chip.textContent = `🕐 ${Math.floor(t/60)} мин ${t%60} сек`;
      }
    }
  });
}, 100);

/* ═══════════ РЕЖИМ РАЗМЕЩЕНИЯ ═══════════ */

/* ═══ размещение: здание таскают по карте, а не выбирают из площадок ═══ */

let placing = null;   // { itemId, x, y, flip }
let ghostEl = null;

function startPlacing(itemId){
  const item = itemById(itemId);
  if(coins < item.price) return say('Не хватает монет');
  closeSheet();
  // отъезжаем на общий план и ставим здание в середину карты —
  // ровно туда, куда после отъезда смотрит экран
  zoomOut();
  placing = { itemId, flip:false, ...snapIso(HOME.x, HOME.y) };
  document.body.classList.add('placing');
  renderPlacing();
  scFire('placing');
}

function renderPlacing(){
  const item = itemById(placing.itemId);
  if(!ghostEl){
    ghostEl = document.createElement('div');
    ghostEl.className = 'plot ghost';
    ghostEl.innerHTML = '<div class="pad"></div><div class="art"></div>';
    canvas.appendChild(ghostEl);
  }
  ghostEl.style.left = placing.x + 'px';
  ghostEl.style.top  = placing.y + 'px';
  // размеры те же, что у готового здания: без них у призрака нулевая
  // ширина картинки — на карте оставался один зелёный ромб
  const f = fitOf(item.art);
  // метку берём с запасом: ровно по основанию она целиком прячется
  // под каменной площадкой здания и её не видно
  const pad = ghostEl.querySelector('.pad');
  pad.style.width  = (f.t*TILE_W + 14).toFixed(0) + 'px';
  pad.style.height = (f.t*TILE_H + 8).toFixed(0) + 'px';
  const art = ghostEl.querySelector('.art');
  art.style.width  = f.w + 'px';
  art.style.bottom = -f.off + 'px';
  art.innerHTML =
    `<img src="${item.art}" alt="" style="transform:scaleX(${placing.flip ? -1 : 1})">`;

  dock.innerHTML =
    `<div class="placeRow">
       <button class="square" id="cancel">✕</button>
       <button class="square" id="flip">↻</button>
     </div>
     <button class="primary" id="confirm">Построить за ${item.price.toLocaleString('ru')}</button>`;
  say('Перетащи здание, куда поставить');
}

function stopPlacing(popId){
  placing = null;
  ghostEl?.remove();
  ghostEl = null;
  document.body.classList.remove('placing');
  dock.innerHTML = '<button class="primary" id="openSheet">🔨 Постройки</button>';
  paintAll(popId);
}

const dock = document.getElementById('dock');
dock.addEventListener('click', e => {
  const b = e.target.closest('button');
  if(!b) return;
  if(b.id === 'openSheet') return openSheet();
  if(b.id === 'cancel')    return stopPlacing();
  if(b.id === 'flip'){ placing.flip = !placing.flip; return renderPlacing(); }
  if(b.id === 'confirm'){
    const item = itemById(placing.itemId);
    const id = 'b' + (seq++);
    coins -= item.price;
    built.push({ id, itemId:item.id, state:'building',
                 endsAt:Date.now() + BUILD_MS, flip:placing.flip, x:placing.x, y:placing.y });
    stopPlacing(id);              // стройка встаёт на место с отскоком
    save();
    say(`${item.name} строится`);
  }
});

/* ═══════════ ТАПЫ ПО КАРТЕ ═══════════ */

canvas.addEventListener('click', e => {
  const wasPanned = panned; panned = false;
  if(wasPanned) return;

  if(placing) return;                     // в режиме размещения тапы не нужны
  const el = e.target.closest('.plot');
  if(!el) return;
  const b = built.find(x => x.id === el.dataset.id);
  if(!b) return;
  if(b.state === 'building') return say('Ещё строится');
  if(b.state === 'gift')     return unwrap(b);
  const item = itemById(b.itemId);
  if(item.opens === 'generator') return openBuilding('generator');
  if(item.opens === 'cafe')      return openBuilding('cafe');
  if(item.opens === 'orders')    return openOrders();
  say(`${item.name}: экран пока не сделан`);
});

/* раскрываем подарок → конфетти → здание готово */
function unwrap(b){
  b.state = 'ready';
  paintAll(b.id);
  save();
  confetti();
  scFire('built');
  say(`${itemById(b.itemId).name} построен`);
}

function confetti(){
  const box = document.getElementById('confetti');
  const colors = ['#ffd60a','#ff453a','#0a84ff','#30d158','#ff9f0a','#bf5af2'];
  box.innerHTML = '';
  for(let i = 0; i < 40; i++){
    const s = document.createElement('span');
    s.style.left = (10 + Math.random()*80) + 'vw';
    s.style.top = (10 + Math.random()*25) + 'vh';
    s.style.background = colors[i % colors.length];
    s.style.setProperty('--dx', (Math.random()*160 - 80) + 'px');
    s.style.animationDelay = (Math.random()*.35) + 's';
    box.appendChild(s);
  }
  box.classList.add('on');
  setTimeout(() => box.classList.remove('on'), 2200);
}

/* ═══════════ КАТАЛОГ ═══════════ */

const sheet = document.getElementById('sheet');
const catsBox = document.getElementById('cats');
const itemsBox = document.getElementById('items');
let openCat = null;

function openSheet(){
  scFire('sheetOpened');
  openCat = null;
  document.getElementById('sheetTitle').textContent = 'Постройки';
  catsBox.style.display = '';
  itemsBox.classList.remove('on');
  catsBox.innerHTML = CATALOG.map(c => `
    <div class="cat" data-cat="${c.cat}">
      <span class="dot"></span>
      <b>${c.cat}</b>
      <img src="${c.icon}" alt="">
    </div>`).join('');
  document.getElementById('coins2').textContent = coins.toLocaleString('ru');
  sheet.classList.add('on');
}

function openCategory(name){
  openCat = CATALOG.find(c => c.cat === name);
  if(!openCat) return;
  document.getElementById('sheetTitle').textContent = openCat.cat;
  catsBox.style.display = 'none';
  itemsBox.classList.add('on');
  const list = openCat.items.filter(i => !i.hidden);
  itemsBox.innerHTML = list.map((i, k) => `
    <div class="card ${i.locked ? 'locked' : ''}">
      <span class="n">${k+1}/${list.length}</span>
      <b>${i.name}</b>
      <img src="${i.art}" alt="">
      <button class="buy" data-item="${i.id}" ${i.locked ? 'disabled' : ''}>
        ${i.locked ? '🔒 закрыто' : i.price.toLocaleString('ru') + '<i class="i-coin"></i>'}
      </button>
    </div>`).join('');
  scFire('catOpened');
}

const closeSheet = () => { sheet.classList.remove('on'); genSpeech.classList.remove('on'); };

sheet.addEventListener('click', e => {
  if(e.target.closest('.back')){
    // назад: из категории — к списку категорий, из списка — на карту
    return openCat ? openSheet() : closeSheet();
  }
  const cat = e.target.closest('[data-cat]');
  if(cat) return openCategory(cat.dataset.cat);
  const buy = e.target.closest('[data-item]');
  if(buy) startPlacing(buy.dataset.item);
});

/* ═══════════ ПОДСКАЗКА ═══════════ */

let sayTimer;
function say(text){
  hintline.textContent = text;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { hintline.textContent = ''; }, 2400);
}

/* ═══════════ ПЕРЕТАСКИВАНИЕ КАРТЫ ═══════════ */

const viewport = document.getElementById('viewport');
const MAP_W = 2600, MAP_H = 1533;
let scale = 1, ox = 0, oy = 0, drag = null, panned = false;

function apply(){
  const w = MAP_W*scale, h = MAP_H*scale;
  ox = w <= innerWidth  ? (innerWidth  - w)/2 : Math.min(0, Math.max(innerWidth  - w, ox));
  oy = h <= innerHeight ? (innerHeight - h)/2 : Math.min(0, Math.max(innerHeight - h, oy));
  canvas.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
}
function fit(){
  minScale = fitScale();
  // на новой карте виден весь остров, поэтому приближения задаём долями
  // от обзорного масштаба: 4× — рабочий вид здания, 5× — предел щипка
  MAX_SCALE = minScale * 5;
  scale = minScale;
  ox = (innerWidth - MAP_W*scale)/2;
  oy = (innerHeight - MAP_H*scale)/2;
  apply();
}
addEventListener('resize', fit);

/* Панорама одним пальцем и зум щипком. Минимальный масштаб — тот,
   при котором карта закрывает экран, чтобы не появлялись пустые поля. */

const pts = new Map();
let pinch = null, minScale = 1;
let MAX_SCALE = 2.6;   // пересчитывается в fit() от размера экрана

function fitScale(){ return Math.max(innerWidth / MAP_W, innerHeight / MAP_H); }

viewport.addEventListener('pointerdown', e => {
  pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if(placing && pts.size === 1){
    // ведём здание, а не карту
    moveGhost(e.clientX, e.clientY);
    drag = null;
    return;
  }
  if(pts.size === 1){
    drag = {x:e.clientX, y:e.clientY, ox, oy};
    panned = false;
  } else if(pts.size === 2){
    drag = null;
    panned = true;                       // это жест масштаба, не тап
    const [a, b] = [...pts.values()];
    const mid = {x:(a.x + b.x)/2, y:(a.y + b.y)/2};
    pinch = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      scale0: scale,
      // точка карты под серединой пальцев — она должна остаться на месте
      cx: (mid.x - ox) / scale,
      cy: (mid.y - oy) / scale
    };
  }
});

function moveGhost(cx, cy){
  const mx = (cx - ox) / scale;
  const my = (cy - oy) / scale;
  Object.assign(placing, snapIso(mx, my));
  ghostEl.style.left = placing.x + 'px';
  ghostEl.style.top  = placing.y + 'px';
}

addEventListener('pointermove', e => {
  if(pts.has(e.pointerId)) pts.set(e.pointerId, {x:e.clientX, y:e.clientY});

  if(placing && pts.size === 1 && ghostEl){ moveGhost(e.clientX, e.clientY); return; }

  if(pinch && pts.size >= 2){
    const [a, b] = [...pts.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = {x:(a.x + b.x)/2, y:(a.y + b.y)/2};
    scale = Math.min(MAX_SCALE, Math.max(minScale, pinch.scale0 * dist / pinch.dist));
    ox = mid.x - pinch.cx * scale;
    oy = mid.y - pinch.cy * scale;
    apply();
    return;
  }

  if(!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if(Math.hypot(dx, dy) > 6) panned = true;
  ox = drag.ox + dx; oy = drag.oy + dy;
  apply();
});

function endPointer(e){
  pts.delete(e.pointerId);
  if(pts.size < 2) pinch = null;
  if(pts.size === 0) drag = null;
}
addEventListener('pointerup', endPointer);
addEventListener('pointercancel', endPointer);

/* колесо с зажатым Ctrl — чтобы можно было проверить зум на десктопе */
viewport.addEventListener('wheel', e => {
  e.preventDefault();
  const k = Math.exp(-e.deltaY / 300);
  const before = {x:(e.clientX - ox)/scale, y:(e.clientY - oy)/scale};
  scale = Math.min(MAX_SCALE, Math.max(minScale, scale * k));
  ox = e.clientX - before.x * scale;
  oy = e.clientY - before.y * scale;
  apply();
}, {passive:false});

/* ═══════════ ЭКРАН ЗДАНИЯ ═══════════ */

const screen = document.getElementById('screen');

/* Кофейня работает на той же механике, что генератор: те же грядки, тот же
   сбор. Меняется только сырьё — она варит американо. Готовой картинки чашки
   нет, поэтому эмодзи заворачиваем в svg и отдаём как обычную картинку. */
const CUP = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112">' +
  '<text x="50%" y="50%" dy=".36em" font-size="92" text-anchor="middle">☕</text></svg>');

// оба экрана создаются сразу: онбординг подписывается на их события
/* В лотке только кофе: закрытые под замком клубника с бананом на обучении
   ничего не объясняют, а внимание оттягивают. */
const gen0 = createGenerator(document.getElementById('app'), {
  assets:'../assets', storeKey:'farm-gen-' + VARIANT,
  mode:'single', cells:5, chrome:false, dim:true,
  version:'direct', back:false, title:'Генератор',
  types:[{ id:'coffee', name:'Кофейное зерно', growMs:40*1000, image:'../assets/imgcoffe.png' }]
});
/* Сцена внутри кофейни: внук у кофе-машины. Машина нарисована в svg —
   готового ассета нет, а показать, что здание что-то делает, надо.
   Пар над чашкой и лампочка мигают, чтобы сцена не читалась как картинка. */
const CAFE_HERO = `
  <div class="scene">
    <img class="who" src="../assets/onboarding/Maloy.png" alt="">
    <svg class="machine" viewBox="0 0 150 148" aria-hidden="true">
      <!-- корпус -->
      <rect x="12" y="10" width="126" height="128" rx="14" fill="#2f6de0"/>
      <rect x="12" y="10" width="126" height="128" rx="14" fill="none" stroke="#5b93ff" stroke-width="2"/>
      <!-- экран с индикаторами -->
      <rect x="24" y="22" width="102" height="40" rx="8" fill="#12224a"/>
      <circle class="led" cx="38" cy="34" r="4" fill="#7ee0ff"/>
      <rect x="50" y="30" width="60" height="5" rx="2.5" fill="#3a5ea8"/>
      <rect x="50" y="44" width="34" height="5" rx="2.5" fill="#3a5ea8"/>
      <circle cx="112" cy="47" r="5" fill="#3a5ea8"/>
      <!-- носик и ниша -->
      <rect x="70" y="62" width="10" height="12" rx="3" fill="#1b3d85"/>
      <rect x="34" y="74" width="82" height="34" rx="6" fill="#255ac0"/>
      <!-- пар и чашка -->
      <path class="steam"    d="M70 88c-5-7 5-11 0-18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path class="steam s2" d="M82 88c-5-7 5-11 0-18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path d="M62 92h24v8a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z" fill="#fff"/>
      <path d="M86 94h5a5 5 0 0 1 0 10h-5" fill="none" stroke="#fff" stroke-width="3"/>
      <rect x="58" y="108" width="32" height="4" rx="2" fill="#e6ecff"/>
      <!-- жёлтая панель -->
      <rect x="24" y="116" width="102" height="14" rx="5" fill="#ffd60a"/>
    </svg>
  </div>`;

const cafeGen = createGenerator(document.getElementById('app2'), {
  assets:'../assets', storeKey:'farm-cafe-' + VARIANT,
  mode:'single', cells:5, chrome:false, dim:true,
  version:'direct', back:false, title:'Кофейня', hero:CAFE_HERO,
  types:[{ id:'americano', name:'Американо', growMs:40*1000, image:CUP }]
});
const gen = gen0;

/* какой экран сейчас открыт — от этого зависит, где искать грядки и лоток */
let genHost = '#app', activeGen = gen0, openedBy = 'generatorOpened';

function openBuilding(kind){
  const cafe = kind === 'cafe';
  genHost   = cafe ? '#app2' : '#app';
  activeGen = cafe ? cafeGen : gen0;
  openedBy  = cafe ? 'cafeOpened' : 'generatorOpened';
  document.getElementById('app').classList.toggle('on', !cafe);
  document.getElementById('app2').classList.toggle('on', cafe);
  screen.classList.add('on');
  dispatchEvent(new Event('resize'));
  scFire(openedBy);
}
const openGenerator = () => openBuilding('generator');

/* закрываем всё, что живёт поверх экрана здания, одним местом */
function closeGenerator(){
  screen.classList.remove('on');
  ordersBox.classList.remove('on');
  clearInterval(boostTimer);
  boostTip.classList.remove('on');
  hideGenHint();
}

/* ═══════════ ЭКРАН ЗАКАЗОВ ═══════════
   Устроен как остальные экраны зданий: открывается по тапу, закрывается
   той же «‹», а после отправки заказа уходит сам — ровно как генератор
   после ускорения. */

const ordersBox = document.getElementById('orders');

/* Что за заказ висит на доске, задаёт сценарий: кто заказчик, что нужно и
   сколько уже есть. Пока не хватает — счётчик красный, галочки нет, кнопка
   гаснет. Так экран умеет показывать и готовый заказ, и невыполнимый. */
const ORDER_ITEMS = { bean:'../assets/imgcoffe.png', cup:CUP };

function setOrder(cfg){
  const c = Object.assign({ client:0, item:'cup', have:5, need:1 }, cfg || {});
  const done = c.have >= c.need;

  ordersBox.querySelector('.slot img').src = ORDER_ITEMS[c.item] || ORDER_ITEMS.cup;
  const count = ordersBox.querySelector('.slot b');
  count.textContent = c.have + '/' + c.need;
  count.classList.toggle('short', !done);
  ordersBox.querySelector('.slot .ok').style.display = done ? '' : 'none';
  ordersBox.querySelector('.slot').classList.toggle('short', !done);

  // Выбранный заказчик встаёт первым — карточка своим хвостиком смотрит на
  // него. Кого выбрали, показывает жёлтая обводка, а зелёная галочка только
  // то, что заказ реально можно закрыть: иначе она обещала выполнимость,
  // когда ресурса нет.
  ordersBox.querySelectorAll('.client').forEach((el, i) => {
    const on = i === c.client;
    el.classList.toggle('on', on);
    el.style.order = on ? 0 : 1;
    el.querySelector('.ok').style.display = (on && done) ? '' : 'none';
  });

  const send = ordersBox.querySelector('.send');
  send.disabled = !done;
  send.classList.toggle('off', !done);
}
setOrder();

function openOrders(){
  ordersBox.classList.add('on');
  scFire('ordersOpened');
}

ordersBox.querySelector('.back').addEventListener('click', () => {
  ordersBox.classList.remove('on');
  hideGenHint();
  hidePoint();
  if(scWait === 'ordersClosed') return scFire('ordersClosed');
  // вышел посреди обучения — зовём обратно, как и в других зданиях
  if(SCRIPT[sc]?.orders){
    sc = SCRIPT.findIndex(s => s.wait === 'ordersOpened') - 1;
    scNext();
  }
});

/* Награда летит в счётчики наверху — те же, что в шапке карты.
   Дальше приходит уровень. Экран заказа при этом может остаться открытым:
   если сценарий продолжается на нём же, закрывать его незачем — человек
   всё это время сидит в одном экране и лишних переходов видеть не должен. */
ordersBox.querySelector('.send').addEventListener('click', () => {
  hideGenHint();
  hidePoint();
  const targets = [...ordersBox.querySelectorAll('.obar .badge i')];
  ordersBox.querySelectorAll('.rewards i').forEach((from, k) => {
    for(let n = 0; n < 4; n++) flyReward(from, targets[k === 0 ? 1 : 0], n * 90);
  });
  ordersBox.querySelector('.send').disabled = true;
  const stay = !!SCRIPT[sc]?.stay;
  setTimeout(() => {
    if(!stay) ordersBox.classList.remove('on');
    ordersBox.querySelector('.send').disabled = false;
    setTimeout(scNext, stay ? 80 : 380);
  }, 900);
});

function flyReward(from, to, delay){
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'fly';
  el.style.background = getComputedStyle(from).background;
  el.style.left = a.left + 'px';
  el.style.top  = a.top + 'px';
  el.style.transitionDelay = delay + 'ms';
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.6)`;
    el.style.opacity = '.1';
  });
  setTimeout(() => el.remove(), 1200 + delay);
}

/* Выход из генератора посреди обучения возвращал на карту без реплик и
   без кнопки «Постройки» — флоу вставал намертво. Отматываем сюжет на
   приглашение зайти в генератор: человек всегда может зайти заново. */
screen.querySelector('.back').addEventListener('click', () => {
  closeGenerator();
  levelBox.classList.remove('on');
  hidePoint();
  if(scWait === 'screenClosed') return scFire('screenClosed');
  if(inGenPart()){
    genWait = null;
    // отматываем к приглашению зайти именно в это здание, а не всегда в генератор
    sc = SCRIPT.findIndex(s => s.wait === openedBy) - 1;
    scNext();
  }
});

/* сюжет и мир сбрасываются вместе: иначе после перезагрузки герои зовут
   строить кофейню, которая уже стоит на карте */
function resetWorld(){
  coins = 5000; built = []; seq = 1;
  localStorage.removeItem(KEY);
  load(); save();
  gen0.reset();
  cafeGen.reset();
  genHost = '#app'; activeGen = gen0; openedBy = 'generatorOpened';
  document.getElementById('app').classList.add('on');
  document.getElementById('app2').classList.remove('on');
  document.getElementById('oldman').classList.remove('on');
  closeGenerator();
  closeSheet();
  levelBox.classList.remove('on');
  if(placing) stopPlacing(); else paintAll();
  genWait = null;
  lastWho = null;
  fit();
  // сюжет ждёт: сперва человек читает, что это за игра и что он сейчас сделает
  sc = -1;
  story.classList.remove('on');
  document.getElementById('tapcatch').classList.remove('on');
  dock.classList.add('hide');
  intro.classList.add('on');
}

const intro = document.getElementById('intro');
intro.querySelector('.go').addEventListener('click', () => {
  intro.classList.remove('on');
  setTimeout(scNext, 300);          // экран уходит, и только потом первая реплика
});

document.getElementById('reset').addEventListener('click', () => { resetWorld(); say('Начали сначала'); });



/* ═══════════════════════════════════════════════════════════════
   ОНБОРДИНГ: сплошной сценарий от первого захода до кофейни.

   Живёт на карте, потому что здесь уже есть и постройка, и вход
   в генератор — иначе флоу разорвался бы между страницами.

   Шаг описывает: кто говорит, что говорит, куда смотрит камера,
   на что показывает стрелка и чего ждём от человека.
   ═══════════════════════════════════════════════════════════════ */

const story    = document.getElementById('story');
const storyImg = story.querySelector('.who img');
const storyName= story.querySelector('.name');
const storyText= story.querySelector('.text');
const point    = document.getElementById('point');

const CAST = {
  grandson: { name:'Внук',    img:'../assets/onboarding/Maloy.png',  cls:'grandson' },
  granny:   { name:'Бабуся',  img:'../assets/onboarding/Granny.png', cls:'granny' },
};

const SCRIPT = opts.script || [];

let sc = -1, scWait = null, shownAt = 0, lastWho = null;

// шаги внутри генератора помечены полем gen — по ним отматываем назад
const inGenPart = () => !!SCRIPT[sc]?.gen;

/* Реплика меняется — бабл подхватывается заново. Персонажа дёргаем
   только когда он действительно сменился: иначе он подпрыгивал на
   каждой своей же фразе. */
function replayStoryAnim(whoChanged){
  story.classList.remove('swap', 'swapWho');
  void story.offsetWidth;                     // перезапуск анимации
  story.classList.add('swap');
  if(whoChanged) story.classList.add('swapWho');
}

function scNext(){
  sc++;
  shownAt = Date.now();
  hidePoint();
  // обучение кончилось — возвращаем карту в обычный вид,
  // иначе кнопка «Постройки» так и оставалась спрятанной под последнюю реплику
  if(sc >= SCRIPT.length){
    story.classList.remove('on');
    genSpeech.classList.remove('on');
    tapcatch.classList.remove('on');
    scWait = null;
    dock.classList.remove('hide');
    showFinish();
    return;
  }
  const st = SCRIPT[sc];

  // тап куда угодно листает реплику — но только там, где мы ничего не ждём.
  // Считаем до ранних выходов: на шагах генератора и уровня ловушка не нужна
  tapcatch.classList.toggle('on', !!(st.text && !st.wait));

  if(st.spawn) spawnBuilding(st.spawn);
  if(st.order) setOrder(st.order);
  // явный выход на карту — нужен только там, где обучение кончилось
  if(st.close){ closeGenerator(); ordersBox.classList.remove('on'); }
  if(st.open === 'orders')    openOrders();
  if(st.open === 'generator') openBuilding('generator');
  if(st.open === 'cafe')      openBuilding('cafe');

  // подсказка внутри открытого экрана: сама встаёт там, где не мешает
  if(st.tip){
    story.classList.remove('on');
    screenTip(st.tip);
    if(st.pointAt) setTimeout(() => pointTo(st.pointAt), 120);
    scWait = st.wait || null;
    return;
  }

  if(st.orders){ story.classList.remove('on'); return ordersStep(st.say); }
  if(st.gen){ story.classList.remove('on'); return genStep(st.gen, st.say); }
  if(st.level){ story.classList.remove('on'); return showLevel(st.level); }

  // поверх каталога показываем компактный бабл: персонаж в полный рост
  // закрыл бы карточки, в макете там аватар сверху
  const overSheet = sheet.classList.contains('on');
  if(overSheet){
    story.classList.remove('on');
    if(st.text){
      genSpeech.querySelector('img').src = '../assets/onboarding/avatar maloy-mini.png';
      genSpeech.querySelector('.b').textContent = st.text;
      // под шапкой каталога, а не поверх неё: бабл наезжал на заголовок
      genSpeech.style.top = (document.querySelector('.sheetTop').getBoundingClientRect().bottom + 12) + 'px';
      genSpeech.classList.add('on');
    } else genSpeech.classList.remove('on');
  } else {
    genSpeech.classList.remove('on');
    const whoChanged = st.who && st.who !== lastWho;
    if(st.who){
      const c = CAST[st.who];
      if(whoChanged){
        storyImg.src = c.img;
        storyName.textContent = c.name;
        storyName.className = 'name ' + c.cls;
      }
      story.querySelector('.who').style.display = '';
    } else {
      story.querySelector('.who').style.display = 'none';
    }
    lastWho = st.who || lastWho;
    storyText.textContent = st.text || '';
    // без реплики панель не показываем: пустая плашка выглядела мусором
    story.classList.toggle('on', !!st.text);
    story.classList.toggle('tap', !!st.text && !st.wait);
    if(st.text) replayStoryAnim(whoChanged);
  }

  if(st.hint) say(st.hint);
  if(st.showOldman) document.getElementById('oldman').classList.add('on');
  // Пока персонаж говорит, кнопка «Постройки» уезжает — она крупная и отвлекает.
  // Но если шаг сам показывает стрелкой на неё, прятать нельзя: жать было бы некуда.
  // В режиме размещения внизу живут ✕, поворот и «Построить» — их не трогаем.
  const pointsAtDock = st.pointAt && dock.querySelector(st.pointAt);
  dock.classList.toggle('hide', !!(st.text && !overSheet && !placing && !pointsAtDock));
  if(st.focus) focusOn(st.focus);
  if(st.pointAt) setTimeout(() => pointTo(st.pointAt), st.focus ? 700 : 60);

  scWait = st.wait || null;
  story.querySelector('.next').style.display = scWait ? 'none' : '';

  // Служебный шаг — только настроил что-то и ничего не показал. Ждать его
  // нечем и листать нечего, поэтому проматываем сами: иначе сценарий встаёт.
  if(!st.text && !st.wait && !st.hint) setTimeout(scNext, 0);
}

/* Листается тапом по всей панели — и по реплике, и по кнопке «Дальше»:
   попадать в маленький значок в углу неудобно. Кнопка остаётся как
   подсказка, что дальше вообще есть. Обработчик один на всю панель,
   иначе тап по кнопке засчитывался бы дважды.

   Шаги, которые чего-то ждут, тапом не листаются, а свежая реплика
   держит паузу: иначе случайные и повторные касания проматывали
   сразу несколько шагов. */
const STEP_GUARD_MS = 400;
const tapcatch = document.getElementById('tapcatch');

function tryAdvance(){
  if(scWait) return;
  if(Date.now() - shownAt < STEP_GUARD_MS) return;
  scNext();
}
story.addEventListener('click', tryAdvance);
tapcatch.addEventListener('click', tryAdvance);

/* ─── камера ─── */

/* Цель ставим не в центр экрана, а в центр свободного места над сюжетной
   панелью: иначе здание оказывается ровно под персонажем и репликой. */
/* «generator» и «orders» стоят под своими id, кофейню ищем по типу здания:
   её ставит человек, и id у неё случайный */
function plotOf(what){
  if(what === 'generator') return built.find(b => b.id === 'gen');
  if(what === 'cafe')      return built.find(b => b.itemId === 'coffee');
  return built.find(b => b.id === what);
}

/* Здания наводим по их записи на карте, а не по вписанным числам:
   кофейню человек ставит сам, и заранее её координат никто не знает.
   Целимся чуть выше основания — иначе в кадр лезет только фундамент. */
function focusOn(what){
  const spot = what === 'oldman' ? OLDMAN : plotOf(what);
  if(!spot) return;
  const target = what === 'oldman' ? spot : { x:spot.x, y:spot.y - 60 };
  const busy = story.classList.contains('on') ? story.offsetHeight : 0;
  const cy = Math.max(innerHeight * .3, (innerHeight - busy) / 2);
  tweenCamera({ s:minScale*4, cx:target.x, cy:target.y, sx:innerWidth/2, sy:cy });
}

/* Отъезд на общий план: выбирать место для здания в упор неудобно —
   не видно ни соседей, ни свободной земли. */
function zoomOut(){
  tweenCamera({ s:minScale*2.4, cx:HOME.x, cy:HOME.y, sx:innerWidth/2, sy:innerHeight/2 });
}

/* точку карты (cx,cy) подводим к точке экрана (sx,sy) при масштабе s */
function tweenCamera(to){
  const from = {s:scale, x:ox, y:oy};
  const end = { x: to.sx - to.cx*to.s, y: to.sy - to.cy*to.s };
  const t0 = performance.now();
  (function tick(now){
    const k = Math.min(1, (now - t0)/900);
    // разгон и торможение: чистый ease-out стартовал рывком
    const e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3)/2;
    scale = from.s + (to.s - from.s)*e;
    ox = from.x + (end.x - from.x)*e;
    oy = from.y + (end.y - from.y)*e;
    apply();
    if(k < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ─── стрелка на элемент ─── */

let pointSel = null, pointRaf = 0;

function pointTo(sel){
  pointSel = sel;
  placePoint();
  cancelAnimationFrame(pointRaf);
  (function follow(){
    if(!pointSel) return;
    placePoint();
    pointRaf = requestAnimationFrame(follow);
  })();
}

function placePoint(){
  const sel = pointSel;
  const el = sel && document.querySelector(sel);
  if(!el){ point.classList.remove('on'); return; }
  const r = el.getBoundingClientRect();
  // решаем по свободному месту: под кнопкой у нижнего края его нет,
  // и стрелка уезжала за экран
  const below = innerHeight - r.bottom > 76;
  point.textContent = below ? '⬆' : '⬇';
  point.style.left = (r.left + r.width/2 - 22) + 'px';
  point.style.top  = below ? (r.bottom + 8) + 'px' : Math.max(60, r.top - 60) + 'px';
  // цель уехала за пределы экрана — стрелку прячем
  point.classList.toggle('on', r.bottom > 0 && r.top < innerHeight);
}

function hidePoint(){ pointSel = null; cancelAnimationFrame(pointRaf); point.classList.remove('on'); }

/* ─── сценарий внутри генератора ─── */

/* Подсказка внутри любого экрана здания. На заказах садится под карточку,
   в генераторе и кофейне — над игровой зоной. */
function screenTip(text){
  if(ordersBox.classList.contains('on')) return ordersBubble(text);
  genBubble(text, false);
}

function ordersBubble(text){
  genSpeech.querySelector('img').src = '../assets/onboarding/avatar maloy-mini.png';
  genSpeech.querySelector('.b').textContent = text;
  genSpeech.classList.add('on');
  const card = ordersBox.querySelector('.card').getBoundingClientRect();
  genSpeech.style.top = Math.min(card.bottom + 56, innerHeight - genSpeech.offsetHeight - 12) + 'px';
  genDemo.classList.remove('on');
}

/* подсказка на экране заказов: бабл внизу, стрелка на кнопку отправки */
function ordersStep(say){
  ordersBubble(say || 'Отправляем заказ');
  setTimeout(() => pointTo('#orders .send'), 120);
}

function genStep(kind, say){
  if(kind === 'seed'){
    genBubble(say || 'Сажай зерно сразу во все грядки!', true);
    genWait = 'allSeeded';
  } else if(kind === 'boost'){
    genBubble(say || 'Ждать не обязательно, можно ускорить!', false);
    showBoostTip();
    genWait = 'boosted';
  }
}

/* ─── что ждём ─── */

function scFire(ev){
  if(scWait === ev){ scWait = null; scNext(); }
}


/* ═══ подсказки внутри генератора ═══
   Пунктир и стрелки из статичного макета не рисуем: движущегося
   зерна с рукой достаточно, путь читается по самому движению. */

const genSpeech = document.getElementById('genSpeech');
const genDemo   = document.getElementById('genDemo');
const boostTip  = document.getElementById('boostTip');
const levelBox  = document.getElementById('level');
let genWait = null, reseedTimer = null, boostTimer = null;

/* Бабл встаёт над игровой зоной, а не поверх неё: цепляемся за самый
   верхний её блок — сцену, если она есть, иначе сетку. Выше остаётся
   только заголовок, его перекрыть не жалко. */
function genBubble(text, withDemo){
  genSpeech.querySelector('img').src = '../assets/onboarding/avatar maloy-mini.png';
  genSpeech.querySelector('.b').textContent = text;
  genSpeech.classList.add('on');

  const host = document.querySelector(genHost);
  const hero = host.querySelector('#hero');
  const anchor = (hero && hero.innerHTML.trim()) ? hero : host.querySelector('.block');
  if(anchor){
    // от игровой зоны отступаем заметно: вплотную бабл читался как её часть
    const top = anchor.getBoundingClientRect().top - genSpeech.offsetHeight - 34;
    genSpeech.style.top = Math.max(50, top) + 'px';
  }
  if(withDemo) drawGenDemo(); else genDemo.classList.remove('on');
}
function hideGenHint(){
  clearTimeout(reseedTimer);
  genSpeech.classList.remove('on');
  genDemo.classList.remove('on');
}

/* зерно едет от лотка через весь ряд — путь невидимый, виден только жест */
function drawGenDemo(){
  const cells = [...document.querySelectorAll(genHost + ' .cell')];
  const src = document.querySelector(genHost + ' .seed:not(.locked)');
  if(!src || !cells.length) return;
  const rs = src.getBoundingClientRect();
  const f = cells[0].getBoundingClientRect();
  const l = cells[cells.length-1].getBoundingClientRect();
  const x0 = rs.left + rs.width/2, y0 = rs.top + rs.height/2;
  const y = f.top + f.height/2;
  const x1 = f.left + f.width/2, x2 = l.left + l.width/2;
  const d = `M ${x0} ${y0} C ${x0-60} ${y0-120}, ${x1-60} ${y+120}, ${x1} ${y} L ${x2} ${y}`;
  // тащим то, что реально лежит в лотке: в генераторе зерно, в кофейне чашку
  const icon = src.querySelector('img')?.src || '../assets/imgcoffe.png';
  genDemo.innerHTML = `<div class="runner" style="offset-path:path('${d}')">
      <img src="${icon}" alt=""></div>`;
  genDemo.classList.add('on');
}

/* подсказка уходит, только когда реально взяли зерно из лотка */
// слушаем весь экран здания: грядок теперь двое — генератор и кофейня
screen.addEventListener('pointerdown', e => {
  if(genWait && e.target.closest('.seed:not(.locked)')) hideGenHint();
});

function showBoostTip(){
  const cells = [...document.querySelectorAll(genHost + ' .cell')];
  const mid = cells[Math.floor(cells.length/2)];
  if(!mid) return;
  const r = mid.getBoundingClientRect();
  boostTip.style.left = (r.left + r.width/2) + 'px';
  boostTip.style.top  = (r.bottom + 14) + 'px';
  boostTip.classList.add('on');
  tickBoost();
}

/* время в тултипе — настоящее, из самой долгой грядки: подписанные
   «29 сек» рядом с живым прогрессом сразу выдавали заглушку */
function tickBoost(){
  clearInterval(boostTimer);
  const time = boostTip.querySelector('.time');
  const draw = () => {
    const ends = activeGen.cells().filter(c => c.state === 'growing').map(c => c.endsAt);
    const left = ends.length ? Math.ceil((Math.max(...ends) - Date.now())/1000) : 0;
    time.textContent = left > 0 ? `🕐 ещё ${left} сек` : '🕐 готово';
    if(left <= 0) clearInterval(boostTimer);
  };
  draw();
  boostTimer = setInterval(draw, 500);
}

/* Ускорил — зёрна улетают, и мы сразу возвращаемся на карту: держать
   человека на пустых грядках нечем, а уровень читается лучше на фоне
   фермы, чем поверх служебного экрана. Дальше уровень, потом наезд камеры. */
boostTip.querySelector('.boost').addEventListener('click', () => {
  boostTip.classList.remove('on');
  clearInterval(boostTimer);
  hideGenHint();
  flyAwayBeans();
  const cells = [...document.querySelectorAll(genHost + ' .cell')];
  activeGen.setCells(cells.map((_, i) => ({ index:i, state:'empty' })));
  genWait = null;
  // Обычно экран уходит сам. Но сценарий может попросить остаться —
  // тогда дальше человека уводят подсказкой и стрелкой на выход.
  const stay = !!SCRIPT[sc]?.stay;
  setTimeout(() => {
    if(!stay) closeGenerator();
    setTimeout(scNext, stay ? 60 : 380);
  }, 620);
});

/* урожай улетает вверх-вправо за экран, а не просто исчезает:
   в генераторе это зёрна, в кофейне — готовый американо */
function flyAwayBeans(){
  // берём координаты ячейки, а не картинки внутри: у неё размер может быть нулевым
  document.querySelectorAll(genHost + ' .cell').forEach((cell, i) => {
    const img = cell.querySelector('img');
    if(!img || img.hidden) return;
    const r = cell.getBoundingClientRect();
    if(!r.width) return;
    const fly = document.createElement('img');
    fly.src = img.src;
    fly.className = 'flyaway';
    fly.style.left = (r.left + r.width/2 - 22) + 'px';
    fly.style.top  = (r.top + r.height/2 - 22) + 'px';
    fly.style.animationDelay = (i * 55) + 'ms';
    document.body.appendChild(fly);
    setTimeout(() => fly.remove(), 1400);
  });
}

/* Что открывается на каждом уровне. Второй даёт кофейню и американо,
   третий — доску заказов: ровно то, к чему сюжет ведёт дальше. */
const LEVELS = {
  2: ['<img src="../assets/map/Cafe.png" alt="">', '☕'],
  3: ['<img src="../assets/map/building-order board.png" alt="">', '📦'],
  4: ['<img src="../assets/map/building-barn.png" alt="">',
      '<img src="../assets/map/building-generator.png" alt="">'],
};

/* уровень показываем уже на карте — экран здания к этому моменту закрыт */
function showLevel(n){
  hideGenHint();
  levelBox.querySelector('.medal span').textContent = n;
  levelBox.querySelector('.items').innerHTML =
    (LEVELS[n] || []).map(h => `<div>${h}</div>`).join('');
  levelBox.classList.add('on');
  setTimeout(confetti, 420);        // сыплется под самый выезд медали
}

/* Здание, которое даёт сам сюжет: доску заказов не покупают, её открывает
   третий уровень. Места подобраны по карте — там сплошная трава под всё
   основание. Берём первое, куда человек не поставил свою постройку. */
const SPAWNS = {
  orders:{ itemId:'orders', spots:[[1598,985],[1582,1094],[1137,960]] },
};

function spawnBuilding(kind){
  if(built.some(b => b.id === kind)) return;
  const cfg = SPAWNS[kind];
  const free = cfg.spots.find(([x,y]) =>
    !built.some(b => Math.abs(b.x - x) < 140 && Math.abs(b.y - y) < 75)) || cfg.spots[0];
  built.push({ id:kind, itemId:cfg.itemId, state:'ready', order:true, x:free[0], y:free[1] });
  paintAll(kind);
  save();
}

// забрал награду — экран уходит, и только потом камера едет к деду.
// «Закрыть» ведёт туда же: тупика на этом экране быть не должно
levelBox.addEventListener('click', e => {
  if(!e.target.closest('.take, .close')) return;
  levelBox.classList.remove('on');
  setTimeout(scNext, 340);
});

/* засеял весь ряд — сразу тултип ускорения, ждать не заставляем.
   Засеял не всё и отпустил — подсказку возвращаем: раньше она пропадала
   при первом же касании лотка и человек оставался без объяснений. */
function onCellsChanged(st){
  if(genWait !== 'allSeeded') return;
  if(st.empty === 0){ genWait = null; return scNext(); }
  clearTimeout(reseedTimer);
  reseedTimer = setTimeout(() => {
    const left = activeGen.stats().empty;
    if(genWait === 'allSeeded' && left > 0) genBubble(`Осталось засеять ещё ${left}`, true);
  }, 700);
}
gen0.on('change', onCellsChanged);
cafeGen.on('change', onCellsChanged);

/* Финальная спасибка: прогон закончен, дальше свободная игра. */
const finishBox = document.getElementById('finish');
/* «Готово» отпускает человека в свободную игру: карта остаётся как есть,
   со всем построенным, здания открываются обычным тапом. */
finishBox.querySelector('.done').addEventListener('click', () => finishBox.classList.remove('on'));
function showFinish(){
  finishBox.classList.add('on');
  setTimeout(confetti, 400);
}
/* Кот на финальном экране. Файла может ещё не быть, поэтому перебираем
   расширения по очереди, а если не нашлось ни одного, показываем эмодзи.
   Достаточно положить картинку в assets/onboarding/cat.png и она подхватится. */
(function pickCat(names){
  const img = finishBox.querySelector('img.pic');
  if(!img) return;
  if(!names.length){
    img.replaceWith(Object.assign(document.createElement('div'),
      { className:'pic none', textContent:'\u{1F63A}' }));
    return;
  }
  img.onerror = () => pickCat(names.slice(1));
  img.src = '../assets/onboarding/' + names[0];
})(['cat.png','cat.jpg','cat.jpeg','cat.webp']);

/* прототип всегда стартует с начала истории — и мир вместе с ней */
resetWorld();

/* наружу отдаём только ручки для отладки и прогонов */
return { gen:gen0, cafe:cafeGen, level:levelBox, finish:finishBox, story, dock, point,
         step:() => sc, script:SCRIPT };
};
