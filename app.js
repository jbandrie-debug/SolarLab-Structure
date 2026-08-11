const $=id=>document.getElementById(id);
const types={
 panel:{name:"Solar Panel",sub:"550 W PV module",icon:"",visual:"pv",props:["550 W","Vmp 41.8 V","Imp 13.16 A"]},
 mppt:{name:"MPPT Controller",sub:"Charge controller",icon:"⚙",visual:"",props:["48 V nominal","98% efficiency","DC input"]},
 battery:{name:"Battery Bank",sub:"48 V storage",icon:"🔋",visual:"",props:["48 V","200 Ah","9.6 kWh nominal"]},
 breaker:{name:"DC Breaker",sub:"Protection",icon:"▣",visual:"",props:["DC rated","Protection device","Manual trip"]},
 inverter:{name:"Inverter",sub:"DC → AC",icon:"↕",visual:"",props:["5,000 W","48 V DC input","AC output"]},
 load:{name:"AC Load",sub:"Consumer",icon:"💡",visual:"",props:["850 W","AC demand","Variable"]},
 meter:{name:"Energy Meter",sub:"Measurement",icon:"▥",visual:"",props:["Voltage","Current","Energy"]}};
let S={name:"SolarLab Test System",desc:"48V solar power system simulation.",v:48,panels:4,pw:550,ah:200,iw:5000,sun:100,load:850,soc:76,nodes:[],fault:"",running:false,seconds:0};

function toast(t){$("toast").textContent=t;$("toast").style.display="block";clearTimeout(window.tt);window.tt=setTimeout(()=>$("toast").style.display="none",1700)}
function show(id){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");if(id==="analysis")analysis();if(id==="report")report()}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>show(b.dataset.page));
function readSetup(){S.name=$("pname").value;S.desc=$("pdesc").value;S.v=+$("voltage").value;S.panels=+$("panelCount").value;S.pw=+$("panelW").value;S.ah=+$("batteryAh").value;S.iw=+$("inverterW").value}
["pname","pdesc","voltage","panelCount","panelW","batteryAh","inverterW"].forEach(id=>$(id).addEventListener("input",readSetup));

function add(type,x,y){let o={id:Date.now()+Math.random(),type,x:x??100+Math.random()*430,y:y??100+Math.random()*330};S.nodes.push(o);draw();selectNode(o);$("empty").style.display="none";toast(types[type].name+" placed")}
document.querySelectorAll(".component").forEach(b=>b.onclick=()=>add(b.dataset.type));

function nodeHTML(o){
 let t=types[o.type], visual=t.visual==="pv"?"pv":"";return `<div class="visual ${visual}">${t.icon}</div><b>${t.name}</b><small>${t.sub}</small><span class="terminal plus" title="Positive"></span><span class="terminal minus" title="Negative"></span>`;
}
function draw(){
 const n=$("nodes");n.innerHTML="";
 S.nodes.forEach(o=>{let e=document.createElement("div");e.className="node";e.dataset.id=o.id;e.style.left=o.x+"px";e.style.top=o.y+"px";e.innerHTML=nodeHTML(o);
 e.onpointerdown=ev=>dragStart(ev,o,e);e.onclick=ev=>{if(!window.dragMoved)selectNode(o)};n.appendChild(e)});
 $("empty").style.display=S.nodes.length?"none":"grid";drawWires();
}
function dragStart(ev,o,e){if(ev.target.classList.contains("terminal"))return;window.dragMoved=false;let r=$("board").getBoundingClientRect(),sx=ev.clientX-o.x-r.left,sy=ev.clientY-o.y-r.top;
 const move=q=>{window.dragMoved=true;let rr=$("board").getBoundingClientRect();o.x=Math.max(8,q.clientX-rr.left-sx);o.y=Math.max(35,q.clientY-rr.top-sy);e.style.left=o.x+"px";e.style.top=o.y+"px";drawWires()};
 const up=()=>{document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up)};document.addEventListener("pointermove",move);document.addEventListener("pointerup",up)}
