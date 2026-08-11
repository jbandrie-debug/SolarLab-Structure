/* =========================================================
   SolarLab Structure V3
   Interactive Solar Engineering Simulator
   ========================================================= */

const $ = id => document.getElementById(id);

const types = {
  panel: {
    name: "Solar Panel",
    sub: "550 W PV module",
    icon: "",
    visual: "pv",
    props: ["550 W", "Vmp 41.8 V", "Imp 13.16 A"]
  },
  mppt: {
    name: "MPPT Controller",
    sub: "Charge controller",
    icon: "⚙",
    props: ["48 V nominal", "98% efficiency", "DC input"]
  },
  battery: {
    name: "Battery Bank",
    sub: "48 V storage",
    icon: "🔋",
    props: ["48 V", "200 Ah", "9.6 kWh nominal"]
  },
  breaker: {
    name: "DC Breaker",
    sub: "Protection",
    icon: "▣",
    props: ["DC rated", "Protection device", "Manual trip"]
  },
  inverter: {
    name: "Inverter",
    sub: "DC → AC",
    icon: "↕",
    props: ["5,000 W", "48 V DC input", "AC output"]
  },
  load: {
    name: "AC Load",
    sub: "Consumer",
    icon: "💡",
    props: ["850 W", "AC demand", "Variable"]
  },
  meter: {
    name: "Energy Meter",
    sub: "Measurement",
    icon: "▥",
    props: ["Voltage", "Current", "Energy"]
  }
};

/* =========================================================
   STATE
   ========================================================= */

let S = {
  name: "SolarLab Test System",
  desc: "48V solar power system simulation.",
  v: 48,
  panels: 4,
  pw: 550,
  ah: 200,
  iw: 5000,

  sun: 100,
  load: 850,
  soc: 76,

  nodes: [],
  connections: [],

  fault: "",
  running: false,
  seconds: 0,

  selectedNode: null,
  selectedWire: null,
  wiringFrom: null
};

/* =========================================================
   HELPERS
   ========================================================= */

function uid(prefix = "id") {
  return prefix + "_" + Date.now() + "_" +
    Math.random().toString(36).slice(2, 8);
}

function toast(message) {
  const t = $("toast");
  if (!t) return;

  t.textContent = message;
  t.style.display = "block";

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    t.style.display = "none";
  }, 1800);
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function show(id) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const page = $(id);

  if (!page) return;

  page.classList.add("active");

  if (id === "analysis") {
    analysis();
  }

  if (id === "report") {
    report();
  }
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    show(button.dataset.page);
  });
});

/* =========================================================
   PROJECT SETUP
   ========================================================= */

function readSetup() {
  S.name = $("pname").value;
  S.desc = $("pdesc").value;
  S.v = Number($("voltage").value);
  S.panels = Math.max(1, Number($("panelCount").value));
  S.pw = Math.max(50, Number($("panelW").value));
  S.ah = Math.max(20, Number($("batteryAh").value));
  S.iw = Math.max(100, Number($("inverterW").value));
}

[
  "pname",
  "pdesc",
  "voltage",
  "panelCount",
  "panelW",
  "batteryAh",
  "inverterW"
].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener("input", readSetup);
});

/* =========================================================
   COMPONENT CREATION
   ========================================================= */

function add(type, x, y) {
  const board = $("board");

  if (!board || !types[type]) return;

  const rect = board.getBoundingClientRect();

  const node = {
    id: uid("node"),
    type,
    x: x ?? Math.max(20, Math.min(350, rect.width / 2 - 75)),
    y: y ?? Math.max(70, Math.min(350, rect.height / 2 - 50))
  };

  S.nodes.push(node);

  clampNode(node);

  draw();

  selectNode(node);

  toast(types[type].name + " placed");
}

document.querySelectorAll(".component").forEach(button => {
  button.addEventListener("click", () => {
    add(button.dataset.type);
  });
});

/* =========================================================
   NODE HTML
   ========================================================= */

