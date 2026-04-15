/* ═══════════════════════════════════════════════════════════════════════
   TELEMETRY DASHBOARD  ·  main.js
═══════════════════════════════════════════════════════════════════════ */

import { DEFAULT_WINDOW_HOURS } from './modules/constants.js';
import { state } from './modules/state.js';
import { toInputFormat } from './modules/utils.js';
import { renderDashboard, setStatus, setLastUpdate } from './modules/ui.js';
import { setupSocket, requestData } from './modules/api.js';
import { initUmbrales } from './modules/umbrales.js';

document.addEventListener('DOMContentLoaded', () => {
    setupDefaultDates();
    setupSocket(onDataUpdate, onClientsList);
    setupControls();
    setupNavigation();
    initUmbrales();
    // requestData will be called automatically once clients_list arrives
});

function setupDefaultDates() {
    const now = new Date();
    const start = new Date(now.getTime() - DEFAULT_WINDOW_HOURS * 3600 * 1000);
    document.getElementById('start-date').value = toInputFormat(start);
    document.getElementById('end-date').value = toInputFormat(now);
}

function onDataUpdate(p) {
    renderDashboard(p.components);
    setLastUpdate(p.end);
    setStatus(state.isLive ? 'En vivo' : 'Rango personalizado', true);
    
    // Process client status
    if (p.client_status) {
        Object.entries(p.client_status).forEach(([clientId, isOnline]) => {
            const label = document.getElementById(`label-${clientId}`);
            const badge = document.getElementById(`badge-${clientId}`);
            if (label && badge) {
                if (!isOnline && state.isLive) {
                    label.classList.add('disconnected');
                    badge.style.display = 'inline-block';
                } else {
                    label.classList.remove('disconnected');
                    badge.style.display = 'none';
                }
            }
        });
    }
}

function onClientsList(data) {
    const container = document.getElementById('clients-checkboxes');
    container.innerHTML = data.clients.map(c => {
        let cliName = c.replace('recursos_', '');
        return `<label class="client-cb-label" id="label-${c}">
            <input type="checkbox" value="${c}" class="client-checkbox"> ${cliName}
            <span class="offline-badge" id="badge-${c}" style="display:none;">(Desconectado)</span>
        </label>`;
    }).join('');
    
    // Add event listeners locally instead of onchange attribute
    document.querySelectorAll('.client-checkbox').forEach(cb => {
        cb.addEventListener('change', updateCompareClients);
    });

    updateCompareClients();
}

function updateCompareClients() {
    const cbs = document.querySelectorAll('.client-checkbox:checked');
    state.compareClients = Array.from(cbs).map(cb => cb.value);
    if (state.compareClients.length > 0) {
        requestData();
    } else {
        document.getElementById('dashboard').innerHTML = '';
        document.getElementById('empty-state').classList.remove('hidden');
    }
}

function setupControls() {
    document.getElementById('apply-btn').addEventListener('click', () => {
        const s = document.getElementById('start-date').value;
        const e = document.getElementById('end-date').value;
        state.isLive = !e;
        document.getElementById('live-dot').classList.toggle('active', state.isLive);
        requestData(s || null, e || null);
    });

    document.getElementById('live-btn').addEventListener('click', () => {
        state.isLive = true;
        setupDefaultDates();
        document.getElementById('live-dot').classList.add('active');
        requestData();
    });

    enableLiveInterval();
}

function enableLiveInterval() {
    setInterval(() => {
        if (state.isLive && state.compareClients.length > 0) {
            requestData(null, null); // requestData already pulls from state inside
        }
    }, 10000);
}

function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');
    const dashboardControls = document.getElementById('dashboard-controls');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Activar botón
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Mostrar vista
            const targetId = btn.getAttribute('data-target');
            views.forEach(v => {
                if ('#' + v.id === targetId) {
                    v.classList.add('active');
                } else {
                    v.classList.remove('active');
                }
            });

            // Mostrar/Ocultar controles de dashboard en el sidebar
            if (targetId === '#dashboard-view') {
                dashboardControls.style.display = 'flex';
            } else {
                dashboardControls.style.display = 'none';
            }
        });
    });
}
