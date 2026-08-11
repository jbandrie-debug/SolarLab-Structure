/* =========================================================
   SOLARLAB STRUCTURE V3
   INTERACTIVE CONNECTION ENGINE
========================================================= */

"use strict";


/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {

  page: "welcome",

  mode: "select",

  nodes: [],

  connections: [],

  selectedNode: null,

  selectedConnection: null,

  pendingTerminal: null,

  history: [],

  simulationRunning: false,

  simulationSeconds: 0,

  faults: [],

  project: {
    name: "SolarLab V3 Test System",
    description: "Interactive 48V solar power system simulation.",
    voltage: 48,
    panelCount: 4,
    panelRating: 550,
    batteryAh: 200,
    inverterRating: 5000
  }

};


/* =========================================================
   COMPONENT DEFINITIONS
========================================================= */

const COMPONENTS = {

  panel: {
    name: "Solar Panel",
    icon: "☀",
    voltage: 48,
    power: 550,
    terminals: ["positive", "negative"]
  },

  mppt: {
    name: "MPPT Controller",
    icon: "⚙",
    voltage: 48,
    power: 0,
    terminals: [
      "positive",
      "negative"
    ]
  },

  battery: {
    name: "Battery Bank",
    icon: "🔋",
    voltage: 48,
    power: 0,
    terminals: [
      "positive",
      "negative"
    ]
  },

  breaker: {
    name: "DC Breaker",
    icon: "▣",
    voltage: 48,
    power: 0,
    terminals: [
      "positive",
      "negative"
    ]
  },

  inverter: {
    name: "Inverter",
    icon: "↕",
    voltage: 48,
    power: 5000,
    terminals: [
      "positive",
      "negative",
      "ac"
    ]
  },

  load: {
    name: "AC Load",
    icon: "💡",
    voltage: 230,
    power: 850,
    terminals: [
      "ac"
    ]
  },

  meter: {
    name: "Energy Meter",
    icon: "▥",
    voltage: 230,
    power: 0,
    terminals: [
      "ac"
    ]
  }

};


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  Array.from(document.querySelectorAll(selector));


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  setupNavigation();

  setupToolbar();

  setupLibrary();

  setupExperiment();

  setupFaults();

  setupSave();

  setupReport();

  loadProjectData();

  renderAll();

});


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  $$("[data-page]").forEach(button => {

    button.addEventListener("click", () => {

      const page = button.dataset.page;

      if (page) {
        showPage(page);
      }

    });

  });

}