function nodeHTML(node) {
  const t = types[node.type];

  const visual =
    node.type === "panel"
      ? "visual pv"
      : "visual";

  return `
    <div class="${visual}">
      ${t.icon}
    </div>

    <b>${t.name}</b>

    <small>${t.sub}</small>

    <button
      class="nodeDelete"
      title="Remove component"
      type="button"
    >×</button>

    <button
      class="terminal plus"
      data-terminal="positive"
      title="Positive terminal"
      type="button"
    >+</button>

    <button
      class="terminal minus"
      data-terminal="negative"
      title="Negative terminal"
      type="button"
    >−</button>
  `;
}

/* =========================================================
   DRAW NODES
   ========================================================= */

function draw() {
  const container = $("nodes");

  if (!container) return;

  container.innerHTML = "";

  S.nodes.forEach(node => {

    const element = document.createElement("div");

    element.className = "node";

    if (S.selectedNode === node.id) {
      element.classList.add("selected");
    }

    element.dataset.id = node.id;

    element.style.left = node.x + "px";
    element.style.top = node.y + "px";

    element.innerHTML = nodeHTML(node);

    /* Node selection */
    element.addEventListener("click", event => {

      if (
        event.target.classList.contains("terminal") ||
        event.target.classList.contains("nodeDelete")
      ) {
        return;
      }

      selectNode(node);
    });

    /* Delete */
    const deleteButton =
      element.querySelector(".nodeDelete");

    deleteButton.addEventListener("click", event => {
      event.stopPropagation();
      removeNode(node.id);
    });

    /* Terminals */
    element.querySelectorAll(".terminal").forEach(terminal => {

      terminal.addEventListener("click", event => {

        event.stopPropagation();

        const terminalType =
          terminal.dataset.terminal;

        terminalClicked(node, terminalType);
      });
    });

    /* Drag */
    element.addEventListener(
      "pointerdown",
      event => dragStart(event, node, element)
    );

    container.appendChild(element);
  });

  const empty = $("empty");

  if (empty) {
    empty.style.display =
      S.nodes.length ? "none" : "grid";
  }

  drawWires();
}

/* =========================================================
   KEEP NODE INSIDE BOARD
   ========================================================= */

function clampNode(node) {
  const board = $("board");

  if (!board) return;

  const maxX =
    Math.max(10, board.clientWidth - 175);

  const maxY =
    Math.max(45, board.clientHeight - 125);

  node.x = Math.max(
    10,
    Math.min(node.x, maxX)
  );

  node.y = Math.max(
    45,
    Math.min(node.y, maxY)
  );
}

/* =========================================================
   DRAG SYSTEM
   ========================================================= */

function dragStart(event, node, element) {

  if (
    event.target.classList.contains("terminal") ||
    event.target.classList.contains("nodeDelete")
  ) {
    return;
  }

  event.preventDefault();

  const board = $("board");

  const rect = board.getBoundingClientRect();

  const startX =
    event.clientX - rect.left - node.x;

  const startY =
    event.clientY - rect.top - node.y;

  let moved = false;

  const move = e => {

    moved = true;

    const newRect =
      board.getBoundingClientRect();

    node.x =
      e.clientX -
      newRect.left -
      startX;

    node.y =
      e.clientY -
      newRect.top -
      startY;

    /* Grid snap */
    node.x = Math.round(node.x / 10) * 10;
    node.y = Math.round(node.y / 10) * 10;

    clampNode(node);

    element.style.left =
      node.x + "px";

    element.style.top =
      node.y + "px";

    drawWires();
  };

  const up = () => {

    document.removeEventListener(
      "pointermove",
      move
    );

    document.removeEventListener(
      "pointerup",
      up
    );

    if (moved) {
      saveSilently();
    }
  };

  document.addEventListener(
    "pointermove",
    move
  );

  document.addEventListener(
    "pointerup",
    up
  );
}

/* =========================================================
   TERMINAL / MANUAL WIRING
   ========================================================= */

function terminalClicked(node, terminal) {

  if (!S.wiringFrom) {

    S.wiringFrom = {
      nodeId: node.id,
      terminal
    };

    highlightTerminal(node.id, terminal);

    toast(
      `${types[node.type].name} ${terminal.toUpperCase()} selected`
    );

    return;
  }

  const from = S.wiringFrom;

  /* Same terminal */
  if (
    from.nodeId === node.id &&
    from.terminal === terminal
  ) {

    clearWiringSelection();

    toast("Connection cancelled");

    return;
  }

  createConnection(
    from.nodeId,
    from.terminal,
    node.id,
    terminal
  );

  clearWiringSelection();
}

