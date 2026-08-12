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
    faults: []
};
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
                voltage: c.voltage,
                watt: c.panelW,
                current: Number((c.panelW / c.voltage).toFixed(2))
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
    const sun = Number($("sun")?.value || 100) / 100;
    const load = Math.max(0, Number($("loadW")?.value) || 0);
    const soc = Math.max(0, Math.min(100, Number($("socW")?.value) || 0));
    const config = getConfig();
    const pv = config.pvTotal * sun;
    const inverterUsage = config.inverterW ? (load / config.inverterW) * 100 : 0;
    return { pv, load, soc, inverterUsage, surplus: pv - load };
}
function updateSimulationUI() {
    const data = calculateSimulation();
    if ($("sunOut")) $("sunOut").textContent = `${$("sun")?.value}%`;
    if ($("mPV")) $("mPV").textContent = `${(data.pv / 1000).toFixed(2)} kW`;
    if ($("mLoad")) $("mLoad").textContent = `${data.load.toLocaleString()} W`;
    if ($("mSOC")) $("mSOC").textContent = `${data.soc}%`;
    if ($("mInv")) $("mInv").textContent = `${Math.round(data.inverterUsage)}%`;
    if ($("pvNode")) $("pvNode").textContent = `${(data.pv / 1000).toFixed(2)} kW`;
    if ($("batNode")) $("batNode").textContent = `${data.soc}% SOC`;
    if ($("invNode")) $("invNode").textContent = `${Math.round(data.inverterUsage)}% load`;
    if ($("loadNode")) $("loadNode").textContent = `${data.load.toLocaleString()} W`;
    if (data.inverterUsage > 100 && $("faultBox")) {
        $("faultBox").className = "status error";
        $("faultBox").textContent = "● INVERTER OVERLOAD";
    }
}
function toggleSimulation() {
    state.simulationRunning = !state.simulationRunning;
    const button = $("simulate");
    if (state.simulationRunning) {
        if (button) button.textContent = "■ Stop Simulation";
        if ($("simState")) $("simState").textContent = "RUNNING";
        if ($("powerBeam")) $("powerBeam").classList.add("running");
        if ($("simNote")) $("simNote").textContent = "Simulation running. Power flow active.";
    } else {
        if (button) button.textContent = "▶ Start Simulation";
        if ($("simState")) $("simState").textContent = "READY";
        if ($("powerBeam")) $("powerBeam").classList.remove("running");
        if ($("simNote")) $("simNote").textContent = "Simulation stopped.";
    }
    renderWires();
}
/* =========================================================
   ANALYSIS & REPORT
========================================================= */
function updateAnalysis() {
    const checks = $("checks");
    if (!checks) return;
    let score = 100;
    const results = [];
    if (state.components.length === 0) {
        score -= 20;
        results.push({ good: false, text: "No components placed." });
    } else {
        results.push({ good: true, text: `${state.components.length} component(s) placed.` });
    }
    const invalid = state.connections.filter(c => !c.valid);
    if (invalid.length) {
        score -= Math.min(40, invalid.length * 10);
        results.push({ good: false, text: `${invalid.length} invalid connection(s) detected.` });
    } else {
        results.push({ good: true, text: `${state.connections.length} valid connection(s).` });
    }
    if ($("score")) $("score").textContent = Math.max(0, score);
    checks.innerHTML = results.map(r => `<div class="check ${r.good ? "good" : "bad"}">${r.good ? "✓" : "⚠"} ${r.text}</div>`).join("");
}
function generateReport() {
    const config = getConfig();
    const sim = calculateSimulation();
    if ($("reportContent")) {
        $("reportContent").innerHTML = `
            <h2>${escapeHTML(state.projectName)}</h2>
            <p>${escapeHTML(state.description)}</p>
            <table class="reportTable">
                <tr><td>System Voltage</td><td>${config.voltage} V</td></tr>
                <tr><td>PV Array</td><td>${config.panelCount} × ${config.panelW} W = ${(config.pvTotal / 1000).toFixed(2)} kW</td></tr>
                <tr><td>Battery</td><td>${config.voltage} V / ${config.batteryAh} Ah</td></tr>
                <tr><td>Inverter Rating</td><td>${config.inverterW.toLocaleString()} W</td></tr>
                <tr><td>Current PV Output</td><td>${(sim.pv / 1000).toFixed(2)} kW</td></tr>
            </table>
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
    if ($("connectionMode")) $("connectionMode").addEventListener("click", toggleConnectionMode);
    if ($("seriesMode")) $("seriesMode").addEventListener("click", () => setConnectionType("series"));
    if ($("parallelMode")) $("parallelMode").addEventListener("click", () => setConnectionType("parallel"));
    if ($("autoWire")) $("autoWire").addEventListener("click", autoWire);
    if ($("clearWorkspace")) $("clearWorkspace").addEventListener("click", clearWorkspace);
    if ($("removeSelected")) $("removeSelected").addEventListener("click", removeSelected);
    if ($("loadDemo")) $("loadDemo").addEventListener("click", loadDemo);
    if ($("simulate")) $("simulate").addEventListener("click", toggleSimulation);
    if ($("saveProject")) $("saveProject").addEventListener("click", saveProject);
    if ($("openWorkspace")) $("openWorkspace").addEventListener("click", () => { readSetup(); applyConfigurationToComponents(); showPage("design"); });
    updateSetupPreview();
    updateSimulationUI();
    updateAnalysis();
    renderWorkspace();
    renderInspector();
    loadSavedProject();
}
initialize();
