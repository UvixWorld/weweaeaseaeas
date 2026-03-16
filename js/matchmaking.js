'use strict';
let mmTimer=null,mmSeconds=30,mmCancelled=false,mmSocket=null,currentRoomId=null,realPlayersInRoom=[];
let mmAnimId=null;
function startMatchmaking(){
  if(!currentUser){alert('Войдите в аккаунт');return;}
  document.getElementById('screen-menu').style.display='none';
  document.getElementById('screen-matchmaking').style.display='flex';
  mmSeconds=30;mmCancelled=false;realPlayersInRoom=[];currentRoomId=null;
  initMMCanvas();buildMMSlots();updateMMRing(30);
  document.getElementById('mm-status').textContent='Подключение...';
  if(typeof io!=='undefined') connectSocketIO();
  else simulateMatchmaking();
}
function connectSocketIO(){
  if(mmSocket){mmSocket.disconnect();mmSocket=null;}
  mmSocket=io(window.location.origin,{transports:['websocket','polling']});
  mmSocket.on('connect',()=>{
    document.getElementById('mm-status').textContent='Ищем игроков...';
    mmSocket.emit('join_queue',{name:currentUser.name,char:selectedChar});
    startMMCountdown();
  });
  mmSocket.on('connect_error',()=>simulateMatchmaking());
  mmSocket.on('queue_update',data=>{
    const c=(data.playersInQueue||1)-1;
    if(c>0) document.getElementById('mm-status').textContent=`Найдено ${c} игрок(ов)`;
  });
  mmSocket.on('match_found',data=>{
    clearInterval(mmTimer);currentRoomId=data.roomId;realPlayersInRoom=data.realPlayers||[];
    realPlayersInRoom.forEach(p=>{if(p.sid!==mmSocket.id)addMMPlayerSlot(p.name,true);});
    document.getElementById('mm-status').textContent='Матч найден! Загрузка...';
    setTimeout(()=>launchGame(data.botCount||9),700);
  });
  mmSocket.on('disconnect',()=>{if(!mmCancelled)simulateMatchmaking();});
}
function startMMCountdown(){
  if(mmTimer)clearInterval(mmTimer);
  mmTimer=setInterval(()=>{
    if(mmCancelled){clearInterval(mmTimer);return;}
    mmSeconds--;document.getElementById('mm-timer').textContent=mmSeconds;updateMMRing(mmSeconds);
    if(mmSeconds<=0){clearInterval(mmTimer);if(mmSocket)mmSocket.emit('force_start',{});else launchGame(9);}
  },1000);
}
function simulateMatchmaking(){
  document.getElementById('mm-status').textContent='Ищем игроков...';
  const fakeNames=['XaosRift','ShadowK1ll','BlazeFist','NightWolf','CrystalPvP'];
  const joinCount=Math.floor(rand(0,4));
  const joinTimes=Array.from({length:joinCount},()=>Math.floor(rand(3,22))).sort((a,b)=>a-b);
  let jIdx=0;
  if(mmTimer)clearInterval(mmTimer);
  mmTimer=setInterval(()=>{
    if(mmCancelled){clearInterval(mmTimer);return;}
    const elapsed=30-mmSeconds;
    while(jIdx<joinTimes.length&&elapsed>=joinTimes[jIdx]){addMMPlayerSlot(fakeNames[jIdx%fakeNames.length],true);jIdx++;}
    mmSeconds--;document.getElementById('mm-timer').textContent=mmSeconds;updateMMRing(mmSeconds);
    if(mmSeconds<=0){clearInterval(mmTimer);launchGame(9-jIdx);}
  },1000);
}
function cancelMatchmaking(){
  mmCancelled=true;if(mmTimer)clearInterval(mmTimer);
  if(mmSocket){mmSocket.disconnect();mmSocket=null;}
  if(mmAnimId){cancelAnimationFrame(mmAnimId);mmAnimId=null;}
  document.getElementById('screen-matchmaking').style.display='none';
  document.getElementById('screen-menu').style.display='flex';
  updateTopbar();initMenuCanvas();
}
function buildMMSlots(){
  const c=document.getElementById('mm-players');
  c.innerHTML=`<div class="mm-slot you-slot"><div class="mm-slot-avatar">${CICONS[CHARS[selectedChar][1]]}</div><div class="mm-slot-name">${currentUser?currentUser.name:'Ты'}</div></div>`;
  for(let i=0;i<9;i++){const s=document.createElement('div');s.className='mm-slot';s.id='mm-slot-'+i;s.innerHTML=`<div class="mm-slot-avatar">❓</div><div class="mm-slot-name" style="color:#446">—</div>`;c.appendChild(s);}
}
function addMMPlayerSlot(name,isReal){
  for(let i=0;i<9;i++){const s=document.getElementById('mm-slot-'+i);if(s&&s.querySelector('.mm-slot-name').textContent==='—'){s.className=isReal?'mm-slot filled':'mm-slot bot-slot';s.querySelector('.mm-slot-avatar').textContent=isReal?'👤':CICONS[Math.floor(rand(0,10))];s.querySelector('.mm-slot-name').textContent=name;break;}}
}
function updateMMRing(sec){const r=document.getElementById('mm-ring');if(r)r.style.strokeDashoffset=213.6*(1-sec/30);}
function launchGame(botCount){
  document.getElementById('screen-matchmaking').style.display='none';
  if(mmAnimId){cancelAnimationFrame(mmAnimId);mmAnimId=null;}
  startGame();
}
let mmScene,mmCamera,mmRenderer,mmMesh;
function initMMCanvas(){
  const canvas=document.getElementById('mm-canvas');
  if(!canvas||!window.THREE)return;
  if(mmAnimId){cancelAnimationFrame(mmAnimId);mmAnimId=null;}
  const W=180,H=220;canvas.width=W;canvas.height=H;
  mmScene=new THREE.Scene();mmCamera=new THREE.PerspectiveCamera(42,W/H,.1,50);mmCamera.position.set(0,2.5,5);mmCamera.lookAt(0,1,0);
  mmRenderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});mmRenderer.setSize(W,H);mmRenderer.toneMapping=THREE.ACESFilmicToneMapping;mmRenderer.toneMappingExposure=1.3;
  mmScene.add(new THREE.AmbientLight(0x334466,.9));const fl=new THREE.DirectionalLight(0xffeedd,1.8);fl.position.set(3,6,5);mmScene.add(fl);
  const c=CHARS[selectedChar];mmMesh=makeCharMesh(c[1],c[3]);mmMesh.scale.setScalar(1.4);mmScene.add(mmMesh);
  function loop(){mmAnimId=requestAnimationFrame(loop);mmMesh.rotation.y+=.016;mmRenderer.render(mmScene,mmCamera);}loop();
}
