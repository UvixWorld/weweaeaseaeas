'use strict';

// ============================================================
//  CONSTANTS
// ============================================================
const CLASSES   = ['Боец','Снайпер','Кидатель','Танк','Убийца','Целитель','Маг','Мех','Зверь','Легенда'];
const CICONS    = ['🥊','🎯','💣','🛡️','🗡️','💚','🔮','🤖','🐾','⭐'];
const RARITIES  = ['Обычный','Редкий','Эпик','Легендарный'];
const RCOLS     = ['#7788aa','#44aaff','#cc44ff','#ffaa00'];
const CBGS      = [
  ['#3a1208','#ff4400'],['#0a2a0a','#44cc44'],['#2a1a00','#ffaa00'],
  ['#081a30','#4488cc'],['#1a0030','#aa44ff'],['#1a2800','#88ff44'],
  ['#200a30','#dd44ff'],['#102030','#44aacc'],['#2a1800','#cc8833'],['#1a1030','#ffcc00']
];

// W_R — world radius
const W_R = 48;
const ZONE_SHRINK_DUR = 180;
const ZONE_START = 44;
const ZONE_END   = 5;

// ============================================================
//  CHARS: [name, classIdx, rarity, colorHex, hp, speed, dmg, range, atkSpd, superName, superDesc]
//  NOTE: speed is now tiles/sec (will be multiplied by 4.5 in movement)
//        range is in world units
// ============================================================
const CHARS = [
  // Brawler (0) — 3-bullet 35° cone, range 9
  ['Ironjaw',    0,0,0xe04428,3500,2.8,140,9, 1.0,'Стальной Рывок',   'Рвётся вперёд, сметая всех — 500 урона'],
  ['Stonefist',  0,0,0xa07850,3800,2.6,150,8, 0.9,'Удар Камня',       'Удар по земле — оглушает ближних на 1.5с'],
  ['Berserker',  0,1,0xcc2200,3200,3.1,160,9, 1.1,'Берсерк',          '+50% скорости и урона на 4 секунды'],
  ['Crusher',    0,1,0x884422,4200,2.4,170,8, 0.8,'Сейсмоволна',      'Волна отбрасывает всех врагов в радиусе 8'],
  ['Rampage',    0,1,0xff4400,3000,3.3,155,9, 1.2,'Огненный Рывок',   'Оставляет огненный след при рывке — 2с'],
  ['Battleborn', 0,2,0xff5500,4500,2.8,180,9, 0.9,'Боевой Клич',      'Союзники получают +30% урона на 5с'],
  ['Warpunch',   0,2,0xdd3300,3600,3.0,175,9, 1.0,'Варп-Удар',        'Телепортируется к цели — 800 урона'],
  ['Titan',      0,2,0x883300,5500,2.2,200,8, 0.7,'Ярость Титана',    'Удваивает размер и урон на 5 секунд'],
  ['Grimhand',   0,3,0xaa3300,4800,3.0,210,9, 0.9,'Захват Смерти',    'Притягивает всех врагов и ударяет'],
  ['Forgeborn',  0,3,0xff7700,5000,2.8,220,9, 0.8,'Кулак Пламени',    'Заряжает кулак 1с — 1200 урона'],

  // Sniper (1) — single piercing, range 22, reload 2.5s
  ['Viper',      1,0,0x44aa44,2800,2.9,800,22,0.38,'Пронизывающий',    'Три мгновенных пирсинг-выстрела'],
  ['Crosswind',  1,0,0x88bb44,2900,3.1,820,21,0.38,'Ветровой Удар',    'Рикошетная пуля отскакивает 3 раза'],
  ['Phantom',    1,1,0x226622,2600,3.3,850,23,0.36,'Призрачный',       'Невидимость 3с, следующий выстрел 2x'],
  ['Rifthawk',   1,1,0x44cc66,2750,3.0,840,22,0.37,'Разломный Болт',   'Открывает разлом — все пули через него 3с'],
  ['Longshot',   1,1,0x66aa22,3000,2.9,900,26,0.33,'Дальний Выстрел',  'Мгновенный выстрел через всю карту'],
  ['Ghosteye',   1,2,0x88ff44,2500,3.5,920,24,0.34,'Истинное Видение', 'Видит скрытых врагов 6с'],
  ['Steelshot',  1,2,0xaabb66,3100,3.0,880,23,0.36,'Бронебой',         'Игнорирует 50% защиты цели'],
  ['Pinpoint',   1,2,0x22cc44,2800,3.2,950,23,0.33,'Метка',            'Помечает цель — 2x урон на 4с'],
  ['Eclipse',    1,3,0x006633,3200,3.3,1000,25,0.28,'Затмение',         'Пуля-чёрная дыра притягивает врагов'],
  ['Razorwind',  1,3,0x44ff88,2900,3.8,980,24,0.30,'Ураган Лезвий',    '20 пуль по всей арене'],

  // Thrower (2) — lobbed AOE
  ['Bombette',   2,0,0xff9900,3200,2.5,400,12,0.5,'Гигабомба',         'Огромная бомба 4x радиус взрыва'],
  ['Lobster',    2,0,0xff6644,3000,2.7,380,13,0.55,'Кассетная',         '6 мини-бомб по области'],
  ['Grenadier',  2,1,0xffbb00,3400,2.6,420,12,0.50,'Веер Гранат',       '3 гранаты в разные стороны'],
  ['Splashdown', 2,1,0xff8833,3100,2.9,400,13,0.55,'Зона Плеска',       'Лужа урона на 4 секунды'],
  ['Pyrocrank',  2,1,0xff5500,3300,2.5,440,12,0.48,'Огненная Дуга',     'Огненная дуга от взрыва'],
  ['Fizzle',     2,2,0xffcc00,3600,2.6,460,12,0.50,'Шипучая Бомба',     'Невидимая бомба с задержкой 1с'],
  ['Barrelroll', 2,2,0xee8800,3700,2.5,480,12,0.46,'Бочки',             'Бочки катятся в 4 стороны'],
  ['Toxidrop',   2,2,0x88cc00,3300,2.7,450,13,0.50,'Кислотный Дождь',   'Яд замедляет врагов на 5с'],
  ['Flintlock',  2,3,0xff9933,3800,2.6,540,13,0.44,'Напалм',            'Зажигает область огнём на 6с'],
  ['Boomcloud',  2,3,0xffaa00,4000,2.5,560,13,0.42,'Авиаудар',          'Серия взрывов по всей карте'],

  // Tank (3) — shotgun 5 pellets, range 5
  ['Fortress',   3,0,0x6688aa,7000,2.2,200,5, 0.9,'Стена Щита',       'Неуязвимость 2 секунды'],
  ['Ironwall',   3,0,0x8899bb,6800,2.3,190,5, 0.95,'Железная Защита',  'Каменная стена блокирует пули 5с'],
  ['Behemoth',   3,1,0x4466aa,8000,1.9,220,5, 0.8,'Дрожь Земли',      'Оглушает всех в радиусе 7'],
  ['Colossus',   3,1,0x3355aa,9000,1.8,240,4, 0.7,'Прыжок-Удар',      'Прыгает — 600 AOE урона'],
  ['Bulwark',    3,1,0x5577cc,7500,2.0,210,5, 0.85,'Укрепление',       'Стоит 4с — 70% меньше урона'],
  ['Rampart',    3,2,0x2244bb,9500,1.9,250,4, 0.7,'Пролом',            'Прорывается сквозь препятствия'],
  ['Goliath',    3,2,0x334499,10500,1.7,280,4,0.6,'Гигантский Удар',   'Заряжает 1.5с — 1500 урона'],
  ['Bastion',    3,2,0x4488dd,8500,2.0,240,5, 0.75,'Последний Рубеж',  'При низком HP: 3с неуязвимость + 2x'],
  ['Shieldwall', 3,3,0x1133cc,11000,1.8,300,4,0.6,'Непробиваемый',     '3с неуязвимость + рывок'],
  ['Mountainback',3,3,0x6699ee,12000,1.7,320,4,0.55,'Лавина',          'Валуны во всех 8 направлениях'],

  // Assassin (4) — 2 fast shots, range 6
  ['Shadowblade',4,0,0x8833cc,2400,4.2,300,6, 1.8,'Шаг Тени',         'Телепорт к врагу + 2x урон'],
  ['Quickstrike',4,0,0xaa44dd,2200,4.6,280,6, 2.0,'Шквал',            '6 ударов за 0.8 секунды'],
  ['Venom',      4,1,0x66aa00,2500,4.4,320,6, 1.7,'Ядовитый Рывок',   'Рывок с ядом — 3 секунды'],
  ['Nightclaw',  4,1,0x440088,2100,5.0,340,5, 2.0,'Ночной Удар',      'Невидимость + тройной урон'],
  ['Slipknife',  4,1,0x9944cc,2300,4.8,330,6, 1.9,'Удар в спину',     'Телепорт за спину + 500 урона'],
  ['Darkflash',  4,2,0x6600cc,2500,5.2,360,6, 1.7,'Тёмная Вспышка',   'Создаёт 3 обманки'],
  ['Razorpetal', 4,2,0xcc44aa,2200,4.9,370,7, 1.8,'Лезвия Бури',      '12 лезвий вращаются вокруг 3с'],
  ['Blinkblade', 4,2,0xaa00ff,2400,5.5,380,6, 1.7,'Мигающий Клинок',  '4 мгновенных рывка'],
  ['Frostclaw',  4,3,0x4488cc,2600,5.0,420,6, 1.6,'Морозный Взрыв',   'Замораживает ближних на 1.5с'],
  ['Swiftreaper',4,3,0xcc00aa,2400,5.8,440,6, 1.5,'Танец Смерти',     'Вращается — задевает всех вокруг'],

  // Healer (5) — slow healshot
  ['Luminary',   5,0,0xffee88,3200,3.0,180,9, 1.1,'Вспышка Исцеления','Мгновенно восстанавливает 2000 HP'],
  ['Mender',     5,0,0xeedd66,3400,2.9,170,8, 1.0,'Зона Лечения',     'Создаёт область лечения 300 HP/с на 4с'],
  ['Brightspring',5,1,0xffdd44,3600,3.1,190,9, 1.0,'Прилив Сил',      'Лечит союзников в радиусе 8 на 1500'],
  ['Soulweave',  5,1,0xffaacc,3300,3.2,200,10,0.95,'Связь Душ',       'Связь с союзником: делит урон 5с'],
  ['Verdance',   5,1,0x88ff88,3700,3.0,185,9, 1.0,'Природное Лечение','Грибы лечения 250 HP/с'],
  ['Glowmist',   5,2,0xaaffee,3500,3.1,210,10,0.95,'Туман Свечения',  'Лечебный туман замедляет врагов 40%'],
  ['Sanctify',   5,2,0xffffaa,3800,3.0,220,10,0.90,'Освящение',       'Неуязвимость + лечение 500 HP/с 3с'],
  ['Thornwarden',5,2,0x88ff44,4000,2.8,230,9, 0.85,'Шипастая Аура',   'Шипы: 80 урон/с атакующим'],
  ['Moonpulse',  5,3,0xaaccff,3600,3.2,250,10,0.85,'Лунная Волна',    'AOE луч лечит 3000 HP'],
  ['Dawnblossom',5,3,0xffcc88,4200,3.0,260,10,0.80,'Цветок Рассвета', 'Выживает одну смерть за матч'],

  // Mage (6) — 2 bouncing orbs
  ['Pyrostar',   6,0,0xff4422,2900,3.0,320,10,0.8,'Огненный Шар',    'Огромный шар: 600 урона AOE 3'],
  ['Vortexia',   6,0,0x4466ff,3000,2.9,300,11,0.85,'Вихрь',          'Притягивает всех в точку'],
  ['Frostwhirl', 6,1,0x66ccff,3100,3.1,340,10,0.75,'Морозная Звезда', 'Замораживает всех в радиусе 6 на 2с'],
  ['Thundercrux',6,1,0xffff00,2900,3.2,360,11,0.72,'Цепная Молния',  'Молния бьёт до 4 врагов цепью'],
  ['Netherflame',6,1,0xaa22ff,3000,3.0,350,10,0.75,'Тёмный Болт',    'Уничтожает вражеские снаряды'],
  ['Arcanova',   6,2,0xee88ff,3200,3.1,380,11,0.70,'Аркановый Взрыв','8 болтов во все стороны'],
  ['Emberstrike',6,2,0xff6633,3100,3.0,400,10,0.70,'Шторм Углей',    '12 огненных шаров по области'],
  ['Riftwitch',  6,2,0x8800ff,3000,3.2,390,11,0.68,'Портал Разлома', 'Телепортирует ближних врагов'],
  ['Solarflare', 6,3,0xffaa00,3400,3.0,450,12,0.62,'Солнечная Вспышка','Луч через всю карту'],
  ['Stormweave', 6,3,0x4499ff,3500,3.1,480,12,0.58,'Шторм-Ткач',     'Облако бури 200 урон/с 5с'],

  // Mech (7) — 3-shot burst, range 11
  ['Model-7',    7,0,0x88aacc,3600,2.6,160,11,1.2,'Форсаж',          'Удваивает скорострельность 4с'],
  ['Protocore',  7,0,0x66aaee,3400,2.7,155,11,1.3,'Ядро-Лазер',      'Луч 800 урона сквозь всех'],
  ['Exoframe',   7,1,0x4499bb,4000,2.5,170,11,1.1,'Экзо-Щит',        '2.5с щит + контрудар'],
  ['Gearhead',   7,1,0xaabb88,3700,2.7,165,10,1.2,'Шестерни',        '4 вращающихся шестерни'],
  ['Axiom',      7,1,0x8899cc,3800,2.6,175,11,1.1,'Аксиом-Импульс',  'ЭМП: отключает суперы на 3с'],
  ['Ironlink',   7,2,0x6688bb,4400,2.5,190,11,1.0,'Железная Цепь',   'Тянет ближайшего врага'],
  ['Nullbot',    7,2,0x9988aa,4100,2.7,195,11,1.0,'Нуль-Поле',       'Блокирует суперы в радиусе 4с'],
  ['Overclocked',7,2,0xbbddff,3800,3.3,200,11,1.1,'Оверклок',        '4с: 3x скорость и скорострельность'],
  ['Synthwave',  7,3,0x44ccff,4200,3.0,230,11,1.0,'Синт-Взрыв',      '4 турели орбитируют 4с'],
  ['Titanfall',  7,3,0x5566bb,4800,2.6,250,11,0.9,'Падение Титана',  'Мех-дроп: 800 AOE урона'],

  // Beast (8) — 4-spread claw shots, range 7
  ['Razorfang',  8,0,0xcc6600,3800,3.7,200,7, 1.1,'Прыжок Когтей',   'Прыжок на врага: 500 урона'],
  ['Wildmaw',    8,0,0xaa5500,3600,3.9,190,7, 1.2,'Дикий Укус',      'Укус: 600 + оглушение 1с'],
  ['Thornback',  8,1,0x448822,4000,3.5,210,7, 1.0,'Шипы во Все Стороны','12 шипов вокруг'],
  ['Grimclaw',   8,1,0x664422,3900,3.7,220,7, 1.1,'Мрачная Коса',    'Удар когтями 240° — 400 урона'],
  ['Frostpelt',  8,1,0x66aacc,3700,3.9,215,7, 1.1,'Ледяной Вой',     'Вой замораживает в радиусе 8'],
  ['Venomfang',  8,2,0x44aa44,4200,3.6,240,7, 1.0,'Ядовитый Укус',   'Отравляет цель: 150 урон/с 5с'],
  ['Stormclaw',  8,2,0xaabb00,4000,4.1,250,7, 1.0,'Громовые Когти',  'Молниеносные когти нескольких врагов'],
  ['Darkprowl',  8,2,0x334422,4300,3.8,260,7, 0.95,'Тёмная Охота',   'Постоянная невидимость в кустах'],
  ['Embermane',  8,3,0xff6600,4600,4.1,300,7, 0.9,'Огненный Рёв',    'Конус огня 200 урон/с 3с'],
  ['Skywraith',  8,3,0x88aaff,4000,4.8,320,9, 0.85,'Небесный Пикет', 'Взлетает и пикирует — 800 AOE'],

  // Legend (9) — 1 massive slow orb
  ['Starlord',   9,3,0xffeebb,5000,3.5,600,14,0.55,'Звёздный Взрыв', '8 осколков во все стороны'],
  ['Voidborn',   9,3,0x3311aa,5200,3.3,650,13,0.52,'Разлом Пустоты', 'Поглощает все пули рядом'],
  ['Etherion',   9,3,0x88ffee,4800,3.7,620,14,0.54,'Эфирная Волна',  'Отталкивает всех с огромной силой'],
  ['Cosmara',    9,3,0xff88cc,5100,3.4,660,13,0.50,'Космический Взрыв','1200 урона всем видимым врагам'],
  ['Dawnbreak',  9,3,0xffdd44,5500,3.3,700,13,0.48,'Удар Рассвета',   'Луч: оглушение + 800 урона'],
  ['Soulgrave',  9,3,0x880044,5300,3.5,720,13,0.48,'Похищение Души',  'Крадёт 30% максимального HP'],
  ['Tempestus',  9,3,0x44aaff,5400,3.7,740,14,0.46,'Буря',            'Все враги хаотично разлетаются'],
  ['Infinara',   9,3,0xff44ff,5100,3.9,760,14,0.44,'Луч Бесконечности','Непрерывный луч вращается 360°'],
  ['Nullvoid',   9,3,0x777788,5700,3.3,800,13,0.42,'Нуль-Удар',       'Игнорирует любую защиту'],
  ['Apex',       9,3,0xffa500,6000,3.9,900,14,0.38,'Апекс-Новая',     'Метеор 1500 урона в цель'],
];

