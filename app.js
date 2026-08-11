/* =========================================================
   SolarLab Structure V3
   Interactive Connection Engine
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

    description:
        "Interactive solar power system simulation.",

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

    panel: {
        name: "Solar Panel",
        icon: "☀"
    },

    mppt: {
        name: "MPPT Controller",
        icon: "⚙"
    },

    battery: {
        name: "Battery Bank",
        icon: "🔋"
    },

    breaker: {
        name: "DC Breaker",
        icon: "▣"
    },

    inverter: {
        name: "Inverter",
        icon: "↕"
    },

    load: {
        name: "AC Load",
        icon: "💡"
    },

    meter: {
        name: "Energy Meter",
        icon: "▥"
    }

};


/* =========================================================
   VOLTAGE PRESETS
========================================================= */

const VOLTAGE_PRESETS = {

    12: {
        voltage: 12,
        inverter: 2000,
        breaker: 80,
        mpptCurrent: 100
    },

    24: {
        voltage: 24,
        inverter: 3000,
        breaker: 80,
        mpptCurrent: 80
    },

    48: {
        voltage: 48,
        inverter: 5000,
        breaker: 60,
        mpptCurrent: 60
    }

};


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = id => document.getElementById(id);

const qs = selector =>
    document.querySelector(selector);

const qsa = selector =>
    [...document.querySelectorAll(selector)];


function toast(message) {

    const el = $("toast");

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

    const preset =
        VOLTAGE_PRESETS[state.voltage];

    return {

        voltage: state.voltage,

        panelCount: state.panelCount,

        panelW: state.panelW,

        pvTotal:
            state.panelCount *
            state.panelW,

        batteryAh: state.batteryAh,

        batteryWh:
            state.voltage *
            state.batteryAh,

        inverterW: state.inverterW,

        breaker: preset.breaker,

        mpptCurrent:
            preset.mpptCurrent

    };

}


/* =========================================================
   AUTO INVERTER
========================================================= */

function calculateAutoInverter() {

    const pv =
        state.panelCount *
        state.panelW;

    const preset =
        VOLTAGE_PRESETS[state.voltage];

    let value =
        preset.inverter;

    if (pv > value) {

        if (pv <= 2500)
            value = 2000;

        else if (pv <= 4000)
            value = 3000;

        else
            value = 5000;

    }

    return value;

}


/* =========================================================
   READ SETUP
========================================================= */

function readSetup() {

    state.projectName =
        $("pname").value.trim()
        || "SolarLab V3 Test System";

    state.description =
        $("pdesc").value.trim()
        || "Interactive solar power system simulation.";

    state.voltage =
        Number($("voltage").value);

    state.panelCount =
        Math.max(
            1,
            Number($("panelCount").value) || 1
        );

    state.panelW =
        Math.max(
            50,
            Number($("panelW").value) || 550
        );

    state.batteryAh =
        Math.max(
            20,
            Number($("batteryAh").value) || 200
        );


    const inverterMode =
        $("inverterMode").value;


    if (inverterMode === "auto") {

        state.inverterW =
            calculateAutoInverter();

    } else {

        state.inverterW =
            Number(inverterMode);

    }

}


/* =========================================================
   UPDATE SETUP PREVIEW
========================================================= */

function updateSetupPreview() {

    readSetup();

    const config =
        getConfig();


    $("previewVoltage").textContent =
        `${config.voltage}V`;

    $("previewPV").textContent =
        `${(config.pvTotal / 1000).toFixed(2)} kW`;

    $("previewBattery").textContent =
        `${config.voltage}V / ${config.batteryAh}Ah`;

    $("previewInverter").textContent =
        `${(config.inverterW / 1000).toFixed(1)} kW`;

    $("previewMPPT").textContent =
        `${config.voltage}V / ${config.mpptCurrent}A`;

    $("previewBreaker").textContent =
        `${config.breaker}A`;


    $("libPanel").textContent =
        `${config.panelW} W PV`;

    $("libMPPT").textContent =
        `${config.voltage}V / ${config.mpptCurrent}A`;

    $("libBattery").textContent =
        `${config.voltage}V / ${config.batteryAh}Ah`;

    $("libBreaker").textContent =
        `${config.breaker}A DC`;

    $("libInverter").textContent =
        `${config.voltage}V → AC`;

    $("libLoad").textContent =
        `${$("loadW").value || 850} W`;

    $("boardVoltage").textContent =
        `${config.voltage}V DC / AC SYSTEM`;


    const autoOption =
        $("inverterMode").value === "auto";

    $("configStatus").textContent =
        autoOption
            ? "● AUTO CONFIGURED"
            : "● CUSTOM CONFIGURED";


    $("configStatus").className =
        "status ok";

}


/* =========================================================
   APPLY CONFIGURATION TO EXISTING COMPONENTS
========================================================= */

function applyConfigurationToComponents() {

    readSetup();

    state.components.forEach(component => {

        component.values =
            getDefaultValues(component.type);

    });

    renderWorkspace();

    renderInspector();

    updateAnalysis();

}