function showPage(page) {

  const pageMap = {
    welcome: "welcome",
    setup: "setup",
    design: "design",
    experiment: "experiment",
    analysis: "analysis",
    report: "reportPage",
    support: "support"
  };

  const target = pageMap[page] || page;

  $$(".page").forEach(section => {
    section.classList.remove("active");
  });

  const targetPage = document.getElementById(target);

  if (targetPage) {
    targetPage.classList.add("active");
  }

  $$(".mainNav button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  state.page = page;

  if (page === "analysis") {
    runAnalysis();
  }

  if (page === "report") {
    generateReport();
  }

}


/* =========================================================
   TOOLBAR
========================================================= */

function setupToolbar() {

  $("#selectMode").addEventListener(
    "click",
    () => setMode("select")
  );

  $("#connectMode").addEventListener(
    "click",
    () => setMode("connect")
  );

  $("#seriesMode").addEventListener(
    "click",
    () => setMode("series")
  );

  $("#parallelMode").addEventListener(
    "click",
    () => setMode("parallel")
  );


  $("#autoWire").addEventListener(
    "click",
    autoWire
  );


  $("#removeSelected").addEventListener(
    "click",
    removeSelected
  );


  $("#undoBtn").addEventListener(
    "click",
    undo
  );


  $("#clearBoard").addEventListener(
    "click",
    clearBoard
  );

}


function setMode(mode) {

  state.mode = mode;

  state.pendingTerminal = null;

  $$(".tool").forEach(button => {
    button.classList.remove("active");
  });

  const buttonMap = {
    select: "#selectMode",
    connect: "#connectMode",
    series: "#seriesMode",
    parallel: "#parallelMode"
  };

  $(buttonMap[mode])?.classList.add("active");

  $("#currentMode").textContent =
    mode.toUpperCase();


  const messages = {

    select:
      "SELECT mode: click a component to inspect it. Drag components to reposition them.",

    connect:
      "CONNECT mode: click one terminal, then another terminal to create a connection.",

    series:
      "SERIES mode: connect components in sequence. Each wire is stored independently.",

    parallel:
      "PARALLEL mode: connect multiple branches to the same electrical points."

  };

  $("#connectionHint").textContent =
    messages[mode];

}


/* =========================================================
   COMPONENT LIBRARY
========================================================= */

function setupLibrary() {

  $$(".component").forEach(button => {

    button.addEventListener("click", () => {

      addNode(button.dataset.type);

    });

  });

}


function addNode(type, x = null, y = null) {

  if (!COMPONENTS[type]) {
    return;
  }

  saveHistory();


  const existingCount =
    state.nodes.filter(node =>
      node.type === type
    ).length;


  const board = $("#board");

  const boardRect =
    board.getBoundingClientRect();


  if (x === null) {

    x =
      50 +
      (existingCount % 3) * 180;

  }


  if (y === null) {

    y =
      80 +
      Math.floor(existingCount / 3) * 150;

  }


  x = clamp(
    x,
    15,
    Math.max(15, boardRect.width - 175)
  );

  y = clamp(
    y,
    50,
    Math.max(50, boardRect.height - 130)
  );


  const node = {

    id:
      `${type}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,

    type,

    x,

    y,

    voltage:
      COMPONENTS[type].voltage,

    power:
      COMPONENTS[type].power,

    label:
      COMPONENTS[type].name,

    terminals:
      COMPONENTS[type].terminals.map(
        terminal => ({
          id: terminal,
          type: terminal
        })
      )

  };


  state.nodes.push(node);

  state.selectedNode = node.id;

  renderBoard();

  updateInspector();

  toast(
    `${COMPONENTS[type].name} added.`
  );

}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderBoard() {

  const layer = $("#nodeLayer");

  layer.innerHTML = "";

  state.nodes.forEach(node => {

    const element =
      document.createElement("div");

    element.className = "node";

    element.dataset.id = node.id;

    if (state.selectedNode === node.id) {
      element.classList.add("selected");
    }


    if (
      nodeHasError(node.id)
    ) {
      element.classList.add("error");
    }


    element.style.left =
      `${node.x}px`;

    element.style.top =
      `${node.y}px`;


    element.innerHTML = `

      <div class="nodeHeader">

        <span class="nodeTitle">
          ${escapeHTML(node.label)}
        </span>

        <span class="nodeId">
          ${node.id.slice(-4)}
        </span>

      </div>

      <div class="nodeBody">

        <span class="nodeIcon">
          ${COMPONENTS[node.type].icon}
        </span>

        <span class="nodeInfo">

          <small>
            ${node.voltage}V
          </small>

          <strong>
            ${node.power || 0}W
          </strong>

        </span>

      </div>
    `;


    node.terminals.forEach(
      terminal => {

        const terminalElement =
          createTerminal(
            node,
            terminal
          );

        element.appendChild(
          terminalElement
        );

      }
    );


    setupNodeInteraction(
      element,
      node
    );


    layer.appendChild(element);

  });


  $("#boardEmpty").style.display =
    state.nodes.length
      ? "none"
      : "block";


  renderWires();

}


function createTerminal(node, terminal) {

  const element =
    document.createElement("div");

  element.className =
    `terminal ${terminal.type}`;

  element.dataset.node =
    node.id;

  element.dataset.terminal =
    terminal.id;


  element.title =
    `${node.label} • ${terminal.id}`;


  element.addEventListener(
    "pointerdown",
    event => {

      event.stopPropagation();

      handleTerminalClick(
        node.id,
        terminal.id
      );

    }
  );


  return element;

}


/* =========================================================
   NODE DRAGGING
========================================================= */

function setupNodeInteraction(
  element,
  node
) {

  let dragging = false;

  let moved = false;

  let startX = 0;

  let startY = 0;

  let originalX = node.x;

  let originalY = node.y;


  element.addEventListener(
    "pointerdown",
    event => {

      if (
        event.target.classList.contains(
          "terminal"
        )
      ) {
        return;
      }


      event.preventDefault();

      dragging = true;

      moved = false;

      startX = event.clientX;

      startY = event.clientY;

      originalX = node.x;

      originalY = node.y;

      element.setPointerCapture(
        event.pointerId
      );


      state.selectedNode =
        node.id;

      state.selectedConnection =
        null;

      renderBoard();

      updateInspector();

    }
  );


  element.addEventListener(
    "pointermove",
    event => {

      if (!dragging) {
        return;
      }


      const dx =
        event.clientX - startX;

      const dy =
        event.clientY - startY;


      if (
        Math.abs(dx) > 3 ||
        Math.abs(dy) > 3
      ) {
        moved = true;
      }


      const board =
        $("#board");

      const rect =
        board.getBoundingClientRect();


      node.x =
        clamp(
          originalX + dx,
          10,
          rect.width - element.offsetWidth - 10
        );


      node.y =
        clamp(
          originalY + dy,
          40,
          rect.height - element.offsetHeight - 10
        );


      element.style.left =
        `${node.x}px`;

      element.style.top =
        `${node.y}px`;


      renderWires();

    }
  );


  element.addEventListener(
    "pointerup",
    event => {

      if (!dragging) {
        return;
      }


      dragging = false;


      try {
        element.releasePointerCapture(
          event.pointerId
        );
      } catch (_) {}


      if (moved) {

        saveHistory();

        toast("Component moved.");

      } else {

        state.selectedNode =
          node.id;

        updateInspector();

      }

    }
  );

}


/* =========================================================
   TERMINAL CONNECTION ENGINE
========================================================= */

function handleTerminalClick(
  nodeId,
  terminalId
) {

  const terminal = {
    nodeId,
    terminalId
  };


  if (!state.pendingTerminal) {

    state.pendingTerminal =
      terminal;

    highlightTerminal(
      nodeId,
      terminalId
    );

    toast(
      "First terminal selected. Choose the second terminal."
    );

    return;
  }


  const first =
    state.pendingTerminal;

  const second =
    terminal;


  state.pendingTerminal = null;


  clearTerminalHighlights();


  if (
    first.nodeId === second.nodeId &&
    first.terminalId === second.terminalId
  ) {

    toast(
      "You cannot connect a terminal to itself.",
      true
    );

    return;
  }


  const validation =
    validateConnection(
      first,
      second
    );


  if (!validation.valid) {

    toast(
      validation.message,
      true
    );

    addFault(
      validation.fault
    );

    renderBoard();

    return;
  }


  createConnection(
    first,
    second,
    state.mode === "select"
      ? "single"
      : state.mode
  );

}


/* =========================================================
   CONNECTION VALIDATION
========================================================= */

function validateConnection(
  a,
  b
) {

  const nodeA =
    getNode(a.nodeId);

  const nodeB =
    getNode(b.nodeId);


  if (!nodeA || !nodeB) {

    return {
      valid: false,
      message: "Component not found.",
      fault: "open"
    };

  }


  if (
    connectionExists(
      a,
      b
    )
  ) {

    return {
      valid: false,
      message: "Duplicate connection already exists.",
      fault: "duplicate"
    };

  }


  const typeA =
    a.terminalId;

  const typeB =
    b.terminalId;


  /*
    AC-to-DC and DC-to-AC checks.
  */

  const acA =
    typeA === "ac";

  const acB =
    typeB === "ac";


  if (
    acA !== acB
  ) {

    return {
      valid: false,
      message:
        "Incompatible terminal: AC cannot be directly connected to a DC terminal.",
      fault: "voltage"
    };

  }


  /*
    Load can only connect through AC.
  */

  if (
    nodeA.type === "load" &&
    !acB
  ) {

    return {
      valid: false,
      message:
        "AC Load requires an AC connection.",
      fault: "voltage"
    };

  }


  if (
    nodeB.type === "load" &&
    !acA
  ) {

    return {
      valid: false,
      message:
        "AC Load requires an AC connection.",
      fault: "voltage"
    };

  }


  /*
    Energy meter is AC in this model.
  */

  if (
    nodeA.type === "meter" &&
    !acB
  ) {

    return {
      valid: false,
      message:
        "Energy Meter requires an AC terminal.",
      fault: "voltage"
    };

  }


  if (
    nodeB.type === "meter" &&
    !acA
  ) {

    return {
      valid: false,
      message:
        "Energy Meter requires an AC terminal.",
      fault: "voltage"
    };

  }


  /*
    Same polarity direct connection.
  */

  if (
    (typeA === "positive" &&
      typeB === "positive") ||
    (typeA === "negative" &&
      typeB === "negative")
  ) {

    /*
      Allow same polarity for parallel.
      This is useful for intentionally
      creating parallel branches.
    */

    if (
      state.mode !== "parallel"
    ) {

      return {
        valid: false,
        message:
          "Same-polarity connection detected. Use PARALLEL mode for intentional parallel wiring.",
        fault: "polarity"
      };

    }

  }


  /*
    Inverter AC terminal must connect
    to AC equipment.
  */

  if (
    nodeA.type === "inverter" &&
    typeA === "ac" &&
    nodeB.type === "inverter"
  ) {

    return {
      valid: false,
      message:
        "Invalid inverter-to-inverter AC connection.",
      fault: "short"
    };

  }


  return {
    valid: true
  };

}


/* =========================================================
   CREATE CONNECTION
========================================================= */

function createConnection(
  a,
  b,
  mode = "single"
) {

  saveHistory();


  const connection = {

    id:
      `wire-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,

    from: {
      nodeId: a.nodeId,
      terminalId: a.terminalId
    },

    to: {
      nodeId: b.nodeId,
      terminalId: b.terminalId
    },

    mode,

    created:
      new Date().toISOString()

  };


  state.connections.push(
    connection
  );


  state.selectedConnection =
    connection.id;

  state.selectedNode = null;


  renderWires();

  renderConnectionList();

  updateInspector();

  toast(
    `${mode.toUpperCase()} connection created.`
  );


  updateSystemFaults();

}


/* =========================================================
   DUPLICATE CONNECTION
========================================================= */

function connectionExists(
  a,
  b
) {

  return state.connections.some(
    connection => {

      const sameDirection =
        connection.from.nodeId === a.nodeId &&
        connection.from.terminalId === a.terminalId &&
        connection.to.nodeId === b.nodeId &&
        connection.to.terminalId === b.terminalId;


      const reverseDirection =
        connection.from.nodeId === b.nodeId &&
        connection.from.terminalId === b.terminalId &&
        connection.to.nodeId === a.nodeId &&
        connection.to.terminalId === a.terminalId;


      return (
        sameDirection ||
        reverseDirection
      );

    }
  );

}


/* =========================================================
   RENDER WIRES
========================================================= */

function renderWires() {

  const svg =
    $("#wireLayer");

  const board =
    $("#board");

  const rect =
    board.getBoundingClientRect();


  svg.setAttribute(
    "viewBox",
    `0 0 ${rect.width} ${rect.height}`
  );


  svg.innerHTML = "";


  state.connections.forEach(
    connection => {

      const from =
        getTerminalPosition(
          connection.from
        );

      const to =
        getTerminalPosition(
          connection.to
        );


      if (!from || !to) {
        return;
      }


      const path =
        createWirePath(
          from,
          to
        );


      const pathElement =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );


      pathElement.setAttribute(
        "d",
        path
      );


      pathElement.classList.add(
        "wire"
      );


      if (
        connection.mode === "series"
      ) {
        pathElement.classList.add(
          "series"
        );
      }


      if (
        connection.mode === "parallel"
      ) {
        pathElement.classList.add(
          "parallel"
        );
      }


      if (
        connectionHasFault(
          connection
        )
      ) {
        pathElement.classList.add(
          "fault"
        );
      }


      if (
        state.selectedConnection ===
        connection.id
      ) {
        pathElement.classList.add(
          "selected"
        );
      }


      pathElement.dataset.id =
        connection.id;


      pathElement.style.pointerEvents =
        "stroke";


      pathElement.addEventListener(
        "pointerdown",
        event => {

          event.stopPropagation();

          state.selectedConnection =
            connection.id;

          state.selectedNode =
            null;

          renderWires();

          updateInspector();

        }
      );


      svg.appendChild(
        pathElement
      );

    }
  );

}


