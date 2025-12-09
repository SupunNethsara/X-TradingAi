// macdUtils.js

// ------------------ BASIC HELPERS ------------------
export function valAtMA(arr, idx) {
    return (idx < 0 || idx >= arr.length) ? null : arr[idx];
}

// ------------------ SMA ------------------
export function smaMA(values, length) {
    const out = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i] ?? 0;
        if (i >= length) sum -= values[i - length] ?? 0;
        if (i >= length - 1) out[i] = sum / length;
    }
    return out;
}

// ------------------ EMA ------------------
export function emaMA(values, length) {
    const out = new Array(values.length).fill(null);
    if (values.length === 0) return out;

    const k = 2 / (length + 1);
    let prev = values[0] ?? 0;
    out[0] = prev;

    for (let i = 1; i < values.length; i++) {
        const v = values[i] ?? 0;
        prev = v * k + prev * (1 - k);
        out[i] = prev;
    }
    return out;
}

// ------------------ WMA ------------------
export function wmaMA(values, length) {
    const out = new Array(values.length).fill(null);
    const denom = length * (length + 1) / 2;

    for (let i = 0; i < values.length; i++) {
        if (i < length - 1) continue;

        let sum = 0;
        for (let j = 0; j < length; j++) {
            sum += (values[i - j] ?? 0) * (length - j);
        }
        out[i] = sum / denom;
    }
    return out;
}

// ------------------ DEMA ------------------
export function demaMA(values, length) {
    const e1 = emaMA(values, length);
    const e2 = emaMA(e1.map(v => v ?? 0), length);

    return e1.map((v, i) =>
        v == null || e2[i] == null
            ? null
            : 2 * v - e2[i]
    );
}

// ------------------ WWMA ------------------
export function wwmaMA(values, length) {
    const alpha = 1 / length;
    const out = new Array(values.length).fill(null);

    let prev = values[0] ?? 0;
    out[0] = prev;

    for (let i = 1; i < values.length; i++) {
        prev = alpha * (values[i] ?? 0) + (1 - alpha) * prev;
        out[i] = prev;
    }
    return out;
}

// ------------------ ZLEMA ------------------
export function zlemaMA(values, length) {
    const lag = Math.floor((length - 1) / 2);
    const adj = values.map((v, i) => {
        const prev = valAtMA(values, i - lag) ?? v ?? 0;
        return (v ?? 0) + ((v ?? 0) - prev);
    });
    return emaMA(adj, length);
}

// ------------------ TSF ------------------
export function tsfMA(values, length) {
    const out = new Array(values.length).fill(null);

    for (let i = length - 1; i < values.length; i++) {
        let sx = 0, sy = 0, sxy = 0, sxx = 0;

        for (let j = 0; j < length; j++) {
            const x = j;
            const y = values[i - length + 1 + j] ?? 0;
            sx += x;
            sy += y;
            sxy += x * y;
            sxx += x * x;
        }

        const n = length;
        const denom = n * sxx - sx * sx;
        const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
        const intercept = (sy - slope * sx) / n;

        out[i] = intercept + slope * (length - 1);
    }

    return out;
}

// ------------------ HMA ------------------
export function hmafMA(values, length) {
    const half = Math.round(length / 2);
    const sqrtLen = Math.round(Math.sqrt(length));

    const w1 = wmaMA(values, half);
    const w2 = wmaMA(values, length);

    const diff = w1.map((v, i) =>
        v == null || w2[i] == null ? null : 2 * v - w2[i]
    );

    return wmaMA(diff, sqrtLen);
}

// ------------------ Tillson T3 ------------------
export function t3fMA(values, length, vol = 0.7) {
    const e1 = emaMA(values, length);
    const e2 = emaMA(e1.map(v => v ?? 0), length);
    const e3 = emaMA(e2.map(v => v ?? 0), length);
    const e4 = emaMA(e3.map(v => v ?? 0), length);
    const e5 = emaMA(e4.map(v => v ?? 0), length);
    const e6 = emaMA(e5.map(v => v ?? 0), length);

    const c1 = vol ** 3 * -1;
    const c2 = 3 * vol ** 2 + 3 * vol ** 3;
    const c3 = -6 * vol ** 2 - 3 * vol - 3 * vol ** 3;
    const c4 = 1 + 3 * vol + vol ** 3 + 3 * vol ** 2;

    return values.map((_, i) =>
        c1 * (e6[i] ?? 0) +
        c2 * (e5[i] ?? 0) +
        c3 * (e4[i] ?? 0) +
        c4 * (e3[i] ?? 0)
    );
}

// ------------------ VAR ------------------
export function varMA(values, length) {
    const out = new Array(values.length).fill(null);
    const alpha = 2 / (length + 1);
    const cmoLen = 9;

    let prev = values[0] ?? 0;

    for (let i = 0; i < values.length; i++) {
        let up = 0, down = 0;

        for (let j = 0; j < cmoLen; j++) {
            const idx = i - j;
            const v1 = valAtMA(values, idx);
            const v2 = valAtMA(values, idx - 1);

            if (v1 == null || v2 == null) continue;
            if (v1 > v2) up += v1 - v2;
            else down += v2 - v1;
        }

        const denom = (up + down) || 1;
        const cmo = (up - down) / denom;
        const src = values[i] ?? 0;

        prev = alpha * Math.abs(cmo) * src + (1 - alpha * Math.abs(cmo)) * prev;
        out[i] = prev;
    }

    return out;
}

// ------------------ GET MA ------------------
export function getMA(values, length, type = "EMA") {
    switch (type.toUpperCase()) {
        case "SMA": return smaMA(values, length);
        case "EMA": return emaMA(values, length);
        case "WMA": return wmaMA(values, length);
        case "DEMA": return demaMA(values, length);
        case "VAR": return varMA(values, length);
        case "WWMA": return wwmaMA(values, length);
        case "ZLEMA": return zlemaMA(values, length);
        case "TSF": return tsfMA(values, length);
        case "HULL": return hmafMA(values, length);
        case "TILL": return t3fMA(values, length);
        default: return emaMA(values, length);
    }
}

// ------------------ MACD ReLoaded ------------------
export function computeMacdRe(candles, shortLen = 12, longLen = 26, signalLen = 9, maType = "VAR") {
    const closes = candles.map(c => c.close);

    const MA12 = getMA(closes, shortLen, maType);
    const MA26 = getMA(closes, longLen, maType);

    const macdSrc = MA12.map((v, i) =>
        v == null || MA26[i] == null ? null : v - MA26[i]
    );

    const macdMA = getMA(macdSrc.map(v => v ?? 0), signalLen, maType);

    const hist = macdSrc.map((v, i) =>
        v == null || macdMA[i] == null ? null : v - macdMA[i]
    );

    const macdPoints = [];
    const matrPoints = [];
    const histPoints = [];
    const ma12Points = [];
    const ma26Points = [];

    candles.forEach((c, i) => {
        if (MA12[i] != null) ma12Points.push({ time: c.time, value: MA12[i] });
        if (MA26[i] != null) ma26Points.push({ time: c.time, value: MA26[i] });
        if (macdSrc[i] != null) macdPoints.push({ time: c.time, value: macdSrc[i] });
        if (macdMA[i] != null) matrPoints.push({ time: c.time, value: macdMA[i] });
        if (hist[i] != null) histPoints.push({ time: c.time, value: hist[i] });
    });

    return {
        ma12Points,
        ma26Points,
        macdPoints,
        matrPoints,
        histPoints,
        hist
    };
}