/* =========================================================
   COMPONENT DEFAULT VALUES
========================================================= */

function getDefaultValues(type) {

    const c =
        getConfig();


    switch (type) {

        case "panel":

            return {

                voltage: c.voltage,

                watt: c.panelW,

                current:
                    Number(
                        (
                            c.panelW /
                            c.voltage
                        ).toFixed(2)
                    )

            };


        case "mppt":

            return {

                voltage: c.voltage,

                maxCurrent:
                    c.mpptCurrent,

                efficiency: 98

            };


        case "battery":

            return {

                voltage: c.voltage,

                ah: c.batteryAh,

                energy:
                    c.batteryWh

            };


        case "breaker":

            return {

                voltage: c.voltage,

                amp: c.breaker

            };


        case "inverter":

            return {

                dcVoltage: c.voltage,

                watt: c.inverterW,

                efficiency: 94

            };


        case "load":

            return {

                voltage: 230,

                watt: 850

            };


        case "meter":

            return {

                voltage: c.voltage,

                maxCurrent: c.mpptCurrent

            };


        default:

            return {};

    }

}


/* =========================================================
   ADD COMPONENT
========================================================= */

function addComponent(type, x = null, y = null) {

    const id =
        `${type}-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;


    const board =
        $("board");

    const rect =
        board.getBoundingClientRect();


    const defaultX =
        x !== null
            ? x
            : Math.max(
                20,
                60 +
                (state.components.length % 4) *
                155
            );


    const defaultY =
        y !== null
            ? y
            : 100 +
                Math.floor(
                    state.components.length / 4
                ) * 130;


    const component = {

        id,

        type,

        x: defaultX,

        y: defaultY,

        values:
            getDefaultValues(type)

    };


    state.components.push(component);

    state.selectedId = id;

    renderWorkspace();

    renderInspector();

    updateAnalysis();

    toast(
        `${COMPONENTS[type].name} added`
    );

}


/* =========================================================
   REMOVE COMPONENT
========================================================= */

function removeSelected() {

    if (!state.selectedId) {

        toast("Select a component first.");

        return;

    }


    const id =
        state.selectedId;


    const component =
        state.components.find(
            c => c.id === id
        );


    if (!component)
        return;


    state.components =
        state.components.filter(
            c => c.id !== id
        );


    state.connections =
        state.connections.filter(
            c =>
                c.from !== id &&
                c.to !== id
        );


    state.selectedId = null;

    state.connectionStart = null;

    renderWorkspace();

    renderInspector();

    updateAnalysis();

    toast(
        `${COMPONENTS[component.type].name} removed`
    );

}


/* =========================================================
   CLEAR WORKSPACE
========================================================= */

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


/* =========================================================
   SELECT COMPONENT
========================================================= */

function selectComponent(id) {

    state.selectedId = id;

    renderWorkspace();

    renderInspector();

}


/* =========================================================
   CREATE NODE ELEMENT
========================================================= */

function createNode(component) {

    const node =
        document.createElement("div");


    node.className = "node";

    if (
        state.selectedId === component.id
    ) {

        node.classList.add("selected");

    }


    if (
        state.connectionStart === component.id
    ) {

        node.classList.add(
            "connectionStart"
        );

    }


    node.dataset.id =
        component.id;


    node.style.left =
        `${component.x}px`;

    node.style.top =
        `${component.y}px`;


    const definition =
        COMPONENTS[component.type];


    node.innerHTML = `

        <div class="nodeIcon">
            ${definition.icon}
        </div>

        <div class="nodeTitle">
            ${definition.name}
        </div>

        <div class="nodeValue">
            ${getComponentDisplayValue(component)}
        </div>

        <div class="nodePorts">

            <span
                class="port plus"
                title="+ positive"
            ></span>

            <span
                class="port minus"
                title="- negative"
            ></span>

        </div>

    `;


    node.addEventListener(
        "pointerdown",
        event => startNodeDrag(
            event,
            component
        )
    );


    node.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            if (
                state.connectionMode
            ) {

                handleConnectionClick(
                    component.id
                );

            } else {

                selectComponent(
                    component.id
                );

            }

        }
    );


    return node;

}


/* =========================================================
   COMPONENT DISPLAY VALUE
========================================================= */

function getComponentDisplayValue(c) {

    const v = c.values;


    switch (c.type) {

        case "panel":
            return `${v.voltage}V • ${v.watt}W`;

        case "mppt":
            return `${v.voltage}V • ${v.maxCurrent}A`;

        case "battery":
            return `${v.voltage}V • ${v.ah}Ah`;

        case "breaker":
            return `${v.voltage}V • ${v.amp}A`;

        case "inverter":
            return `${v.dcVoltage}V • ${v.watt}W`;

        case "load":
            return `${v.watt}W AC`;

        case "meter":
            return `${v.voltage}V meter`;

        default:
            return "";

    }

}


/* =========================================================
   RENDER WORKSPACE
========================================================= */

function renderWorkspace() {

    const nodes =
        $("nodes");

    nodes.innerHTML = "";


    $("emptyWorkspace").style.display =
        state.components.length
            ? "none"
            : "grid";


    state.components.forEach(
        component => {

            nodes.appendChild(
                createNode(component)
            );

        }
    );


    renderWires();

}


/* =========================================================
   DRAG COMPONENT
========================================================= */

function startNodeDrag(event, component) {

    if (state.connectionMode)
        return;


    event.preventDefault();

    selectComponent(component.id);


    const board =
        $("board");

    const boardRect =
        board.getBoundingClientRect();


    const startPointerX =
        event.clientX;

    const startPointerY =
        event.clientY;


    const startX =
        component.x;

    const startY =
        component.y;


    let moved = false;


    const move =
        e => {

            moved = true;


            const dx =
                e.clientX -
                startPointerX;

            const dy =
                e.clientY -
                startPointerY;


            const maxX =
                board.clientWidth -
                150;

            const maxY =
                board.clientHeight -
                105;


            component.x =
                Math.max(
                    5,
                    Math.min(
                        maxX,
                        startX + dx
                    )
                );


            component.y =
                Math.max(
                    45,
                    Math.min(
                        maxY,
                        startY + dy
                    )
                );


            const node =
                document.querySelector(
                    `.node[data-id="${component.id}"]`
                );


            if (node) {

                node.style.left =
                    `${component.x}px`;

                node.style.top =
                    `${component.y}px`;

            }


            renderWires();

        };


    const up =
        () => {

            document.removeEventListener(
                "pointermove",
                move
            );

            document.removeEventListener(
                "pointerup",
                up
            );


            if (moved) {

                renderWires();

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
   CONNECTION MODE
========================================================= */

function toggleConnectionMode() {

    state.connectionMode =
        !state.connectionMode;


    state.connectionStart =
        null;


    const button =
        $("connectionMode");


    if (state.connectionMode) {

        button.classList.add("active");

        button.textContent =
            "🔗 Connection Mode ON";

        $("connectionHint").textContent =
            "Select first component";

        $("connectionHint")
            .classList.add("active");

    } else {

        button.classList.remove("active");

        button.textContent =
            "🔗 Connection Mode";

        $("connectionHint").textContent =
            "Connection mode OFF";

        $("connectionHint")
            .classList.remove("active");

    }


    renderWorkspace();

}


/* =========================================================
   CONNECTION TYPE
========================================================= */

function setConnectionType(type) {

    state.connectionType =
        type;


    toast(
        `${type.toUpperCase()} connection selected`
    );


    if (type === "series") {

        $("connectionHint").textContent =
            "SERIES: select two components";

    }

    else if (type === "parallel") {

        $("connectionHint").textContent =
            "PARALLEL: select two components";

    }

}


/* =========================================================
   CONNECTION CLICK
========================================================= */

function handleConnectionClick(id) {

    if (!state.connectionStart) {

        state.connectionStart =
            id;


        $("connectionHint").textContent =
            `Start selected • choose second component`;

        renderWorkspace();

        return;

    }


    if (
        state.connectionStart === id
    ) {

        toast(
            "Choose a different component."
        );

        return;

    }


    createConnection(
        state.connectionStart,
        id,
        state.connectionType
    );


    state.connectionStart = null;

    $("connectionHint").textContent =
        "Select first component";

    renderWorkspace();

    updateAnalysis();

}


/* =========================================================
   CREATE CONNECTION
========================================================= */

function createConnection(
    from,
    to,
    type = "single"
) {

    const duplicate =
        state.connections.find(
            c =>
                (
                    c.from === from &&
                    c.to === to
                ) ||
                (
                    c.from === to &&
                    c.to === from
                )
        );


    if (duplicate) {

        toast(
            "These components are already connected."
        );

        return false;

    }


    const validation =
        validateConnection(
            from,
            to,
            type
        );


    const connection = {

        id:
            `wire-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`,

        from,

        to,

        type,

        valid:
            validation.valid,

        error:
            validation.error || null

    };


    state.connections.push(
        connection
    );


    if (!validation.valid) {

        toast(
            `Connection warning: ${validation.error}`
        );

    } else {

        toast(
            `${type.toUpperCase()} connection created`
        );

    }


    return true;

}


/* =========================================================
   CONNECTION VALIDATION
========================================================= */

function validateConnection(
    fromId,
    toId,
    type
) {

    const from =
        state.components.find(
            c => c.id === fromId
        );

    const to =
        state.components.find(
            c => c.id === toId
        );


    if (!from || !to) {

        return {
            valid: false,
            error: "Component not found"
        };

    }


    /* AC load can connect only to inverter or meter */

    if (
        to.type === "load" &&
        from.type === "panel"
    ) {

        return {
            valid: false,
            error:
                "PV panel cannot directly feed an AC load."
        };

    }


    if (
        from.type === "load" &&
        to.type === "panel"
    ) {

        return {
            valid: false,
            error:
                "AC load cannot directly connect to PV."
        };

    }


    /* Battery voltage check */

    const fromVoltage =
        getComponentVoltage(from);

    const toVoltage =
        getComponentVoltage(to);


    if (
        fromVoltage &&
        toVoltage &&
        from.type !== "load" &&
        to.type !== "load" &&
        fromVoltage !== toVoltage
    ) {

        return {
            valid: false,
            error:
                `Voltage mismatch: ${fromVoltage}V → ${toVoltage}V`
        };

    }


    /* Inverter output to DC component */

    if (
        from.type === "inverter" &&
        [
            "panel",
            "mppt",
            "battery",
            "breaker"
        ].includes(to.type)
    ) {

        return {
            valid: false,
            error:
                "Inverter AC output cannot directly connect to this DC component."
        };

    }


    if (
        to.type === "inverter" &&
        [
            "load"
        ].includes(from.type)
    ) {

        return {
            valid: false,
            error:
                "AC load should be connected after the inverter."
        };

    }


    return {
        valid: true
    };

}


/* =========================================================
   COMPONENT VOLTAGE
========================================================= */

function getComponentVoltage(component) {

    if (!component)
        return null;


    const v =
        component.values;


    switch (component.type) {

        case "panel":
            return v.voltage;

        case "mppt":
            return v.voltage;

        case "battery":
            return v.voltage;

        case "breaker":
            return v.voltage;

        case "inverter":
            return v.dcVoltage;

        case "meter":
            return v.voltage;

        case "load":
            return 230;

        default:
            return null;

    }

}


/* =========================================================
   RENDER WIRES
========================================================= */

function renderWires() {

    const svg =
        $("wires");


    const board =
        $("board");

    const width =
        board.clientWidth;

    const height =
        board.clientHeight;


    svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`
    );


    svg.innerHTML = "";


    state.connections.forEach(
        connection => {

            const from =
                state.components.find(
                    c =>
                        c.id === connection.from
                );

            const to =
                state.components.find(
                    c =>
                        c.id === connection.to
                );


            if (!from || !to)
                return;


            const x1 =
                from.x + 140;

            const y1 =
                from.y + 45;


            const x2 =
                to.x;

            const y2 =
                to.y + 45;


            const dx =
                Math.abs(x2 - x1) * .45;


            const path =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                );


            const d = `
                M ${x1} ${y1}
                C ${x1 + dx} ${y1},
                  ${x2 - dx} ${y2},
                  ${x2} ${y2}
            `;


            path.setAttribute(
                "d",
                d
            );


            path.classList.add(
                "wire"
            );


            if (
                connection.type === "series"
            ) {

                path.classList.add(
                    "series"
                );

            }


            if (
                connection.type === "parallel"
            ) {

                path.classList.add(
                    "parallel"
                );

            }


            if (
                !connection.valid
            ) {

                path.classList.add(
                    "error"
                );

            }


            path.addEventListener(
                "click",
                () => {

                    if (
                        confirm(
                            "Remove this connection?"
                        )
                    ) {

                        state.connections =
                            state.connections.filter(
                                c =>
                                    c.id !==
                                    connection.id
                            );

                        renderWorkspace();

                        updateAnalysis();

                    }

                }
            );


            svg.appendChild(path);

        }
    );

}