function createWirePath(
  a,
  b
) {

  const dx =
    Math.abs(b.x - a.x);

  const bend =
    Math.max(
      50,
      dx * .45
    );


  return `
    M ${a.x} ${a.y}
    C ${a.x + bend} ${a.y},
      ${b.x - bend} ${b.y},
      ${b.x} ${b.y}
  `;

}


/* =========================================================
   TERMINAL POSITION
========================================================= */

function getTerminalPosition(
  endpoint
) {

  const node =
    getNode(endpoint.nodeId);


  if (!node) {
    return null;
  }


  const element =
    document.querySelector(
      `.node[data-id="${CSS.escape(node.id)}"]`
    );


  if (!element) {
    return null;
  }


  const terminal =
    element.querySelector(
      `.terminal[data-terminal="${endpoint.terminalId}"]`
    );


  if (!terminal) {
    return null;
  }


  const board =
    $("#board");

  const boardRect =
    board.getBoundingClientRect();

  const terminalRect =
    terminal.getBoundingClientRect();


  return {

    x:
      terminalRect.left -
      boardRect.left +
      terminalRect.width / 2,

    y:
      terminalRect.top -
      boardRect.top +
      terminalRect.height / 2

  };

}


/* =========================================================
   AUTO WIRE
========================================================= */

