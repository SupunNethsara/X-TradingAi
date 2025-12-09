const valAt = (arr, idx) => (idx < 0 || idx >= arr.length) ? null : arr[idx];

const sma = (values, length) => {
    const out = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= length) sum -= values[i - length];
        if (i >= length - 1) out[i] = sum / length;
    }
    return out;
};

const ema = (values, length) => {
    const out = new Array(values.length).fill(null);
    if (values.length === 0) return out;
    const k = 2 / (length + 1);
    let prev = values[0];
    out[0] = prev;
    for (let i = 1; i < values.length; i++) {
        const v = values[i];
        prev = (v * k) + prev * (1 - k);
        out[i] = prev;
    }
    return out;
};

const wma = (values, length) => {
    const out = new Array(values.length).fill(null);
    const denom = length * (length + 1) / 2;
    for (let i = 0; i < values.length; i++) {
        if (i < length - 1) continue;
        let sum = 0;
        for (let j = 0; j < length; j++) sum += values[i - j] * (length - j);
        out[i] = sum / denom;
    }
    return out;
};

const dema = (values, length) => {
    const e1 = ema(values, length);
    const e2 = ema(e1.map(x => x === null ? 0 : x), length);
    const out = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
        if (e1[i] === null || e2[i] === null) out[i] = null;
        else out[i] = 2 * e1[i] - e2[i];
    }
    return out;
};

const wwma = (values, length) => {
    const alpha = 1 / length;
    const out = new Array(values.length).fill(null);
    let prev = values[0];
    out[0] = prev;
    for (let i = 1; i < values.length; i++) {
        prev = alpha * values[i] + (1 - alpha) * prev;
        out[i] = prev;
    }
    return out;
};

const zlema = (values, length) => {
    const out = new Array(values.length).fill(null);
    const lag = (length % 2 === 0) ? length / 2 : (length - 1) / 2;
    const adj = values.map((v, i) => {
        const prev = valAt(values, i - lag) ?? v;
        return v + (v - prev);
    });
    return ema(adj, length);
};

const tsf = (values, length) => {
    const out = new Array(values.length).fill(null);
    for (let i = length - 1; i < values.length; i++) {
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let j = 0; j < length; j++) {
            const x = j;
            const y = values[i - length + 1 + j];
            sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
        }
        const n = length;
        const denom = (n * sumXX - sumX * sumX);
        const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;
        out[i] = intercept + slope * (length - 1);
    }
    return out;
};

const hma = (values, length) => {
    const len2 = Math.round(length / 2);
    const sqrtLen = Math.round(Math.sqrt(length));
    const wma1 = wma(values, len2);
    const wma2 = wma(values, length);
    const raw = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
        if (wma1[i] === null || wma2[i] === null) raw[i] = null;
        else raw[i] = 2 * wma1[i] - wma2[i];
    }
    return wma(raw, sqrtLen);
};

const t3 = (values, length, volFactor = 0.7) => {
    const e1 = ema(values, length);
    const e2 = ema(e1.map(x => x === null ? 0 : x), length);
    const e3 = ema(e2.map(x => x === null ? 0 : x), length);
    const e4 = ema(e3.map(x => x === null ? 0 : x), length);
    const e5 = ema(e4.map(x => x === null ? 0 : x), length);
    const e6 = ema(e5.map(x => x === null ? 0 : x), length);
    const c1 = -volFactor * volFactor * volFactor;
    const c2 = 3 * volFactor * volFactor + 3 * volFactor * volFactor * volFactor;
    const c3 = -6 * volFactor * volFactor - 3 * volFactor - 3 * volFactor * volFactor * volFactor;
    const c4 = 1 + 3 * volFactor + volFactor * volFactor * volFactor + 3 * volFactor * volFactor;
    const out = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
        const a = e6[i] ?? 0, b = e5[i] ?? 0, c = e4[i] ?? 0, d = e3[i] ?? 0;
        out[i] = c1 * a + c2 * b + c3 * c + c4 * d;
    }
    return out;
};