/* =========================================================
   INSPECTOR
========================================================= */

function renderInspector() {

    const inspector =
        $("inspector");


    if (!state.selectedId) {

        inspector.innerHTML = `

            <h3>Inspector</h3>

            <p class="hint">
                Select a component to view its properties.
            </p>

        `;

        return;

    }


    const c =
        state.components.find(
            x =>
                x.id ===
                state.selectedId
        );


    if (!c)
        return;


    const v =
        c.values;


    inspector.innerHTML = `

        <h3>
            ${COMPONENTS[c.type].icon}
            ${COMPONENTS[c.type].name}
        </h3>

        <p class="hint">
            Component properties
        </p>

        <h4>TYPE</h4>

        <div class="inspectorValue">
            ${c.type.toUpperCase()}
        </div>

        ${getInspectorFields(c)}

        <h4>POSITION</h4>

        <div class="inspectorValue">
            X: ${Math.round(c.x)}
            &nbsp; • &nbsp;
            Y: ${Math.round(c.y)}
        </div>

        <h4>CONNECTIONS</h4>

        <div class="inspectorValue">
            ${
                state.connections.filter(
                    x =>
                        x.from === c.id ||
                        x.to === c.id
                ).length
            }
            connection(s)
        </div>

        <button
            id="inspectorRemove"
            class="dangerButton"
        >
            🗑 Remove Component
        </button>

    `;


    const remove =
        $("inspectorRemove");


    if (remove) {

        remove.addEventListener(
            "click",
            removeSelected
        );

    }

}