function autoWire() {

  if (
    state.nodes.length === 0
  ) {

    toast(
      "Add components first.",
      true
    );

    return;
  }


  saveHistory();


  /*
    Find nodes by type.
  */

  const panels =
    state.nodes.filter(
      n => n.type === "panel"
    );

  const mppt =
    state.nodes.find(
      n => n.type === "mppt"
    );

  const battery =
    state.nodes.find(
      n => n.type === "battery"
    );

  const breaker =
    state.nodes.find(
      n => n.type === "breaker"
    );

  const inverter =
    state.nodes.find(
      n => n.type === "inverter"
    );

  const load =
    state.nodes.find(
      n => n.type === "load"
    );


  /*
    PV panels parallel into MPPT.
  */

  if (mppt) {

    panels.forEach(panel => {

      safeCreateConnection(
        panel,
        "positive",
        mppt,
        "positive",
        "parallel"
      );


      safeCreateConnection(
        panel,
        "negative",
        mppt,
        "negative",
        "parallel"
      );

    });

  }


  /*
    MPPT to battery.
  */

  if (
    mppt &&
    battery
  ) {

    safeCreateConnection(
      mppt,
      "positive",
      battery,
      "positive",
      "single"
    );


    safeCreateConnection(
      mppt,
      "negative",
      battery,
      "negative",
      "single"
    );

  }


  /*
    Battery through breaker.
  */

  if (
    battery &&
    breaker
  ) {

    safeCreateConnection(
      battery,
      "positive",
      breaker,
      "positive",
      "single"
    );

    safeCreateConnection(
      battery,
      "negative",
      breaker,
      "negative",
      "single"
    );

  }


  /*
    Breaker to inverter.
  */

  if (
    breaker &&
    inverter
  ) {

    safeCreateConnection(
      breaker,
      "positive",
      inverter,
      "positive",
      "single"
    );

    safeCreateConnection(
      breaker,
      "negative",
      inverter,
      "negative",
      "single"
    );

  }


  /*
    Inverter AC to load.
  */

  if (
    inverter &&
    load
  ) {

    safeCreateConnection(
      inverter,
      "ac",
      load,
      "ac",
      "single"
    );

  }


  state.mode = "select";

  setMode("select");

  renderAll();

  toast(
    "Auto Wire completed. Review every connection before simulation."
  );

}


/* =========================================================
   SAFE AUTO CONNECTION
========================================================= */

function safeCreateConnection(
  nodeA,
  terminalA,
  nodeB,
  terminalB,
  mode
) {

  const a = {
    nodeId: nodeA.id,
    terminalId: terminalA
  };

  const b = {
    nodeId: nodeB.id,
    terminalId: terminalB
  };


  if (
    connectionExists(a,b)
  ) {
    return;
  }


  state.connections.push({

    id:
      `wire-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,

    from: a,

    to: b,

    mode,

    created:
      new Date().toISOString()

  });

}


/* =========================================================
   REMOVE SELECTED
========================================================= */

function removeSelected() {

  if (
    state.selectedConnection
  ) {

    saveHistory();

    state.connections =
      state.connections.filter(
        connection =>
          connection.id !==
          state.selectedConnection
      );


    state.selectedConnection =
      null;


    renderAll();

    toast(
      "Connection removed."
    );

    return;
  }


  if (
    state.selectedNode
  ) {

    saveHistory();


    const nodeId =
      state.selectedNode;


    state.connections =
      state.connections.filter(
        connection =>
          connection.from.nodeId !== nodeId &&
          connection.to.nodeId !== nodeId
      );


    state.nodes =
      state.nodes.filter(
        node =>
          node.id !== nodeId
      );


    state.selectedNode =
      null;


    renderAll();

    toast(
      "Component and its connections removed."
    );

    return;
  }


  toast(
    "Select a component or connection first.",
    true
  );

}


/* =========================================================
   CLEAR BOARD
========================================================= */

function clearBoard() {

  if (
    !state.nodes.length &&
    !state.connections.length
  ) {
    return;
  }


  if (
    !confirm(
      "Clear all components and connections?"
    )
  ) {
    return;
  }


  saveHistory();


  state.nodes = [];

  state.connections = [];

  state.selectedNode = null;

  state.selectedConnection = null;

  state.pendingTerminal = null;

  renderAll();

  toast(
    "Workspace cleared."
  );

}


/* =========================================================
   UNDO
========================================================= */

function saveHistory() {

  state.history.push(
    JSON.stringify({
      nodes: state.nodes,
      connections: state.connections
    })
  );


  if (
    state.history.length > 30
  ) {
    state.history.shift();
  }

}


function undo() {

  const previous =
    state.history.pop();


  if (!previous) {

    toast(
      "Nothing to undo.",
      true
    );

    return;
  }


  const data =
    JSON.parse(previous);


  state.nodes =
    data.nodes || [];


  state.connections =
    data.connections || [];


  state.selectedNode = null;

  state.selectedConnection = null;

  renderAll();

  toast(
    "Previous workspace state restored."
  );

}


/* =========================================================
   INSPECTOR
========================================================= */

function updateInspector() {

  const container =
    $("#inspectorContent");


  if (
    state.selectedConnection
  ) {

    const connection =
      state.connections.find(
        item =>
          item.id ===
          state.selectedConnection
      );


    if (!connection) {
      return;
    }


    const fromNode =
      getNode(
        connection.from.nodeId
      );

    const toNode =
      getNode(
        connection.to.nodeId
      );


    container.innerHTML = `

      <h3>Connection Inspector</h3>

      <div class="inspectorRow">
        <span>Type</span>
        <strong>
          ${connection.mode.toUpperCase()}
        </strong>
      </div>

      <div class="inspectorRow">
        <span>From</span>
        <strong>
          ${escapeHTML(fromNode?.label || "Unknown")}
        </strong>
      </div>

      <div class="inspectorRow">
        <span>Terminal</span>
        <strong>
          ${connection.from.terminalId}
        </strong>
      </div>

      <div class="inspectorRow">
        <span>To</span>
        <strong>
          ${escapeHTML(toNode?.label || "Unknown")}
        </strong>
      </div>

      <div class="inspectorRow">
        <span>Terminal</span>
        <strong>
          ${connection.to.terminalId}
        </strong>
      </div>

      <button
        class="secondary"
        id="inspectorRemoveConnection"
        style="width:100%;margin-top:12px;"
      >
        Remove Connection
      </button>
    `;


    $("#inspectorRemoveConnection")
      .addEventListener(
        "click",
        removeSelected
      );


    return;
  }


  if (
    !state.selectedNode
  ) {

    container.innerHTML = `

      <h3>Inspector</h3>

      <p class="hint">
        Select a component to view its
        properties and terminals.
      </p>

    `;

    return;
  }


  const node =
    getNode(
      state.selectedNode
    );


  if (!node) {
    return;
  }


  const connected =
    countConnections(node.id);


  container.innerHTML = `

    <h3>${escapeHTML(node.label)}</h3>

    <div class="inspectorRow">
      <span>Component</span>
      <strong>${node.type}</strong>
    </div>

    <div class="inspectorRow">
      <span>Voltage</span>
      <strong>${node.voltage} V</strong>
    </div>

    <div class="inspectorRow">
      <span>Power</span>
      <strong>${node.power || 0} W</strong>
    </div>

    <div class="inspectorRow">
      <span>Connections</span>
      <strong>${connected}</strong>
    </div>

    <div class="terminalList">

      <h4>Terminals</h4>

      ${node.terminals.map(
        terminal => `

          <div class="terminalItem">

            <span>
              ${terminal.id.toUpperCase()}
            </span>

            <span class="${terminal.type}">
              ${terminal.type}
            </span>

          </div>

        `
      ).join("")}

    </div>

    <button
      class="secondary"
      id="inspectorRemove"
      style="width:100%;margin-top:12px;"
    >
      🗑 Remove Component
    </button>
  `;


  $("#inspectorRemove")
    .addEventListener(
      "click",
      removeSelected
    );

}


/* =========================================================
   CONNECTION LIST
========================================================= */

function renderConnectionList() {

  const container =
    $("#connectionList");


  if (
    !state.connections.length
  ) {

    container.innerHTML = `
      <div class="emptyList">
        No connections yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    state.connections.map(
      connection => {

        const from =
          getNode(
            connection.from.nodeId
          );

        const to =
          getNode(
            connection.to.nodeId
          );


        return `

          <div
            class="connectionItem"
            data-connection="${connection.id}"
          >

            <div>

              <strong>
                ${escapeHTML(from?.label || "?")}
              </strong>

              <small>
                :${connection.from.terminalId}
                →
                ${escapeHTML(to?.label || "?")}
                :${connection.to.terminalId}
              </small>

            </div>

            <small>
              ${connection.mode.toUpperCase()}
            </small>

            <button
              data-remove-connection="${connection.id}"
            >
              ×
            </button>

          </div>

        `;

      }
    ).join("");


  $$("[data-connection]").forEach(
    element => {

      element.addEventListener(
        "click",
        event => {

          if (
            event.target.dataset
              .removeConnection
          ) {
            return;
          }


          state.selectedConnection =
            element.dataset.connection;

          state.selectedNode = null;

          renderWires();

          updateInspector();

        }
      );

    }
  );


  $$("[data-remove-connection]")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          saveHistory();


          const id =
            button.dataset
              .removeConnection;


          state.connections =
            state.connections.filter(
              connection =>
                connection.id !== id
            );


          state.selectedConnection =
            null;


          renderAll();

          toast(
            "Connection removed."
          );

        }
      );

    });

}


