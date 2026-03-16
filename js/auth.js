'use strict';

let currentUser = null;

function saveSession(u){ localStorage.setItem('ba_user', JSON.stringify(u)); }
function loadSession(){ return JSON.parse(localStorage.getItem('ba_user')||'null'); }
function getAccounts(){ return JSON.parse(localStorage.getItem('ba_accounts')||'{}'); }
function saveAccounts(a){ localStorage.setItem('ba_accounts', JSON.stringify(a)); }

function authTab(tab){
  document.getElementById('tab-login').classList.toggle('on', tab==='login');
  document.getElementById('tab-reg').classList.toggle('on', tab==='reg');
  document.getElementById('auth-login').style.display = tab==='login'?'':'none';
  document.getElementById('auth-reg').style.display   = tab==='reg'  ?'':'none';
}

function doRegister(){
  const name  = document.getElementById('reg-name').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const err   = document.getElementById('reg-err');
  err.textContent = '';
  if(name.length < 2 || name.length > 16){ err.textContent='Имя: 2–16 символов'; return; }
  if(pass.length < 4){ err.textContent='Пароль минимум 4 символа'; return; }
  if(pass !== pass2){ err.textContent='Пароли не совпадают'; return; }
  const accs = getAccounts();
  if(accs[name.toLowerCase()]){ err.textContent='Это имя уже занято'; return; }
  const user = { name, trophies:0, coins:150, gems:20, xp:0, xpMax:1000, selectedChar:0,
                 quests: generateQuests() };
  accs[name.toLowerCase()] = { ...user, pw: btoa(pass) };
  saveAccounts(accs);
  loginUser(user);
}

function doLogin(){
  const name = document.getElementById('login-name').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err  = document.getElementById('login-err');
  err.textContent = '';
  const accs = getAccounts();
  const acc  = accs[name.toLowerCase()];
  if(!acc){ err.textContent='Аккаунт не найден'; return; }
  if(acc.pw !== btoa(pass)){ err.textContent='Неверный пароль'; return; }
  loginUser(acc);
}

function doGuest(){
  const user = { name:'Гость_'+Math.floor(Math.random()*9999), trophies:0, coins:150,
                 gems:20, xp:0, xpMax:1000, selectedChar:0, isGuest:true,
                 quests: generateQuests() };
  loginUser(user);
}

function doLogout(){
  saveCurrentUser();
  currentUser = null;
  localStorage.removeItem('ba_user');
  document.getElementById('screen-menu').style.display = 'none';
  document.getElementById('screen-auth').style.display = 'flex';
}

function loginUser(user){
  currentUser = user;
  saveSession(user);
  document.getElementById('screen-auth').style.display = 'none';
  document.getElementById('screen-menu').style.display = 'flex';
  initMenuLayout();
  updateTopbar();
}

function saveCurrentUser(){
  if(!currentUser) return;
  saveSession(currentUser);
  if(!currentUser.isGuest){
    const accs = getAccounts();
    if(accs[currentUser.name.toLowerCase()]){
      accs[currentUser.name.toLowerCase()] = { ...accs[currentUser.name.toLowerCase()], ...currentUser };
      saveAccounts(accs);
    }
  }
}

function addTrophies(amount){
  if(!currentUser) return;
  currentUser.trophies = Math.max(0, (currentUser.trophies||0) + amount);
  currentUser.xp = Math.min(currentUser.xpMax, (currentUser.xp||0) + Math.abs(amount)*3);
  saveCurrentUser();
  updateTopbar();
}

function submitMatchResult(rank, kills, cubes, mapName){
  const delta = calcTrophyChange(rank, 10);
  addTrophies(delta);
  if(currentUser && currentUser.quests){
    if(rank===1) currentUser.quests.forEach(q=>{ if(q.id==='q1') q.progress=Math.min(q.target,q.progress+1); });
  }
  saveCurrentUser();
  return delta;
}

function generateQuests(){
  return [
    {id:'q1',title:'Победи в Шоудауне',desc:'Займи 1 место',target:1,progress:0,reward:50,rewardType:'trophy',done:false},
    {id:'q2',title:'Убей 3 бойцов',desc:'За один матч',target:3,progress:0,reward:100,rewardType:'coins',done:false},
    {id:'q3',title:'Собери 5 Кубов Силы',desc:'В одном матче',target:5,progress:0,reward:30,rewardType:'gems',done:false},
  ];
}

function updateQuestProgress(type, amount){
  if(!currentUser||!currentUser.quests) return;
  currentUser.quests.forEach(q=>{
    if(q.done) return;
    if(type==='kills'&&q.id==='q2') q.progress=Math.min(q.target,q.progress+amount);
    if(type==='cubes'&&q.id==='q3') q.progress=Math.min(q.target,q.progress+amount);
  });
}

// Авто-логин
(function(){ const s=loadSession(); if(s) loginUser(s); })();