/* =========================================================
   INSPECTOR FIELDS
========================================================= */

function getInspectorFields(c) {

    const v =
        c.values;


    switch (c.type) {

        case "panel":

            return `

                <h4>VOLTAGE</h4>
                <div class="inspectorValue">
                    ${v.voltage} V
                </div>

                <h4>POWER</h4>
                <div class="inspectorValue">
                    ${v.watt} W
                </div>

                <h4>CURRENT</h4>
                <div class="inspectorValue">
                    ${v.current} A
                </div>

            `;


        case "mppt":

            return `

                <h4>SYSTEM VOLTAGE</h4>
                <div class="inspectorValue">
                    ${v.voltage} V
                </div>

                <h4>MAX CURRENT</h4>
                <div class="inspectorValue">
                    ${v.maxCurrent} A
                </div>

                <h4>EFFICIENCY</h4>
                <div class="inspectorValue">
                    ${v.efficiency}%
                </div>

            `;


        case "battery":

            return `

                <h4>BATTERY VOLTAGE</h4>
                <div class="inspectorValue">
                    ${v.voltage} V
                </div>

                <h4>CAPACITY</h4>
                <div class="inspectorValue">
                    ${v.ah} Ah
                </div>

                <h4>ENERGY</h4>
                <div class="inspectorValue">
                    ${v.energy.toLocaleString()} Wh
                </div>

            `;


        case "breaker":

            return `

                <h4>RATING</h4>
                <div class="inspectorValue">
                    ${v.voltage} V / ${v.amp} A
                </div>

            `;


        case "inverter":

            return `

                <h4>DC INPUT</h4>
                <div class="inspectorValue">
                    ${v.dcVoltage} V
                </div>

                <h4>RATING</h4>
                <div class="inspectorValue">
                    ${v.watt.toLocaleString()} W
                </div>

                <h4>EFFICIENCY</h4>
                <div class="inspectorValue">
                    ${v.efficiency}%
                </div>

            `;


        case "load":

            return `

                <h4>AC VOLTAGE</h4>
                <div class="inspectorValue">
                    ${v.voltage} V AC
                </div>

                <h4>POWER</h4>
                <div class="inspectorValue">
                    ${v.watt} W
                </div>

            `;


        case "meter":

            return `

                <h4>VOLTAGE</h4>
                <div class="inspectorValue">
                    ${v.voltage} V
                </div>

                <h4>MAX CURRENT</h4>
                <div class="inspectorValue">
                    ${v.maxCurrent} A
                </div>

            `;

        default:
            return "";

    }

}


