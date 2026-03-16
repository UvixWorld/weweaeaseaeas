'use strict';

// ─────────────────────────────────────────
//  SERVER AUTH — uses /api/* endpoints
// ─────────────────────────────────────────
let currentUser = null;
const API = ''; // same origin

function saveSession(user){ sessionStorage.setItem('ba_user', JSON.stringify(user)); }
function loadSession(){ return JSON.parse(sessionStorage.getItem('ba_user')||'null'); }

function authTab(tab){
  document.getElementById('tab-login').classList.toggle('on', tab==='login');
  document.getElementById('tab-reg').classList.toggle('on', tab==='reg');
  document.getElementById('auth-login').style.display = tab==='login'?'':'none';
  document.getElementById('auth-reg').style.display   = tab==='reg'  ?'':'none';
}

async function doRegister(){
  const name  = document.getElementById('reg-name').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const err   = document.getElementById('reg-err');
  err.textContent = '';
  if(pass !== pass2){ err.textContent='Пароли не совпадают'; return; }
  try {
    const r = await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:name,password:pass})});
    const d = await r.json();
    if(!d.ok){ err.textContent = d.error||'Ошибка'; return; }
    loginUser(d.user);
  } catch(e){ err.textContent='Сервер недоступен'; }
}

async function doLogin(){
  const name = document.getElementById('login-name').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err  = document.getElementById('login-err');
  err.textContent = '';
  try {
    const r = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:name,password:pass})});
    const d = await r.json();
    if(!d.ok){ err.textContent = d.error||'Ошибка'; return; }
    loginUser(d.user);
  } catch(e){ err.textContent='Сервер недоступен'; }
}

async function doGuest(){
  const r = await fetch('/api/guest',{method:'POST'});
  const d = await r.json();
  if(d.ok) loginUser(d.user);
}

function doLogout(){
  saveCurrentUser();
  currentUser = null;
  sessionStorage.removeItem('ba_user');
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

setInterval(saveCurrentUser, 60000);

async function saveCurrentUser(){
  if(!currentUser||currentUser.isGuest) return;
  try {
    await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(currentUser)});
  } catch(e){}
}

async function addTrophies(amount){
  if(!currentUser) return;
  currentUser.trophies = Math.max(0,(currentUser.trophies||0)+amount);
  currentUser.xp = Math.min(currentUser.xpMax,(currentUser.xp||0)+Math.abs(amount)*3);
  saveSession(currentUser);
  updateTopbar();
}

async function submitMatchResult(rank, kills, cubes, mapName){
  if(!currentUser||currentUser.isGuest){
    const delta = calcTrophyChange(rank,10);
    addTrophies(delta);
    return delta;
  }
  try {
    const r = await fetch('/api/match_result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:currentUser.name,rank,kills,cubes,mapName})});
    const d = await r.json();
    if(d.user){ currentUser={...currentUser,...d.user}; saveSession(currentUser); }
    updateTopbar();
    return d.trophyChange||0;
  } catch(e){
    const delta = calcTrophyChange(rank,10);
    addTrophies(delta);
    return delta;
  }
}

function generateQuests(){
  return [
    {id:'q1',title:'Победи в Шоудауне',desc:'Займи 1 место',target:1,progress:0,reward:50,rewardType:'trophy',done:false},
    {id:'q2',title:'Убей 3 бойцов',desc:'За один матч',target:3,progress:0,reward:100,rewardType:'coins',done:false},
    {id:'q3',title:'Собери 5 Кубов Силы',desc:'В одном матче',target:5,progress:0,reward:30,rewardType:'gems',done:false},
  ];
}

(function(){
  const saved = loadSession();
  if(saved) loginUser(saved);
})();