// const varMA = (values, length) => {
//     const out = new Array(values.length).fill(null);
//     const alpha = 2 / (length + 1);
//     const periodForCMO = 9;
//     let prevVAR = values[0] ?? 0;
//     for (let i = 0; i < values.length; i++) {
//         let vUD_sum = 0, vDD_sum = 0;
//         for (let j = 0; j < periodForCMO; j++) {
//             const idx = i - j;
//             const vCur = valAt(values, idx);
//             const vPrev = valAt(values, idx - 1);
//             if (vCur === null || vPrev === null) continue;
//             if (vCur > vPrev) vUD_sum += (vCur - vPrev);
//             else vDD_sum += (vPrev - vCur);
//         }
//         const denom = (vUD_sum + vDD_sum) || 1;
//         const cmo = (vUD_sum - vDD_sum) / denom;
//         const factor = Math.abs(cmo);
//         const src = values[i] ?? 0;
//         const newVAR = alpha * factor * src + (1 - alpha * factor) * prevVAR;
//         out[i] = newVAR;
//         prevVAR = newVAR;
//     }
//     return out;
// };

// const getMA = (values, length, type = 'EMA') => {
//     switch ((type || 'EMA').toUpperCase()) {
//         case 'SMA': return sma(values, length);
//         case 'EMA': return ema(values, length);
//         case 'WMA': return wma(values, length);
//         case 'DEMA': return dema(values, length);
//         case 'TMA': {
//             const inner = sma(values, Math.ceil(length / 2));
//             return sma(inner, Math.floor(length / 2) + 1);
//         }
//         case 'VAR': return varMA(values, length);
//         case 'WWMA': return wwma(values, length);
//         case 'ZLEMA': return zlema(values, length);
//         case 'TSF': return tsf(values, length);
//         case 'HULL': return hma(values, length);
//         case 'TILL': return t3(values, length, 0.7);
//         case 'RMA': return wwma(values, length);
//         default: return ema(values, length);
//     }
// };

const computeMA = (data, period, type = 'EMA') => {
    const values = data.map(d => d.close || d.value);
    const out = getMA(values, period, type);
    return data.map((d, i) => ({ time: d.time, value: out[i] ?? null }));
};

export const computeSMA = (data, period) => computeMA(data, period, 'SMA');

export const computeEMA = (data, period) => computeMA(data, period, 'EMA');

export const computeWMA = (data, period) => computeMA(data, period, 'WMA');

export const computeRMA = (data, period) => computeMA(data, period, 'RMA');

export const computeBB = (data, period, stdDev) => {
    if (data.length < period) return { upper: [], middle: [], lower: [] };
    const values = data.map(d => d.close || d.value);
    const middleOut = new Array(data.length).fill(null);
    const upperOut = new Array(data.length).fill(null);
    const lowerOut = new Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
        const slice = values.slice(i - period + 1, i + 1);
        const mean = slice.reduce((acc, v) => acc + v, 0) / period;
        let variance = 0;
        for (let v of slice) {
            variance += Math.pow(v - mean, 2);
        }
        variance /= period;
        const stdev = Math.sqrt(variance);
        middleOut[i] = mean;
        upperOut[i] = mean + stdDev * stdev;
        lowerOut[i] = mean - stdDev * stdev;
    }
    const middle = data.map((d, i) => ({ time: d.time, value: middleOut[i] }));
    const upper = data.map((d, i) => ({ time: d.time, value: upperOut[i] }));
    const lower = data.map((d, i) => ({ time: d.time, value: lowerOut[i] }));
    return { upper, middle, lower };
};

export const computeRSI = (data, period) => {
    const values = data.map(d => d.close || d.value);
    const out = new Array(data.length).fill(null);
    if (data.length < period + 1) {
        return data.map((d, i) => ({ time: d.time, value: null }));
    }
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = values[i] - values[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    out[period] = rsi;
    for (let i = period + 1; i < data.length; i++) {
        const change = values[i] - values[i - 1];
        const gain = Math.max(change, 0);
        const loss = Math.max(-change, 0);
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
        out[i] = rsi;
    }
    return data.map((d, i) => ({ time: d.time, value: out[i] }));
};

const computeRSINumbers = (closes, period = 14) => {
    if (closes.length < period + 1) return new Array(closes.length).fill(null);
    const out = new Array(closes.length).fill(null);
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    out[period] = rsi;
    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        const gain = Math.max(change, 0);
        const loss = Math.max(-change, 0);
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
        out[i] = rsi;
    }
    return out;
};

