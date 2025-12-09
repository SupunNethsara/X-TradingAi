// gainzAlgoCompute.js
// Exports computeGainzSignals(candles, config)
// candles: [{ time: unixSeconds, open, high, low, close }, ...]
// config: same keys you've been using
export function computeATR(highs, lows, closes, period) {
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

export function computeRSI(closes, period = 14) {
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

    const atrArr = computeATR(high, low, close, 14);
    const rsiArr = computeRSI(close, 14);

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