/* =========================================================
   EXPERIMENT
========================================================= */

function setupExperiment() {

  $("#sunlight")
    .addEventListener(
      "input",
      updateSimulationPreview
    );


  $("#acLoad")
    .addEventListener(
      "input",
      updateSimulationPreview
    );


  $("#batterySOC")
    .addEventListener(
      "input",
      updateSimulationPreview
    );


  $("#simulate")
    .addEventListener(
      "click",
      toggleSimulation
    );

}


function calculatePVOutput() {

  const sunlight =
    Number(
      $("#sunlight").value
    );


  const panels =
    Number(
      $("#panelCount").value
    );


  const panelW =
    Number(
      $("#panelRating").value
    );


  return (
    panels *
    panelW *
    (sunlight / 100)
  );

}


function updateSimulationPreview() {

  const sunlight =
    Number(
      $("#sunlight").value
    );


  const load =
    Number(
      $("#acLoad").value
    );


  const soc =
    Number(
      $("#batterySOC").value
    );


  const pv =
    calculatePVOutput();


  const inverter =
    Number(
      $("#inverterRating").value
    );


  const inverterPercent =
    inverter > 0
      ? (load / inverter) * 100
      : 0;


  $("#sunlightOutput").textContent =
    `${sunlight}%`;


  $("#metricPV").textContent =
    `${(pv / 1000).toFixed(2)} kW`;


  $("#metricLoad").textContent =
    `${(load / 1000).toFixed(2)} kW`;


  $("#metricSOC").textContent =
    `${soc}%`;


  $("#metricInverter").textContent =
    `${inverterPercent.toFixed(0)}%`;


  $("#flowPV").textContent =
    `${Math.round(pv)} W`;


  $("#flowLoad").textContent =
    `${Math.round(load)} W`;


  $("#flowBattery").textContent =
    `${soc}% SOC`;


  $("#flowInverter").textContent =
    `${inverterPercent.toFixed(0)}%`;


  if (
    state.simulationRunning
  ) {

    $("#simulationState")
      .textContent =
      "RUNNING";

    $("#powerBeam")
      .classList.add(
        "running"
      );

  }


  updateSystemFaults();

}


/* =========================================================
   SIMULATION
========================================================= */

function toggleSimulation() {

  state.simulationRunning =
    !state.simulationRunning;


  if (
    state.simulationRunning
  ) {

    $("#simulate")
      .textContent =
      "■ Stop Simulation";


    $("#simulationMessage")
      .textContent =
      "Simulation running. Electrical behaviour is being evaluated.";


    $("#simulationState")
      .textContent =
      "RUNNING";


    $("#powerBeam")
      .classList.add(
        "running"
      );


    simulationTick();


  } else {

    $("#simulate")
      .textContent =
      "▶ Start Simulation";


    $("#simulationState")
      .textContent =
      "PAUSED";


    $("#powerBeam")
      .classList.remove(
        "running"
      );

  }

}