/* =========================================================
   TERMINAL HIGHLIGHT
   ========================================================= */

function highlightTerminal(nodeId, terminal) {

  clearWiringSelection();

  const node =
    document.querySelector(
      `.node[data-id="${nodeId}"]`
    );

  if (!node) return;

  const target =
    node.querySelector(
      `.terminal.${terminal === "positive" ? "plus" : "minus"}`
    );

  if (target) {
    target.classList.add("wiring");
  }
}

function clearWiringSelection() {

  document
    .querySelectorAll(".terminal.wiring")
    .forEach(el => {
      el.classList.remove("wiring");
    });

  S.wiringFrom = null;
}

/* =========================================================
   CREATE CONNECTION
   ========================================================= */

function createConnection(
  fromNode,
  fromTerminal,
  toNode,
  toTerminal
) {

  /* Prevent duplicate connection */
  const duplicate =
    S.connections.some(c =>
      c.fromNode === fromNode &&
      c.fromTerminal === fromTerminal &&
      c.toNode === toNode &&
      c.toTerminal === toTerminal
    );

  if (duplicate) {
    toast("Connection already exists");
    return;
  }

  const connection = {
    id: uid("wire"),

    fromNode,
    fromTerminal,

    toNode,
    toTerminal
  };

  S.connections.push(connection);

  drawWires();

  detectFaults();

  saveSilently();

  toast("Single connection created");
}

/* =========================================================
   DRAW CUSTOM WIRES
   ========================================================= */

function drawWires() {

  const svg = $("wires");

  if (!svg) return;

  svg.innerHTML = "";

  S.connections.forEach(connection => {

    const a =
      S.nodes.find(n =>
        n.id === connection.fromNode
      );

    const b =
      S.nodes.find(n =>
        n.id === connection.toNode
      );

    if (!a || !b) return;

    const x1 =
      a.x +
      (connection.fromTerminal === "positive"
        ? 155
        : 0);

    const y1 =
      a.y + 62;

    const x2 =
      b.x +
      (connection.toTerminal === "positive"
        ? 155
        : 0);

    const y2 =
      b.y + 62;

    const curve =
      Math.max(
        40,
        Math.abs(x2 - x1) * 0.45
      );

    const path =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

    path.setAttribute(
      "d",
      `M ${x1} ${y1}
       C ${x1 + curve} ${y1},
         ${x2 - curve} ${y2},
         ${x2} ${y2}`
    );

    path.setAttribute(
      "fill",
      "none"
    );

    path.setAttribute(
      "stroke",
      wireColor(connection)
    );

    path.setAttribute(
      "stroke-width",
      S.selectedWire === connection.id
        ? "6"
        : "3"
    );

    path.setAttribute(
      "stroke-linecap",
      "round"
    );

    path.dataset.wireId =
      connection.id;

    path.style.pointerEvents = "stroke";

    path.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        S.selectedWire =
          connection.id;

        drawWires();

        showWireInspector(connection);
      }
    );

    svg.appendChild(path);
  });
}

/* =========================================================
   WIRE COLOR
   ========================================================= */

function wireColor(connection) {

  if (
    connection.fromTerminal === "positive" &&
    connection.toTerminal === "positive"
  ) {
    return "#ff5e5e";
  }

  if (
    connection.fromTerminal === "negative" &&
    connection.toTerminal === "negative"
  ) {
    return "#58aaff";
  }

  return "#59e49a";
}

/* =========================================================
   WIRE INSPECTOR
   ========================================================= */

