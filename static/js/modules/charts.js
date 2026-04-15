import { PALETTE, PLOTLY_CFG } from './constants.js';
import { state } from './state.js';

export function buildLayout(unit, nTraces, height = 320) {
    const many = nTraces > 6;
    return {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        height,
        font: { color: '#8fa3c8', family: "'Inter', sans-serif", size: 11 },
        margin: { t: 8, b: many ? 100 : 50, l: unit ? 60 : 44, r: 14 },
        xaxis: {
            type: 'date', gridcolor: 'rgba(40,60,100,0.35)', zerolinecolor: 'rgba(40,60,100,0.5)',
            tickformat: '%H:%M\n%d/%m', tickfont: { size: 10 }, linecolor: 'rgba(40,60,100,0.4)', autorange: true,
        },
        yaxis: {
            gridcolor: 'rgba(40,60,100,0.35)', zerolinecolor: 'rgba(40,60,100,0.5)',
            ticksuffix: unit ? ` ${unit}` : '', tickfont: { size: 10 },
            linecolor: 'rgba(40,60,100,0.4)', tickformat: '.3~g', autorange: true,
            fixedrange: true,
        },
        showlegend: nTraces > 1,
        legend: {
            orientation: 'h', y: many ? -0.30 : -0.22, x: 0,
            font: { size: many ? 9 : 10 }, bgcolor: 'rgba(0,0,0,0)',
        },
        hovermode: 'x unified',
        hoverlabel: { bgcolor: '#0c1120', bordercolor: '#2a3d61', font: { family: "'Inter', sans-serif", size: 12 } },
        dragmode: 'pan',
        modebar: { bgcolor: 'rgba(0,0,0,0)', color: '#4a5f84', activecolor: '#4f8ef7' },
    };
}

export function buildTraces(sensors, unit, sType, colorOverride) {
    let ci = 0;
    return Object.entries(sensors).map(([clientName, sData]) => {
        const color = colorOverride || PALETTE[ci++ % PALETTE.length];
        const xs = sData.data.map(d => d.x);
        const ys = sData.data.map(d => d.y);
        
        // Usar el nombre del hardware específico del cliente para la leyenda
        const traceName = sData.hw_name ? `${clientName} (${sData.hw_name})` : clientName;

        return {
            x: xs, y: ys, name: traceName,
            type: 'scatter',
            mode: xs.length <= 1 ? 'markers' : 'lines',
            line: { shape: 'linear', width: 2, color },
            marker: { size: 4, color, opacity: 0.7 },
            fill: 'none',
            fillcolor: undefined,
            hovertemplate: `<b>%{fullData.name}</b><br>%{x|%d/%m %H:%M:%S}<br><b>%{y:.3f} ${unit}</b><extra></extra>`,
        };
    });
}

export function plotChart(divId, traces, layout) {
    if (state.chartRegistry[divId]) {
        Plotly.react(divId, traces, layout, PLOTLY_CFG);
    } else {
        Plotly.newPlot(divId, traces, layout, PLOTLY_CFG);
        state.chartRegistry[divId] = true;
    }
}

export function buildMetricsHtml(sensors, unit, colorOverride) {
    let ci = 0;
    return Object.entries(sensors).map(([clientName, sData]) => {
        const c = colorOverride || PALETTE[ci++ % PALETTE.length];
        const last = sData.last !== null ? +sData.last.toFixed(3) : '—';
        const max = sData.max > -1e8 ? +sData.max.toFixed(3) : '—';
        
        // Usar el nombre del hardware específico del cliente para el título
        const displayName = sData.hw_name ? `${clientName} (${sData.hw_name})` : clientName;

        return `<div class="metric-chip">
            <span class="metric-chip-name" title="${displayName}" style="color:${c}aa">${displayName}</span>
            <div class="metric-chip-vals">
                <span class="metric-chip-last">${last}</span>
                <span class="metric-chip-unit">${unit}</span>
                <span class="metric-chip-max">max ${max}${unit ? ' ' + unit : ''}</span>
            </div>
        </div>`;
    }).join('');
}