/* =========================================================
   AUTO WIRE
========================================================= */

function autoWire() {

    if (
        state.components.length < 2
    ) {

        toast(
            "Add at least two components."
        );

        return;

    }


    state.connections = [];


    const find =
        type =>
            state.components.find(
                c =>
                    c.type === type
            );


    const panels =
        state.components.filter(
            c =>
                c.type === "panel"
        );


    const mppt =
        find("mppt");

    const battery =
        find("battery");

    const breaker =
        find("breaker");

    const inverter =
        find("inverter");

    const load =
        find("load");

    const meter =
        find("meter");


    /* PV → MPPT */

    if (
        panels.length &&
        mppt
    ) {

        panels.forEach(
            panel => {

                createConnection(
                    panel.id,
                    mppt.id,
                    "parallel"
                );

            }
        );

    }


    /* MPPT → breaker */

    if (
        mppt &&
        breaker
    ) {

        createConnection(
            mppt.id,
            breaker.id,
            "single"
        );

    }


    /* breaker → battery */

    if (
        breaker &&
        battery
    ) {

        createConnection(
            breaker.id,
            battery.id,
            "single"
        );

    }


    /* battery → inverter */

    if (
        battery &&
        inverter
    ) {

        createConnection(
            battery.id,
            inverter.id,
            "single"
        );

    }


    /* inverter → load */

    if (
        inverter &&
        load
    ) {

        createConnection(
            inverter.id,
            load.id,
            "single"
        );

    }


    /* inverter → meter */

    if (
        inverter &&
        meter
    ) {

        createConnection(
            inverter.id,
            meter.id,
            "single"
        );

    }


    arrangeAutoLayout();

    renderWorkspace();

    updateAnalysis();

    toast(
        "Automatic system wiring created."
    );

}


/* =========================================================
   AUTO LAYOUT
========================================================= */

function arrangeAutoLayout() {

    const groups = [

        ["panel", 50, 120],

        ["mppt", 250, 120],

        ["breaker", 450, 120],

        ["battery", 650, 120],

        ["inverter", 850, 120],

        ["load", 1050, 120],

        ["meter", 1050, 300]

    ];


    groups.forEach(
        ([type,x,y]) => {

            const matches =
                state.components.filter(
                    c =>
                        c.type === type
                );


            matches.forEach(
                (c,index) => {

                    c.x =
                        x;

                    c.y =
                        y +
                        index * 115;

                }
            );

        }
    );

}