export const computeZigZag = (data, deviation) => {
    if (data.length < 2) return [];

    const zigzag = [];
    let lastPivotIdx = 0;
    let lastPivotValue = data[0].close || data[0].value;
    let direction = 0;
    let lastHigh = data[0].high || data[0].value;
    let lastLow = data[0].low || data[0].value;

    for (let i = 1; i < data.length; i++) {
        const currHigh = data[i].high || data[i].value;
        const currLow = data[i].low || data[i].value;
        const currClose = data[i].close || data[i].value;

        if (direction === 0) {
            if (currClose > lastPivotValue) {
                direction = 1;
                lastHigh = currHigh;
                lastPivotIdx = i;
                continue;
            } else if (currClose < lastPivotValue) {
                direction = -1;
                lastLow = currLow;
                lastPivotIdx = i;
                continue;
            }
        } else if (direction === 1) {
            if (currHigh > lastHigh) {
                lastHigh = currHigh;
                lastPivotIdx = i;
                continue;
            }
            const dropPct = (lastHigh - currLow) / lastHigh * 100;
            if (dropPct >= deviation) {
                if (zigzag.length === 0 || zigzag[zigzag.length - 1].value !== lastHigh) {
                    zigzag.push({ time: data[lastPivotIdx].time, value: lastHigh });
                }
                zigzag.push({ time: data[i].time, value: currLow });
                direction = -1;
                lastLow = currLow;
                lastPivotIdx = i;
            }
        } else if (direction === -1) {
            if (currLow < lastLow) {
                lastLow = currLow;
                lastPivotIdx = i;
                continue;
            }
            const risePct = (currHigh - lastLow) / lastLow * 100;
            if (risePct >= deviation) {
                if (zigzag.length === 0 || zigzag[zigzag.length - 1].value !== lastLow) {
                    zigzag.push({ time: data[lastPivotIdx].time, value: lastLow });
                }
                zigzag.push({ time: data[i].time, value: currHigh });
                direction = 1;
                lastHigh = currHigh;
                lastPivotIdx = i;
            }
        }
    }

    if (zigzag.length > 0 && (zigzag[zigzag.length - 1].time !== data[data.length - 1].time)) {
        const finalValue = direction === 1 ? lastHigh : lastLow;
        zigzag.push({ time: data[lastPivotIdx].time, value: finalValue });
    } else if (zigzag.length === 0) {
        zigzag.push({ time: data[0].time, value: lastPivotValue });
    }

    return zigzag;
};

export const computeMACD = (data, fast = 12, slow = 26, signalPeriod = 9, maType = 'EMA') => {
    const values = data.map(d => d.close || d.value);
    const MAfast = getMA(values, fast, maType);
    const MAslow = getMA(values, slow, maType);
    const macdLineValues = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
        if (MAfast[i] !== null && MAslow[i] !== null) {
            macdLineValues[i] = MAfast[i] - MAslow[i];
        }
    }
    const src2_for_ma = macdLineValues.map(v => v === null ? 0 : v);
    const signalValues = getMA(src2_for_ma, signalPeriod, maType);
    const histValues = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
        if (macdLineValues[i] !== null && signalValues[i] !== null) {
            histValues[i] = macdLineValues[i] - signalValues[i];
        }
    }
    const macdLine = data.map((d, i) => ({ time: d.time, value: macdLineValues[i] }));
    const signalLine = data.map((d, i) => ({ time: d.time, value: signalValues[i] }));
    const histogram = data.map((d, i) => ({
        time: d.time,
        value: histValues[i],
        color: histValues[i] !== null && histValues[i] >= 0 ? '#00C853' : (histValues[i] !== null ? '#FF6D00' : undefined)
    }));
    return { macdLine, signalLine, histogram };
};

// export const computeMacdRe = (candles, shortLen = 12, longLen = 26, signalLen = 9, maType = 'VAR') => {
//     const closes = candles.map(c => c.close);
//     const MA12 = getMA(closes, shortLen, maType);
//     const MA26 = getMA(closes, longLen, maType);
//     const src2 = new Array(closes.length).fill(null);
//     for (let i = 0; i < closes.length; i++) {
//         if (MA12[i] === null || MA26[i] === null) src2[i] = null;
//         else src2[i] = MA12[i] - MA26[i];
//     }
//     const src2_for_ma = src2.map(v => v === null ? 0 : v);
//     const MATR = getMA(src2_for_ma, signalLen, maType);
//     const hist = new Array(closes.length).fill(null);
//     for (let i = 0; i < closes.length; i++) {
//         if (src2[i] === null || MATR[i] === null) hist[i] = null;
//         else hist[i] = src2[i] - MATR[i];
//     }

//     const ma12Points = [];
//     const ma26Points = [];
//     const macdPoints = [];
//     const matrPoints = [];
//     const histPoints = [];

