/* =========================================================
   SolarLab Structure V3
   Interactive Connection & Engineering Engine (Upgraded)
========================================================= */
"use strict";
/* =========================================================
   GLOBAL STATE
========================================================= */
const state = {
    voltage: 48,
    panelCount: 4,
    panelW: 550,
    batteryAh: 200,
    inverterW: 5000,
    projectName: "SolarLab V3 Test System",
    description: "Interactive solar power system simulation.",
    components: [],
    connections: [],
    selectedId: null,
    connectionMode: false,
    connectionType: "single",
    connectionStart: null,
    simulationRunning: false,
    simulationSeconds: 0,
    faults: [],
    sun: 100,
    loadW: 850,
    soc: 76,
    temp: 25,
    lastCable: null
};

const MODULE_TYPICAL = { vmp: 41.8, imp: 13.16, voc: 49.5, isc: 13.9 };

const CABLE_SIZES = [
    { mm2: 1.5, awg: "16", ampCu: 15 }, { mm2: 2.5, awg: "14", ampCu: 21 },
    { mm2: 4, awg: "12", ampCu: 28 }, { mm2: 6, awg: "10", ampCu: 37 },
    { mm2: 10, awg: "8", ampCu: 52 }, { mm2: 16, awg: "6", ampCu: 69 },
    { mm2: 25, awg: "4", ampCu: 90 }, { mm2: 35, awg: "2", ampCu: 111 },
    { mm2: 50, awg: "1/0", ampCu: 134 }, { mm2: 70, awg: "2/0", ampCu: 171 },
    { mm2: 95, awg: "3/0", ampCu: 207 }, { mm2: 120, awg: "4/0", ampCu: 239 }
];
const RHO = { cu: 0.0175, al: 0.0282 };
/* =========================================================
   COMPONENT DEFINITIONS
========================================================= */
const COMPONENTS = {
    panel: { name: "Solar Panel", icon: "☀" },
    mppt: { name: "MPPT Controller", icon: "⚙" },
    battery: { name: "Battery Bank", icon: "🔋" },
    breaker: { name: "DC Breaker", icon: "▣" },
    inverter: { name: "Inverter", icon: "↕" },
    load: { name: "AC Load", icon: "💡" },
    meter: { name: "Energy Meter", icon: "▥" }
};
/* =========================================================
   VOLTAGE PRESETS
========================================================= */
const VOLTAGE_PRESETS = {
    12: { voltage: 12, inverter: 2000, breaker: 80, mpptCurrent: 100 },
    24: { voltage: 24, inverter: 3000, breaker: 80, mpptCurrent: 80 },
    48: { voltage: 48, inverter: 5000, breaker: 60, mpptCurrent: 60 }
};
/* =========================================================
   DOM HELPERS
========================================================= */
const $ = id => document.getElementById(id);
const qs = selector => document.querySelector(selector);
const qsa = selector => [...document.querySelectorAll(selector)];
function toast(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
        el.classList.remove("show");
    }, 2200);
}
/* =========================================================
   PROJECT CONFIGURATION
========================================================= */
function getConfig() {
    const preset = VOLTAGE_PRESETS[state.voltage] || VOLTAGE_PRESETS[48];
    return {
        voltage: state.voltage,
        panelCount: state.panelCount,
        panelW: state.panelW,
        pvTotal: state.panelCount * state.panelW,
        batteryAh: state.batteryAh,
        batteryWh: state.voltage * state.batteryAh,
        inverterW: state.inverterW,
        breaker: preset.breaker,
        mpptCurrent: preset.mpptCurrent
    };
}
/* =========================================================
   AUTO INVERTER CALCULATOR
========================================================= */
function calculateAutoInverter() {
    const pv = state.panelCount * state.panelW;
    const preset = VOLTAGE_PRESETS[state.voltage] || VOLTAGE_PRESETS[48];
    let value = preset.inverter;
    if (pv > value) {
        if (pv <= 2500) value = 2000;
        else if (pv <= 4000) value = 3000;
        else value = 5000;
    }
    return value;
}
/* =========================================================
   DYNAMIC PV ARRAY CALCULATOR (Series vs Parallel)
========================================================= */
function calculatePVArray() {
    const panels = state.components.filter(c => c.type === "panel");
    if (!panels.length) return { totalVoltage: 0, totalCurrent: 0, totalWattage: 0 };
    const seriesConnections = state.connections.filter(c => c.type === "series");
    const parallelConnections = state.connections.filter(c => c.type === "parallel");
    let totalVoltage = 0;
    let totalCurrent = 0;
    if (seriesConnections.length >= panels.length - 1 && panels.length > 1) {
        totalVoltage = panels.reduce((sum, p) => sum + (p.values.voltage || state.voltage), 0);
        totalCurrent = Math.min(...panels.map(p => p.values.current || (p.values.watt / p.values.voltage)));
    } else if (parallelConnections.length >= panels.length - 1 && panels.length > 1) {
        totalVoltage = Math.min(...panels.map(p => p.values.voltage || state.voltage));
        totalCurrent = panels.reduce((sum, p) => sum + (p.values.current || (p.values.watt / p.values.voltage)), 0);
    } else {
        const config = getConfig();
        totalVoltage = config.voltage;
        totalCurrent = Number((config.pvTotal / config.voltage).toFixed(2));
    }
    const totalWattage = totalVoltage * totalCurrent;
    return { totalVoltage, totalCurrent, totalWattage };
}
/* =========================================================
   READ SETUP
========================================================= */
function readSetup() {
    state.projectName = $("pname")?.value.trim() || "SolarLab V3 Test System";
    state.description = $("pdesc")?.value.trim() || "Interactive solar power system simulation.";
    state.voltage = Number($("voltage")?.value) || 48;
    state.panelCount = Math.max(1, Number($("panelCount")?.value) || 1);
    state.panelW = Math.max(50, Number($("panelW")?.value) || 550);
    state.batteryAh = Math.max(20, Number($("batteryAh")?.value) || 200);
    const inverterMode = $("inverterMode")?.value;
    if (inverterMode === "auto") {
        state.inverterW = calculateAutoInverter();
    } else {
        state.inverterW = Number(inverterMode) || 5000;
    }
}
/* =========================================================
   UPDATE SETUP PREVIEW
========================================================= */
function updateSetupPreview() {
    readSetup();
    const config = getConfig();
    if ($("previewVoltage")) $("previewVoltage").textContent = `${config.voltage}V`;
    if ($("previewPV")) $("previewPV").textContent = `${(config.pvTotal / 1000).toFixed(2)} kW`;
    if ($("previewBattery")) $("previewBattery").textContent = `${config.voltage}V / ${config.batteryAh}Ah`;
    if ($("previewInverter")) $("previewInverter").textContent = `${(config.inverterW / 1000).toFixed(1)} kW`;
    if ($("previewMPPT")) $("previewMPPT").textContent = `${config.voltage}V / ${config.mpptCurrent}A`;
    if ($("previewBreaker")) $("previewBreaker").textContent = `${config.breaker}A`;
    if ($("libPanel")) $("libPanel").textContent = `${config.panelW} W PV`;
    if ($("libMPPT")) $("libMPPT").textContent = `${config.voltage}V / ${config.mpptCurrent}A`;
    if ($("libBattery")) $("libBattery").textContent = `${config.voltage}V / ${config.batteryAh}Ah`;
    if ($("libBreaker")) $("libBreaker").textContent = `${config.breaker}A DC`;
    if ($("libInverter")) $("libInverter").textContent = `${config.voltage}V → AC`;
    if ($("libLoad")) $("libLoad").textContent = `${$("loadW")?.value || 850} W`;
    if ($("boardVoltage")) $("boardVoltage").textContent = `${config.voltage}V DC / AC SYSTEM`;
    const autoOption = $("inverterMode")?.value === "auto";
    if ($("configStatus")) {
        $("configStatus").textContent = autoOption ? "● AUTO CONFIGURED" : "● CUSTOM CONFIGURED";
        $("configStatus").className = "status ok";
    }
}
/* =========================================================
   APPLY CONFIGURATION TO COMPONENTS
========================================================= */
function applyConfigurationToComponents() {
    readSetup();
    state.components.forEach(component => {
        component.values = getDefaultValues(component.type);
    });
    renderWorkspace();
    renderInspector();
    updateAnalysis();
}
/* =========================================================
   COMPONENT DEFAULT VALUES
========================================================= */
function getDefaultValues(type) {
    const c = getConfig();
    switch (type) {
        case "panel":
            return {
                voltage: MODULE_TYPICAL.vmp,
                watt: c.panelW,
                current: MODULE_TYPICAL.imp,
                vmp: MODULE_TYPICAL.vmp,
                imp: MODULE_TYPICAL.imp
            };
        case "mppt":
            return { voltage: c.voltage, maxCurrent: c.mpptCurrent, efficiency: 98 };
        case "battery":
            return { voltage: c.voltage, ah: c.batteryAh, energy: c.batteryWh };
        case "breaker":
            return { voltage: c.voltage, amp: c.breaker };
        case "inverter":
            return { dcVoltage: c.voltage, watt: c.inverterW, efficiency: 94 };
        case "load":
            return { voltage: 230, watt: 850 };
        case "meter":
            return { voltage: c.voltage, maxCurrent: c.mpptCurrent };
        default:
            return {};
    }
}
/* =========================================================
   ADD / REMOVE / CLEAR COMPONENTS
========================================================= */
function addComponent(type, x = null, y = null) {
    const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const board = $("board");
    const defaultX = x !== null ? x : Math.max(20, 60 + (state.components.length % 4) * 155);
    const defaultY = y !== null ? y : 100 + Math.floor(state.components.length / 4) * 130;
    const component = {
        id,
        type,
        x: defaultX,
        y: defaultY,
        values: getDefaultValues(type)
    };
    state.components.push(component);
    state.selectedId = id;
    renderWorkspace();
    renderInspector();
    updateAnalysis();
    toast(`${COMPONENTS[type].name} added`);
}
function removeSelected() {
    if (!state.selectedId) {
        toast("Select a component first.");
        return;
    }
    const id = state.selectedId;
    const component = state.components.find(c => c.id === id);
    if (!component) return;
    state.components = state.components.filter(c => c.id !== id);
    state.connections = state.connections.filter(c => c.from !== id && c.to !== id);
    state.selectedId = null;
    state.connectionStart = null;
    renderWorkspace();
    renderInspector();
    updateAnalysis();
    toast(`${COMPONENTS[component.type].name} removed`);
}
function clearWorkspace() {
    if (!state.components.length) {
        toast("Workspace is already empty.");
        return;
    }
    state.components = [];
    state.connections = [];
    state.selectedId = null;
    state.connectionStart = null;
    renderWorkspace();
    renderInspector();
    updateAnalysis();
    toast("Workspace cleared.");
}
function selectComponent(id) {
    state.selectedId = id;
    renderWorkspace();
    renderInspector();
}
/* =========================================================
   CREATE NODE ELEMENT
========================================================= */
function createNode(component) {
    const node = document.createElement("div");
    node.className = "node";
    if (state.selectedId === component.id) node.classList.add("selected");
    if (state.connectionStart === component.id) node.classList.add("connectionStart");
    node.dataset.id = component.id;
    node.style.left = `${component.x}px`;
    node.style.top = `${component.y}px`;
    const definition = COMPONENTS[component.type];
    node.innerHTML = `
        <div class="nodeIcon">${definition.icon}</div>
        <div class="nodeTitle">${definition.name}</div>
        <div class="nodeValue">${getComponentDisplayValue(component)}</div>
        <div class="nodePorts">
            <span class="port plus" title="+ positive"></span>
            <span class="port minus" title="- negative"></span>
        </div>
    `;
    node.addEventListener("pointerdown", event => startNodeDrag(event, component));
    node.addEventListener("click", event => {
        event.stopPropagation();
        if (state.connectionMode) {
            handleConnectionClick(component.id);
        } else {
            selectComponent(component.id);
        }
    });
    return node;
}
function getComponentDisplayValue(c) {
    const v = c.values;
    switch (c.type) {
        case "panel": return `${v.voltage}V • ${v.watt}W`;
        case "mppt": return `${v.voltage}V • ${v.maxCurrent}A`;
        case "battery": return `${v.voltage}V • ${v.ah}Ah`;
        case "breaker": return `${v.voltage}V • ${v.amp}A`;
        case "inverter": return `${v.dcVoltage}V • ${v.watt}W`;
        case "load": return `${v.watt}W AC`;
        case "meter": return `${v.voltage}V meter`;
        default: return "";
    }
}
/* =========================================================
   RENDER WORKSPACE
========================================================= */
function renderWorkspace() {
    const nodes = $("nodes");
    if (!nodes) return;
    nodes.innerHTML = "";
    if ($("emptyWorkspace")) {
        $("emptyWorkspace").style.display = state.components.length ? "none" : "grid";
    }
    state.components.forEach(component => {
        nodes.appendChild(createNode(component));
    });
    renderWires();
}
/* =========================================================
   DRAG COMPONENT
========================================================= */
function startNodeDrag(event, component) {
    if (state.connectionMode) return;
    event.preventDefault();
    selectComponent(component.id);
    const board = $("board");
    const startPointerX = event.clientX;
    const startPointerY = event.clientY;
    const startX = component.x;
    const startY = component.y;
    let moved = false;
    const move = e => {
        moved = true;
        const dx = e.clientX - startPointerX;
        const dy = e.clientY - startPointerY;
        const maxX = board.clientWidth - 150;
        const maxY = board.clientHeight - 105;
        component.x = Math.max(5, Math.min(maxX, startX + dx));
        component.y = Math.max(45, Math.min(maxY, startY + dy));
        const node = document.querySelector(`.node[data-id="${component.id}"]`);
        if (node) {
            node.style.left = `${component.x}px`;
            node.style.top = `${component.y}px`;
        }
        renderWires();
    };
    const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (moved) renderWires();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
}
/* =========================================================
   CONNECTION LOGIC
========================================================= */
function toggleConnectionMode() {
    state.connectionMode = !state.connectionMode;
    state.connectionStart = null;
    const button = $("connectionMode");
    if (state.connectionMode) {
        button.classList.add("active");
        button.textContent = "🔗 Connection Mode ON";
        if ($("connectionHint")) {
            $("connectionHint").textContent = "Select first component";
            $("connectionHint").classList.add("active");
        }
    } else {
        button.classList.remove("active");
        button.textContent = "🔗 Connection Mode";
        if ($("connectionHint")) {
            $("connectionHint").textContent = "Connection mode OFF";
            $("connectionHint").classList.remove("active");
        }
    }
    renderWorkspace();
}
function setConnectionType(type) {
    state.connectionType = type;
    toast(`${type.toUpperCase()} connection selected`);
    if ($("connectionHint")) {
        $("connectionHint").textContent = `${type.toUpperCase()}: select two components`;
    }
}
function handleConnectionClick(id) {
    if (!state.connectionStart) {
        state.connectionStart = id;
        if ($("connectionHint")) $("connectionHint").textContent = `Start selected • choose second component`;
        renderWorkspace();
        return;
    }
    if (state.connectionStart === id) {
        toast("Choose a different component.");
        return;
    }
    createConnection(state.connectionStart, id, state.connectionType);
    state.connectionStart = null;
    if ($("connectionHint")) $("connectionHint").textContent = "Select first component";
    renderWorkspace();
    updateAnalysis();
}
function createConnection(from, to, type = "single") {
    const duplicate = state.connections.find(c => (c.from === from && c.to === to) || (c.from === to && c.to === from));
    if (duplicate) {
        toast("These components are already connected.");
        return false;
    }
    const validation = validateConnection(from, to, type);
    const connection = {
        id: `wire-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        from,
        to,
        type,
        valid: validation.valid,
        error: validation.error || null
    };
    state.connections.push(connection);
    if (!validation.valid) {
        toast(`Connection warning: ${validation.error}`);
    } else {
        toast(`${type.toUpperCase()} connection created`);
    }
    return true;
}
function validateConnection(fromId, toId, type) {
    const from = state.components.find(c => c.id === fromId);
    const to = state.components.find(c => c.id === toId);
    if (!from || !to) return { valid: false, error: "Component not found" };
    if (to.type === "load" && from.type === "panel") {
        return { valid: false, error: "PV panel cannot directly feed an AC load." };
    }
    const fromVoltage = getComponentVoltage(from);
    const toVoltage = getComponentVoltage(to);
    if (fromVoltage && toVoltage && from.type !== "load" && to.type !== "load" && fromVoltage !== toVoltage) {
        return { valid: false, error: `Voltage mismatch: ${fromVoltage}V → ${toVoltage}V` };
    }
    if (from.type === "inverter" && ["panel", "mppt", "battery", "breaker"].includes(to.type)) {
        return { valid: false, error: "Inverter AC output cannot directly connect to DC component." };
    }
    return { valid: true };
}
function getComponentVoltage(component) {
    if (!component) return null;
    const v = component.values;
    switch (component.type) {
        case "panel": case "mppt": case "battery": case "breaker": case "meter": return v.voltage;
        case "inverter": return v.dcVoltage;
        case "load": return 230;
        default: return null;
    }
}
/* =========================================================
   PORT-ACCURATE WIRE RENDERING
========================================================= */
function getPortCoordinates(componentId, isPositive = true) {
    const nodeEl = document.querySelector(`.node[data-id="${componentId}"]`);
    const boardEl = $("board");
    if (!nodeEl || !boardEl) return { x: 0, y: 0 };
    const boardRect = boardEl.getBoundingClientRect();
    const portEl = nodeEl.querySelector(isPositive ? ".port.plus" : ".port.minus");
    if (!portEl) {
        const comp = state.components.find(c => c.id === componentId);
        return { x: (comp?.x || 0) + 70, y: (comp?.y || 0) + 44 };
    }
    const portRect = portEl.getBoundingClientRect();
    return {
        x: portRect.left - boardRect.left + (portRect.width / 2),
        y: portRect.top - boardRect.top + (portRect.height / 2)
    };
}
function renderWires() {
    const svg = $("wires");
    const board = $("board");
    if (!svg || !board) return;
    svg.setAttribute("viewBox", `0 0 ${board.clientWidth} ${board.clientHeight}`);
    svg.innerHTML = "";
    state.connections.forEach(connection => {
        const fromPos = getPortCoordinates(connection.from, true);
        const toPos = getPortCoordinates(connection.to, false);
        const x1 = fromPos.x;
        const y1 = fromPos.y;
        const x2 = toPos.x;
        const y2 = toPos.y;
        const dx = Math.abs(x2 - x1) * 0.45;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        path.setAttribute("d", d);
        path.classList.add("wire");
        if (connection.type === "series") path.classList.add("series");
        if (connection.type === "parallel") path.classList.add("parallel");
        if (!connection.valid) path.classList.add("error");
        if (state.simulationRunning && connection.valid) path.classList.add("active-flow");
        path.addEventListener("click", () => {
            if (confirm("Remove this connection?")) {
                state.connections = state.connections.filter(c => c.id !== connection.id);
                renderWorkspace();
                updateAnalysis();
            }
        });
        svg.appendChild(path);
    });
}
/* =========================================================
   INSPECTOR
========================================================= */
function renderInspector() {
    const inspector = $("inspector");
    if (!inspector) return;
    if (!state.selectedId) {
        inspector.innerHTML = `
            <h3>Inspector</h3>
            <p class="hint">Select a component to view its properties.</p>
        `;
        return;
    }
    const c = state.components.find(x => x.id === state.selectedId);
    if (!c) return;
    inspector.innerHTML = `
        <h3>${COMPONENTS[c.type].icon} ${COMPONENTS[c.type].name}</h3>
        <p class="hint">Component properties</p>
        <h4>TYPE</h4>
        <div class="inspectorValue">${c.type.toUpperCase()}</div>
        ${getInspectorFields(c)}
        <h4>POSITION</h4>
        <div class="inspectorValue">X: ${Math.round(c.x)} • Y: ${Math.round(c.y)}</div>
        <h4>CONNECTIONS</h4>
        <div class="inspectorValue">
            ${state.connections.filter(x => x.from === c.id || x.to === c.id).length} connection(s)
        </div>
        <button id="inspectorRemove" class="dangerButton">🗑 Remove Component</button>
    `;
    const remove = $("inspectorRemove");
    if (remove) remove.addEventListener("click", removeSelected);
}
function getInspectorFields(c) {
    const v = c.values;
    switch (c.type) {
        case "panel":
            return `
                <h4>VOLTAGE</h4><div class="inspectorValue">${v.voltage} V</div>
                <h4>POWER</h4><div class="inspectorValue">${v.watt} W</div>
                <h4>CURRENT</h4><div class="inspectorValue">${v.current} A</div>
            `;
        case "mppt":
            return `
                <h4>SYSTEM VOLTAGE</h4><div class="inspectorValue">${v.voltage} V</div>
                <h4>MAX CURRENT</h4><div class="inspectorValue">${v.maxCurrent} A</div>
                <h4>EFFICIENCY</h4><div class="inspectorValue">${v.efficiency}%</div>
            `;
        case "battery":
            return `
                <h4>BATTERY VOLTAGE</h4><div class="inspectorValue">${v.voltage} V</div>
                <h4>CAPACITY</h4><div class="inspectorValue">${v.ah} Ah</div>
                <h4>ENERGY</h4><div class="inspectorValue">${v.energy.toLocaleString()} Wh</div>
            `;
        case "inverter":
            return `
                <h4>DC INPUT</h4><div class="inspectorValue">${v.dcVoltage} V</div>
                <h4>RATING</h4><div class="inspectorValue">${v.watt.toLocaleString()} W</div>
                <h4>EFFICIENCY</h4><div class="inspectorValue">${v.efficiency}%</div>
            `;
        case "load":
            return `
                <h4>AC VOLTAGE</h4><div class="inspectorValue">${v.voltage} V AC</div>
                <h4>POWER</h4><div class="inspectorValue">${v.watt} W</div>
            `;
        default:
            return "";
    }
}
/* =========================================================
   AUTO WIRE & LAYOUT
========================================================= */
function autoWire() {
    if (state.components.length < 2) {
        toast("Add at least two components.");
        return;
    }
    state.connections = [];
    const find = type => state.components.find(c => c.type === type);
    const panels = state.components.filter(c => c.type === "panel");
    const mppt = find("mppt");
    const battery = find("battery");
    const breaker = find("breaker");
    const inverter = find("inverter");
    const load = find("load");
    if (panels.length && mppt) panels.forEach(p => createConnection(p.id, mppt.id, "parallel"));
    if (mppt && breaker) createConnection(mppt.id, breaker.id, "single");
    if (breaker && battery) createConnection(breaker.id, battery.id, "single");
    if (battery && inverter) createConnection(battery.id, inverter.id, "single");
    if (inverter && load) createConnection(inverter.id, load.id, "single");
    arrangeAutoLayout();
    renderWorkspace();
    updateAnalysis();
    toast("Automatic system wiring created.");
}
function arrangeAutoLayout() {
    const groups = [
        ["panel", 50, 120], ["mppt", 250, 120], ["breaker", 450, 120],
        ["battery", 650, 120], ["inverter", 850, 120], ["load", 1050, 120]
    ];
    groups.forEach(([type, x, y]) => {
        const matches = state.components.filter(c => c.type === type);
        matches.forEach((c, index) => {
            c.x = x;
            c.y = y + index * 115;
        });
    });
}
function loadDemo() {
    readSetup();
    state.components = [];
    state.connections = [];
    const types = ["panel", "panel", "panel", "panel", "mppt", "breaker", "battery", "inverter", "load"];
    types.forEach(type => addComponent(type));
    arrangeAutoLayout();
    state.selectedId = null;
    renderWorkspace();
    renderInspector();
    autoWire();
    showPage("design");
    toast("Demo system loaded.");
}
/* =========================================================
   SIMULATION ENGINE
========================================================= */
function calculateSimulation() {
    const sun = (Number($("sun")?.value ?? state.sun) || 0) / 100;
    const load = Math.max(0, Number($("loadW")?.value ?? state.loadW) || 0);
    const soc = Math.max(0, Math.min(100, Number($("socW")?.value ?? state.soc) || 0));
    const temp = Number($("temp")?.value ?? state.temp) || 25;
    state.sun = sun * 100; state.loadW = load; state.soc = soc; state.temp = temp;
    const config = getConfig();
    const tempFactor = 1 - Math.max(0, (temp - 25) * 0.004);
    const mpptEff = 0.98, invEff = 0.94;
    const rawPV = config.pvTotal * sun * tempFactor;
    const pv = rawPV * mpptEff;
    const dcForLoad = load / invEff;
    const inverterUsage = config.inverterW ? (load / config.inverterW) * 100 : 0;
    let netW = pv - dcForLoad;
    if (state.faults.includes("short") || state.faults.includes("reverse")) netW = 0;
    if (state.faults.includes("overload")) netW = -dcForLoad;
    const capacityWh = config.batteryWh;
    const usableWh = capacityWh * 0.8;
    const peakSunHours = 4.5 * sun;
    const dailyPV = (config.pvTotal / 1000) * peakSunHours * mpptEff * tempFactor;
    const dailyLoad = (load / 1000) * 24;
    const autonomyH = load > 0 ? (usableWh * (soc / 100)) / load : 99;
    return { pv, load, soc, inverterUsage, netW, temp, capacityWh, usableWh, dailyPV, dailyLoad, autonomyH, surplus: pv - load };
}
function updateSimulationUI() {
    const data = calculateSimulation();
    if ($("sunOut")) $("sunOut").textContent = `${Math.round(state.sun)}%`;
    if ($("tempOut")) $("tempOut").textContent = `${state.temp}°C`;
    if ($("mPV")) $("mPV").textContent = `${(data.pv / 1000).toFixed(2)} kW`;
    if ($("mLoad")) $("mLoad").textContent = `${data.load.toLocaleString()} W`;
    if ($("mSOC")) $("mSOC").textContent = `${data.soc.toFixed(1)}%`;
    if ($("mInv")) $("mInv").textContent = `${Math.round(data.inverterUsage)}%`;
    if ($("pvNode")) $("pvNode").textContent = `${(data.pv / 1000).toFixed(2)} kW`;
    if ($("batNode")) $("batNode").textContent = `${data.soc.toFixed(1)}% SOC`;
    if ($("invNode")) $("invNode").textContent = `${Math.round(data.inverterUsage)}% load`;
    if ($("loadNode")) $("loadNode").textContent = `${data.load.toLocaleString()} W`;
    const box = $("faultBox");
    if (box) {
        if (state.faults.includes("overload")) { box.className = "status error"; box.textContent = "● INVERTER OVERLOAD — protection trip"; }
        else if (state.faults.includes("reverse")) { box.className = "status error"; box.textContent = "● WRONG POLARITY — connection blocked"; }
        else if (state.faults.includes("short")) { box.className = "status error"; box.textContent = "● SHORT CIRCUIT — protective shutdown"; }
        else if (data.inverterUsage > 100) { box.className = "status error"; box.textContent = "● Load exceeds inverter rating"; }
        else if (data.soc < 20) { box.className = "status error"; box.textContent = "● Low SOC — deep discharge risk"; }
        else { box.className = "status ok"; box.textContent = "● No active faults"; }
    }
    if ($("simNote")) {
        if (!state.simulationRunning) $("simNote").textContent = "System ready. Start simulation to see live power flow and SOC change.";
        else if (state.faults.length) $("simNote").textContent = "Fault active — power flow interrupted.";
        else if (data.netW > 50) $("simNote").textContent = `Charging: +${data.netW.toFixed(0)} W into battery. SOC rising.`;
        else if (data.netW < -50) $("simNote").textContent = `Discharging: ${Math.abs(data.netW).toFixed(0)} W from battery. SOC falling.`;
        else $("simNote").textContent = "Near balance — PV roughly matches load.";
    }
}
function toggleSimulation() {
    state.simulationRunning = !state.simulationRunning;
    const button = $("simulate");
    if (state.simulationRunning) {
        if (button) button.textContent = "■ Stop Simulation";
        if ($("simState")) $("simState").textContent = "RUNNING";
        if ($("powerBeam")) $("powerBeam").classList.add("running");
        toast("Simulation started — SOC evolves with net power");
    } else {
        if (button) button.textContent = "▶ Start Simulation";
        if ($("simState")) $("simState").textContent = "READY";
        if ($("powerBeam")) $("powerBeam").classList.remove("running");
        state.faults = [];
        toast("Simulation stopped");
    }
    updateSimulationUI();
    renderWires();
}

function triggerFault(type) {
    if (!state.faults.includes(type)) state.faults.push(type);
    if (type === "overload") {
        state.loadW = Math.max(getConfig().inverterW * 1.3, 6500);
        if ($("loadW")) $("loadW").value = state.loadW;
    }
    updateSimulationUI();
    renderWires();
    toast(type.toUpperCase() + " fault triggered");
}

/* Live SOC + clock: 1 sim-second ≈ 1 real minute of energy */
setInterval(() => {
    if (!state.simulationRunning) return;
    state.simulationSeconds += 1;
    const h = String(Math.floor(state.simulationSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor(state.simulationSeconds / 60) % 60).padStart(2, "0");
    const s = String(state.simulationSeconds % 60).padStart(2, "0");
    if ($("simTime")) $("simTime").textContent = h + ":" + m + ":" + s;
    if (state.faults.includes("short") || state.faults.includes("reverse")) { updateSimulationUI(); return; }
    const data = calculateSimulation();
    if (state.faults.includes("overload") && data.inverterUsage > 110) { updateSimulationUI(); return; }
    const capacityWh = getConfig().batteryWh || 1;
    const dSOC = (data.netW * 60) / capacityWh * 100;
    state.soc = Math.max(0, Math.min(100, state.soc + dSOC));
    if ($("socW")) $("socW").value = state.soc.toFixed(1);
    updateSimulationUI();
}, 1000);
/* =========================================================
   ANALYSIS & REPORT
========================================================= */
function estimateArrayTopology() {
    const series = Math.max(1, Math.round(state.voltage / MODULE_TYPICAL.vmp));
    const parallel = Math.max(1, Math.ceil(state.panelCount / series));
    return { series, parallel, arrayCurrent: parallel * MODULE_TYPICAL.imp };
}
function circuitCurrent(circuit) {
    const config = getConfig();
    const topo = estimateArrayTopology();
    if (circuit === "custom") return Math.max(0, Number($("cableCustomI")?.value) || 0);
    if (circuit === "pv") return topo.arrayCurrent * (state.sun / 100) * 1.25;
    if (circuit === "battery") return (state.loadW / (config.voltage * 0.94)) * 1.25;
    if (circuit === "ac") return state.loadW / 230;
    return 0;
}
function voltageDrop(I, L, mm2, mat, V) {
    const rho = RHO[mat] || RHO.cu;
    const R_per_m = rho / mm2;
    const Vd = 2 * I * L * R_per_m;
    return { Vd, VdPct: V > 0 ? (Vd / V) * 100 : 0, powerLoss: Vd * I, R_per_m };
}
function recommendCable(I, L, maxVD, mat, V) {
    const rho = RHO[mat] || RHO.cu;
    const VdAllow = (maxVD / 100) * V;
    const aminVD = VdAllow > 0 ? (2 * I * L * rho) / VdAllow : 0;
    for (const s of CABLE_SIZES) {
        const amp = mat === "al" ? s.ampCu * 0.78 : s.ampCu;
        if (amp >= I && s.mm2 >= aminVD) return { recommended: { ...s, amp }, aminVD };
    }
    const s = CABLE_SIZES[CABLE_SIZES.length - 1];
    return { recommended: { ...s, amp: mat === "al" ? s.ampCu * 0.78 : s.ampCu }, aminVD };
}
function populateCableSizes() {
    const sel = $("cableSize");
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = CABLE_SIZES.map(s => `<option value="${s.mm2}">${s.mm2} mm² (≈ AWG ${s.awg})</option>`).join("");
    sel.value = cur || "10";
}
function runCableCalc() {
    if (!$("cableCircuit")) return;
    const circuit = $("cableCircuit").value;
    const len = Math.max(0.1, Number($("cableLen")?.value) || 15);
    const maxVD = Math.max(0.1, Number($("cableMaxVD")?.value) || 3);
    const mat = $("cableMat")?.value || "cu";
    const sizeMm2 = Number($("cableSize")?.value) || 10;
    const I = circuitCurrent(circuit);
    const V = circuit === "ac" ? 230 : state.voltage;
    const { recommended, aminVD } = recommendCable(I, len, maxVD, mat, V);
    const sel = voltageDrop(I, len, sizeMm2, mat, V);
    const rec = voltageDrop(I, len, recommended.mm2, mat, V);
    const sizeInfo = CABLE_SIZES.find(s => s.mm2 === sizeMm2) || CABLE_SIZES[0];
    const selAmp = mat === "al" ? sizeInfo.ampCu * 0.78 : sizeInfo.ampCu;
    const ampOk = selAmp >= I, vdOk = sel.VdPct <= maxVD + 0.05;
    let statusClass = "ok", statusText = "● Cable meets ampacity and voltage-drop targets";
    if (!ampOk && !vdOk) { statusClass = "error"; statusText = "⚡ Undersized — ampacity and Vd failed"; }
    else if (!ampOk) { statusClass = "error"; statusText = "⚡ Ampacity exceeded"; }
    else if (!vdOk) { statusClass = "error"; statusText = "⚠ Voltage drop above target"; }
    const labels = { pv: "PV → MPPT (DC)", battery: "Battery → Inverter (DC)", ac: "Inverter → Load (AC)", custom: "Custom" };
    if ($("cableResults")) {
        $("cableResults").innerHTML = `
            <div class="check">Circuit <b>${labels[circuit]||circuit}</b></div>
            <div class="check">Design current <b>${I.toFixed(1)} A</b></div>
            <div class="check">Voltage <b>${V} V</b></div>
            <div class="check">Length / material <b>${len} m / ${mat==="cu"?"Copper":"Aluminium"}</b></div>
            <div class="check">Selected <b>${sizeMm2} mm² (≈ AWG ${sizeInfo.awg})</b></div>
            <div class="check ${ampOk?"good":"bad"}">Ampacity <b>${selAmp.toFixed(0)} A ${ampOk?"✓":"✗"}</b></div>
            <div class="check ${vdOk?"good":"bad"}">Voltage drop <b>${sel.Vd.toFixed(2)} V (${sel.VdPct.toFixed(2)}%) ${vdOk?"✓":"✗"}</b></div>
            <div class="check">Power loss <b>${sel.powerLoss.toFixed(1)} W</b></div>
            <div class="check">Min area for Vd <b>${aminVD.toFixed(1)} mm²</b></div>
            <div class="check good">Recommended <b>${recommended.mm2} mm² (≈ AWG ${recommended.awg})</b></div>
            <div class="check">At recommended Vd <b>${rec.Vd.toFixed(2)} V (${rec.VdPct.toFixed(2)}%)</b></div>
            <div class="status ${statusClass}" style="margin-top:12px">${statusText}</div>
            <p class="hint" style="margin-top:8px">V<sub>d</sub>=2×I×L×(ρ/A). Higher system voltage → lower current → smaller cable. Educational ampacity only.</p>`;
    }
    state.lastCable = { circuit: labels[circuit], I: I.toFixed(1), V, len, mat: mat==="cu"?"Copper":"Aluminium",
        selected: sizeMm2+" mm²", Vd: sel.Vd.toFixed(2), VdPct: sel.VdPct.toFixed(2),
        recommended: recommended.mm2+" mm²", ok: ampOk && vdOk };
}

function updateAnalysis() {
    const checks = $("checks");
    if (!checks) return;
    const data = calculateSimulation();
    let score = 100;
    const results = [];
    if (state.components.length === 0) { score -= 20; results.push({ good: false, text: "No components placed." }); }
    else results.push({ good: true, text: state.components.length + " component(s) placed." });
    const invalid = state.connections.filter(c => !c.valid);
    if (invalid.length) { score -= Math.min(40, invalid.length * 10); results.push({ good: false, text: invalid.length + " invalid connection(s)." }); }
    else if (state.connections.length) results.push({ good: true, text: state.connections.length + " valid connection(s)." });
    if (data.inverterUsage > 100) { score -= 25; results.push({ good: false, text: "Inverter overloaded (" + Math.round(data.inverterUsage) + "%)." }); }
    else if (data.inverterUsage > 80) { score -= 8; results.push({ good: false, text: "Inverter near limit (" + Math.round(data.inverterUsage) + "%)." }); }
    else results.push({ good: true, text: "Inverter utilisation " + Math.round(data.inverterUsage) + "%." });
    if (data.dailyPV < data.dailyLoad) { score -= 15; results.push({ good: false, text: "Daily PV (" + data.dailyPV.toFixed(1) + " kWh) < load (" + data.dailyLoad.toFixed(1) + " kWh)." }); }
    else results.push({ good: true, text: "Energy balance OK: PV " + data.dailyPV.toFixed(1) + " vs load " + data.dailyLoad.toFixed(1) + " kWh/day." });
    if (data.autonomyH < 12) { score -= 12; results.push({ good: false, text: "Low autonomy ≈ " + data.autonomyH.toFixed(1) + " h." }); }
    else results.push({ good: true, text: "Autonomy ≈ " + data.autonomyH.toFixed(1) + " h (80% DoD)." });
    if (state.faults.length) { score -= 20; results.push({ good: false, text: "Active fault(s): " + state.faults.join(", ") }); }
    score = Math.max(0, Math.round(score));
    if ($("score")) $("score").textContent = score;
    checks.innerHTML = results.map(r => `<div class="check ${r.good?"good":"bad"}">${r.good?"✓":"⚠"} ${r.text}</div>`).join("");
    const chart = $("chart");
    if (chart) {
        chart.innerHTML = "";
        for (let i = 0; i < 24; i++) {
            let irr = (i >= 6 && i <= 18) ? Math.sin(((i - 6) / 12) * Math.PI) : 0;
            const bar = document.createElement("div");
            bar.className = "energyBar";
            bar.style.height = Math.max(4, irr * 100) + "%";
            chart.appendChild(bar);
        }
    }
    populateCableSizes();
    runCableCalc();
}
function generateReport() {
    const config = getConfig();
    const sim = calculateSimulation();
    const cab = state.lastCable;
    const cableRows = cab ? `
        <tr><td colspan="2"><b>Cable check</b></td></tr>
        <tr><td>Circuit</td><td>${escapeHTML(String(cab.circuit))}</td></tr>
        <tr><td>Design current</td><td>${cab.I} A</td></tr>
        <tr><td>Length / material</td><td>${cab.len} m / ${cab.mat}</td></tr>
        <tr><td>Selected / recommended</td><td>${cab.selected} / ${cab.recommended}</td></tr>
        <tr><td>Voltage drop</td><td>${cab.Vd} V (${cab.VdPct}%)</td></tr>
        <tr><td>Status</td><td>${cab.ok ? "Within targets" : "Review required"}</td></tr>` : "";
    if ($("reportContent")) {
        $("reportContent").innerHTML = `
            <h2>${escapeHTML(state.projectName)}</h2>
            <p>${escapeHTML(state.description)}</p>
            <table class="reportTable">
                <tr><td>System Voltage</td><td>${config.voltage} V</td></tr>
                <tr><td>PV Array</td><td>${config.panelCount} × ${config.panelW} W = ${(config.pvTotal / 1000).toFixed(2)} kWp</td></tr>
                <tr><td>Battery</td><td>${config.voltage} V / ${config.batteryAh} Ah (${(config.batteryWh/1000).toFixed(1)} kWh)</td></tr>
                <tr><td>Inverter Rating</td><td>${config.inverterW.toLocaleString()} W</td></tr>
                <tr><td>Irradiance / Temp</td><td>${Math.round(state.sun)}% / ${state.temp}°C</td></tr>
                <tr><td>PV Output (now)</td><td>${(sim.pv / 1000).toFixed(2)} kW</td></tr>
                <tr><td>AC Load / SOC</td><td>${sim.load} W / ${sim.soc.toFixed(1)}%</td></tr>
                <tr><td>Autonomy</td><td>${sim.autonomyH.toFixed(1)} h</td></tr>
                <tr><td>Daily PV / Load</td><td>${sim.dailyPV.toFixed(1)} / ${sim.dailyLoad.toFixed(1)} kWh</td></tr>
                <tr><td>Components / wires</td><td>${state.components.length} / ${state.connections.length}</td></tr>
                ${cableRows}
            </table>
            <p style="margin-top:14px;color:#8ea3ad;font-size:12px">Educational simulation only. Verify real designs with datasheets, code-compliant cable sizing, protection coordination, and qualified professionals.</p>
        `;
    }
}
/* =========================================================
   JSON EXPORT & IMPORT SYSTEM
========================================================= */
function exportProjectJSON() {
    readSetup();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${state.projectName.replace(/\s+/g, '_')}_SolarLab.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast("Project JSON exported successfully!");
}
function saveProject() {
    readSetup();
    localStorage.setItem("solarlab-v3-project", JSON.stringify({ version: 3, state }));
    toast("Project saved on this device.");
}
function loadSavedProject() {
    try {
        const raw = localStorage.getItem("solarlab-v3-project");
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.state) return false;
        Object.assign(state, data.state);
        updateSetupPreview();
        renderWorkspace();
        renderInspector();
        updateSimulationUI();
        updateAnalysis();
        return true;
    } catch (e) {
        return false;
    }
}
/* =========================================================
   NAVIGATION & ESCAPE HTML
========================================================= */
function showPage(pageId) {
    qsa(".page").forEach(page => page.classList.remove("active"));
    const target = $(pageId);
    if (!target) return;
    target.classList.add("active");
    qsa(".nav button").forEach(button => {
        button.classList.toggle("active", button.dataset.page === pageId);
    });
    if (pageId === "analysis") updateAnalysis();
    if (pageId === "reportPage") generateReport();
    window.scrollTo({ top: 0, behavior: "smooth" });
}
function escapeHTML(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
/* =========================================================
   EVENT LISTENERS & INITIALIZATION
========================================================= */
function initialize() {
    qsa("[data-page]").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page === "report" ? "reportPage" : btn.dataset.page)));
    qsa(".component").forEach(btn => btn.addEventListener("click", () => addComponent(btn.dataset.type)));
    $("connectionMode")?.addEventListener("click", toggleConnectionMode);
    $("seriesMode")?.addEventListener("click", () => setConnectionType("series"));
    $("parallelMode")?.addEventListener("click", () => setConnectionType("parallel"));
    $("autoWire")?.addEventListener("click", autoWire);
    $("clearWorkspace")?.addEventListener("click", clearWorkspace);
    $("removeSelected")?.addEventListener("click", removeSelected);
    $("loadDemo")?.addEventListener("click", loadDemo);
    $("simulate")?.addEventListener("click", toggleSimulation);
    $("saveProject")?.addEventListener("click", saveProject);
    $("openWorkspace")?.addEventListener("click", () => { readSetup(); applyConfigurationToComponents(); showPage("design"); });
    $("printReport")?.addEventListener("click", () => { generateReport(); window.print(); });
    ["pname","pdesc","voltage","panelCount","panelW","batteryAh","inverterMode"].forEach(id => {
        $(id)?.addEventListener("input", updateSetupPreview);
        $(id)?.addEventListener("change", updateSetupPreview);
    });
    ["sun","loadW","socW","temp"].forEach(id => {
        $(id)?.addEventListener("input", () => { state.faults = state.faults.filter(f => f !== "overload"); updateSimulationUI(); });
    });
    $("overload")?.addEventListener("click", () => triggerFault("overload"));
    $("reverse")?.addEventListener("click", () => triggerFault("reverse"));
    $("short")?.addEventListener("click", () => triggerFault("short"));
    ["cableCircuit","cableLen","cableMaxVD","cableMat","cableSize","cableCustomI"].forEach(id => {
        $(id)?.addEventListener("input", runCableCalc);
        $(id)?.addEventListener("change", runCableCalc);
    });
    $("calcCable")?.addEventListener("click", runCableCalc);
    updateSetupPreview();
    updateSimulationUI();
    updateAnalysis();
    renderWorkspace();
    renderInspector();
    loadSavedProject();
}
initialize();
