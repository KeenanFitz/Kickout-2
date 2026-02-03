/* =========================
   VARIABLES
============================ */
let data = JSON.parse(localStorage.getItem("kickoutData")) || [];
let firstHalf = true;
let selectedPlayer = null;
let kickoutWon = true;
let lastPrediction = null;
let lastConfidence = 0;
let alertCooldown = false;
let simpleView = false;
const AUTO_SIMPLE_THRESHOLD = 60;
const pitchContainer = document.getElementById("pitchContainer");
const heatmapCanvas = document.getElementById("heatmapCanvas");
const ctx = heatmapCanvas.getContext("2d");
const predictionText = document.getElementById("prediction");
const lostToggle = document.getElementById("lostToggle");
const simpleToggle = document.getElementById("simpleViewToggle");
const clearDataBtn = document.getElementById("clearDataBtn");
const playerGrid = document.getElementById("playerGrid");

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
    data = [];
    localStorage.removeItem("kickoutData");
    predictionText.textContent="Data cleared. Ready.";
    resetCanvas();
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
   HEATMAP CANVAS
============================ */
function resizeCanvas() {
  heatmapCanvas.width = pitchContainer.clientWidth;
  heatmapCanvas.height = pitchContainer.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

pitchContainer.addEventListener('click',(e)=>{
  const rect = pitchContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  addDot(x,y);
  const zoneGroup = getZoneGroup(y);

  saveKickout(zoneGroup);
});

function addDot(x,y){
  ctx.fillStyle = "rgba(0,0,255,0.6)";
  ctx.beginPath();
  ctx.arc(x,y,6,0,Math.PI*2);
  ctx.fill();
}

function resetCanvas(){ ctx.clearRect(0,0,heatmapCanvas.width,heatmapCanvas.height); }

function getZoneGroup(y){
  const h = heatmapCanvas.height;
  if(y<h/3) return "Top"; // zones 1-3
  else if(y<2*h/3) return "Middle"; // zones 4-6
  else return "Bottom"; // zones 7-9
}

/* =========================
   SAVE KICKOUT
============================ */
function saveKickout(zoneGroup){
  const call = document.getElementById("callInput").value.trim().toUpperCase();
  const setup = document.getElementById("setupInput").value;

  if(!call || !setup) return alert("Enter call & setup");
  if(kickoutWon && !selectedPlayer) return alert("Select winner");

  data.push({
    call,
    setup,
    zoneGroup,
    player: kickoutWon ? selectedPlayer : null,
    won: kickoutWon,
    time: Date.now()
  });
  localStorage.setItem("kickoutData",JSON.stringify(data));

  updatePrediction();

  selectedPlayer=null;
  document.querySelectorAll(".playerBtn").forEach(b=>b.classList.remove("active"));
  kickoutWon=true;
  lostToggle.className="won";
  lostToggle.textContent="Kickout WON";
}

/* =========================
   PREDICTION
============================ */
function updatePrediction(){
  const call = document.getElementById("callInput").value.trim().toUpperCase();
  const setup = document.getElementById("setupInput").value;

  const recent = data.filter(d => d.call===call && d.setup===setup && d.won);
  if(recent.length<1){
    predictionText.textContent="Building pattern…";
    return;
  }

  const counts = {};
  recent.forEach(d => counts[d.zoneGroup] = (counts[d.zoneGroup]||0)+1);

  const bestZone = Object.keys(counts).reduce((a,b)=>counts[a]>counts[b]?a:b);
  const confidence = Math.round((counts[bestZone]/recent.length)*100);

  predictionText.textContent = `${call} → ${bestZone} (${confidence}%)`;

  lastPrediction=bestZone;
  lastConfidence=confidence;

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
