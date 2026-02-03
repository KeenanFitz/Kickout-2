/* =========================
   VARIABLES
============================ */
let data=JSON.parse(localStorage.getItem("kickoutData"))||[];
let firstHalf=true;
let selectedPlayer=null;
let kickoutWon=true;
let lastPrediction=null;
let lastConfidence=0;
let alertCooldown=false;
let simpleView=false;
const AUTO_SIMPLE_THRESHOLD=60;
const MAX_RECENT=10;
const zoneFlip={"1":"6","2":"5","3":"4","4":"3","5":"2","6":"1"};

const predictionText=document.getElementById("prediction");
const zones=document.querySelectorAll(".zone");
const lostToggle=document.getElementById("lostToggle");
const simpleToggle=document.getElementById("simpleViewToggle");
const clearDataBtn=document.getElementById("clearDataBtn");
const playerGrid=document.getElementById("playerGrid");

/* =========================
   PLAYER BUTTONS
============================ */
for(let i=1;i<=30;i++){
  const btn=document.createElement("button");
  btn.textContent=i;
  btn.className="playerBtn";
  btn.onclick=()=>{
    selectedPlayer=i;
    document.querySelectorAll(".playerBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  };
  playerGrid.appendChild(btn);
}

/* =========================
   LOST TOGGLE
============================ */
lostToggle.onclick=()=>{
  kickoutWon=!kickoutWon;
  lostToggle.className=kickoutWon?"won":"lost";
  lostToggle.textContent=kickoutWon?"Kickout WON":"Kickout LOST";
};

/* =========================
   SIMPLE VIEW TOGGLE
============================ */
simpleToggle.onclick=()=>{
  simpleView=!simpleView;
  document.body.classList.toggle("simple",simpleView);
  simpleToggle.textContent=simpleView?"Exit Simple View":"Simple View";
};

/* =========================
   CLEAR DATA
============================ */
clearDataBtn.onclick=()=>{
  if(confirm("Clear all match data?")){
    data=[];
    localStorage.removeItem("kickoutData");
    predictionText.textContent="Data cleared. Ready.";
    resetHeatMap();
  }
};

/* =========================
   HALFTIME
============================ */
function toggleHalftime(){
  firstHalf=!firstHalf;
  document.getElementById("halfStatus").textContent=firstHalf?"First Half":"Second Half";
}

/* =========================
   ZONE CLICK HANDLER
============================ */
zones.forEach(zone=>{
  zone.onclick=()=>{
    const call=document.getElementById("callInput").value.trim().toUpperCase();
    const setup=document.getElementById("setupInput").value;
    const rawZone=zone.dataset.zone;
    const zoneNum=firstHalf?rawZone:zoneFlip[rawZone];

    if(!call || !setup) return alert("Enter call & setup");
    if(kickoutWon && !selectedPlayer) return alert("Select winner");

    if(lastPrediction && lastConfidence>=60 && zoneNum!==lastPrediction && !alertCooldown){
      triggerPatternBroken();
    }

    data.push({
      call, setup, zone:zoneNum,
      player:kickoutWon?selectedPlayer:null,
      won:kickoutWon, time:Date.now()
    });

    localStorage.setItem("kickoutData",JSON.stringify(data));
    updatePrediction();

    selectedPlayer=null;
    document.querySelectorAll(".playerBtn").forEach(b=>b.classList.remove("active"));
    kickoutWon=true;
    lostToggle.className="won";
    lostToggle.textContent="Kickout WON";
  };
});

/* =========================
   PREDICTION & HEATMAP
============================ */
function updatePrediction(){
  const call=document.getElementById("callInput").value.trim().toUpperCase();
  const setup=document.getElementById("setupInput").value;

  const recent=data.filter(d=>d.call===call && d.setup===setup && d.won).slice(-MAX_RECENT);

  if(recent.length<1){
    predictionText.textContent="Building pattern…";
    resetHeatMap();
    return;
  }

  const counts={};
  recent.forEach(d=>counts[d.zone]=(counts[d.zone]||0)+1);
  const bestZone=Object.keys(counts).reduce((a,b)=>counts[a]>counts[b]?a:b);
  const confidence=Math.round((counts[bestZone]/recent.length)*100);

  predictionText.textContent=`${call} → Zone ${bestZone} (${confidence}%)`;

  lastPrediction=bestZone;
  lastConfidence=confidence;

  updateHeatMap(counts);

  // Auto Simple View
  if(confidence>=AUTO_SIMPLE_THRESHOLD && !simpleView){
    simpleView=true;
    document.body.classList.add("simple");
    simpleToggle.textContent="Exit Simple View";
  } else if(confidence<AUTO_SIMPLE_THRESHOLD && simpleView){
    simpleView=false;
    document.body.classList.remove("simple");
    simpleToggle.textContent="Simple View";
  }
}

/* =========================
   HEATMAP FUNCTIONS
============================ */
function updateHeatMap(counts){
  const maxCount=Math.max(...Object.values(counts));
  zones.forEach(z=>{
    const c=counts[z.dataset.zone]||0;
    const intensity=0.2 + (c/maxCount)*0.8;
    z.style.backgroundColor=`rgba(27,94,32,${intensity})`;
  });
}
function resetHeatMap(){ zones.forEach(z=>z.style.backgroundColor="rgba(27,94,32,0.2)"); }

/* =========================
   PATTERN BROKEN ALERT
============================ */
function triggerPatternBroken(){
  const alertBox=document.getElementById("alertBox");
  alertBox.classList.remove("hidden");
  alertCooldown=true;
  setTimeout(()=>{
    alertBox.classList.add("hidden");
    alertCooldown=false;
  },4000);
}
const pitchContainer = document.getElementById("pitchContainer");
const heatmapCanvas = document.getElementById("heatmapCanvas");
const ctx = heatmapCanvas.getContext("2d");

function resizeCanvas() {
  heatmapCanvas.width = pitchContainer.clientWidth;
  heatmapCanvas.height = pitchContainer.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* =========================
   CLICK TO ADD DOT
============================ */
pitchContainer.addEventListener('click', (e) => {
  const rect = pitchContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Add dot to canvas
  addDot(x, y);

  // Determine zone group
  const zoneGroup = getZoneGroup(y);

  saveKickout(zoneGroup);
});

/* =========================
   DRAW DOT
============================ */
function addDot(x, y) {
  ctx.fillStyle = "rgba(0,0,255,0.6)";
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI*2);
  ctx.fill();
}

/* =========================
   MAP Y COORD TO ZONE GROUP
============================ */
function getZoneGroup(y) {
  const h = heatmapCanvas.height;
  if (y < h/3) return "Top";       // zones 1,2,3
  else if (y < 2*h/3) return "Middle"; // zones 4,5,6
  else return "Bottom";            // zones 7,8,9
}

/* =========================
   SAVE KICKOUT
============================ */
function saveKickout(zoneGroup) {
  const call = document.getElementById("callInput").value.trim().toUpperCase();
  const setup = document.getElementById("setupInput").value;

  if (!call || !setup) return alert("Enter call & setup");
  if (kickoutWon && !selectedPlayer) return alert("Select winner");

  data.push({
    call,
    setup,
    zoneGroup,
    player: kickoutWon ? selectedPlayer : null,
    won: kickoutWon,
    time: Date.now()
  });
  localStorage.setItem("kickoutData", JSON.stringify(data));

  updatePrediction();
}