function showWireInspector(connection) {

  const from =
    S.nodes.find(n =>
      n.id === connection.fromNode
    );

  const to =
    S.nodes.find(n =>
      n.id === connection.toNode
    );

  if (!from || !to) return;

  $("inspector").innerHTML = `
    <h3>Connection</h3>

    <p class="hint">
      Individual electrical connection
    </p>

    <div class="property">
      <span>From</span>
      <b>${types[from.type].name}</b>
    </div>

    <div class="property">
      <span>Terminal</span>
      <b>${connection.fromTerminal}</b>
    </div>

    <div class="property">
      <span>To</span>
      <b>${types[to.type].name}</b>
    </div>

    <div class="property">
      <span>Terminal</span>
      <b>${connection.toTerminal}</b>
    </div>

    <button
      class="fault"
      id="deleteWire"
      style="margin-top:18px"
    >
      Remove Connection
    </button>
  `;

  $("deleteWire").onclick = () => {
    removeConnection(connection.id);
  };
}

/* =========================================================
   REMOVE CONNECTION
   ========================================================= */

function removeConnection(id) {

  S.connections =
    S.connections.filter(
      c => c.id !== id
    );

  S.selectedWire = null;

  drawWires();

  detectFaults();

  toast("Connection removed");

  saveSilently();

  resetInspector();
}

/* =========================================================
   REMOVE COMPONENT
   ========================================================= */

function removeNode(id) {

  const node =
    S.nodes.find(n => n.id === id);

  if (!node) return;

  S.nodes =
    S.nodes.filter(n => n.id !== id);

  /* Remove all wires connected to node */
  S.connections =
    S.connections.filter(
      c =>
        c.fromNode !== id &&
        c.toNode !== id
    );

  if (S.selectedNode === id) {
    S.selectedNode = null;
  }

  draw();

  resetInspector();

  detectFaults();

  saveSilently();

  toast(types[node.type].name + " removed");
}

/* =========================================================
   INSPECTOR
   ========================================================= */

function selectNode(node) {

  S.selectedNode = node.id;
  S.selectedWire = null;

  draw();

  const t = types[node.type];

  $("inspector").innerHTML = `
    <h3>${t.name}</h3>

    <p class="hint">${t.sub}</p>

    ${t.props.map((p, i) => `
      <div class="property">
        <span>
          ${["Rating", "Specification", "Detail"][i] || "Property"}
        </span>
        <b>${p}</b>
      </div>
    `).join("")}

    <h4>Terminals</h4>

    <div class="terminalLegend">
      <span>
        <i class="dot red"></i>
        Positive
      </span>

      <span>
        <i class="dot blue"></i>
        Negative
      </span>
    </div>

    <p class="hint" style="margin-top:15px">
      Tap a terminal, then tap another terminal
      to create one connection.
    </p>

    <button
      class="fault"
      style="margin-top:12px"
      onclick="removeNode('${node.id}')"
    >
      Remove Component
    </button>
  `;
}

function resetInspector() {

  $("inspector").innerHTML = `
    <h3>Inspector</h3>

    <p class="hint">
      Select a component or connection.
    </p>
  `;
}

/* =========================================================
   AUTO WIRE
   ========================================================= */

$("autoWire").onclick = () => {

  const order = [
    "panel",
    "mppt",
    "battery",
    "breaker",
    "inverter",
    "load"
  ];

  /* Add missing components */
  order.forEach((type, i) => {

    if (!S.nodes.some(n => n.type === type)) {

      add(
        type,
        40 + i * 180,
        230
      );
    }
  });

  /* Position */
  order.forEach((type, i) => {

    const node =
      S.nodes.find(n =>
        n.type === type
      );

    if (!node) return;

    node.x = 40 + i * 180;
    node.y = 230;
  });

  /* Clear previous wires */
  S.connections = [];

  const nodes =
    order.map(type =>
      S.nodes.find(n =>
        n.type === type
      )
    );

  for (let i = 0; i < nodes.length - 1; i++) {

    const a = nodes[i];
    const b = nodes[i + 1];

    if (!a || !b) continue;

    createConnection(
      a.id,
      "positive",
      b.id,
      "negative"
    );
  }

  draw();

  toast("Series connection created");
};

/* =========================================================
   CLEAR WORKSPACE
   ========================================================= */

$("clear").onclick = () => {

  if (!confirm("Clear all components and connections?")) {
    return;
  }

  S.nodes = [];
  S.connections = [];

  S.selectedNode = null;
  S.selectedWire = null;

  draw();

  resetInspector();

  saveSilently();

  toast("Workspace cleared");
};