function selectNode(o){document.querySelectorAll(".node").forEach(x=>x.classList.toggle("selected",+x.dataset.id===o.id));let t=types[o.type];$("inspector").innerHTML=`<h3>${t.name}</h3><p class="hint">${t.sub}</p>${t.props.map((p,i)=>`<div class="property"><span>${["Rating","Specification","Detail"][i]||"Property"}</span><b>${p}</b></div>`).join("")}<h4>Terminals</h4><div class="terminalLegend"><span><i class="dot red"></i> Positive</span><span><i class="dot blue"></i> Negative</span></div><button class="fault" style="margin-top:18px" onclick="removeNode(${o.id})">Remove Component</button>`}
function removeNode(id){S.nodes=S.nodes.filter(o=>o.id!==id);draw();$("inspector").innerHTML="<h3>Inspector</h3><p class='hint'>Select a component to view terminals and properties.</p>"}
function drawWires(){
 let svg=$("wires");svg.innerHTML="";
 let ordered=["panel","mppt","battery","breaker","inverter","load"].map(t=>S.nodes.find(o=>o.type===t)).filter(Boolean);
 for(let i=0;i<ordered.length-1;i++){let a=ordered[i],b=ordered[i+1],line=document.createElementNS("http://www.w3.org/2000/svg","path");
 let x1=a.x+155,y1=a.y+55,x2=b.x,y2=b.y+55,c=(x2-x1)*.45;
 line.setAttribute("d",`M ${x1} ${y1} C ${x1+c} ${y1}, ${x2-c} ${y2}, ${x2} ${y2}`);line.setAttribute("fill","none");line.setAttribute("stroke","#59e49a");line.setAttribute("stroke-width","3");line.setAttribute("filter","drop-shadow(0 0 4px #59e49a)");svg.appendChild(line)}
}
$("autoWire").onclick=()=>{let order=["panel","mppt","battery","breaker","inverter","load"];order.forEach((t,i)=>{let o=S.nodes.find(x=>x.type===t);if(!o)add(t,80+i*190,250)});S.nodes.forEach((o,i)=>{o.x=70+i*185;o.y=250+(o.type==="breaker"?100:0)});draw();toast("Recommended demo wiring created")}
$("clear").onclick=()=>{S.nodes=[];draw();toast("Workspace cleared")};
$("loadDemo").onclick=()=>{$("pname").value="SolarLab Demo System";readSetup();S.nodes=[];["panel","mppt","battery","breaker","inverter","load","meter"].forEach((t,i)=>add(t,70+i*180,220+(t==="breaker"?120:0)));show("design");toast("Demo system loaded")};

function calc(){let pv=S.panels*S.pw*S.sun/100/1000,load=S.load/1000,inv=load/S.iw*100;return{pv,load,inv,prod:pv*6,demand:load*24}}
function updateExperiment(){
 S.sun=+$("sun").value;S.load=+$("loadW").value;S.soc=Math.max(0,Math.min(100,+$("socW").value));
 let c=calc();$("sunOut").textContent=S.sun+"%";$("mPV").textContent=c.pv.toFixed(2)+" kW";$("mLoad").textContent=c.load.toFixed(2)+" kW";$("mSOC").textContent=S.soc+"%";$("mInv").textContent=c.inv.toFixed(0)+"%";$("pvNode").textContent=c.pv.toFixed(2)+" kW";$("loadNode").textContent=S.load+" W";$("batNode").textContent=S.soc+"% SOC";$("invNode").textContent=c.inv.toFixed(0)+"% load";
 let box=$("faultBox");if(S.fault==="overload"){box.className="status danger";box.textContent="⚡ INVERTER OVERLOAD — protection trip simulated."}else if(S.fault==="reverse"){box.className="status danger";box.textContent="⚡ WRONG POLARITY — connection blocked in simulation."}else if(S.fault==="short"){box.className="status danger";box.textContent="🔥 SHORT CIRCUIT — simulated protective shutdown."}else if(c.inv>100){box.className="status warn";box.textContent="⚠ Load is above inverter rating."}else{box.className="status ok";box.textContent="● No active faults"}
 $("simNote").textContent=S.running?(S.fault?"Fault condition active. Simulation has entered protection state.":"Power is flowing through the virtual system. Monitor voltage, load and SOC."):"System ready. Start simulation to see live power flow.";
}
["sun","loadW","socW"].forEach(id=>$(id).addEventListener("input",()=>{S.fault="";updateExperiment()}));
$("simulate").onclick=()=>{S.running=!S.running;$("simulate").textContent=S.running?"■ Stop Simulation":"▶ Start Simulation";$("simState").textContent=S.running?"RUNNING":"READY";if(!S.running)S.fault="";updateExperiment();toast(S.running?"Simulation started":"Simulation stopped")};
$("overload").onclick=()=>{S.fault="overload";S.load=Math.max(S.iw*1.25,6500);$("loadW").value=S.load;updateExperiment();toast("Overload test triggered")};
$("reverse").onclick=()=>{S.fault="reverse";updateExperiment();toast("Wrong polarity test triggered")};
$("short").onclick=()=>{S.fault="short";updateExperiment();toast("Short-circuit test triggered")};
setInterval(()=>{if(S.running){S.seconds++;let h=String(Math.floor(S.seconds/3600)).padStart(2,"0"),m=String(Math.floor(S.seconds/60)%60).padStart(2,"0"),s=String(S.seconds%60).padStart(2,"0");$("simTime").textContent=`${h}:${m}:${s}`}},1000);