// Attack configs per class
const ATKCONF = [
  {type:'spread',  bullets:3, spread:.28, speed:18, range:9,  reloadTime:1.0, size:.15},            // 0 Brawler
  {type:'snipe',   bullets:1, spread:0,   speed:30, range:22, reloadTime:2.5, size:.12, pierce:true},// 1 Sniper
  {type:'lob',     bullets:1, spread:0,   speed:0,  range:13, reloadTime:2.2, size:.35, fuseTime:1.5, aoe:2.5},// 2 Thrower
  {type:'shotgun', bullets:5, spread:.55, speed:16, range:5,  reloadTime:1.1, size:.16},            // 3 Tank
  {type:'dual',    bullets:2, spread:.12, speed:22, range:7,  reloadTime:0.5, size:.13},            // 4 Assassin
  {type:'healshot',bullets:1, spread:.1,  speed:14, range:10, reloadTime:1.0, size:.16, healOnHit:80},// 5 Healer
  {type:'orb',     bullets:2, spread:.25, speed:15, range:12, reloadTime:1.1, size:.20, bounce:1},  // 6 Mage
  {type:'burst3',  bullets:3, spread:.08, speed:20, range:11, reloadTime:1.1, size:.13, burstDelay:.1},// 7 Mech
  {type:'claw',    bullets:4, spread:.45, speed:17, range:7,  reloadTime:0.95,size:.15},            // 8 Beast
  {type:'powershot',bullets:1,spread:0,  speed:12, range:14, reloadTime:1.6, size:.38, dmgMult:2.2},// 9 Legend
];