/* =========================================================
   DEMO SYSTEM
========================================================= */

function loadDemo() {

    readSetup();

    state.components = [];

    state.connections = [];

    const types = [

        "panel",
        "panel",
        "panel",
        "panel",
        "mppt",
        "breaker",
        "battery",
        "inverter",
        "load"

    ];


    types.forEach(
        type =>
            addComponent(
                type
            )
    );


    arrangeAutoLayout();

    state.selectedId = null;

    renderWorkspace();

    renderInspector();

    autoWire();

    showPage("design");

    toast(
        "Demo system loaded."
    );

}


/* =========================================================
   SIMULATION
========================================================= */

function calculateSimulation() {

    const sun =
        Number($("sun").value) / 100;


    const load =
        Math.max(
            0,
            Number($("loadW").value) || 0
        );


    const soc =
        Math.max(
            0,
            Math.min(
                100,
                Number($("socW").value) || 0
            )
        );


    const config =
        getConfig();


    const pv =
        config.pvTotal *
        sun;


    const inverterUsage =
        config.inverterW
            ? load /
              config.inverterW *
              100
            : 0;


    return {

        pv,

        load,

        soc,

        inverterUsage,

        surplus:
            pv - load

    };

}


/* =========================================================
   UPDATE SIMULATION UI
========================================================= */

function updateSimulationUI() {

    const data =
        calculateSimulation();


    $("sunOut").textContent =
        `${$("sun").value}%`;


    $("mPV").textContent =
        `${(data.pv / 1000).toFixed(2)} kW`;

    $("mLoad").textContent =
        `${data.load.toLocaleString()} W`;

    $("mSOC").textContent =
        `${data.soc}%`;

    $("mInv").textContent =
        `${Math.round(
            data.inverterUsage
        )}%`;


    $("pvNode").textContent =
        `${(data.pv / 1000).toFixed(2)} kW`;

    $("batNode").textContent =
        `${data.soc}% SOC`;

    $("invNode").textContent =
        `${Math.round(
            data.inverterUsage
        )}% load`;

    $("loadNode").textContent =
        `${data.load.toLocaleString()} W`;


    if (
        data.inverterUsage > 100
    ) {

        $("faultBox").className =
            "status error";

        $("faultBox").textContent =
            "● INVERTER OVERLOAD";

    }

}


/* =========================================================
   START / STOP SIMULATION
========================================================= */

function toggleSimulation() {

    state.simulationRunning =
        !state.simulationRunning;


    const button =
        $("simulate");


    if (
        state.simulationRunning
    ) {

        button.textContent =
            "■ Stop Simulation";

        $("simState").textContent =
            "RUNNING";

        $("powerBeam")
            .classList.add("running");

        $("simNote").textContent =
            "Simulation running. Power flow is active.";

    } else {

        button.textContent =
            "▶ Start Simulation";

        $("simState").textContent =
            "READY";

        $("powerBeam")
            .classList.remove("running");

        $("simNote").textContent =
            "Simulation stopped.";

    }

}


/* =========================================================
   FAULT TEST
========================================================= */

function setFault(message) {

    state.faults = [message];

    $("faultBox").className =
        "status error";

    $("faultBox").textContent =
        `● ${message}`;

    $("simNote").textContent =
        `FAULT: ${message}`;

    toast(
        `Fault triggered: ${message}`
    );

    updateAnalysis();

}


/* =========================================================
   OVERLOAD
========================================================= */

function overloadTest() {

    const config =
        getConfig();


    $("loadW").value =
        Math.round(
            config.inverterW * 1.35
        );


    updateSimulationUI();

    setFault(
        "INVERTER OVERLOAD"
    );

}


/* =========================================================
   WRONG POLARITY
========================================================= */

function reverseTest() {

    setFault(
        "WRONG POLARITY DETECTED"
    );

}


/* =========================================================
   SHORT CIRCUIT
========================================================= */

function shortTest() {

    setFault(
        "SHORT CIRCUIT DETECTED"
    );

}


/* =========================================================
   ANALYSIS
========================================================= */