//     for (let i = 0; i < candles.length; i++) {
//         const time = candles[i].time;
//         if (MA12[i] !== null) ma12Points.push({ time, value: MA12[i] });
//         if (MA26[i] !== null) ma26Points.push({ time, value: MA26[i] });
//         if (src2[i] !== null) macdPoints.push({ time, value: src2[i] });
//         if (MATR[i] !== null) matrPoints.push({ time, value: MATR[i] });
//         if (hist[i] !== null) histPoints.push({ time, value: hist[i] });
//     }
//     return { ma12Points, ma26Points, macdPoints, matrPoints, histPoints, hist };
// };

export const computeAO = (data, fast, slow) => {
    const medianValues = data.map(d => ((d.high || d.value) + (d.low || d.value)) / 2);
    const smaFast = sma(medianValues, fast);
    const smaSlow = sma(medianValues, slow);
    const fastStart = fast - 1;
    const slowStart = slow - 1;
    const start = Math.max(fastStart, slowStart);
    const ao = new Array(data.length).fill(null);
    for (let i = start; i < data.length; i++) {
        const fIdx = i - fastStart;
        const sIdx = i - slowStart;
        const val = (smaFast[fIdx] ?? 0) - (smaSlow[sIdx] ?? 0);
        ao[i] = val;
    }
    return data.map((d, i) => ({ time: d.time, value: ao[i], color: ao[i] >= 0 ? '#00C853' : '#FF6D00' }));
};

export const computeEnvelope = (data, period, percent) => {
    const ma = computeSMA(data, period);
    const upper = ma.map(p => ({ time: p.time, value: p.value * (1 + percent / 100) }));
    const lower = ma.map(p => ({ time: p.time, value: p.value * (1 - percent / 100) }));
    return { upper, middle: ma, lower };
};

export const computeDonchian = (data, period) => {
    if (data.length < period) return { upper: [], lower: [] };
    const highValues = data.map(d => d.high || d.value);
    const lowValues = data.map(d => d.low || d.value);
    const upperOut = new Array(data.length).fill(null);
    const lowerOut = new Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
        const sliceH = highValues.slice(i - period + 1, i + 1);
        const sliceL = lowValues.slice(i - period + 1, i + 1);
        upperOut[i] = Math.max(...sliceH);
        lowerOut[i] = Math.min(...sliceL);
    }
    const upper = data.map((d, i) => ({ time: d.time, value: upperOut[i] }));
    const lower = data.map((d, i) => ({ time: d.time, value: lowerOut[i] }));
    return { upper, lower };
};

export const computeStochastic = (data, kPeriod = 14, kSmoothing = 1, dPeriod = 3) => {
    if (data.length < kPeriod) return { k: [], d: [] };
    const highValues = data.map(d => d.high || d.value);
    const lowValues = data.map(d => d.low || d.value);
    const closeValues = data.map(d => d.close || d.value);

    const lowestLow = new Array(data.length).fill(null);
    const highestHigh = new Array(data.length).fill(null);
    for (let i = kPeriod - 1; i < data.length; i++) {
        const sliceL = lowValues.slice(i - kPeriod + 1, i + 1);
        const sliceH = highValues.slice(i - kPeriod + 1, i + 1);
        lowestLow[i] = Math.min(...sliceL);
        highestHigh[i] = Math.max(...sliceH);
    }

    const rawK = new Array(data.length).fill(null);
    for (let i = kPeriod - 1; i < data.length; i++) {
        const ll = lowestLow[i];
        const hh = highestHigh[i];
        const range = hh - ll;
        rawK[i] = range === 0 ? 50 : 100 * (closeValues[i] - ll) / range;
    }

    const kValues = getMA(closeValues.map((_, i) => rawK[i]), kSmoothing, 'SMA');
    const dValues = getMA(closeValues.map((_, i) => kValues[i]), dPeriod, 'SMA');

    const kLine = data.map((d, i) => ({ time: d.time, value: kValues[i] ?? null }));
    const dLine = data.map((d, i) => ({ time: d.time, value: dValues[i] ?? null }));
    return { k: kLine, d: dLine };
};

export const computeWilliamsR = (data, period = 14) => {
    if (data.length < period) return [];
    const highValues = data.map(d => d.high || d.value);
    const lowValues = data.map(d => d.low || d.value);
    const closeValues = data.map(d => d.close || d.value);

    const out = new Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
        const sliceH = highValues.slice(i - period + 1, i + 1);
        const sliceL = lowValues.slice(i - period + 1, i + 1);
        const hh = Math.max(...sliceH);
        const ll = Math.min(...sliceL);
        const range = hh - ll;
        out[i] = range === 0 ? -50 : -100 * (hh - closeValues[i]) / range;
    }
    return data.map((d, i) => ({ time: d.time, value: out[i] }));
};

