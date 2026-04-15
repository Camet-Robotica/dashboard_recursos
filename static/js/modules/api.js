import { state } from './state.js';
import { setStatus } from './ui.js';

export function setupSocket(onDataUpdate, onClientsList) {
    state.socket = io({ transports: ['websocket', 'polling'] });
    state.socket.on('connect', () => { 
        setStatus('Conectado', true); 
        state.socket.emit('request_clients'); 
    });
    state.socket.on('disconnect', () => setStatus('Desconectado – reconectando…', false));
    state.socket.on('connect_error', () => setStatus('Error de conexión', false));

    state.socket.on('data_update', onDataUpdate);
    state.socket.on('clients_list', onClientsList);
}

export function requestData(start, end) {
    const s = start !== undefined ? start : (document.getElementById('start-date').value || null);
    const e = end !== undefined ? end : (document.getElementById('end-date').value || null);
    if (state.compareClients.length > 0 && state.socket) {
        state.socket.emit('request_data', { clients: state.compareClients, start: s, end: e });
    }
}