function updateAnalysis() {

    const checks =
        $("checks");


    if (!checks)
        return;


    const config =
        getConfig();


    let score = 100;

    const results = [];


    /* Components */

    if (
        state.components.length === 0
    ) {

        score -= 20;

        results.push({
            good: false,
            text:
                "No components placed."
        });

    } else {

        results.push({
            good: true,
            text:
                `${state.components.length} component(s) placed.`
        });

    }


    /* Connections */

    const invalid =
        state.connections.filter(
            c =>
                !c.valid
        );


    if (
        invalid.length
    ) {

        score -=
            Math.min(
                40,
                invalid.length * 10
            );


        results.push({
            good: false,
            text:
                `${invalid.length} invalid connection(s) detected.`
        });

    } else {

        results.push({
            good: true,
            text:
                `${state.connections.length} valid connection(s).`
        });

    }


    /* Voltage */

    const wrongVoltage =
        state.components.filter(
            c =>
                c.type !== "load" &&
                getComponentVoltage(c) !==
                state.voltage
        );


    if (
        wrongVoltage.length
    ) {

        score -= 15;

        results.push({
            good: false,
            text:
                "Voltage mismatch in component configuration."
        });

    } else {

        results.push({
            good: true,
            text:
                `All DC components configured for ${state.voltage}V.`
        });

    }


    /* Faults */

    if (
        state.faults.length
    ) {

        score -= 20;

        results.push({
            good: false,
            text:
                state.faults[0]
        });

    } else {

        results.push({
            good: true,
            text:
                "No active faults."
        });

    }


    score =
        Math.max(
            0,
            Math.min(
                100,
                score
            )
        );


    $("score").textContent =
        score;


    checks.innerHTML =
        results
            .map(
                result => `

                    <div
                        class="check ${
                            result.good
                                ? "good"
                                : "bad"
                        }"
                    >
                        ${
                            result.good
                                ? "✓"
                                : "⚠"
                        }
                        ${result.text}
                    </div>

                `
            )
            .join("");


    renderEnergyChart();

}


/* =========================================================
   ENERGY CHART
========================================================= */

function renderEnergyChart() {

    const chart =
        $("chart");


    if (!chart)
        return;


    const config =
        getConfig();


    const bars = [];


    for (
        let hour = 0;
        hour < 24;
        hour++
    ) {

        let sun = 0;


        if (
            hour >= 6 &&
            hour <= 18
        ) {

            sun =
                Math.sin(
                    (
                        (hour - 6) /
                        12
                    ) * Math.PI
                );

        }


        const power =
            config.pvTotal *
            sun;


        bars.push(power);

    }


    const max =
        Math.max(
            ...bars,
            1
        );


    chart.innerHTML =
        bars.map(
            value => `

                <div
                    class="energyBar"
                    style="height:${
                        Math.max(
                            2,
                            value / max * 100
                        )
                    }%"
                    title="${
                        Math.round(value)
                    } W"
                ></div>

            `
        ).join("");

}


/* =========================================================
   REPORT
========================================================= */

function generateReport() {

    const config =
        getConfig();


    const sim =
        calculateSimulation();


    const valid =
        state.connections.filter(
            c =>
                c.valid
        ).length;


    const invalid =
        state.connections.filter(
            c =>
                !c.valid
        ).length;


    $("reportContent").innerHTML = `

        <h2>
            ${escapeHTML(
                state.projectName
            )}
        </h2>

        <p>
            ${escapeHTML(
                state.description
            )}
        </p>

        <table class="reportTable">

            <tr>
                <td>System Voltage</td>
                <td>${config.voltage} V</td>
            </tr>

            <tr>
                <td>PV Array</td>
                <td>
                    ${config.panelCount}
                    ×
                    ${config.panelW} W
                    =
                    ${(config.pvTotal / 1000).toFixed(2)}
                    kW
                </td>
            </tr>

            <tr>
                <td>Battery</td>
                <td>
                    ${config.voltage} V /
                    ${config.batteryAh} Ah
                </td>
            </tr>

            <tr>
                <td>Battery Energy</td>
                <td>
                    ${config.batteryWh.toLocaleString()}
                    Wh
                </td>
            </tr>

            <tr>
                <td>Inverter</td>
                <td>
                    ${config.inverterW.toLocaleString()}
                    W
                </td>
            </tr>

            <tr>
                <td>Connections</td>
                <td>
                    ${valid} valid /
                    ${invalid} invalid
                </td>
            </tr>

            <tr>
                <td>Current PV Output</td>
                <td>
                    ${(sim.pv / 1000).toFixed(2)}
                    kW
                </td>
            </tr>

            <tr>
                <td>Current Load</td>
                <td>
                    ${sim.load.toLocaleString()}
                    W
                </td>
            </tr>

            <tr>
                <td>Battery SOC</td>
                <td>
                    ${sim.soc}%
                </td>
            </tr>

            <tr>
                <td>Active Faults</td>
                <td>
                    ${
                        state.faults.length
                            ? state.faults.join(", ")
                            : "None"
                    }
                </td>
            </tr>

        </table>

        <br>

        <p>
            <b>Educational Notice:</b>
            This simulation is intended for learning and
            experimentation. It is not a substitute for
            engineering design, electrical code compliance,
            manufacturer specifications, or professional review.
        </p>

    `;

}


/* =========================================================
   SAVE PROJECT
========================================================= */

function saveProject() {

    readSetup();


    const data = {

        version: 3,

        state

    };


    localStorage.setItem(
        "solarlab-v3-project",
        JSON.stringify(data)
    );


    toast(
        "Project saved on this device."
    );

}


/* =========================================================
   LOAD PROJECT
========================================================= */