export const computeAroon = (data, period) => {
    if (data.length < period) return { up: [], down: [] };
    const highValues = data.map(d => d.high || d.value);
    const lowValues = data.map(d => d.low || d.value);
    const upOut = new Array(data.length).fill(null);
    const downOut = new Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
        let highestHighIdx = 0;
        let lowestLowIdx = 0;
        let hh = highValues[i - period + 1];
        let ll = lowValues[i - period + 1];
        for (let j = 1; j < period; j++) {
            const h = highValues[i - period + 1 + j];
            const l = lowValues[i - period + 1 + j];
            if (h > hh) {
                hh = h;
                highestHighIdx = j;
            }
            if (l < ll) {
                ll = l;
                lowestLowIdx = j;
            }
        }
        upOut[i] = ((period - 1 - highestHighIdx) / (period - 1)) * 100;
        downOut[i] = ((period - 1 - lowestLowIdx) / (period - 1)) * 100;
    }
    const up = data.map((d, i) => ({ time: d.time, value: upOut[i] }));
    const down = data.map((d, i) => ({ time: d.time, value: downOut[i] }));
    return { up, down };
};

export const computeADX = (data, period = 14) => {
    if (data.length < period + 1) return { adx: [], plusDI: [], minusDI: [] };
    const highValues = data.map(d => d.high || d.value);
    const lowValues = data.map(d => d.low || d.value);
    const closeValues = data.map(d => d.close || d.value);
    const tr = new Array(data.length).fill(0);
    const plusDM = new Array(data.length).fill(0);
    const minusDM = new Array(data.length).fill(0);
    tr[0] = highValues[0] - lowValues[0];
    for (let i = 1; i < data.length; i++) {
        const hl = highValues[i] - lowValues[i];
        const hpc = Math.abs(highValues[i] - closeValues[i - 1]);
        const lpc = Math.abs(lowValues[i] - closeValues[i - 1]);
        tr[i] = Math.max(hl, Math.max(hpc, lpc));
        const hpdm = highValues[i] - highValues[i - 1];
        const lpdm = lowValues[i - 1] - lowValues[i];
        if (hpdm > lpdm && hpdm > 0) {
            plusDM[i] = hpdm;
        } else {
            plusDM[i] = 0;
        }
        if (lpdm > hpdm && lpdm > 0) {
            minusDM[i] = lpdm;
        } else {
            minusDM[i] = 0;
        }
    }
    const atr = getMA(tr, period, 'RMA');
    const plusDM_sm = getMA(plusDM, period, 'RMA');
    const minusDM_sm = getMA(minusDM, period, 'RMA');
    const plusDI_out = new Array(data.length).fill(null);
    const minusDI_out = new Array(data.length).fill(null);
    for (let i = 0; i < data.length; i++) {
        const atr_i = atr[i] ?? 0;
        if (atr_i === 0) continue;
        plusDI_out[i] = 100 * (plusDM_sm[i] ?? 0) / atr_i;
        minusDI_out[i] = 100 * (minusDM_sm[i] ?? 0) / atr_i;
    }
    const dx = new Array(data.length).fill(0);
    for (let i = 0; i < data.length; i++) {
        const pdi = plusDI_out[i] ?? 0;
        const mdi = minusDI_out[i] ?? 0;
        const sum = pdi + mdi;
        if (sum === 0) {
            dx[i] = 0;
        } else {
            dx[i] = 100 * Math.abs(pdi - mdi) / sum;
        }
    }
    const adx_sm = getMA(dx, period, 'RMA');
    const adx_out = new Array(data.length).fill(null);
    for (let i = 0; i < data.length; i++) {
        adx_out[i] = adx_sm[i];
    }
    const plus = data.map((d, i) => ({ time: d.time, value: plusDI_out[i] }));
    const minus = data.map((d, i) => ({ time: d.time, value: minusDI_out[i] }));
    const adx = data.map((d, i) => ({ time: d.time, value: adx_out[i] }));
    return { adx, plusDI: plus, minusDI: minus };
};

export const computeCCI = (data, period = 14) => {
    if (data.length < period) return data.map((d, i) => ({ time: d.time, value: null }));
    const highValues = data.map(d => d.high || d.value);
    const lowValues = data.map(d => d.low || d.value);
    const closeValues = data.map(d => d.close || d.value);
    const tp = new Array(data.length).fill(0);
    for (let i = 0; i < data.length; i++) {
        tp[i] = (highValues[i] + lowValues[i] + closeValues[i]) / 3;
    }
    const sma_tp = sma(tp, period);
    const md = new Array(data.length).fill(0);
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            const diff = Math.abs(tp[i - j] - sma_tp[i]);
            sum += diff;
        }
        md[i] = sum / period;
    }
    const out = new Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
        const meanDev = md[i];
        if (meanDev === 0) {
            out[i] = 0;
        } else {
            out[i] = (tp[i] - sma_tp[i]) / (0.015 * meanDev);
        }
    }
    return data.map((d, i) => ({ time: d.time, value: out[i] }));
};