/* =========================================================
   DEMO
   ========================================================= */

$("loadDemo").onclick = () => {

  $("pname").value =
    "SolarLab Demo System";

  readSetup();

  S.nodes = [];
  S.connections = [];

  const demo = [
    ["panel", 40, 230],
    ["mppt", 220, 230],
    ["battery", 400, 230],
    ["breaker", 580, 230],
    ["inverter", 760, 230],
    ["load", 940, 230],
    ["meter", 760, 400]
  ];

  demo.forEach(([type, x, y]) => {
    S.nodes.push({
      id: uid("node"),
      type,
      x,
      y
    });
  });

  const find = type =>
    S.nodes.find(n => n.type === type);

  const series = [
    ["panel", "mppt"],
    ["mppt", "battery"],
    ["battery", "breaker"],
    ["breaker", "inverter"],
    ["inverter", "load"]
  ];

  series.forEach(([a, b]) => {

    const A = find(a);
    const B = find(b);

    S.connections.push({
      id: uid("wire"),
      fromNode: A.id,
      fromTerminal: "positive",
      toNode: B.id,
      toTerminal: "negative"
    });
  });

  draw();

  show("design");

  toast("Demo system loaded");
};

/* =========================================================
   KEYBOARD DELETE
   ========================================================= */

document.addEventListener("keydown", event => {

  if (
    event.key !== "Delete" &&
    event.key !== "Backspace"
  ) {
    return;
  }

  /* Do not delete while typing */
  const tag =
    document.activeElement?.tagName;

  if (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT"
  ) {
    return;
  }

  if (S.selectedWire) {

    removeConnection(
      S.selectedWire
    );

    return;
  }

  if (S.selectedNode) {

    removeNode(
      S.selectedNode
    );
  }
});

/* =========================================================
   SIMULATION
   ========================================================= */

function calc() {

  const pv =
    S.panels *
    S.pw *
    S.sun /
    100 /
    1000;

  const load =
    S.load / 1000;

  const inv =
    load /
    (S.iw / 1000) *
    100;

  return {
    pv,
    load,
    inv,

    prod: pv * 6,

    demand:
      load * 24
  };
}

/* =========================================================
   FAULT ENGINE
   ========================================================= */

function detectFaults() {

  const faults = [];

  const c = calc();

  /* Inverter overload */
  if (c.inv > 100) {
    faults.push(
      "INVERTER OVERLOAD"
    );
  }

  /* Connection polarity */
  S.connections.forEach(connection => {

    if (
      connection.fromTerminal ===
      connection.toTerminal
    ) {

      faults.push(
        "POLARITY / TERMINAL ERROR"
      );
    }
  });

  /* Open circuit */
  const requiredTypes = [
    "panel",
    "mppt",
    "battery",
    "inverter",
    "load"
  ];

  const hasAll =
    requiredTypes.every(type =>
      S.nodes.some(n =>
        n.type === type
      )
    );

  if (
    hasAll &&
    S.connections.length === 0
  ) {
    faults.push(
      "OPEN CIRCUIT"
    );
  }

  /* Very simple short-circuit detection */
  S.connections.forEach(connection => {

    if (
      connection.fromNode ===
      connection.toNode
    ) {

      faults.push(
        "SHORT CIRCUIT"
      );
    }
  });

  /* Battery direct PV warning */
  S.connections.forEach(connection => {

    const a =
      S.nodes.find(n =>
        n.id === connection.fromNode
      );

    const b =
      S.nodes.find(n =>
        n.id === connection.toNode
      );

    if (!a || !b) return;

    const pair = [
      a.type,
      b.type
    ].sort().join("-");

    if (pair === "battery-panel") {

      faults.push(
        "PV DIRECT BATTERY CONNECTION"
      );
    }
  });

  if (faults.length) {

    S.fault =
      [...new Set(faults)].join(" | ");

  } else {

    S.fault = "";
  }

  updateFaultBox();
}