function loadSavedProject() {

    try {

        const raw =
            localStorage.getItem(
                "solarlab-v3-project"
            );


        if (!raw)
            return false;


        const data =
            JSON.parse(raw);


        if (!data.state)
            return false;


        Object.assign(
            state,
            data.state
        );


        $("pname").value =
            state.projectName;

        $("pdesc").value =
            state.description;

        $("voltage").value =
            state.voltage;

        $("panelCount").value =
            state.panelCount;

        $("panelW").value =
            state.panelW;

        $("batteryAh").value =
            state.batteryAh;


        $("inverterMode").value =
            "auto";


        updateSetupPreview();

        renderWorkspace();

        renderInspector();

        updateSimulationUI();

        updateAnalysis();

        return true;

    }

    catch (error) {

        console.error(error);

        return false;

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(pageId) {

    qsa(".page").forEach(
        page => {

            page.classList.remove(
                "active"
            );

        }
    );


    const target =
        $(pageId);


    if (!target)
        return;


    target.classList.add(
        "active"
    );


    qsa(".nav button").forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.page === pageId
            );

        }
    );


    if (
        pageId === "analysis"
    ) {

        updateAnalysis();

    }


    if (
        pageId === "reportPage"
    ) {

        generateReport();

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   EVENTS
========================================================= */


/* Navigation */

qsa("[data-page]").forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                let page =
                    button.dataset.page;


                if (
                    page === "report"
                ) {

                    page =
                        "reportPage";

                }


                showPage(page);

            }
        );

    }
);


/* Setup inputs */

[
    "pname",
    "pdesc",
    "voltage",
    "panelCount",
    "panelW",
    "batteryAh",
    "inverterMode"
].forEach(
    id => {

        $(id).addEventListener(
            "input",
            updateSetupPreview
        );

        $(id).addEventListener(
            "change",
            () => {

                updateSetupPreview();

                applyConfigurationToComponents();

            }
        );

    }
);


/* Open workspace */

$("openWorkspace")
    .addEventListener(
        "click",
        () => {

            readSetup();

            applyConfigurationToComponents();

            showPage("design");

            toast(
                `${state.voltage}V system loaded into 3D Workspace.`
            );

        }
    );


/* Add components */

qsa(".component").forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                addComponent(
                    button.dataset.type
                );

            }
        );

    }
);


/* Connection */

$("connectionMode")
    .addEventListener(
        "click",
        toggleConnectionMode
    );


$("seriesMode")
    .addEventListener(
        "click",
        () =>
            setConnectionType(
                "series"
            )
    );


$("parallelMode")
    .addEventListener(
        "click",
        () =>
            setConnectionType(
                "parallel"
            )
    );


$("autoWire")
    .addEventListener(
        "click",
        autoWire
    );


$("clearWorkspace")
    .addEventListener(
        "click",
        clearWorkspace
    );


$("removeSelected")
    .addEventListener(
        "click",
        removeSelected
    );


/* Demo */

$("loadDemo")
    .addEventListener(
        "click",
        loadDemo
    );


/* Simulation */

$("simulate")
    .addEventListener(
        "click",
        toggleSimulation
    );


$("sun")
    .addEventListener(
        "input",
        updateSimulationUI
    );


$("loadW")
    .addEventListener(
        "input",
        () => {

            updateSimulationUI();

            updateSetupPreview();

        }
    );


$("socW")
    .addEventListener(
        "input",
        updateSimulationUI
    );


/* Faults */

$("overload")
    .addEventListener(
        "click",
        overloadTest
    );


$("reverse")
    .addEventListener(
        "click",
        reverseTest
    );


$("short")
    .addEventListener(
        "click",
        shortTest
    );


/* Save */

$("saveProject")
    .addEventListener(
        "click",
        saveProject
    );


/* Report */

$("printReport")
    .addEventListener(
        "click",
        () => {

            generateReport();

            window.print();

        }
    );


/* Board click */

$("board")
    .addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("board") ||
                event.target.classList.contains(
                    "boardGrid"
                )
            ) {

                state.selectedId = null;

                state.connectionStart = null;

                renderWorkspace();

                renderInspector();

            }

        }
    );


/* =========================================================
   SIMULATION TIMER
========================================================= */

setInterval(
    () => {

        if (
            !state.simulationRunning
        )
            return;


        state.simulationSeconds++;


        const seconds =
            state.simulationSeconds % 60;

        const minutes =
            Math.floor(
                state.simulationSeconds / 60
            ) % 60;

        const hours =
            Math.floor(
                state.simulationSeconds / 3600
            );


        $("simTime").textContent =
            [
                hours,
                minutes,
                seconds
            ]
                .map(
                    n =>
                        String(n)
                            .padStart(2,"0")
                )
                .join(":");


        updateSimulationUI();

    },
    1000
);


/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

    updateSetupPreview();

    updateSimulationUI();

    updateAnalysis();

    renderWorkspace();

    renderInspector();


    const saved =
        loadSavedProject();


    if (saved) {

        toast(
            "Saved SolarLab project restored."
        );

    }

}


initialize();