export const computeHeikenAshiBas = (candles, opts) => {
    const bas = new HeikenAshiBas(opts);
    return bas.run(candles);
};

class HeikenAshiBas {
    constructor(opts = {}) {
        this.useTrendFilter = opts.useTrendFilter ?? true;
        this.showSignals = opts.showSignals ?? true;
        this.showEma = opts.showEma ?? false;
        this.atrPeriod = opts.atrPeriod ?? 14;
        this.tpMultiplier = opts.tpMultiplier ?? 2.0;
        this.slMultiplier = opts.slMultiplier ?? 1.0;
        this.kijunPeriod = 26;
        this.emaPeriod = 200;
        this.useDivergenceFilter = opts.useDivergenceFilter ?? true;
        this.divergenceLookback = opts.divergenceLookback ?? 2;
    }

    heikenAshi(candles) {
        const ha = [];
        if (!candles.length) return ha;
        // first
        let haOpen = (candles[0].open + candles[0].close) / 2;
        let haClose = (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;
        let haHigh = Math.max(candles[0].high, haOpen, haClose);
        let haLow = Math.min(candles[0].low, haOpen, haClose);
        ha.push({ time: candles[0].time, open: haOpen, high: haHigh, low: haLow, close: haClose });
        for (let i = 1; i < candles.length; i++) {
            const c = candles[i];
            haClose = (c.open + c.high + c.low + c.close) / 4;
            haOpen = (ha[i - 1].open + ha[i - 1].close) / 2;
            haHigh = Math.max(c.high, haOpen, haClose);
            haLow = Math.min(c.low, haOpen, haClose);
            ha.push({ time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose });
        }
        return ha;
    }

    ema(values, period) {
        const out = [];
        const k = 2 / (period + 1);
        for (let i = 0; i < values.length; i++) {
            if (i === 0) out.push(values[i]);
            else out.push(values[i] * k + out[i - 1] * (1 - k));
        }
        return out;
    }

    kijunSen(candles, period = 26) {
        const out = [];
        for (let i = 0; i < candles.length; i++) {
            if (i < period - 1) { out.push(null); continue; }
            const slice = candles.slice(i - period + 1, i + 1);
            const hh = Math.max(...slice.map(s => s.high));
            const ll = Math.min(...slice.map(s => s.low));
            out.push((hh + ll) / 2);
        }
        return out;
    }

    atr(highs, lows, closes, period) {
        const trs = [];
        for (let i = 0; i < highs.length; i++) {
            if (i === 0) trs.push(highs[i] - lows[i]);
            else trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
        }
        const out = [];
        for (let i = 0; i < trs.length; i++) {
            if (i < period) out.push(null);
            else if (i === period) {
                const sum = trs.slice(0, period).reduce((a, b) => a + b, 0);
                out.push(sum / period);
            } else {
                out.push((out[i - 1] * (period - 1) + trs[i]) / period);
            }
        }
        return out;
    }

    run(candles) {
        if (!candles || !candles.length) return null;
        const open = candles.map(c => c.open);
        const high = candles.map(c => c.high);
        const low = candles.map(c => c.low);
        const close = candles.map(c => c.close);

        const haData = this.heikenAshi(candles);
        const ema200 = this.ema(close, this.emaPeriod);
        const kijun = this.kijunSen(candles, this.kijunPeriod);
        const atrArr = this.atr(high, low, close, this.atrPeriod);

        const baselineCurr = kijun.map((v, i) => v);
        const baselinePast = kijun.map((v, i) => (i - this.divergenceLookback >= 0 ? kijun[i - this.divergenceLookback] : null));
        const baselineSlope = baselineCurr.map((v, i) => (v != null && baselinePast[i] != null) ? (v - baselinePast[i]) / this.divergenceLookback : null);
        const bullishDiv = baselineSlope.map(s => s != null ? s > 0 : false);
        const bearishDiv = baselineSlope.map(s => s != null ? s < 0 : false);
        const slopeIsZero = baselineSlope.map(s => s != null ? s === 0 : false);

        const signals = [];
        for (let i = 1; i < candles.length; i++) {
            if (kijun[i] == null || atrArr[i] == null) continue;

            const haClose = haData[i].close;
            const haOpen = haData[i].open;
            const haHigh = haData[i].high;
            const haLow = haData[i].low;

            const haClosePrev = haData[i - 1].close;
            const kijunPrev = kijun[i - 1];

            const rsi_dummy = null;
            const trendOkLong = !this.useTrendFilter || (close[i] > ema200[i]);
            const trendOkShort = !this.useTrendFilter || (close[i] < ema200[i]);

            const longCondition =
                haClose > kijun[i] &&
                haClosePrev >= kijunPrev &&
                haClose > haOpen &&
                (haHigh - haClose) >= (haClose - haOpen) * 0.3 &&
                trendOkLong &&
                (!this.useDivergenceFilter || (bullishDiv[i] && !slopeIsZero[i]));

            const shortCondition =
                haClose < kijun[i] &&
                haClosePrev <= kijunPrev &&
                haClose < haOpen &&
                (haClose - haLow) >= (haOpen - haClose) * 0.3 &&
                trendOkShort &&
                (!this.useDivergenceFilter || (bearishDiv[i] && !slopeIsZero[i]));

            const htfAtr = atrArr[i];
            const ltfAtr = atrArr[i];

            const longTp = close[i] + htfAtr * this.tpMultiplier;
            const longSl = close[i] - ltfAtr * this.slMultiplier;
            const shortTp = close[i] - htfAtr * this.tpMultiplier;
            const shortSl = close[i] + ltfAtr * this.slMultiplier;

            signals.push({
                index: i,
                time: candles[i].time,
                long: longCondition,
                short: shortCondition,
                longTp, longSl, shortTp, shortSl
            });
        }

        return { haData, ema200, kijun, atrArr, signals };
    }
}


const computeATRNumbers = (highs, lows, closes, period) => {
    const trs = [];
    for (let i = 0; i < highs.length; i++) {
        if (i === 0) trs.push(highs[i] - lows[i]);
        else trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    }
    const out = new Array(trs.length).fill(null);
    for (let i = 0; i < trs.length; i++) {
        if (i < period) {
            out[i] = null;
            continue;
        }
        if (i === period) {
            const sum = trs.slice(0, period + 1).reduce((a, b) => a + b, 0);
            out[i] = sum / (period + 1);
        } else {
            out[i] = (out[i - 1] * (period - 1) + trs[i]) / period;
        }
    }
    return out;
};

// gainzAlgoCompute.js
// Exports computeGainzSignals(candles, config)
// candles: [{ time: unixSeconds, open, high, low, close }, ...]
// config: same keys you've been using
export function computeATRG(highs, lows, closes, period) {
    const trs = [];
    for (let i = 0; i < highs.length; i++) {
        if (i === 0) trs.push(highs[i] - lows[i]);
        else trs.push(Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        ));
    }
    const atr = [];
    for (let i = 0; i < trs.length; i++) {
        if (i < period) { atr.push(null); continue; }
        if (i === period) {
            // sum from 0..period
            const s = trs.slice(0, period + 1).reduce((a, b) => a + b, 0);
            atr.push(s / (period + 1));
        } else {
            atr.push((atr[i - 1] * (period - 1) + trs[i]) / period);
        }
    }
    return atr;
}