// ============================================================
//  UTILITY
// ============================================================
const rand   = (a,b) => a + Math.random() * (b - a);
const clamp  = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp   = (a,b,t) => a + (b - a) * t;
function rot2D(v,a){ return {x:v.x*Math.cos(a)-v.z*Math.sin(a), z:v.x*Math.sin(a)+v.z*Math.cos(a)}; }
function hex3(h){ return new THREE.Color(h); }
function worldToScreen(worldPos, cam){
  const v = worldPos.clone();
  v.project(cam);
  return {
    x: ((v.x + 1) / 2) * window.innerWidth,
    y: ((-v.y + 1) / 2) * window.innerHeight,
    visible: v.z < 1
  };
}

// ============================================================
//  CHARACTER MODEL FACTORY
// ============================================================
function makeCharMesh(classIdx, colorHex, scale=1){
  const g = new THREE.Group();
  const col = hex3(colorHex);
  const dark = new THREE.Color(colorHex).multiplyScalar(.35);
  function mat(c,rough=.6,metal=.15,emissI=0){
    const m = new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
    if(emissI>0){m.emissive=new THREE.Color(c);m.emissiveIntensity=emissI;}
    return m;
  }
  if(classIdx===0){
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.4,.9),mat(col,.7,.1));body.position.y=.7;
    const head=new THREE.Mesh(new THREE.BoxGeometry(.85,.75,.8),mat(col,.6,.1));head.position.y=1.68;
    const gloveL=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),mat(new THREE.Color(.8,.1,.05)));gloveL.position.set(-1.1,.7,.15);
    const gloveR=gloveL.clone();gloveR.position.x=1.1;
    g.add(body,head,gloveL,gloveR);
  } else if(classIdx===1){
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.38,.44,1.5,8),mat(col,.5,.3));body.position.y=.75;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),mat(col,.5,.2));head.position.y=1.7;
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1.3,6),mat(new THREE.Color(.15,.15,.15),.4,.9));
    barrel.rotation.x=Math.PI/2;barrel.position.set(0,.85,.85);
    g.add(body,head,barrel);
  } else if(classIdx===2){
    const body=new THREE.Mesh(new THREE.SphereGeometry(.6,10,8),mat(col,.65,.1));body.scale.set(1,1.15,1);body.position.y=.65;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.44,10,8),mat(col,.6,.1));head.position.y=1.6;
    const bomb=new THREE.Mesh(new THREE.SphereGeometry(.22,8,7),mat(new THREE.Color(.08,.08,.08)));bomb.position.set(1.1,.75,.35);
    g.add(body,head,bomb);
  } else if(classIdx===3){
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.45,1.0,1.1),mat(col,.5,.5));body.position.y=.5;
    const head=new THREE.Mesh(new THREE.BoxGeometry(.95,.7,.9),mat(col,.5,.4));head.position.y=1.35;
    const cannon=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.55,8),mat(dark,.4,.7));cannon.rotation.x=Math.PI/2;cannon.position.set(0,.65,.75);
    g.add(body,head,cannon);
  } else if(classIdx===4){
    const body=new THREE.Mesh(new THREE.BoxGeometry(.65,1.45,.55),mat(col,.3,.55));body.position.y=.73;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.34,8,7),mat(col,.2,.55));head.position.y=1.66;
    const blL=new THREE.Mesh(new THREE.BoxGeometry(.08,.82,.06),mat(new THREE.Color(.8,.9,1),0,.9,.8));blL.position.set(-.42,.7,.22);blL.rotation.z=.25;
    const blR=blL.clone();blR.position.x=.42;blR.rotation.z=-.25;
    g.add(body,head,blL,blR);
  } else if(classIdx===5){
    const body=new THREE.Mesh(new THREE.SphereGeometry(.58,12,10),mat(col,.2,.1,.4));body.position.y=.8;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),mat(col,.2,.1,.35));head.position.y=1.62;
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.75,.065,6,24),mat(col,.1,.2,.6));halo.position.y=1.85;halo.rotation.x=.25;
    g.add(body,head,halo);
  } else if(classIdx===6){
    const body=new THREE.Mesh(new THREE.IcosahedronGeometry(.58,0),mat(col,.2,.2,.3));body.position.y=1.0;
    const hat=new THREE.Mesh(new THREE.ConeGeometry(.5,.95,6),mat(dark,.8,.0));hat.position.y=2.0;
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.1,12),mat(dark,.8,.0));brim.position.y=1.58;
    g.add(body,hat,brim);
  } else if(classIdx===7){
    const torso=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.25,.82),mat(col,.3,.75));torso.position.y=.63;
    const head=new THREE.Mesh(new THREE.BoxGeometry(.72,.62,.68),mat(dark,.2,.85));head.position.y=1.52;
    const eyeL=new THREE.Mesh(new THREE.BoxGeometry(.22,.13,.05),mat(new THREE.Color(.5,1,1),0,.2,1.5));eyeL.position.set(-.17,1.54,.36);
    const eyeR=eyeL.clone();eyeR.position.x=.17;
    g.add(torso,head,eyeL,eyeR);
  } else if(classIdx===8){
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.25,.85,1.05),mat(col,.85,.0));body.position.set(0,.38,.08);body.rotation.x=.15;
    const head=new THREE.Mesh(new THREE.BoxGeometry(.78,.68,.9),mat(col,.85,.0));head.position.set(0,.92,.55);
    const earL=new THREE.Mesh(new THREE.ConeGeometry(.19,.42,4),mat(col,.8,.0));earL.position.set(-.3,1.35,.45);
    const earR=earL.clone();earR.position.x=.3;
    g.add(body,head,earL,earR);
  } else {
    const body=new THREE.Mesh(new THREE.OctahedronGeometry(.65,0),mat(col,.1,.3,.4));body.position.y=.95;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.42,12,10),mat(col,.1,.2,.35));head.position.y=1.85;
    const wL=new THREE.Mesh(new THREE.ConeGeometry(.45,1.05,3),mat(col,.1,.2,.5));wL.position.set(-.88,1.2,0);wL.rotation.z=Math.PI*.28;
    const wR=wL.clone();wR.position.x=.88;wR.rotation.z=-Math.PI*.28;
    g.add(body,head,wL,wR);
  }
  // Eyes
  if(classIdx!==7&&classIdx!==8){
    const eyeM=new THREE.MeshStandardMaterial({color:0xffffff,emissive:new THREE.Color(1,1,1),emissiveIntensity:2,roughness:.1});
    const eg=new THREE.SphereGeometry(.085,6,5);
    const eL=new THREE.Mesh(eg,eyeM);eL.position.set(-.16,1.65,.38);
    const eR=new THREE.Mesh(eg,eyeM);eR.position.set(.16,1.65,.38);
    g.add(eL,eR);
  }
  // Shadow
  const shad=new THREE.Mesh(new THREE.CircleGeometry(.68,18),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.38,depthWrite:false}));
  shad.rotation.x=-Math.PI/2;shad.position.y=.01;g.add(shad);
  // Glow ring
  const glow=new THREE.Mesh(new THREE.RingGeometry(.5,.72,24),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));
  glow.rotation.x=-Math.PI/2;glow.position.y=.02;glow.userData.isGlow=true;g.add(glow);
  g.scale.setScalar(scale);
  return g;
}