function simulationTick() {

  if (
    !state.simulationRunning
  ) {
    return;
  }


  state.simulationSeconds++;


  const hours =
    Math.floor(
      state.simulationSeconds / 3600
    );


  const minutes =
    Math.floor(
      (state.simulationSeconds % 3600) /
      60
    );


  const seconds =
    state.simulationSeconds %
    60;


  $("#simulationTime")
    .textContent =
    `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;


  updateSimulationPreview();


  setTimeout(
    simulationTick,
    1000
  );

}


/* =========================================================
   FAULT LAB
========================================================= */

function setupFaults() {

  $("#faultOverload")
    .addEventListener(
      "click",
      () => {

        addFault("overload");

        renderAll();

      }
    );


  $("#faultPolarity")
    .addEventListener(
      "click",
      () => {

        addFault("polarity");

        renderAll();

      }
    );


  $("#faultShort")
    .addEventListener(
      "click",
      () => {

        addFault("short");

        renderAll();

      }
    );


  $("#faultVoltage")
    .addEventListener(
      "click",
      () => {

        addFault("voltage");

        renderAll();

      }
    );


  $("#clearFaults")
    .addEventListener(
      "click",
      () => {

        state.faults = [];

        renderAll();

        toast(
          "Faults cleared."
        );

      }
    );

}


function addFault(type) {

  if (
    !state.faults.includes(type)
  ) {

    state.faults.push(type);

  }


  updateFaultBox();

}


function updateFaultBox() {

  const box =
    $("#faultBox");


  if (
    !state.faults.length
  ) {

    box.className =
      "status ok";

    box.textContent =
      "● No active faults";

    return;

  }


  const names = {

    overload:
      "⚡ Inverter / system overload",

    polarity:
      "＋/− Wrong polarity",

    short:
      "🔥 Short circuit detected",

    voltage:
      "⚠ Voltage mismatch",

    open:
      "○ Open circuit",

    duplicate:
      "Duplicate connection"

  };


  box.className =
    "status error";


  box.innerHTML =
    state.faults.map(
      fault =>
        `● ${names[fault] || fault}`
    ).join("<br>");

}


function updateSystemFaults() {

  const load =
    Number(
      $("#acLoad").value
    );


  const inverter =
    Number(
      $("#inverterRating").value
    );


  /*
    Remove automatic overload
    before recalculating.
  */

  state.faults =
    state.faults.filter(
      fault =>
        ![
          "auto-overload",
          "auto-open"
        ].includes(fault)
    );


  if (
    load > inverter
  ) {

    state.faults.push(
      "auto-overload"
    );

  }


  /*
    Detect incomplete essential
    system.
  */

  const requiredTypes =
    [
      "panel",
      "mppt",
      "battery",
      "inverter",
      "load"
    ];


  const missing =
    requiredTypes.filter(
      type =>
        !state.nodes.some(
          node =>
            node.type === type
        )
    );


  if (
    state.nodes.length > 0 &&
    missing.length
  ) {

    state.faults.push(
      "auto-open"
    );

  }


  updateFaultBox();

}


/* =========================================================
   FAULT HELPERS
========================================================= */

function nodeHasError(
  nodeId
) {

  return state.connections.some(
    connection =>
      connectionHasFault(
        connection
      ) &&
      (
        connection.from.nodeId ===
        nodeId ||
        connection.to.nodeId ===
        nodeId
      )
  );

}


function connectionHasFault(
  connection
) {

  const a =
    getNode(
      connection.from.nodeId
    );

  const b =
    getNode(
      connection.to.nodeId
    );


  if (!a || !b) {
    return true;
  }


  if (
    connection.from.terminalId ===
      connection.to.terminalId &&
    connection.from.terminalId !==
      "ac"
  ) {

    return true;

  }


  if (
    connection.from.terminalId ===
      "ac" &&
    connection.to.terminalId !==
      "ac"
  ) {

    return true;

  }


  if (
    connection.to.terminalId ===
      "ac" &&
    connection.from.terminalId !==
      "ac"
  ) {

    return true;

  }


  return false;

}


/* =========================================================
   ANALYSIS
========================================================= */

function runAnalysis() {

  updateSystemFaults();


  const pv =
    calculatePVOutput();


  const load =
    Number(
      $("#acLoad").value
    );


  const inverter =
    Number(
      $("#inverterRating").value
    );


  const validConnections =
    state.connections.filter(
      connection =>
        !connectionHasFault(
          connection
        )
    ).length;


  const totalConnections =
    state.connections.length;


  let score = 100;


  if (
    state.nodes.length === 0
  ) {
    score -= 40;
  }


  if (
    totalConnections === 0
  ) {
    score -= 25;
  }


  if (
    state.faults.length
  ) {
    score -=
      Math.min(
        40,
        state.faults.length * 8
      );
  }


  if (
    totalConnections > 0 &&
    validConnections ===
      totalConnections
  ) {
    score += 5;
  }


  if (
    load > inverter
  ) {
    score -= 20;
  }


  score =
    clamp(
      score,
      0,
      100
    );


  $("#designScore")
    .textContent =
    Math.round(score);


  const checks =
    [];


  if (
    state.nodes.length
  ) {

    checks.push(
      createCheck(
        "ok",
        `${state.nodes.length} component(s) placed.`
      )
    );

  } else {

    checks.push(
      createCheck(
        "warning",
        "No components placed."
      )
    );

  }


  if (
    totalConnections
  ) {

    checks.push(
      createCheck(
        validConnections ===
          totalConnections
          ? "ok"
          : "error",

        `${validConnections}/${totalConnections} connections pass basic validation.`
      )
    );

  } else {

    checks.push(
      createCheck(
        "warning",
        "No electrical connections created."
      )
    );

  }


  if (
    load <= inverter
  ) {

    checks.push(
      createCheck(
        "ok",
        "AC load is within inverter rating."
      )
    );

  } else {

    checks.push(
      createCheck(
        "error",
        "AC load exceeds inverter rating."
      )
    );

  }


  if (
    pv >= load
  ) {

    checks.push(
      createCheck(
        "ok",
        "Estimated PV output can cover the current AC load."
      )
    );

  } else {

    checks.push(
      createCheck(
        "warning",
        "Estimated PV output is below the current AC load."
      )
    );

  }


  if (
    state.faults.length
  ) {

    checks.push(
      createCheck(
        "error",
        `${state.faults.length} active fault condition(s).`
      )
    );

  } else {

    checks.push(
      createCheck(
        "ok",
        "No active fault conditions."
      )
    );

  }


  $("#systemChecks")
    .innerHTML =
    checks.join("");


  $("#connectionStats")
    .innerHTML = `

      <div class="inspectorRow">
        <span>Components</span>
        <strong>
          ${state.nodes.length}
        </strong>
      </div>

      <div class="inspectorRow">
        <span>Total Wires</span>
        <strong>
          ${state.connections.length}
        </strong>
      </div>

      <div class="inspectorRow">
        <span>Valid Wires</span>
        <strong>
          ${validConnections}
        </strong>
      </div>

      <div class="inspectorRow">
        <span>PV Output</span>
        <strong>
          ${(pv / 1000).toFixed(2)} kW
        </strong>
      </div>

      <div class="inspectorRow">
        <span>AC Load</span>
        <strong>
          ${(load / 1000).toFixed(2)} kW
        </strong>
      </div>

    `;


  generateChart();

}


function createCheck(
  type,
  message
) {

  return `
    <div class="check ${type}">
      ${type === "ok" ? "✓" : type === "error" ? "✕" : "⚠"}
      ${escapeHTML(message)}
    </div>
  `;

}


/* =========================================================
   ENERGY CHART
========================================================= */

function generateChart() {

  const chart =
    $("#energyChart");


  const values =
    Array.from(
      { length: 24 },
      (_, hour) => {

        const solar =
          Math.max(
            0,
            Math.sin(
              ((hour - 6) / 12) *
              Math.PI
            )
          );


        return solar;

      }
    );


  chart.innerHTML = `

    <div class="chartBar">

      ${values.map(
        value =>
          `<span style="height:${Math.max(
            3,
            value * 100
          )}%"></span>`
      ).join("")}

    </div>

    <small class="hint">
      Simulated relative solar generation from 00:00 to 23:00.
    </small>
  `;

}


/* =========================================================
   REPORT
========================================================= */

function setupReport() {

  $("#printReport")
    .addEventListener(
      "click",
      () => {

        generateReport();

        window.print();

      }
    );

}


function generateReport() {

  const pv =
    calculatePVOutput();


  const load =
    Number(
      $("#acLoad").value
    );


  const soc =
    Number(
      $("#batterySOC").value
    );


  const score =
    $("#designScore")
      ?.textContent || "0";


  $("#reportContent")
    .innerHTML = `

      <h2>
        SolarLab Structure V3
      </h2>

      <p>
        ${escapeHTML(
          $("#projectDescription").value
        )}
      </p>

      <table class="reportTable">

        <tr>
          <td>Project</td>
          <td>
            ${escapeHTML(
              $("#projectName").value
            )}
          </td>
        </tr>

        <tr>
          <td>System Voltage</td>
          <td>
            ${$("#systemVoltage").value} V
          </td>
        </tr>

        <tr>
          <td>PV Panels</td>
          <td>
            ${$("#panelCount").value}
            ×
            ${$("#panelRating").value} W
          </td>
        </tr>

        <tr>
          <td>Estimated PV Output</td>
          <td>
            ${(pv / 1000).toFixed(2)} kW
          </td>
        </tr>

        <tr>
          <td>AC Load</td>
          <td>
            ${(load / 1000).toFixed(2)} kW
          </td>
        </tr>

        <tr>
          <td>Battery SOC</td>
          <td>
            ${soc}%
          </td>
        </tr>

        <tr>
          <td>Components</td>
          <td>
            ${state.nodes.length}
          </td>
        </tr>

        <tr>
          <td>Connections</td>
          <td>
            ${state.connections.length}
          </td>
        </tr>

        <tr>
          <td>Active Faults</td>
          <td>
            ${state.faults.length}
          </td>
        </tr>

        <tr>
          <td>Design Score</td>
          <td>
            ${score}/100
          </td>
        </tr>

      </table>

      <p style="margin-top:20px;">
        Generated by SolarLab Structure V3.
      </p>

      <p>
        ⚠ Educational simulation only. Verify all
        real-world electrical designs using appropriate
        engineering calculations, standards, datasheets,
        protection requirements and qualified review.
      </p>

    `;

}


/* =========================================================
   SAVE / LOAD
========================================================= */

function setupSave() {

  $("#saveBtn")
    .addEventListener(
      "click",
      saveProject
    );


  $("#loadDemo")
    .addEventListener(
      "click",
      loadDemo
    );


  /*
    Load project values.
  */

  [
    "#projectName",
    "#projectDescription",
    "#systemVoltage",
    "#panelCount",
    "#panelRating",
    "#batteryAh",
    "#inverterRating"
  ].forEach(selector => {

    $(selector)
      ?.addEventListener(
        "change",
        syncProject
      );

  });

}


function syncProject() {

  state.project = {

    name:
      $("#projectName").value,

    description:
      $("#projectDescription").value,

    voltage:
      Number(
        $("#systemVoltage").value
      ),

    panelCount:
      Number(
        $("#panelCount").value
      ),

    panelRating:
      Number(
        $("#panelRating").value
      ),

    batteryAh:
      Number(
        $("#batteryAh").value
      ),

    inverterRating:
      Number(
        $("#inverterRating").value
      )

  };


  $("#boardVoltage")
    .textContent =
    `${state.project.voltage}V DC / AC`;

}


function saveProject() {

  syncProject();


  const data = {

    version: "3.0",

    project:
      state.project,

    nodes:
      state.nodes,

    connections:
      state.connections,

    faults:
      state.faults

  };


  localStorage.setItem(
    "solarlab-v3-project",
    JSON.stringify(data)
  );


  toast(
    "SolarLab V3 project saved on this device."
  );

}


function loadProjectData() {

  try {

    const saved =
      localStorage.getItem(
        "solarlab-v3-project"
      );


    if (!saved) {
      return;
    }


    const data =
      JSON.parse(saved);


    if (
      data.project
    ) {

      state.project =
        data.project;

      $("#projectName").value =
        state.project.name;

      $("#projectDescription").value =
        state.project.description;

      $("#systemVoltage").value =
        state.project.voltage;

      $("#panelCount").value =
        state.project.panelCount;

      $("#panelRating").value =
        state.project.panelRating;

      $("#batteryAh").value =
        state.project.batteryAh;

      $("#inverterRating").value =
        state.project.inverterRating;

    }


    state.nodes =
      Array.isArray(data.nodes)
        ? data.nodes
        : [];


    state.connections =
      Array.isArray(data.connections)
        ? data.connections
        : [];


    state.faults =
      Array.isArray(data.faults)
        ? data.faults
        : [];


  } catch (error) {

    console.error(
      "Could not load project:",
      error
    );

  }

}


/* =========================================================
   DEMO SYSTEM
========================================================= */

function loadDemo() {

  state.nodes = [];

  state.connections = [];

  state.faults = [];

  state.history = [];


  const board =
    $("#board");

  const width =
    board.clientWidth || 800;


  const center =
    width / 2;


  const panel1 =
    createDemoNode(
      "panel",
      60,
      100
    );

  const panel2 =
    createDemoNode(
      "panel",
      60,
      270
    );

  const mppt =
    createDemoNode(
      "mppt",
      center - 80,
      180
    );

  const battery =
    createDemoNode(
      "battery",
      center + 130,
      180
    );

  const breaker =
    createDemoNode(
      "breaker",
      center + 330,
      100
    );

  const inverter =
    createDemoNode(
      "inverter",
      center + 330,
      300
    );

  const load =
    createDemoNode(
      "load",
      center + 520,
      300
    );


  state.nodes.push(
    panel1,
    panel2,
    mppt,
    battery,
    breaker,
    inverter,
    load
  );


  safeCreateConnection(
    panel1,
    "positive",
    mppt,
    "positive",
    "parallel"
  );

  safeCreateConnection(
    panel1,
    "negative",
    mppt,
    "negative",
    "parallel"
  );

  safeCreateConnection(
    panel2,
    "positive",
    mppt,
    "positive",
    "parallel"
  );

  safeCreateConnection(
    panel2,
    "negative",
    mppt,
    "negative",
    "parallel"
  );

  safeCreateConnection(
    mppt,
    "positive",
    battery,
    "positive",
    "single"
  );

  safeCreateConnection(
    mppt,
    "negative",
    battery,
    "negative",
    "single"
  );

  safeCreateConnection(
    battery,
    "positive",
    breaker,
    "positive",
    "single"
  );

  safeCreateConnection(
    battery,
    "negative",
    breaker,
    "negative",
    "single"
  );

  safeCreateConnection(
    breaker,
    "positive",
    inverter,
    "positive",
    "series"
  );

  safeCreateConnection(
    breaker,
    "negative",
    inverter,
    "negative",
    "series"
  );

  safeCreateConnection(
    inverter,
    "ac",
    load,
    "ac",
    "single"
  );


  state.selectedNode =
    null;

  state.selectedConnection =
    null;


  renderAll();

  showPage("design");

  toast(
    "Demo system loaded. Try dragging components and creating additional connections."
  );

}


/* =========================================================
   DEMO NODE FACTORY
========================================================= */

function createDemoNode(
  type,
  x,
  y
) {

  return {

    id:
      `demo-${type}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    type,

    x,

    y,

    voltage:
      COMPONENTS[type].voltage,

    power:
      COMPONENTS[type].power,

    label:
      COMPONENTS[type].name,

    terminals:
      COMPONENTS[type].terminals.map(
        terminal => ({
          id: terminal,
          type: terminal
        })
      )

  };

}