export function computeRSIG(closes, period = 14) {
    const ups = [], downs = [];
    for (let i = 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        ups.push(Math.max(diff, 0));
        downs.push(Math.max(-diff, 0));
    }
    const rsi = [null]; // align with original length
    let avgUp = 0, avgDown = 0;
    for (let i = 0; i < ups.length; i++) {
        if (i < period) {
            avgUp += ups[i];
            avgDown += downs[i];
            if (i === period - 1) {
                avgUp /= period;
                avgDown /= period;
                const rs = avgDown === 0 ? 100 : avgUp / avgDown;
                rsi.push(100 - (100 / (1 + rs)));
            } else rsi.push(null);
        } else {
            avgUp = (avgUp * (period - 1) + ups[i]) / period;
            avgDown = (avgDown * (period - 1) + downs[i]) / period;
            const rs = avgDown === 0 ? 100 : avgUp / avgDown;
            rsi.push(100 - (100 / (1 + rs)));
        }
    }
    // rsi length is closes.length (first element is null)
    return rsi;
}

function roundUp(number, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.ceil(number * factor) / factor;
}

/**
 * computeGainzSignals
 * return: {
 *   signals: [ { index, time, long, short, price, tp, sl } ],
 *   tpPoints, slPoints, tpShortPoints, slShortPoints (optional arrays),
 *   debugMap (optional)
 * }
 */
