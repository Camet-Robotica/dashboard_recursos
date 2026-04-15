export const DEFAULT_WINDOW_HOURS = 1;

export const PALETTE = [
    '#4f8ef7', '#34d399', '#a78bfa', '#fbbf24',
    '#f472b6', '#38bdf8', '#fb923c', '#4ade80',
    '#e879f9', '#2dd4bf', '#f87171', '#818cf8',
];

export const SENSOR_UNIT_MAP = {
    'Temperature': { unit: 'Temperatura', symbol: '°C' },
    'Load': { unit: 'Carga', symbol: '%' },
    'Power': { unit: 'Potencia', symbol: 'W' },
    'Clock': { unit: 'Frecuencia', symbol: 'MHz' },
    'Data': { unit: 'Datos', symbol: 'GB' },
    'SmallData': { unit: 'Datos', symbol: 'MB' },
    'Fan': { unit: 'Velocidad', symbol: 'RPM' },
    'Control': { unit: 'Control', symbol: '%' },
    'Voltage': { unit: 'Voltaje', symbol: 'V' },
    'Level': { unit: 'Vida útil', symbol: '%' },
    'Throughput': { unit: 'Transferencia', symbol: 'MB/s' },
    'Factor': { unit: 'Factor', symbol: 'x' },
    'Frequency': { unit: 'Frecuencia', symbol: 'Hz' },
    'TimeSpan': { unit: 'Tiempo', symbol: 'h' },
    'Current': { unit: 'Corriente', symbol: 'A' },
    'Energy': { unit: 'Energía', symbol: 'Wh' },
};

export const AREA_TYPES = new Set([]);
export const BAR_TYPES = new Set([]);
export const CPU_SELECTOR_TYPES = new Set(['Load']);

export const HW_ICON = {
    'CPU': 'cpu', 'GPU': 'gpu', 'MEMORIA RAM': 'ram',
    'MOTHERBOARD': 'mb', 'ALMACENAMIENTO': 'disk',
};

export const HW_SVG = {
    cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>`,
    gpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="10" rx="2" stroke-width="1.8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 7V5m4 2V5m4 2V5m4 2V5M6 17v2m4-2v2m4-2v2m4-2v2"/></svg>`,
    ram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`,
    mb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 5h18M3 10h18M3 15h18M3 20h18M8 5v15m8-15v15"/></svg>`,
    disk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke-width="1.8"/><path stroke-linecap="round" stroke-width="1.8" d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>`,
    other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
};

export const PLOTLY_CFG = {
    responsive: true, scrollZoom: true, displayModeBar: true, displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines', 'toImage'],
};