/* =========================================================
   GLOBAL RENDER
========================================================= */

function renderAll() {

  syncProject();

  renderBoard();

  renderConnectionList();

  updateInspector();

  updateFaultBox();

  updateSimulationPreview();

}


/* =========================================================
   TERMINAL VISUAL HELPERS
========================================================= */

function highlightTerminal(
  nodeId,
  terminalId
) {

  clearTerminalHighlights();


  const element =
    document.querySelector(
      `.node[data-id="${CSS.escape(nodeId)}"] .terminal[data-terminal="${terminalId}"]`
    );


  element?.classList.add(
    "selectedTerminal"
  );

}


function clearTerminalHighlights() {

  $$(".selectedTerminal")
    .forEach(element =>
      element.classList.remove(
        "selectedTerminal"
      )
    );

}


/* =========================================================
   UTILITY
========================================================= */

function getNode(id) {

  return state.nodes.find(
    node =>
      node.id === id
  );

}


function countConnections(
  nodeId
) {

  return state.connections.filter(
    connection =>
      connection.from.nodeId === nodeId ||
      connection.to.nodeId === nodeId
  ).length;

}


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );

}


function pad(number) {

  return String(number)
    .padStart(2, "0");

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


let toastTimer = null;


function toast(
  message,
  error = false
) {

  const element =
    $("#toast");


  element.textContent =
    message;


  element.className =
    error
      ? "show error"
      : "show";


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        element.className = "";

      },
      3000
    );

}


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
  "resize",
  () => {

    renderWires();

  }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Delete" ||
      event.key === "Backspace"
    ) {

      removeSelected();

    }


    if (
      event.ctrlKey &&
      event.key.toLowerCase() === "z"
    ) {

      event.preventDefault();

      undo();

    }

  }
);


/* =========================================================
   INITIAL MODE
========================================================= */

setTimeout(
  () => {

    setMode("select");

  },
  100
);