function updateFaultBox() {

  const box = $("faultBox");

  if (!box) return;

  if (S.fault) {

    box.className =
      "status danger";

    box.textContent =
      "⚠ " + S.fault;

  } else {

    box.className =
      "status ok";

    box.textContent =
      "● No active faults";
  }
}

/* =========================================================
   EXPERIMENT UI
   ========================================================= */

function updateExperiment() {

  S.sun =
    Number($("sun").value);

  S.load =
    Number($("loadW").value);

  S.soc =
    Math.max(
      0,
      Math.min(
        100,
        Number($("socW").value)
      )
    );

  const c = calc();

  $("sunOut").textContent =
    S.sun + "%";

  $("mPV").textContent =
    c.pv.toFixed(2) + " kW";

  $("mLoad").textContent =
    c.load.toFixed(2) + " kW";

  $("mSOC").textContent =
    S.soc + "%";

  $("mInv").textContent =
    c.inv.toFixed(0) + "%";

  $("pvNode").textContent =
    c.pv.toFixed(2) + " kW";

  $("loadNode").textContent =
    S.load + " W";

  $("batNode").textContent =
    S.soc + "% SOC";

  $("invNode").textContent =
    c.inv.toFixed(0) + "% load";

  detectFaults();

  $("simNote").textContent =
    S.running
      ? S.fault
        ? "Fault condition active. Protection response simulated."
        : "Power is flowing through the virtual system."
      : "System ready. Start simulation to see live power flow.";
}

["sun", "loadW", "socW"].forEach(id => {

  $(id).addEventListener(
    "input",
    () => {
      updateExperiment();
    }
  );
});

/* =========================================================
   START / STOP
   ========================================================= */

$("simulate").onclick = () => {

  S.running =
    !S.running;

  $("simulate").textContent =
    S.running
      ? "■ Stop Simulation"
      : "▶ Start Simulation";

  $("simState").textContent =
    S.running
      ? "RUNNING"
      : "READY";

  updateExperiment();

  toast(
    S.running
      ? "Simulation started"
      : "Simulation stopped"
  );
};

/* =========================================================
   FAULT BUTTONS
   ========================================================= */

$("overload").onclick = () => {

  S.fault =
    "INVERTER OVERLOAD";

  S.load =
    Math.max(
      S.iw * 1.25,
      6500
    );

  $("loadW").value =
    S.load;

  updateExperiment();

  toast("Overload test triggered");
};

$("reverse").onclick = () => {

  S.fault =
    "WRONG POLARITY";

  updateFaultBox();

  $("simNote").textContent =
    "Wrong polarity fault simulated.";

  toast("Wrong polarity test triggered");
};

$("short").onclick = () => {

  S.fault =
    "SHORT CIRCUIT";

  updateFaultBox();

  $("simNote").textContent =
    "Short circuit protection simulated.";

  toast("Short-circuit test triggered");
};

/* =========================================================
   TIMER
   ========================================================= */

setInterval(() => {

  if (!S.running) return;

  S.seconds++;

  const h =
    String(
      Math.floor(
        S.seconds / 3600
      )
    ).padStart(2, "0");

  const m =
    String(
      Math.floor(
        S.seconds / 60
      ) % 60
    ).padStart(2, "0");

  const s =
    String(
      S.seconds % 60
    ).padStart(2, "0");

  $("simTime").textContent =
    `${h}:${m}:${s}`;

}, 1000);

/* =========================================================
   ANALYSIS
   ========================================================= */

function analysis() {

  const c = calc();

  let score = 100;

  if (c.inv > 100)
    score -= 35;

  if (c.prod < c.demand)
    score -= 15;

  if (S.fault)
    score -= 20;

  if (!S.connections.length)
    score -= 10;

  score =
    Math.max(
      0,
      Math.round(score)
    );

  $("score").textContent =
    score;

  $("checks").innerHTML = [

    ["PV array",
      `${c.pv.toFixed(2)} kW`],

    ["AC demand",
      `${S.load} W`],

    ["Inverter utilization",
      `${c.inv.toFixed(0)}%`],

    ["Daily PV estimate",
      `${c.prod.toFixed(1)} kWh`],

    ["Daily load estimate",
      `${c.demand.toFixed(1)} kWh`],

    ["Connections",
      `${S.connections.length}`],

    ["Fault state",
      S.fault || "Normal"]

  ].map(item => `
    <div class="check">
      ${item[0]}
      <b>${item[1]}</b>
    </div>
  `).join("");

  $("chart").innerHTML = "";

  for (let i = 0; i < 24; i++) {

    const energy =
      Math.max(
        3,
        Math.sin(
          (i - 6) /
          12 *
          Math.PI
        ) * 100
      );

    const bar =
      document.createElement("i");

    bar.className =
      "bar";

    bar.style.height =
      energy + "%";

    $("chart").appendChild(bar);
  }
}

