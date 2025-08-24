const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 72;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const W = canvas.width, H = canvas.height;
const COLS = 8, ROWS = 3;
const CELL_W = W / COLS, CELL_H = H / ROWS;
let sun = 50, mode = 'peashooter', wave = 1, time = 0, gameOver = false;
const plants = [], bullets = [], zombies = [], suns = [];
const sunEl = document.getElementById('sun');
const waveEl = document.getElementById('wave');

document.getElementById('plantBtn').onclick = ()=> mode='peashooter';
document.getElementById('wallBtn').onclick = ()=> mode='wallnut';
document.getElementById('shovelBtn').onclick = ()=> mode='shovel';

function updateUI(){ sunEl.textContent = '☀ ' + sun; waveEl.textContent = 'Wave ' + wave; }
function cellAt(x,y){ return { col: Math.floor(x / CELL_W), row: Math.floor(y / CELL_H) }; }

canvas.addEventListener('pointerdown', e=>{
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  // Collect suns
  for (let s of suns){
    const dx = s.x - x, dy = s.y - y;
    if (Math.hypot(dx,dy) < 36 && s.alive){
      s.alive = false;
      sun += s.val;
      updateUI();
      return;
    }
  }

  const {col,row} = cellAt(x,y);
  if (col < 0 || col >= COLS || row<0 || row>=ROWS) return;

  if (mode === 'shovel'){
    const i = plants.findIndex(p=> p.col===col && p.row===row);
    if (i>=0) plants.splice(i,1);
    return;
  }
  if (plants.some(p=> p.col===col && p.row===row)) return;

  if (mode==='peashooter' && sun>=100){ sun-=100; plants.push({col,row,type:'peashooter',hp:100,cooldown:0}); }
  else if (mode==='wallnut' && sun>=50){ sun-=50; plants.push({col,row,type:'wallnut',hp:300,cooldown:0}); }
  updateUI();
});

// 🌞 Sun uses settings
function spawnSun(){ 
  const x=Math.random()*W,y=-20; 
  suns.push({x,y,vy:0.6+Math.random()*0.4,val:gameSettings.sunValue,alive:true}); 
}

// 🧟 Zombie uses settings
function spawnZombie(){ 
  const row=Math.floor(Math.random()*ROWS); 
  zombies.push({x: W+10,row,hp:gameSettings.zombieHP,spd:gameSettings.zombieSpeed,biteTimer:0}); 
}

function update(dt){
  if (gameOver) return;
  time += dt;

  if (Math.random() < 0.005 + wave*0.0008) spawnZombie();
  if (Math.random() < gameSettings.sunChance) spawnSun();
  if (time > 30 && Math.random() < 0.002) { wave++; time = 0; }

  for (let p of plants){ 
    if (p.type==='peashooter'){ 
      p.cooldown-=dt; 
      const anyZombieAhead = zombies.some(z=> z.row===p.row && z.x>(p.col+0.5)*CELL_W); 
      if(anyZombieAhead && p.cooldown<=0){ 
        bullets.push({x:(p.col+0.7)*CELL_W,y:(p.row+0.5)*CELL_H,vx:0.45,atk:gameSettings.peaDamage}); 
        p.cooldown=1.1; 
      } 
    } 
  }

  for (let b of bullets) b.x += b.vx*dt*100;

  for (let z of zombies) 
    for (let b of bullets){ 
      if(Math.abs(b.y-(z.row+0.5)*CELL_H)<24 && Math.abs(b.x-z.x)<16){ 
        z.hp-=b.atk; 
        b.x=W+999; 
      } 
    }

  for (let z of zombies){
    const col = Math.floor((z.x-20)/CELL_W);
    let target = plants.find(p=>p.row===z.row && p.col===col);
    if(target){ 
      z.biteTimer-=dt; 
      if(z.biteTimer<=0){ target.hp-=15; z.biteTimer=0.6; } 
      if(target.hp<=0){ const idx=plants.indexOf(target); if(idx>=0) plants.splice(idx,1); } 
    } else { 
      z.x-=z.spd*dt*100; 
    }
    if(z.x<10) gameOver=true;
  }

  for(let s of suns){ 
    if(s.alive){ 
      s.y+=s.vy*dt*100; 
      if(s.y>H-40) s.vy=0; 
    } 
  }

  for(let i=bullets.length-1;i>=0;i--) if(bullets[i].x>W+50) bullets.splice(i,1);
  for(let i=zombies.length-1;i>=0;i--) if(zombies[i].hp<=0) zombies.splice(i,1);
  for(let i=suns.length-1;i>=0;i--) if(!suns[i].alive) suns.splice(i,1);
}

function drawGrid(){ 
  for(let r=0;r<ROWS;r++){ 
    for(let c=0;c<COLS;c++){ 
      ctx.fillStyle=(r+c)%2?'#2b732b':'#2f7a2f'; 
      ctx.fillRect(c*CELL_W,r*CELL_H,CELL_W-2,CELL_H-2); 
    } 
  } 
}

function draw(){
  ctx.clearRect(0,0,W,H);
  drawGrid();

  for(let s of suns){ 
    if(!s.alive) continue; 
    ctx.beginPath(); 
    ctx.arc(s.x,s.y,16,0,Math.PI*2); 
    ctx.fillStyle='#ffd54f'; 
    ctx.fill(); 
    ctx.fillStyle='#000'; 
    ctx.font='12px sans-serif'; 
    ctx.fillText('+'+s.val,s.x-10,s.y+4); 
  }

  for(let p of plants){ 
    const x=p.col*CELL_W+CELL_W*0.5,y=p.row*CELL_H+CELL_H*0.5; 
    if(p.type==='peashooter'){ 
      ctx.fillStyle='#3cb043'; 
      ctx.beginPath(); 
      ctx.arc(x,y,22,0,Math.PI*2); 
      ctx.fill(); 
      ctx.fillStyle='#226b22'; 
      ctx.fillRect(x-28,y+12,56,8); 
    } else { 
      ctx.fillStyle='#8b5a2b'; 
      ctx.fillRect(x-26,y-26,52,52); 
    } 
  }

  for(let b of bullets){ 
    ctx.fillStyle='#9be564'; 
    ctx.beginPath(); 
    ctx.arc(b.x,b.y,6,0,Math.PI*2); 
    ctx.fill(); 
  }

  for(let z of zombies){ 
    ctx.fillStyle='#a7a7a7'; 
    ctx.fillRect(z.x-18,(z.row+0.5)*CELL_H-24,36,48); 
    ctx.fillStyle='#4a2f2f'; 
    ctx.fillRect(z.x-18,(z.row+0.5)*CELL_H+12,36,12); 
  }

  if(gameOver){ 
    ctx.fillStyle='rgba(0,0,0,0.6)'; 
    ctx.fillRect(0,0,W,H); 
    ctx.fillStyle='#fff'; 
    ctx.font='bold 48px sans-serif'; 
    ctx.fillText('Game Over', W/2-130,H/2); 
  }
}

let last=0;
function loop(ts){ 
  const dt=(ts-last)/1000||0.016; 
  last=ts; 
  update(dt); 
  draw(); 
  requestAnimationFrame(loop); 
}
updateUI();
requestAnimationFrame(loop);
