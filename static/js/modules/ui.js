import { SENSOR_UNIT_MAP, HW_ICON, HW_SVG, CPU_SELECTOR_TYPES } from './constants.js';
import { state } from './state.js';
import { sid, dotColor, extractClients } from './utils.js';
import { buildTraces, buildLayout, plotChart, buildMetricsHtml } from './charts.js';

export function setStatus(msg, ok) {
    const el = document.getElementById('status-text');
    const dot = document.getElementById('live-dot');
    el.textContent = msg;
    el.style.color = ok ? 'var(--green)' : 'var(--red)';
    dot.classList.toggle('active', state.isLive && ok);
}

export function setLastUpdate(isoStr) {
    if (!isoStr) return;
    document.getElementById('last-update').textContent =
        `Actualizado: ${new Date(isoStr).toLocaleTimeString('es-AR')}`;
}

export function renderDashboard(components) {
    const dashboard = document.getElementById('dashboard');
    const emptyState = document.getElementById('empty-state');
    if (!components || !Object.keys(components).length) {
        dashboard.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    const mergedComponents = {};
    for (const [hwName, hwInfo] of Object.entries(components)) {
        if (hwInfo.type.toUpperCase() === 'MEMORIA RAM') {
            const unifiedName = 'Memoria RAM del Sistema';
            if (!mergedComponents[unifiedName]) {
                mergedComponents[unifiedName] = { type: hwInfo.type, sensors: {} };
            }
            for (const [sType, sDict] of Object.entries(hwInfo.sensors)) {
                if (!mergedComponents[unifiedName].sensors[sType]) mergedComponents[unifiedName].sensors[sType] = {};
                for (const [sName, sDataByClient] of Object.entries(sDict)) {
                    const uniqueSensorName = `${hwName} (${sName})`;
                    mergedComponents[unifiedName].sensors[sType][uniqueSensorName] = sDataByClient;
                }
            }
        } else {
            mergedComponents[hwName] = hwInfo;
        }
    }

    for (const [hwName, hwInfo] of Object.entries(mergedComponents)) {
        renderHardware(dashboard, hwName, hwInfo);
    }
}

function renderHardware(container, hwName, hwInfo) {
    const safeId = sid(hwName);
    const hwTypeUp = hwInfo.type.toUpperCase();
    const isCpu = hwTypeUp === 'CPU';

    let section = document.getElementById(`hw-${safeId}`);
    if (!section) {
        section = document.createElement('div');
        section.id = `hw-${safeId}`;
        section.className = 'hw-section';
        container.appendChild(section);
        const ik = HW_ICON[hwTypeUp] || 'other';
        section.innerHTML = `
            <div class="hw-header">
                <div class="hw-icon ${ik}">${HW_SVG[ik]}</div>
                <div><span class="hw-name">${hwName}</span><span class="hw-badge">${hwInfo.type}</span></div>
            </div>
            <div class="charts-grid" id="grid-${safeId}"></div>
            ${isCpu ? `<div class="charts-grid charts-grid--sel" id="sel-grid-${safeId}"></div>` : ''}
        `;
    }

    const grid = document.getElementById(`grid-${safeId}`);
    for (const [sType, sensors] of Object.entries(hwInfo.sensors)) {
        const isLoad = hwTypeUp === 'CPU' && sType === 'Load';
        if (isCpu) {
            const byClient = extractClients(sensors);
            for (const [clientName, clientSensors] of Object.entries(byClient)) {
                const clientSafeId = safeId + '-' + sid(clientName);
                renderChartIndividualStyle(grid, clientSafeId, sType, clientSensors, clientName, isLoad ? { fullWidth: true, height: 440 } : { height: 320 });
            }
        } else {
            renderChart(grid, safeId, sType, sensors, { height: 320 });
        }
    }

    if (isCpu) {
        buildCpuFlat(hwInfo.sensors);
        renderCpuSelectorCard(document.getElementById(`sel-grid-${safeId}`), safeId);
    }
}

function renderChartIndividualStyle(grid, safeId, sType, sensors, clientName, opts = {}) {
    const { fullWidth = false, height = 320 } = opts;
    const meta = SENSOR_UNIT_MAP[sType] || { unit: sType, symbol: '' };
    const unit = meta.symbol;
    const cid = `chart-${safeId}-${sid(sType)}-${sid(clientName)}`;
    let card = document.getElementById(`card-${cid}`);
    if (!card) {
        card = document.createElement('div');
        card.id = `card-${cid}`;
        card.className = `chart-card${fullWidth ? ' chart-card--fullwidth' : ''}`;
        card.innerHTML = `
            <div class="chart-title">
                <span class="chart-title-dot" style="background:${dotColor(sType)}"></span>
                ${meta.unit} (${clientName})${unit ? ` <span class="unit-badge">${unit}</span>` : ''}
            </div>
            <div id="${cid}"></div>
            <div class="metrics-row" id="m-${cid}"></div>`;
        grid.appendChild(card);
    }

    const traces = buildTraces(sensors, unit, sType);
    plotChart(cid, traces, buildLayout(unit, traces.length, height));
    document.getElementById(`m-${cid}`).innerHTML = buildMetricsHtml(sensors, unit);
}

function renderChart(grid, safeId, sType, sensors, opts = {}) {
    const { fullWidth = false, height = 320 } = opts;
    const meta = SENSOR_UNIT_MAP[sType] || { unit: sType, symbol: '' };
    const unit = meta.symbol;

    for (const [sName, clientsData] of Object.entries(sensors)) {
        const sNameSafe = sid(sName);
        const cid = `chart-${safeId}-${sid(sType)}-${sNameSafe}`;
        let card = document.getElementById(`card-${cid}`);
        if (!card) {
            card = document.createElement('div');
            card.id = `card-${cid}`;
            card.className = `chart-card${fullWidth ? ' chart-card--fullwidth' : ''}`;
            card.innerHTML = `
                <div class="chart-title">
                    <span class="chart-title-dot" style="background:${dotColor(sType)}"></span>
                    ${meta.unit}: ${sName} ${unit ? ` <span class="unit-badge">${unit}</span>` : ''}
                </div>
                <div id="${cid}"></div>
                <div class="metrics-row" id="m-${cid}"></div>`;
            grid.appendChild(card);
        }

        const traces = buildTraces(clientsData, unit, sType);
        plotChart(cid, traces, buildLayout(unit, traces.length, height));
        document.getElementById(`m-${cid}`).innerHTML = buildMetricsHtml(clientsData, unit);
    }
}

function buildCpuFlat(sensorsByType) {
    state.cpuSensorsFlat = {};
    for (const [sType, sensors] of Object.entries(sensorsByType)) {
        if (!CPU_SELECTOR_TYPES.has(sType)) continue;
        const meta = SENSOR_UNIT_MAP[sType] || { unit: sType, symbol: '' };
        for (const [sName, clientsData] of Object.entries(sensors)) {
            state.cpuSensorsFlat[`${meta.unit} › ${sName}`] = {
                sType, sName, unit: meta.symbol,
                clientsData
            };
        }
    }
}

function renderCpuSelectorCard(container, safeId) {
    const cardId = `cpu-sel-card-${safeId}`;
    const selId = `cpu-sel-${safeId}`;
    const cid = `cpu-sel-chart-${safeId}`;
    const optHtml = (k) => `<option value="${k}">${k}</option>`;
    let card = document.getElementById(cardId);

    if (!card) {
        card = document.createElement('div');
        card.id = cardId;
        card.className = 'chart-card chart-card--fullwidth';
        card.innerHTML = `
            <div class="selector-header">
                <div class="chart-title" style="margin:0">
                    <span class="chart-title-dot" style="background:var(--accent)"></span>
                    Monitor individual de CPU
                </div>
                <select id="${selId}" class="sensor-select">
                    ${Object.keys(state.cpuSensorsFlat).map(optHtml).join('')}
                </select>
            </div>
            <div id="${cid}"></div>
            <div class="metrics-row" id="m-${cid}"></div>`;
        container.appendChild(card);
        document.getElementById(selId).addEventListener('change', () => updateCpuSelector(safeId));
    } else {
        const sel = document.getElementById(selId);
        const cur = sel.value;
        const optsKeys = Object.keys(state.cpuSensorsFlat);
        sel.innerHTML = optsKeys.map(k => `<option value="${k}"${k === cur ? ' selected' : ''}>${k}</option>`).join('');
    }
    updateCpuSelector(safeId);
}

function updateCpuSelector(safeId) {
    const sel = document.getElementById(`cpu-sel-${safeId}`);
    if (!sel) return;
    const e = state.cpuSensorsFlat[sel.value];
    if (!e) return;
    const cid = `cpu-sel-chart-${safeId}`;

    const traces = buildTraces(e.clientsData, e.unit, e.sType);
    plotChart(cid, traces, buildLayout(e.unit, traces.length, 340));
    document.getElementById(`m-${cid}`).innerHTML = buildMetricsHtml(e.clientsData, e.unit);
}