/* =========================================================
   REPORT
   ========================================================= */

function report() {

  const c = calc();

  const reportBox =
    const reportBox =
    $("reportContent");

  if (!reportBox) return;

  reportBox.innerHTML = `

    <h2>${S.name}</h2>

    <p>${S.desc}</p>

    <table>

      <tr>
        <td>System voltage</td>
        <td><b>${S.v} V</b></td>
      </tr>

      <tr>
        <td>Solar array</td>
        <td>
          <b>
            ${S.panels} × ${S.pw} W =
            ${(S.panels * S.pw / 1000).toFixed(2)} kWp
          </b>
        </td>
      </tr>

      <tr>
        <td>Battery bank</td>
        <td>
          <b>${S.v} V / ${S.ah} Ah</b>
        </td>
      </tr>

      <tr>
        <td>Inverter</td>
        <td>
          <b>${S.iw} W</b>
        </td>
      </tr>

      <tr>
        <td>PV output</td>
        <td>
          <b>${c.pv.toFixed(2)} kW</b>
        </td>
      </tr>

      <tr>
        <td>AC load</td>
        <td>
          <b>${S.load} W</b>
        </td>
      </tr>

      <tr>
        <td>Battery SOC</td>
        <td>
          <b>${S.soc}%</b>
        </td>
      </tr>

      <tr>
        <td>Connections</td>
        <td>
          <b>${S.connections.length}</b>
        </td>
      </tr>

      <tr>
        <td>Fault state</td>
        <td>
          <b>${S.fault || "Normal"}</b>
        </td>
      </tr>

    </table>

    <p
      style="
        margin-top:20px;
        color:#718ba2;
        font-size:11px
      "
    >
      Educational simulation only.
      Verify real-world systems with component
      datasheets, electrical calculations,
      applicable standards and qualified
      professionals.
    </p>
  `;
}

/* =========================================================
   SAVE / LOAD
   ========================================================= */

function saveSilently() {

  try {

    localStorage.setItem(
      "SolarLabV3",
      JSON.stringify(S)
    );

  } catch (error) {

    console.warn(
      "Save failed",
      error
    );
  }
}

$("save").onclick = () => {

  readSetup();

  saveSilently();

  toast(
    "Project saved locally"
  );
};

/* =========================================================
   LOAD SAVED PROJECT
   ========================================================= */

function loadSaved() {

  try {

    const saved =
      localStorage.getItem(
        "SolarLabV3"
      );

    if (!saved) return;

    const loaded =
      JSON.parse(saved);

    S = {
      ...S,
      ...loaded
    };

  } catch (error) {

    console.warn(
      "Could not load project",
      error
    );
  }
}

/* =========================================================
   PRINT
   ========================================================= */

$("print").onclick = () => {
  window.print();
};

/* =========================================================
   INITIALIZE
   ========================================================= */

function init() {

  loadSaved();

  $("pname").value =
    S.name;

  $("pdesc").value =
    S.desc;

  $("voltage").value =
    S.v;

  $("panelCount").value =
    S.panels;

  $("panelW").value =
    S.pw;

  $("batteryAh").value =
    S.ah;

  $("inverterW").value =
    S.iw;

  $("sun").value =
    S.sun;

  $("loadW").value =
    S.load;

  $("socW").value =
    S.soc;

  draw();

  updateExperiment();

  analysis();
}

init();

/* =========================================================
   RESPONSIVE RESIZE
   ========================================================= */

window.addEventListener(
  "resize",
  () => {

    S.nodes.forEach(
      clampNode
    );

    draw();
  }
);
