export function sid(str) { 
    return str.replace(/[^a-zA-Z0-9]/g, '_'); 
}

export function dotColor(sType) {
    return {
        Temperature: '#f87171', Load: '#4f8ef7', Power: '#fbbf24', Clock: '#34d399',
        Fan: '#38bdf8', Voltage: '#a78bfa', Data: '#fb923c', SmallData: '#fb923c'
    }[sType] || '#8fa3c8';
}

export function toInputFormat(date) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function extractClients(sensorsOfType) {
    const byClient = {};
    for (const [sName, clientsData] of Object.entries(sensorsOfType)) {
        for (const [clientName, cData] of Object.entries(clientsData)) {
            if (!byClient[clientName]) byClient[clientName] = {};
            byClient[clientName][sName] = cData;
        }
    }
    return byClient;
}
