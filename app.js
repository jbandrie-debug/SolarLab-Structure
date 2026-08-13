/* =========================================================
   SolarLab Structure V3
   Interactive Connection + Expanded 3D Workspace
========================================================= */

"use strict";

/* =========================================================
STATE
========================================================= */

const state = {

    version: 3,

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

    zoom: 1,

    expanded: false
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
        breaker: 100,
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

const qsa = selector =>
    [...document.querySelectorAll(selector)];


function toast(message) {

    const el = $("toast");

    if (!el) return;

    el.textContent = message;

    el.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {

        el.classList.remove("show");

    }, 2400);
}


/* =========================================================
CONFIGURATION
========================================================= */

function getConfig() {

    const preset =
        VOLTAGE_PRESETS[state.voltage] ||
        VOLTAGE_PRESETS[48];

    const pvTotal =
        state.panelCount * state.panelW;

    return {

        voltage: state.voltage,

        panelCount: state.panelCount,

        panelW: state.panelW,

        pvTotal,

        batteryAh: state.batteryAh,

        batteryWh:
            state.voltage *
            state.batteryAh,

        inverterW:
            state.inverterW,

        breaker:
            preset.breaker,

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

    if (state.voltage === 12) {

        if (pv <= 1800) return 2000;

        if (pv <= 3000) return 3000;

        return 5000;

    }

    if (state.voltage === 24) {

        if (pv <= 2500) return 3000;

        if (pv <= 4500) return 5000;

        return 10000;

    }

    if (pv <= 4000) return 5000;

    if (pv <= 8000) return 10000;

    return 10000;
}


/* =========================================================
READ SETUP
========================================================= */

function readSetup() {

    state.projectName =
        $("pname")?.value.trim() ||
        "SolarLab V3 Test System";

    state.description =
        $("pdesc")?.value.trim() ||
        "Interactive solar power system simulation.";

    state.voltage =
        Number($("voltage")?.value) || 48;

    state.panelCount =
        Math.max(
            1,
            Number($("panelCount")?.value) || 1
        );

    state.panelW =
        Math.max(
            50,
            Number($("panelW")?.value) || 550
        );

    state.batteryAh =
        Math.max(
            20,
            Number($("batteryAh")?.value) || 200
        );

    const inverterMode =
        $("inverterMode")?.value || "auto";

    if (inverterMode === "auto") {

        state.inverterW =
            calculateAutoInverter();

    } else {

        state.inverterW =
            Number(inverterMode) || 5000;

    }

}


/* =========================================================
SETUP PREVIEW
========================================================= */

function updateSetupPreview() {

    readSetup();

    const c = getConfig();

    if ($("previewVoltage"))
        $("previewVoltage").textContent =
            `${c.voltage}V`;

    if ($("previewPV"))
        $("previewPV").textContent =
            `${(c.pvTotal / 1000).toFixed(2)} kW`;

    if ($("previewBattery"))
        $("previewBattery").textContent =
            `${c.voltage}V / ${c.batteryAh}Ah`;

    if ($("previewInverter"))
        $("previewInverter").textContent =
            `${(c.inverterW / 1000).toFixed(1)} kW`;

    if ($("previewMPPT"))
        $("previewMPPT").textContent =
            `${c.voltage}V / ${c.mpptCurrent}A`;

    if ($("previewBreaker"))
        $("previewBreaker").textContent =
            `${c.breaker}A`;

    if ($("libPanel"))
        $("libPanel").textContent =
            `${c.panelW} W PV`;

    if ($("libMPPT"))
        $("libMPPT").textContent =
            `${c.voltage}V / ${c.mpptCurrent}A`;

    if ($("libBattery"))
        $("libBattery").textContent =
            `${c.voltage}V / ${c.batteryAh}Ah`;

    if ($("libBreaker"))
        $("libBreaker").textContent =
            `${c.breaker}A DC`;

    if ($("libInverter"))
        $("libInverter").textContent =
            `${c.voltage}V → AC`;

    if ($("libLoad"))
        $("libLoad").textContent =
            `${$("loadW")?.value || 850} W`;

    if ($("boardVoltage"))
        $("boardVoltage").textContent =
            `${c.voltage}V DC / AC SYSTEM`;

}


/* =========================================================
DEFAULT COMPONENT VALUES
========================================================= */

function getDefaultValues(type) {

    const c = getConfig();

    switch (type) {

        case "panel":

            return {

                voltage: c.voltage,

                watt: c.panelW,

                current:
                    Number(
                        (c.panelW / c.voltage)
                        .toFixed(2)
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

                energy: c.batteryWh

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
APPLY AUTO CONFIG
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

    updateSetupPreview();

    toast(
        `${state.voltage}V automatic configuration applied`
    );
}


/* =========================================================
ADD COMPONENT
========================================================= */

function addComponent(type, x = null, y = null) {

    const board = $("board");

    const margin = 25;

    const index =
        state.components.length;

    const defaultX =
        x !== null
            ? x
            : 50 + (index % 4) * 175;

    const defaultY =
        y !== null
            ? y
            : 110 + Math.floor(index / 4) * 135;

    const component = {

        id:
            `${type}-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`,

        type,

        x: defaultX,

        y: defaultY,

        width: 150,

        height: 105,

        values:
            getDefaultValues(type)

    };

    if (board) {

        const maxX =
            Math.max(
                margin,
                board.clientWidth -
                component.width -
                margin
            );

        const maxY =
            Math.max(
                70,
                board.clientHeight -
                component.height -
                margin
            );

        component.x =
            Math.min(
                Math.max(margin, component.x),
                maxX
            );

        component.y =
            Math.min(
                Math.max(70, component.y),
                maxY
            );
    }

    state.components.push(component);

    state.selectedId =
        component.id;

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

    if (!component) return;

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
CLEAR
========================================================= */

function clearWorkspace() {

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
SELECT
========================================================= */

function selectComponent(id) {

    state.selectedId = id;

    renderWorkspace();

    renderInspector();
}


/* =========================================================
COMPONENT DISPLAY
========================================================= */

function getComponentDisplayValue(c) {

    const v = c.values || {};

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
CREATE NODE
========================================================= */

function createNode(component) {

    const node =
        document.createElement("div");

    node.className = "node";

    if (
        state.selectedId ===
        component.id
    ) {
        node.classList.add("selected");
    }

    if (
        state.connectionStart ===
        component.id
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

    node.style.width =
        `${component.width}px`;

    node.style.height =
        `${component.height}px`;


    const def =
        COMPONENTS[component.type];


    node.innerHTML = `

        <div class="nodeIcon">
            ${def.icon}
        </div>

        <div class="nodeTitle">
            ${def.name}
        </div>

        <div class="nodeValue">
            ${getComponentDisplayValue(component)}
        </div>

        <div class="nodePorts">

            <span
                class="port plus"
                title="Positive"
                data-port="plus"
            ></span>

            <span
                class="port minus"
                title="Negative"
                data-port="minus"
            ></span>

        </div>

        <div
            class="resizeHandle"
            title="Resize component"
        ></div>

    `;


    node.addEventListener(
        "pointerdown",
        event => {

            if (
                event.target.closest(
                    ".resizeHandle"
                )
            ) return;

            startNodeDrag(
                event,
                component
            );

        }
    );


    node.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            if (
                event.target.closest(
                    ".resizeHandle"
                )
            ) return;

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


    const resizeHandle =
        node.querySelector(
            ".resizeHandle"
        );

    resizeHandle.addEventListener(
        "pointerdown",
        event => {

            event.stopPropagation();

            startResize(
                event,
                component
            );

        }
    );


    return node;
}


/* =========================================================
RENDER WORKSPACE
========================================================= */

function renderWorkspace() {

    const nodes =
        $("nodes");

    if (!nodes) return;

    nodes.innerHTML = "";

    if ($("emptyWorkspace")) {

        $("emptyWorkspace").style.display =
            state.components.length
                ? "none"
                : "grid";

    }

    state.components.forEach(
        component => {

            nodes.appendChild(
                createNode(component)
            );

        }
    );

    applyZoom();

    renderWires();

}


/* =========================================================
DRAG COMPONENT
========================================================= */

function startNodeDrag(
    event,
    component
) {

    if (state.connectionMode)
        return;

    event.preventDefault();

    selectComponent(
        component.id
    );

    const board =
        $("board");

    if (!board) return;

    const startX =
        event.clientX;

    const startY =
        event.clientY;

    const originalX =
        component.x;

    const originalY =
        component.y;

    let moved = false;


    const move = e => {

        moved = true;

        const dx =
            (e.clientX - startX) /
            state.zoom;

        const dy =
            (e.clientY - startY) /
            state.zoom;


        const maxX =
            Math.max(
                5,
                board.clientWidth -
                component.width -
                5
            );

        const maxY =
            Math.max(
                65,
                board.clientHeight -
                component.height -
                5
            );


        component.x =
            clamp(
                originalX + dx,
                5,
                maxX
            );

        component.y =
            clamp(
                originalY + dy,
                65,
                maxY
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

            renderWires();

            renderInspector();

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
RESIZE COMPONENT
========================================================= */

function startResize(
    event,
    component
) {

    event.preventDefault();

    const startX =
        event.clientX;

    const startY =
        event.clientY;

    const startW =
        component.width;

    const startH =
        component.height;


    const move = e => {

        const dx =
            (e.clientX - startX) /
            state.zoom;

        const dy =
            (e.clientY - startY) /
            state.zoom;


        const board =
            $("board");


        const maxW =
            Math.max(
                100,
                board.clientWidth -
                component.x -
                5
            );

        const maxH =
            Math.max(
                75,
                board.clientHeight -
                component.y -
                5
            );


        component.width =
            clamp(
                startW + dx,
                100,
                maxW
            );

        component.height =
            clamp(
                startH + dy,
                75,
                maxH
            );


        const node =
            document.querySelector(
                `.node[data-id="${component.id}"]`
            );


        if (node) {

            node.style.width =
                `${component.width}px`;

            node.style.height =
                `${component.height}px`;

        }


        renderWires();

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

        renderInspector();

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

        button?.classList.add("active");

        if (button)
            button.textContent =
                "🔗 Connection ON";


        setConnectionHint(
            `${state.connectionType.toUpperCase()} • select first component`
        );

    } else {

        button?.classList.remove("active");

        if (button)
            button.textContent =
                "🔗 Connection";


        setConnectionHint(
            "Connection mode OFF"
        );

    }

    renderWorkspace();

}


/* =========================================================
CONNECTION TYPE
========================================================= */

function setConnectionType(type) {

    state.connectionType =
        type;

    state.connectionStart =
        null;


    qsa(
        "#singleMode,#seriesMode,#parallelMode"
    ).forEach(
        button =>
            button.classList.remove(
                "active"
            )
    );


    const activeButton =
        $(
            type === "single"
                ? "singleMode"
                : type === "series"
                    ? "seriesMode"
                    : "parallelMode"
        );


    activeButton?.classList.add(
        "active"
    );


    setConnectionHint(
        state.connectionMode
            ? `${type.toUpperCase()} • select first component`
            : `${type.toUpperCase()} selected`
    );

}


/* =========================================================
CONNECTION CLICK
========================================================= */

function handleConnectionClick(id) {

    if (!state.connectionStart) {

        state.connectionStart =
            id;

        setConnectionHint(
            `${state.connectionType.toUpperCase()} • choose second component`
        );

        renderWorkspace();

        return;
    }


    if (
        state.connectionStart ===
        id
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


    state.connectionStart =
        null;


    setConnectionHint(
        `${state.connectionType.toUpperCase()} • select first component`
    );


    renderWorkspace();

    renderInspector();

    updateAnalysis();

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


    if (
        from.type === "panel" &&
        to.type === "load"
    ) {

        return {
            valid: false,
            error:
                "PV panel cannot directly feed an AC load."
        };

    }


    if (
        from.type === "load" &&
        to.type !== "inverter"
    ) {

        return {
            valid: false,
            error:
                "AC load should connect to AC output."
        };

    }


    if (
        from.type === "inverter" &&
        [
            "panel",
            "mppt",
            "battery",
            "breaker",
            "meter"
        ].includes(to.type)
    ) {

        return {
            valid: false,
            error:
                "Inverter AC output cannot directly connect to DC input."
        };

    }


    const v1 =
        getComponentVoltage(from);

    const v2 =
        getComponentVoltage(to);


    if (
        v1 &&
        v2 &&
        from.type !== "load" &&
        to.type !== "load" &&
        v1 !== v2
    ) {

        return {
            valid: false,
            error:
                `Voltage mismatch: ${v1}V → ${v2}V`
        };

    }


    if (
        type === "series" &&
        from.type === "load" &&
        to.type === "panel"
    ) {

        return {
            valid: false,
            error:
                "Invalid series topology."
        };

    }


    return {
        valid: true,
        error: null
    };

}


/* =========================================================
CREATE CONNECTION
========================================================= */

function createConnection(
    from,
    to,
    type
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


    if (
        validation.valid
    ) {

        toast(
            `${type.toUpperCase()} connection created`
        );

    } else {

        toast(
            `⚠ ERROR: ${validation.error}`
        );

    }


    return true;

}


/* =========================================================
COMPONENT VOLTAGE
========================================================= */

function getComponentVoltage(
    component
) {

    if (!component)
        return null;

    const v =
        component.values || {};


    switch (
        component.type
    ) {

        case "panel":
        case "mppt":
        case "battery":
        case "breaker":
        case "meter":

            return v.voltage;


        case "inverter":

            return v.dcVoltage;


        case "load":

            return 230;


        default:

            return null;

    }

}


/* =========================================================
PORT COORDINATES
========================================================= */

function getPortCoordinates(
    componentId,
    positive = true
) {

    const node =
        document.querySelector(
            `.node[data-id="${componentId}"]`
        );

    const board =
        $("board");


    if (!node || !board)
        return {
            x: 0,
            y: 0
        };


    const boardRect =
        board.getBoundingClientRect();


    const port =
        node.querySelector(
            positive
                ? ".port.plus"
                : ".port.minus"
        );


    if (!port)
        return {
            x: 0,
            y: 0
        };


    const rect =
        port.getBoundingClientRect();


    return {

        x:
            (
                rect.left -
                boardRect.left
            ) +
            rect.width / 2,

        y:
            (
                rect.top -
                boardRect.top
            ) +
            rect.height / 2

    };

}


/* =========================================================
RENDER WIRES
========================================================= */

function renderWires() {

    const svg =
        $("wires");

    const board =
        $("board");


    if (!svg || !board)
        return;


    svg.setAttribute(
        "viewBox",
        `0 0 ${board.clientWidth} ${board.clientHeight}`
    );


    svg.innerHTML = "";


    state.connections.forEach(
        connection => {

            const a =
                getPortCoordinates(
                    connection.from,
                    true
                );

            const b =
                getPortCoordinates(
                    connection.to,
                    false
                );


            const dx =
                Math.max(
                    40,
                    Math.abs(
                        b.x - a.x
                    ) * .42
                );


            const path =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                );


            path.setAttribute(
                "d",
                `
                M ${a.x} ${a.y}
                C ${a.x + dx} ${a.y},
                  ${b.x - dx} ${b.y},
                  ${b.x} ${b.y}
                `
            );


            path.classList.add(
                "wire"
            );


            if (
                connection.type ===
                "series"
            ) {

                path.classList.add(
                    "series"
                );

            }


            if (
                connection.type ===
                "parallel"
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


            if (
                state.simulationRunning &&
                connection.valid
            ) {

                path.classList.add(
                    "active-flow"
                );

            }


            path.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    state.connections =
                        state.connections.filter(
                            c =>
                                c.id !==
                                connection.id
                        );

                    renderWorkspace();

                    updateAnalysis();

                    toast(
                        "Connection removed."
                    );

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

    if (!inspector)
        return;


    if (!state.selectedId) {

        inspector.innerHTML = `

            <h3>Inspector</h3>

            <p class="hint">
                Select a component to view its properties.
            </p>

        `;

        return;
    }


    const component =
        state.components.find(
            c =>
                c.id ===
                state.selectedId
        );


    if (!component)
        return;


    const v =
        component.values || {};


    inspector.innerHTML = `

        <h3>
            ${COMPONENTS[component.type].icon}
            ${COMPONENTS[component.type].name}
        </h3>

        <p class="hint">
            Component properties
        </p>

        <h4>TYPE</h4>

        <div class="inspectorValue">
            ${component.type.toUpperCase()}
        </div>


        <h4>AUTO ELECTRICAL VALUES</h4>

        ${getInspectorElectrical(component)}


        <h4>SIZE</h4>

        <div class="inspectorGrid">

            <label>
                Width
                <input
                    id="insWidth"
                    type="number"
                    min="100"
                    max="500"
                    value="${Math.round(component.width)}"
                >
            </label>

            <label>
                Height
                <input
                    id="insHeight"
                    type="number"
                    min="75"
                    max="400"
                    value="${Math.round(component.height)}"
                >
            </label>

        </div>


        <h4>POSITION</h4>

        <div class="inspectorValue">

            X: ${Math.round(component.x)}
            •
            Y: ${Math.round(component.y)}

        </div>


        <h4>CONNECTIONS</h4>

        <div class="inspectorValue">

            ${
                state.connections.filter(
                    c =>
                        c.from === component.id ||
                        c.to === component.id
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


    $("insWidth")?.addEventListener(
        "input",
        event => {

            component.width =
                clamp(
                    Number(event.target.value) || 150,
                    100,
                    500
                );

            renderWorkspace();

        }
    );


    $("insHeight")?.addEventListener(
        "input",
        event => {

            component.height =
                clamp(
                    Number(event.target.value) || 105,
                    75,
                    400
                );

            renderWorkspace();

        }
    );


    $("inspectorRemove")
        ?.addEventListener(
            "click",
            removeSelected
        );

}


/* =========================================================
INSPECTOR ELECTRICAL DATA
========================================================= */

function getInspectorElectrical(
    component
) {

    const v =
        component.values || {};


    switch (
        component.type
    ) {

        case "panel":

            return `

                <div class="inspectorValue">
                    ${v.voltage} V
                    •
                    ${v.watt} W
                    •
                    ${v.current} A
                </div>

            `;


        case "mppt":

            return `

                <div class="inspectorValue">
                    ${v.voltage} V
                    •
                    ${v.maxCurrent} A
                    •
                    ${v.efficiency}% efficiency
                </div>

            `;


        case "battery":

            return `

                <div class="inspectorValue">
                    ${v.voltage} V
                    •
                    ${v.ah} Ah
                    •
                    ${v.energy} Wh
                </div>

            `;


        case "breaker":

            return `

                <div class="inspectorValue">
                    ${v.voltage} V
                    •
                    ${v.amp} A
                </div>

            `;


        case "inverter":

            return `

                <div class="inspectorValue">
                    ${v.dcVoltage} V DC
                    •
                    ${v.watt} W
                    •
                    ${v.efficiency}% efficiency
                </div>

            `;


        case "load":

            return `

                <div class="inspectorValue">
                    ${v.voltage} V AC
                    •
                    ${v.watt} W
                </div>

            `;


        case "meter":

            return `

                <div class="inspectorValue">
                    ${v.voltage} V
                    •
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


    const panels =
        state.components.filter(
            c => c.type === "panel"
        );

    const mppt =
        state.components.find(
            c => c.type === "mppt"
        );

    const breaker =
        state.components.find(
            c => c.type === "breaker"
        );

    const battery =
        state.components.find(
            c => c.type === "battery"
        );

    const inverter =
        state.components.find(
            c => c.type === "inverter"
        );

    const load =
        state.components.find(
            c => c.type === "load"
        );


    /* Panels → MPPT */

    if (panels.length && mppt) {

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


    arrangeAutoLayout();

    renderWorkspace();

    updateAnalysis();

    toast(
        "Automatic wiring created."
    );

}


/* =========================================================
AUTO LAYOUT
========================================================= */

function arrangeAutoLayout() {

    const positions = {

        panel: {
            x: 50,
            y: 120
        },

        mppt: {
            x: 250,
            y: 120
        },

        breaker: {
            x: 450,
            y: 120
        },

        battery: {
            x: 650,
            y: 120
        },

        inverter: {
            x: 850,
            y: 120
        },

        load: {
            x: 1050,
            y: 120
        },

        meter: {
            x: 650,
            y: 280
        }

    };


    Object.keys(
        positions
    ).forEach(
        type => {

            const matches =
                state.components.filter(
                    c =>
                        c.type === type
                );


            matches.forEach(
                (component, index) => {

                    component.x =
                        positions[type].x;

                    component.y =
                        positions[type].y +
                        index * 125;

                }
            );

        }
    );

}


/* =========================================================
DEMO
========================================================= */

function loadDemo() {

    readSetup();

    state.components = [];

    state.connections = [];

    state.selectedId = null;


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
            addComponent(type)
    );


    arrangeAutoLayout();

    renderWorkspace();

    autoWire();

    showPage("design");

    toast(
        "Demo system loaded."
    );

}


/* =========================================================
ZOOM
========================================================= */

function applyZoom() {

    const nodes =
        $("nodes");

    if (!nodes)
        return;

    nodes.style.transform =
        `scale(${state.zoom})`;

    if ($("zoomLabel"))
        $("zoomLabel").textContent =
            `${Math.round(state.zoom * 100)}%`;

}


function setZoom(value) {

    state.zoom =
        clamp(
            value,
            0.55,
            1.8
        );

    applyZoom();

    renderWires();

}


function zoomIn() {

    setZoom(
        state.zoom + .1
    );

}


function zoomOut() {

    setZoom(
        state.zoom - .1
    );

}


function fitBoard() {

    const board =
        $("board");

    if (!board ||
        !state.components.length
    ) {

        setZoom(1);

        return;
    }


    const maxX =
        Math.max(
            ...state.components.map(
                c =>
                    c.x +
                    c.width
            )
        );

    const maxY =
        Math.max(
            ...state.components.map(
                c =>
                    c.y +
                    c.height
            )
        );


    const zx =
        (board.clientWidth - 70) /
        Math.max(
            maxX,
            400
        );

    const zy =
        (board.clientHeight - 120) /
        Math.max(
            maxY,
            300
        );


    setZoom(
        clamp(
            Math.min(zx, zy),
            .55,
            1.2
        )
    );

}


/* =========================================================
EXPAND WORKSPACE
========================================================= */

function toggleExpandedWorkspace() {

    const design =
        $("design");

    if (!design)
        return;


    state.expanded =
        !state.expanded;


    design.classList.toggle(
        "expandedPage",
        state.expanded
    );


    document.body.classList.toggle(
        "workspaceExpanded",
        state.expanded
    );


    const button =
        $("expandWorkspace");


    if (button) {

        button.textContent =
            state.expanded
                ? "⛶ Exit Fullscreen"
                : "⛶ Expand";

    }


    setTimeout(
        () => {

            renderWorkspace();

            fitBoard();

        },
        100
    );

}


/* =========================================================
SIMULATION
========================================================= */

function calculateSimulation() {

    const sun =
        Number(
            $("sun")?.value || 100
        ) / 100;


    const load =
        Math.max(
            0,
            Number(
                $("loadW")?.value
            ) || 0
        );


    const soc =
        clamp(
            Number(
                $("socW")?.value
            ) || 0,
            0,
            100
        );


    const config =
        getConfig();


    const pv =
        config.pvTotal *
        sun;


    const inverterUsage =
        config.inverterW
            ? (
                load /
                config.inverterW
            ) * 100
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
SIMULATION UI
========================================================= */

function updateSimulationUI() {

    const data =
        calculateSimulation();


    if ($("sunOut"))
        $("sunOut").textContent =
            `${$("sun")?.value || 100}%`;


    if ($("mPV"))
        $("mPV").textContent =
            `${(
                data.pv / 1000
            ).toFixed(2)} kW`;


    if ($("mLoad"))
        $("mLoad").textContent =
            `${data.load.toLocaleString()} W`;


    if ($("mSOC"))
        $("mSOC").textContent =
            `${data.soc}%`;


    if ($("mInv"))
        $("mInv").textContent =
            `${Math.round(
                data.inverterUsage
            )}%`;


    if ($("pvNode"))
        $("pvNode").textContent =
            `${(
                data.pv / 1000
            ).toFixed(2)} kW`;


    if ($("batNode"))
        $("batNode").textContent =
            `${data.soc}% SOC`;


    if ($("invNode"))
        $("invNode").textContent =
            `${Math.round(
                data.inverterUsage
            )}% load`;


    if ($("loadNode"))
        $("loadNode").textContent =
            `${data.load.toLocaleString()} W`;


    updateFaultDisplay();

}


/* =========================================================
SIMULATION TOGGLE
========================================================= */

function toggleSimulation() {

    state.simulationRunning =
        !state.simulationRunning;


    const button =
        $("simulate");


    if (
        state.simulationRunning
    ) {

        if (button)
            button.textContent =
                "■ Stop Simulation";


        if ($("simState"))
            $("simState").textContent =
                "RUNNING";


        if ($("powerBeam"))
            $("powerBeam")
                .classList.add(
                    "running"
                );


        if ($("simNote"))
            $("simNote").textContent =
                "Simulation running. Power flow active.";

    } else {

        if (button)
            button.textContent =
                "▶ Start Simulation";


        if ($("simState"))
            $("simState").textContent =
                "READY";


        if ($("powerBeam"))
            $("powerBeam")
                .classList.remove(
                    "running"
                );


        if ($("simNote"))
            $("simNote").textContent =
                "Simulation stopped.";

    }


    renderWires();

}


/* =========================================================
FAULT LAB
========================================================= */

function triggerFault(type) {

    const existing =
        state.faults.indexOf(type);


    if (existing >= 0) {

        state.faults =
            state.faults.filter(
                f => f !== type
            );

    } else {

        state.faults.push(type);

    }


    updateFaultDisplay();

    updateAnalysis();

}


function updateFaultDisplay() {

    const box =
        $("faultBox");

    if (!box)
        return;


    const simulation =
        calculateSimulation();


    let message =
        "● No active faults";


    let hasError =
        false;


    if (
        state.faults.includes(
            "overload"
        ) ||
        simulation.inverterUsage > 100
    ) {

        message =
            "● INVERTER OVERLOAD";

        hasError = true;

    }


    if (
        state.faults.includes(
            "polarity"
        )
    ) {

        message =
            "● WRONG POLARITY";

        hasError = true;

    }


    if (
        state.faults.includes(
            "short"
        )
    ) {

        message =
            "● SHORT CIRCUIT";

        hasError = true;

    }


    box.className =
        hasError
            ? "status error"
            : "status ok";


    box.textContent =
        message;

}


/* =========================================================
ANALYSIS
========================================================= */

function updateAnalysis() {

    const checks =
        $("checks");

    if (!checks)
        return;


    let score = 100;

    const results = [];


    if (
        state.components.length === 0
    ) {

        score -= 25;

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


    const invalid =
        state.connections.filter(
            c => !c.valid
        );


    if (invalid.length) {

        score -= Math.min(
            50,
            invalid.length * 10
        );


        invalid.slice(
            0,
            5
        ).forEach(
            c => {

                results.push({

                    good: false,

                    text:
                        `Connection error: ${c.error}`

                });

            }
        );

    } else {

        results.push({

            good: true,

            text:
                `${state.connections.length} connection(s) valid.`

        });

    }


    if (
        state.faults.length
    ) {

        score -=
            state.faults.length * 10;


        results.push({

            good: false,

            text:
                `${state.faults.length} active fault test(s).`

        });

    }


    const series =
        state.connections.filter(
            c =>
                c.type === "series"
        ).length;


    const parallel =
        state.connections.filter(
            c =>
                c.type === "parallel"
        ).length;


    if (series) {

        results.push({

            good: true,

            text:
                `${series} series connection(s) detected.`

        });

    }


    if (parallel) {

        results.push({

            good: true,

            text:
                `${parallel} parallel connection(s) detected.`

        });

    }


    score =
        Math.max(
            0,
            Math.round(score)
        );


    if ($("score"))
        $("score").textContent =
            score;


    checks.innerHTML =
        results.map(
            r => `

                <div class="check ${
                    r.good
                        ? "good"
                        : "bad"
                }">

                    ${
                        r.good
                            ? "✓"
                            : "⚠"
                    }

                    ${escapeHTML(
                        r.text
                    )}

                </div>

            `
        ).join("");


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


    const values = [];


    for (
        let hour = 0;
        hour < 24;
        hour++
    ) {

        const solarFactor =
            Math.max(
                0,
                Math.sin(
                    (
                        (hour - 6) /
                        12
                    ) *
                    Math.PI
                )
            );


        values.push(
            config.pvTotal *
            solarFactor
        );

    }


    const max =
        Math.max(
            ...values,
            1
        );


    chart.innerHTML =
        values.map(
            value => `

                <div
                    class="energyBar"
                    title="${Math.round(
                        value
                    )} W"
                    style="
                        height:${
                            Math.max(
                                3,
                                (value / max) * 100
                            )
                        }%;
                    "
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


    const report =
        $("reportContent");

    if (!report)
        return;


    report.innerHTML = `

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
                <td>
                    ${config.voltage} V
                </td>
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
                <td>Inverter</td>
                <td>
                    ${config.inverterW.toLocaleString()} W
                </td>
            </tr>

            <tr>
                <td>Current PV Output</td>
                <td>
                    ${(sim.pv / 1000).toFixed(2)} kW
                </td>
            </tr>

            <tr>
                <td>Connections</td>
                <td>
                    ${state.connections.length}
                </td>
            </tr>

            <tr>
                <td>Invalid Connections</td>
                <td>
                    ${
                        state.connections.filter(
                            c => !c.valid
                        ).length
                    }
                </td>
            </tr>

            <tr>
                <td>Active Fault Tests</td>
                <td>
                    ${state.faults.length}
                </td>
            </tr>

        </table>

    `;

}


/* =========================================================
SAVE PROJECT
========================================================= */

function saveProject() {

    readSetup();

    localStorage.setItem(
        "solarlab-v3-project",
        JSON.stringify({
            version: 3,
            state
        })
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


        updateSetupPreview();

        renderWorkspace();

        renderInspector();

        updateSimulationUI();

        updateAnalysis();

        return true;

    } catch (error) {

        console.error(error);

        return false;

    }

}


/* =========================================================
NAVIGATION
========================================================= */

function showPage(pageId) {

    qsa(".page")
        .forEach(
            page =>
                page.classList.remove(
                    "active"
                )
        );


    const page =
        $(pageId);


    if (!page)
        return;


    page.classList.add(
        "active"
    );


    qsa(".nav button")
        .forEach(
            button =>
                button.classList.toggle(
                    "active",
                    button.dataset.page ===
                    pageId
                )
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


    if (
        pageId === "design"
    ) {

        setTimeout(
            renderWorkspace,
            80
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
AUTO LAYOUT CONFIG UPDATE
========================================================= */

function onSetupChanged() {

    updateSetupPreview();

    applyConfigurationToComponents();

}


/* =========================================================
UTILITY
========================================================= */

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


function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


function setConnectionHint(
    text
) {

    const hint =
        $("connectionHint");

    if (!hint)
        return;

    hint.textContent =
        text;

    hint.classList.toggle(
        "active",
        state.connectionMode
    );

}


/* =========================================================
KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            state.expanded
        ) {

            toggleExpandedWorkspace();

        }

        if (
            event.key === "Delete" &&
            state.selectedId
        ) {

            removeSelected();

        }

    }
);


/* =========================================================
INITIALIZATION
========================================================= */

function initialize() {


    /* Navigation */

    qsa(
        "[data-page]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () =>
                    showPage(
                        button.dataset.page
                    )
            );

        }
    );


    /* Component library */

    qsa(
        ".component"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () =>
                    addComponent(
                        button.dataset.type
                    )
            );

        }
    );


    /* Setup inputs */

    [
        "voltage",
        "panelCount",
        "panelW",
        "batteryAh",
        "inverterMode"
    ].forEach(
        id => {

            $(id)?.addEventListener(
                "input",
                onSetupChanged
            );

            $(id)?.addEventListener(
                "change",
                onSetupChanged
            );

        }
    );


    /* Connection */

    $("connectionMode")
        ?.addEventListener(
            "click",
            toggleConnectionMode
        );


    $("singleMode")
        ?.addEventListener(
            "click",
            () =>
                setConnectionType(
                    "single"
                )
        );


    $("seriesMode")
        ?.addEventListener(
            "click",
            () =>
                setConnectionType(
                    "series"
                )
        );


    $("parallelMode")
        ?.addEventListener(
            "click",
            () =>
                setConnectionType(
                    "parallel"
                )
        );


    $("autoWire")
        ?.addEventListener(
            "click",
            autoWire
        );


    $("clearWorkspace")
        ?.addEventListener(
            "click",
            clearWorkspace
        );


    $("removeSelected")
        ?.addEventListener(
            "click",
            removeSelected
        );


    /* Workspace */

    $("expandWorkspace")
        ?.addEventListener(
            "click",
            toggleExpandedWorkspace
        );


    $("zoomIn")
        ?.addEventListener(
            "click",
            zoomIn
        );


    $("zoomOut")
        ?.addEventListener(
            "click",
            zoomOut
        );


    $("fitBoard")
        ?.addEventListener(
            "click",
            fitBoard
        );


    $("board")
        ?.addEventListener(
            "wheel",
            event => {

                if (!event.ctrlKey)
                    return;

                event.preventDefault();

                setZoom(
                    state.zoom +
                    (
                        event.deltaY < 0
                            ? .05
                            : -.05
                    )
                );

            },
            {
                passive: false
            }
        );


    /* Demo */

    $("loadDemo")
        ?.addEventListener(
            "click",
            loadDemo
        );


    /* Open workspace */

    $("openWorkspace")
        ?.addEventListener(
            "click",
            () => {

                readSetup();

                applyConfigurationToComponents();

                showPage(
                    "design"
                );

            }
        );


    /* Save */

    $("saveProject")
        ?.addEventListener(
            "click",
            saveProject
        );


    /* Simulation */

    $("simulate")
        ?.addEventListener(
            "click",
            toggleSimulation
        );


    [
        "sun",
        "loadW",
        "socW"
    ].forEach(
        id => {

            $(id)?.addEventListener(
                "input",
                () => {

                    updateSimulationUI();

                    updateAnalysis();

                }
            );

        }
    );


    /* Faults */

    $("overload")
        ?.addEventListener(
            "click",
            () =>
                triggerFault(
                    "overload"
                )
        );


    $("reverse")
        ?.addEventListener(
            "click",
            () =>
                triggerFault(
                    "polarity"
                )
        );


    $("short")
        ?.addEventListener(
            "click",
            () =>
                triggerFault(
                    "short"
                )
        );


    /* Report */

    $("printReport")
        ?.addEventListener(
            "click",
            () => {

                generateReport();

                window.print();

            }
        );


    /* Initial */

    updateSetupPreview();

    updateSimulationUI();

    updateAnalysis();

    renderWorkspace();

    renderInspector();


    loadSavedProject();

}


/* =========================================================
START
========================================================= */

initialize();