export function computeGainzSignals(candles, config = {}) {
    if (!candles || !candles.length) return { signals: [], tpPoints: [], slPoints: [], tpShortPoints: [], slShortPoints: [], debugMap: {} };

    const open = candles.map(c => c.open);
    const high = candles.map(c => c.high);
    const low = candles.map(c => c.low);
    const close = candles.map(c => c.close);
    const n = candles.length;

    const atrArr = computeATRG(high, low, close, 14);
    const rsiArr = computeRSIG(close, 14);

    const tr = [];
    for (let i = 0; i < n; i++) {
        if (i === 0) tr.push(high[i] - low[i]);
        else tr.push(Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1])));
    }

    const haStableThreshold = config.candle_stability_index_param ?? 0.7;
    const rsiThreshold = config.rsi_index_param ?? 80;
    const deltaLen = config.candle_delta_length_param ?? 10;
    const disableRepeating = config.disable_repeating_signals_param ?? true;

    const signals = [];
    const tpPoints = [], slPoints = [], tpShortPoints = [], slShortPoints = [];
    const debugMap = {};

    let last_signal = '';

    for (let i = 1; i < n; i++) {
        const stable_candle = tr[i] ? (Math.abs(close[i] - open[i]) / tr[i] > haStableThreshold) : false;
        const rsi_val = rsiArr[i] ?? null;
        const rsi_below = (rsi_val != null) ? (rsi_val < rsiThreshold) : false;
        const rsi_above = (rsi_val != null) ? (rsi_val > (100 - rsiThreshold)) : false;

        const bullish_engulfing = (close[i - 1] < open[i - 1]) && (close[i] > open[i]) && (close[i] > open[i - 1]);
        const bearish_engulfing = (close[i - 1] > open[i - 1]) && (close[i] < open[i]) && (close[i] < open[i - 1]);

        const decrease_over = (i - deltaLen >= 0) ? (close[i] < close[i - deltaLen]) : false;
        const increase_over = (i - deltaLen >= 0) ? (close[i] > close[i - deltaLen]) : false;

        const atr = atrArr[i] ?? (tr[i] || 0);
        const dist = (atr || 0) * (config.tp_sl_multi ?? 1);

        let tp_dist;
        if (config.rrr === '2:3') tp_dist = dist / 2 * 3;
        else if (config.rrr === '1:2') tp_dist = dist * 2;
        else if (config.rrr === '1:4') tp_dist = dist * 4;
        else tp_dist = dist;

        const bull_state = bullish_engulfing && stable_candle && rsi_below && decrease_over;
        const bull = bull_state && (disableRepeating ? (last_signal !== 'buy') : true);

        if (bull) {
            last_signal = 'buy';
            const tp = roundUp(close[i] + tp_dist, config.tp_sl_prec ?? 2);
            const sl = roundUp(close[i] - dist, config.tp_sl_prec ?? 2);

            signals.push({
                index: i,
                time: candles[i].time,
                long: true,
                short: false,
                price: close[i],
                tp,
                sl
            });

            tpPoints.push({ time: candles[i].time, value: tp });
            slPoints.push({ time: candles[i].time, value: sl });
        }

        const bear_state = bearish_engulfing && stable_candle && rsi_above && increase_over;
        const bear = bear_state && (disableRepeating ? (last_signal !== 'sell') : true);

        if (bear) {
            last_signal = 'sell';
            const tp = roundUp(close[i] - tp_dist, config.tp_sl_prec ?? 2);
            const sl = roundUp(close[i] + dist, config.tp_sl_prec ?? 2);

            signals.push({
                index: i,
                time: candles[i].time,
                long: false,
                short: true,
                price: close[i],
                tp,
                sl
            });

            tpShortPoints.push({ time: candles[i].time, value: tp });
            slShortPoints.push({ time: candles[i].time, value: sl });
        }

        // debug map for problem bars (optional)
        if (bull_state || bear_state) {
            const iso = new Date(candles[i].time * 1000).toISOString();
            debugMap[iso] = {
                index: i,
                open: open[i], high: high[i], low: low[i], close: close[i],
                tr: tr[i], atr, stable_candle, rsi_val, rsi_below, rsi_above,
                bullish_engulfing, bearish_engulfing, decrease_over, increase_over,
                dist, tp_dist, last_signal
            };
        }
    }

    return {
        tpPoints, slPoints,
        tpShortPoints, slShortPoints,
        signals,        // <-- REQUIRED
        debugMap
    };
}


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