function analysis(){
 let c=calc(),score=100-(c.inv>100?35:0)-(c.prod<c.demand?15:0)-(S.fault?20:0);score=Math.max(0,Math.round(score));$("score").textContent=score;
 $("checks").innerHTML=[["PV array",`${c.pv.toFixed(2)} kW`],["AC demand",`${S.load} W`],["Inverter utilization",`${c.inv.toFixed(0)}%`],["Daily PV estimate",`${c.prod.toFixed(1)} kWh`],["Daily load estimate",`${c.demand.toFixed(1)} kWh`],["Fault state",S.fault||"Normal"]].map(x=>`<div class="check">${x[0]} <b>${x[1]}</b></div>`).join("");
 $("chart").innerHTML="";for(let i=0;i<24;i++){let h=Math.max(3,Math.sin((i-6)/12*Math.PI)*100);let e=document.createElement("i");e.className="bar";e.style.height=h+"%";$("chart").appendChild(e)}
}
function report(){
 let c=calc();$("report").innerHTML=`<h2>${S.name}</h2><p>${S.desc}</p><table>
 <tr><td>System voltage</td><td><b>${S.v} V</b></td></tr><tr><td>Solar array</td><td><b>${S.panels} × ${S.pw} W = ${(S.panels*S.pw/1000).toFixed(2)} kWp</b></td></tr>
 <tr><td>Battery bank</td><td><b>${S.v} V / ${S.ah} Ah</b></td></tr><tr><td>Inverter</td><td><b>${S.iw} W</b></td></tr>
 <tr><td>Simulated PV output</td><td><b>${c.pv.toFixed(2)} kW</b></td></tr><tr><td>AC load</td><td><b>${S.load} W</b></td></tr>
 <tr><td>Battery SOC</td><td><b>${S.soc}%</b></td></tr><tr><td>Fault state</td><td><b>${S.fault||"Normal"}</b></td></tr></table>
 <p style="margin-top:20px;color:#718ba2;font-size:11px">Educational simulation only. Verify all real-world designs with component datasheets, electrical calculations, applicable standards/codes, protection coordination, and qualified professionals.</p>`}
$("print").onclick=()=>window.print();
$("save").onclick=()=>{readSetup();localStorage.setItem("SolarLabV2",JSON.stringify(S));toast("Project saved locally")};
try{let x=JSON.parse(localStorage.getItem("SolarLabV2"));if(x)S=x}catch(e){}
function init(){["pname","pdesc","voltage","panelCount","panelW","batteryAh","inverterW"].forEach(id=>{});$("pname").value=S.name;$("pdesc").value=S.desc;$("voltage").value=S.v;$("panelCount").value=S.panels;$("panelW").value=S.pw;$("batteryAh").value=S.ah;$("inverterW").value=S.iw;$("sun").value=S.sun;$("loadW").value=S.load;$("socW").value=S.soc;draw();updateExperiment()}
init();
