// TradingChart.js
import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback, memo, useMemo, useState } from 'react';
import {
    createChart,
    AreaSeries,
    CandlestickSeries,
    LineSeries,
    HistogramSeries,
    BarSeries,
    version
} from 'lightweight-charts';

import {
    computeSMA,
    computeEMA,
    computeWMA,
    computeRMA,
    computeBB,
    computeRSI,
    computeZigZag,
    computeMACD,
    computeAO,
    computeEnvelope,
    computeDonchian,
    computeHeikenAshiBas,
    computeGainzSignals
} from './indicators';
// import { computeGainzSignals } from './gainzAlgoCompute';
import { computeMacdRe } from './macdUtils';

import { createLabel } from '../lib/comp';
const TradingChart = memo(forwardRef(({ data, chartType, indicators = [], symbol }, ref) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef({});
    const mainSeriesRef = useRef(null);
    const numPanesRef = useRef(0);
    const fitContentRef = useRef(false);
    const autoScrollRef = useRef(true);
    const userInteractedRef = useRef(false);  // Tracks if user has zoomed/dragged
    const isZoomedInRef = useRef(false);  // Tracks if zoomed in (narrower view)
    const prevRangeWidthRef = useRef(null);  // Track previous visible range width for zoom detection
    const scrollTimeoutRef = useRef(null);
    const latestTimeRef = useRef(null);
    const lastDataRef = useRef([]);  // Track previous data to detect appends/updates
    const rangeChangeHandlerRef = useRef(null);
    const isMounted = useRef(true);
    const gainzOverlayRef = useRef(null);
    const gainzSignalsRef = useRef([]);
    const macdRef = useRef(null);
    const labelLayerRef = useRef(null);
    const haSignalsRef = useRef([]); 

    console.log("Lightweight Charts version:", indicators);


    const [haOptions, setHaOptions] = useState({
        useTrendFilter: true,
        showSignals: true,
        showEma: false,
        atrPeriod: 14,
        tpMultiplier: 2.0,
        slMultiplier: 1.0,
    });
    const [gainzOptions, setGainzOptions] = useState({
        showSignals: true,
        showLines: true, // Master switch for TP/SL lines
        rrr: "1:2",
        tp_sl_multi: 1,
        tp_sl_prec: 2,
        candle_stability_index_param: 0.7,
        rsi_index_param: 80, // Using 80 as a likely threshold (100-20)
        candle_delta_length_param: 7,
        disable_repeating_signals_param: true
    });

    function createSignalLabel({ x, y, type, tp, sl, time }) {
        const wrapper = document.createElement("div");
        wrapper.className = `signal-label ${type}`;
        wrapper.style.position = "absolute";
        wrapper.style.left = `${Math.round(x)}px`;
        wrapper.style.top = `${Math.round(y) - 32}px`; // moved higher
        wrapper.style.transform = "translate(-50%, -50%)";
        wrapper.style.pointerEvents = "none";
        wrapper.style.zIndex = 30;

        // === MAIN BADGE ===
        const badge = document.createElement("div");
        badge.textContent = type === "buy" ? "BUY" : "SELL";
        badge.style.fontWeight = "700";
        badge.style.fontSize = "13px";
        badge.style.padding = "5px 10px";
        badge.style.borderRadius = "5px";
        badge.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
        badge.style.position = "relative";
        badge.style.whiteSpace = "nowrap";

        if (type === "buy") {
            badge.style.background = "#18E02F";
            badge.style.color = "#000";
        } else {
            badge.style.background = "#FF3A3A";
            badge.style.color = "#fff";
        }

        // === POINTER TRIANGLE ===
        const pointer = document.createElement("div");
        pointer.style.position = "absolute";
        pointer.style.left = "50%";
        pointer.style.transform = "translateX(-50%)";
        pointer.style.width = "0";
        pointer.style.height = "0";

        if (type === "buy") {
            pointer.style.top = "100%";
            pointer.style.borderLeft = "6px solid transparent";
            pointer.style.borderRight = "6px solid transparent";
            pointer.style.borderTop = "7px solid #18E02F";
        } else {
            pointer.style.bottom = "100%";
            pointer.style.borderLeft = "6px solid transparent";
            pointer.style.borderRight = "6px solid transparent";
            pointer.style.borderBottom = "7px solid #FF3A3A";
        }

        badge.appendChild(pointer);
        wrapper.appendChild(badge);

        // === TP/SL BOX ===
        const info = document.createElement("div");
        info.style.position = "absolute";
        info.style.top = "100%";
        info.style.left = "50%";
        info.style.transform = "translate(-50%, 8px)";
        info.style.fontSize = "11px";
        info.style.background = "rgba(255,255,255,0.85)";
        info.style.padding = "3px 6px";
        info.style.borderRadius = "4px";
        info.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
        info.style.color = "#000";
        info.style.whiteSpace = "pre";

        // info.textContent = `TP: ${tp}\nSL: ${sl}`;
        // wrapper.appendChild(info);
        if (tp !== undefined && sl !== undefined && tp !== "-" && sl !== "-" && !isNaN(tp) && !isNaN(sl)) {
            info.textContent = `TP: ${tp}\nSL: ${sl}`;
            wrapper.appendChild(info);
        }

        wrapper.dataset.signalTime = time;
        return wrapper;
        }


    function renderGainzOverlayMarkers() {
        const chart = chartRef.current;
        const series = mainSeriesRef.current;
        const overlay = gainzOverlayRef.current;
        if (!chart || !series || !overlay) return;

        overlay.innerHTML = ""; // clear

        const signals = gainzSignalsRef.current || [];

        signals.forEach(sig => {
            const x = chart.timeScale().timeToCoordinate(sig.time);
            const y = series.priceToCoordinate(sig.price);
            if (x == null || y == null) return;

            const type = sig.long ? "buy" : "sell";

            const label = createSignalLabel({
                x, y,
                type,
                tp: sig.tp,
                sl: sig.sl,
                time: sig.time
            });

            overlay.appendChild(label);
        });
    }
    // ---------------------------------------------------------
    // RENDER HEIKEN-ASHI ARROWS ON MAIN CHART
    // ---------------------------------------------------------
    function renderHaOverlayArrows() {
        const chart = chartRef.current;
        const series = mainSeriesRef.current;
        const overlay = gainzOverlayRef.current;

        if (!chart || !series || !overlay || !haSignalsRef.current) return;

        // Remove only HA arrows
        overlay.querySelectorAll(".ha-arrow").forEach(el => el.remove());

        haSignalsRef.current.forEach(sig => {
            const candle = lastDataRef.current.find(c => c.time === sig.time);
            if (!candle) return;

            const x = chart.timeScale().timeToCoordinate(sig.time);
            if (x == null) return;

            // Determine candle body
            const bodyLow  = Math.min(candle.open, candle.close);
            const bodyHigh = Math.max(candle.open, candle.close);

            let y;

            if (sig.long) {
                // UP arrow → below body
                y = series.priceToCoordinate(bodyLow);
                y += 14;
            } else {
                // DOWN arrow → above body
                y = series.priceToCoordinate(bodyHigh);
                y -= 14;
            }

            if (y == null) return;

            const type = sig.long ? "buy" : "sell";
            const el = createHaArrow({ x, y, type });
            overlay.appendChild(el);
        });
    }

    // ---------------------------------------------------------
    // CREATE HEIKEN-ASHI ARROWS (GREEN UP, RED DOWN)
    // ---------------------------------------------------------
    function createHaArrow({ x, y, type }) {
        const el = document.createElement("div");
        el.className = "ha-arrow";
        el.style.position = "absolute";
        el.style.left = `${Math.round(x)}px`;
        el.style.top = `${Math.round(y)}px`;
        el.style.transform = "translate(-50%, -50%)";
        el.style.pointerEvents = "none";
        el.style.zIndex = 60;

        // Arrow head
        const head = document.createElement("div");
        head.style.width = "0";
        head.style.height = "0";

        if (type === "buy") {
            head.style.borderLeft = "5px solid transparent";
            head.style.borderRight = "5px solid transparent";
            head.style.borderBottom = "10px solid #00FF00";
        } else {
            head.style.borderLeft = "5px solid transparent";
            head.style.borderRight = "5px solid transparent";
            head.style.borderTop = "10px solid #FF0000";
        }


        el.appendChild(head);

        return el;
    }


    // Helper to filter out invalid data points (null/undefined/NaN values)
    const sanitizeData = useCallback((data) => 
        data.filter(point => point?.value != null && !isNaN(point.value)), 
        []
    );

    // Memoize whether original data has OHLC
    const hasOHLC = useMemo(() => data?.length > 0 && 'open' in data[0], [data]);

    // Memoize processed main data to avoid recomputing on every render
    const processedMainData = useMemo(() => {
        if (!data || data.length === 0) return [];
        let processed = data;
        // if (processed.length > 1000) {  // Commented out to prevent slicing and start time changes that cause view resets
        //     processed = processed.slice(-1000);
        // }
        return 'open' in processed[0] ? processed : processed.map(d => ({ ...d, open: d.value, high: d.value, low: d.value, close: d.value }));
    }, [data]);

    // Memoize indicator computations to avoid recomputing unless main data or relevant params change
    const indicatorComputations = useMemo(() => {
        if (processedMainData.length === 0) return {};
        const computations = {};
        indicators.forEach(ind => {
            switch (ind.type) {
                case 'heikenAshiBas': {
                    // prefer explicit ind.options from parent; fallback to local haOptions
                    const opts = ind.options || haOptions || {};
                    const res = computeHeikenAshiBas(processedMainData, opts);
                    computations[ind.id] = {
                        haData: res?.haData || [],
                        kijun: res?.kijun || [],
                        ema200: res?.ema200 || [],
                        signals: res?.signals || [],
                    };
                    break;
                }
                case 'SMA':
                    computations[ind.id] = { data: sanitizeData(computeSMA(processedMainData, ind.period)) };
                    break;
                case 'EMA':
                    computations[ind.id] = { data: sanitizeData(computeEMA(processedMainData, ind.period)) };
                    break;
                case 'WMA':
                    computations[ind.id] = { data: sanitizeData(computeWMA(processedMainData, ind.period)) };
                    break;
                case 'RMA':
                    computations[ind.id] = { data: sanitizeData(computeRMA(processedMainData, ind.period)) };
                    break;
                case 'ENVELOPE':
                    const envelope = computeEnvelope(processedMainData, ind.period, ind.percent);
                    computations[ind.id] = {
                        upper: sanitizeData(envelope.upper),
                        middle: sanitizeData(envelope.middle),
                        lower: sanitizeData(envelope.lower),
                    };
                    break;
                case 'BBANDS':
                    const bb = computeBB(processedMainData, ind.period, ind.stdDev);
                    computations[ind.id] = {
                        upper: sanitizeData(bb.upper),
                        middle: sanitizeData(bb.middle),
                        lower: sanitizeData(bb.lower),
                    };
                    break;
                case 'DONCHIAN':
                    const donchian = computeDonchian(processedMainData, ind.period);
                    computations[ind.id] = {
                        upper: sanitizeData(donchian.upper),
                        lower: sanitizeData(donchian.lower),
                    };
                    break;
                case 'ZIGZAG':
                    computations[ind.id] = { data: sanitizeData(computeZigZag(processedMainData, ind.deviation || 5)) };
                    break;
                case 'RSI':
                    computations[ind.id] = { data: sanitizeData(computeRSI(processedMainData, ind.period)) };
                    break;
                case 'MACD':
                    const macd = computeMACD(processedMainData, ind.fastPeriod, ind.slowPeriod, ind.signalPeriod);
                    computations[ind.id] = {
                        macdLine: sanitizeData(macd.macdLine),
                        signalLine: sanitizeData(macd.signalLine),
                        histogram: sanitizeData(macd.histogram),
                    };
                    break;
                case 'MACD_RE': {
                    const res = computeMacdRe(processedMainData, ind.shortLen, ind.longLen, ind.signalLen, ind.maType);

                    // Convert hist → histogram format
                    const histData = processedMainData.map((c, i) => ({
                        time: c.time,
                        value: res.hist[i] ?? 0,
                    }));

                    computations[ind.id] = {
                        macdLine: res.macdPoints,
                        signalLine: res.matrPoints,
                        histogram: histData,
                    };
                    console.log("computations",computations)

                    break;
                }

                case 'AO':
                    computations[ind.id] = { data: sanitizeData(computeAO(processedMainData, ind.fastPeriod, ind.slowPeriod)) };
                    break;
                case 'RAINBOW':
                    computations[ind.id] = (ind.types || []).map((type, idx) => {
                        const per = ind.periods?.[idx] || 14;
                        let computedData;
                        switch (type) {
                            case 'SMA': computedData = computeSMA(processedMainData, per); break;
                            case 'EMA': computedData = computeEMA(processedMainData, per); break;
                            case 'WMA': computedData = computeWMA(processedMainData, per); break;
                            case 'RMA': computedData = computeRMA(processedMainData, per); break;
                            default: computedData = computeSMA(processedMainData, per);
                        }
                        return sanitizeData(computedData);
                    });
                    break;
                case "GAINZ":
                    const result = computeGainzSignals(processedMainData, ind.options);
                    computations[ind.id] = result;
                    console.log("GAINZ COMPUTE", result);
                    break;
                default:
                    computations[ind.id] = { data: sanitizeData(computeSMA(processedMainData, 14)) };
            }
        });
        return computations;
    }, [processedMainData, indicators, sanitizeData,haOptions]);

    const processData = useCallback((rawMainData) => {
        if (!isMounted.current || !mainSeriesRef.current || !chartRef.current || rawMainData.length === 0) return;

        const timeScale = chartRef.current.timeScale();
        const oldStart = lastDataRef.current[0]?.time;
        const newStart = rawMainData[0].time;
        const startChanged = newStart !== oldStart;
        const isMajor = lastDataRef.current.length === 0 || startChanged;

        latestTimeRef.current = rawMainData[rawMainData.length - 1].time;

        const shift = startChanged ? (newStart - oldStart) : 0;

        // Update overlays and panes (full setData, safe as times align unless major)
        const overlays = indicators.filter(ind => ind.location === 'overlay');
        overlays.forEach(ind => {
            const comp = indicatorComputations[ind.id];
            if (!comp) return;
            if (ind.type === 'heikenAshiBas') {
            const comp = indicatorComputations[ind.id];
            if (!comp) return;

            // ------------------------------
            // 1) CREATE SERIES IF NOT EXIST
            // ------------------------------
            // Heiken Ashi Series
            if (!seriesRef.current[`${ind.id}-ha`]) {
                seriesRef.current[`${ind.id}-ha`] = chart.addCandlestickSeries({
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderUpColor: '#26a69a',
                    borderDownColor: '#ef5350',
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                });
            }

            // Kijun Line
            if (!seriesRef.current[`${ind.id}-kijun`]) {
                seriesRef.current[`${ind.id}-kijun`] = chart.addLineSeries({
                    color: '#3E82FF',
                    lineWidth: 2,
                });
            }

            // EMA 200
            if (!seriesRef.current[`${ind.id}-ema200`]) {
                seriesRef.current[`${ind.id}-ema200`] = chart.addLineSeries({
                    color: '#FFA500',
                    lineWidth: 2,
                });
            }

            // Fetch series references
            const haSeries = seriesRef.current[`${ind.id}-ha`];
            const kijunSeries = seriesRef.current[`${ind.id}-kijun`];
            const emaSeries = seriesRef.current[`${ind.id}-ema200`];

            // ------------------------------
            // 2) SET HEIKEN ASHI TRANSFORMED CANDLE DATA
            if (comp.haData && haSeries) {
                haSeries.setData(comp.haData);
            }

            // ------------------------------
            // 3) SET KIJUN DATA\
            console.log(comp)
            // ------------------------------
            if (comp.kijun && kijunSeries) {
                const kijunData = comp.kijun
                    .map((v, i) =>
                        v != null
                            ? { time: rawMainData[i]?.time, value: v }
                            : null
                    )
                    .filter(Boolean);

                kijunSeries.setData(kijunData);
            }

            // ------------------------------
            // 4) SET EMA 200 DATA
            // ------------------------------
            if (comp.ema200 && emaSeries) {
                const emaData = comp.ema200.map((v, i) => ({
                    time: rawMainData[i]?.time,
                    value: v,
                }));
                emaSeries.setData(emaData);
            }

            if (comp.signals && haSeries) {
            const validSignals = comp.signals.filter((s) => s.long || s.short);

            if (comp.signals?.length > 0) {
                    haSignalsRef.current = comp.signals
                    .filter(s => s.long || s.short)
                    .map(sig => ({
                        time: sig.time,
                        price: rawMainData.find(d => d.time === sig.time)?.close || 0,
                        long: sig.long,
                        short: sig.short
                    }));
                    
                    setTimeout(renderHaOverlayArrows, 20);
                }
            // Replace existing setTimeout at end of processData:
            setTimeout(() => {
            renderHaOverlayArrows();      
            renderGainzOverlayMarkers(); 
            }, 20);
        }
            setTimeout(() => {
                renderHaOverlayArrows();   // Draw Heiken-Ashi arrows
            }, 20);

            return;
        }
            if (ind.type === "GAINZ") {
                    const comp = indicatorComputations[ind.id];
                    if (!comp || !comp.signals) return;

                    // Prepare normalized signals for overlay
                    gainzSignalsRef.current = comp.signals.map(sig => ({
                        time: sig.time,
                        price: rawMainData[sig.index]?.close,
                        long: sig.long,
                        short: sig.short,
                        tp: sig.tp,
                        sl: sig.sl
                    }));

                    // Render markers after chart draws
                    setTimeout(() => renderGainzOverlayMarkers(), 30);

                    return;
                }
            if (ind.type === 'RAINBOW') {
                const rainbowSeries = seriesRef.current[ind.id];
                comp.forEach((data, idx) => {
                    rainbowSeries?.[idx]?.setData(data);
                });
            } else if (ind.type === 'ENVELOPE') {
                seriesRef.current[`${ind.id}-upper`]?.setData(comp.upper);
                seriesRef.current[`${ind.id}-middle`]?.setData(comp.middle);
                seriesRef.current[`${ind.id}-lower`]?.setData(comp.lower);
            } else if (ind.type === 'BBANDS') {
                seriesRef.current[`${ind.id}-upper`]?.setData(comp.upper);
                seriesRef.current[`${ind.id}-middle`]?.setData(comp.middle);
                seriesRef.current[`${ind.id}-lower`]?.setData(comp.lower);
            } else if (ind.type === 'DONCHIAN') {
                seriesRef.current[`${ind.id}-upper`]?.setData(comp.upper);
                seriesRef.current[`${ind.id}-lower`]?.setData(comp.lower);
            } else {
                const series = seriesRef.current[ind.id];
                series?.setData(comp.data);
            }
        });

        const paneIndicators = indicators.filter(ind => ind.location === 'pane');
        paneIndicators.forEach(ind => {
            const comp = indicatorComputations[ind.id];
            if (!comp) return;
            switch (ind.type) {
                case 'heikenAshiBas': {
                    const haSeries = chart.addCandlestickSeries({
                                upColor: '#26a69a',
                                downColor: '#ef5350',
                                borderUpColor: '#26a69a',
                                borderDownColor: '#ef5350',
                                wickUpColor: '#26a69a',
                                wickDownColor: '#ef5350',
                            });
                    const kijunSeries = chart.addLineSeries({
                        color: '#1E88E5',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    const emaSeries = chart.addLineSeries({
                                    color: '#8E24AA',
                                    lineWidth: 2,
                                    lastValueVisible: false,
                                    priceLineVisible: false
                                });                    seriesRef.current[`${ind.id}-ha`] = haSeries;
                                        seriesRef.current[`${ind.id}-ha`] = haSeries;
                                seriesRef.current[`${ind.id}-kijun`] = kijunSeries;
                                seriesRef.current[`${ind.id}-ema200`] = emaSeries;
                                        break;
                                    }
                case 'RSI':
                    const rsiSeries = seriesRef.current[ind.id];
                    rsiSeries?.setData(comp.data);
                    const overbought = seriesRef.current[`${ind.id}-overbought`];
                    const oversold = seriesRef.current[`${ind.id}-oversold`];
                    if (rawMainData.length > 0) {
                        const levelData70 = rawMainData.map(d => ({ time: d.time, value: 70 }));
                        const levelData30 = rawMainData.map(d => ({ time: d.time, value: 30 }));
                        overbought?.setData(levelData70);
                        oversold?.setData(levelData30);
                    }
                    break;
                case 'MACD':
                case 'MACD_RE': {
                    const comp = indicatorComputations[ind.id];
                    if (!comp) return;

                    // Update main MACD series
                    seriesRef.current[`${ind.id}-macd`]?.setData(comp.macdLine);
                    seriesRef.current[`${ind.id}-signal`]?.setData(comp.signalLine);
                    seriesRef.current[`${ind.id}-hist`]?.setData(comp.histogram);

                    // ----------------------------------------------------
                    // ✅ ADD YOUR CROSSOVER DETECTION CODE HERE
                    // ----------------------------------------------------
                    const signals = [];
                    const macdArr = comp.macdLine;
                    const sigArr = comp.signalLine;

                    for (let i = 1; i < macdArr.length; i++) {
                        const p = macdArr[i - 1], s = sigArr[i - 1];
                        const c = macdArr[i], cs = sigArr[i];

                        // BUY crossover
                        if (p.value <= s.value && c.value > cs.value) {
                            signals.push({
                                type: "buy",
                                time: c.time,
                                price: rawMainData[i].close,
                            });
                        }

                        // SELL crossover
                        if (p.value >= s.value && c.value < cs.value) {
                            signals.push({
                                type: "sell",
                                time: c.time,
                                price: rawMainData[i].close,
                            });
                        }
                    }

                    // DRAW LABELS ON OVERLAY
                    const chart = chartRef.current;

                    const overlay = gainzOverlayRef.current;

                    if (overlay && chart && mainSeriesRef.current) {
                        // Clear old labels before drawing new
                        overlay.innerHTML = "";

                        signals.forEach(sig => {
                            console.log("MACD SIGNAL", sig);
                            const x = chart.timeScale().timeToCoordinate(sig.time);
                            const y = mainSeriesRef.current.priceToCoordinate(sig.price);

                            if (x != null && y != null) {
                                const el = createSignalLabel({
                                    x,
                                    y,
                                    type: sig.type,
                                    time: sig.time
                                });

                                overlay.appendChild(el);
                            }
                        });
                    }


                    return;
                }

                case 'AO':
                case 'ZIGZAG':
                    const series = seriesRef.current[ind.id];
                    series?.setData(comp.data);
                    break;
                case "GAINZ":
                    const result = computeGainzSignals(processedMainData, ind.options);
                    computations[ind.id] = result;
                    console.log("GAINZ COMPUTE", result);
                    break;
                default:
                    const defaultSeries = seriesRef.current[ind.id];
                    defaultSeries?.setData(comp.data);
            }
        });

        if (isMajor) {
            // Full reset for main series
            const mainData = chartType === 'area' 
                ? rawMainData.map(d => ({ time: d.time, value: d.close }))
                : rawMainData;
            mainSeriesRef.current.setData(mainData);

            // Handle view after full setData
            const oldVisible = timeScale.getVisibleRange();
            if (userInteractedRef.current && oldVisible && startChanged) {
                // Preserve and shift view
                let newFrom = oldVisible.from + shift;
                let newTo = oldVisible.to + shift;
                const dataFrom = newStart;
                const dataTo = latestTimeRef.current;
                newFrom = Math.max(newFrom, dataFrom);
                newTo = Math.min(newTo, dataTo);
                if (newFrom < newTo) {
                    timeScale.setVisibleRange({ from: newFrom, to: newTo });
                } else {
                    // Fallback if out of bounds
                    timeScale.scrollToRealTime();
                }
            } else if (fitContentRef.current) {
                timeScale.fitContent();
                fitContentRef.current = false;
            } else if (autoScrollRef.current && !userInteractedRef.current && latestTimeRef.current) {
                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = setTimeout(() => {
                    timeScale.scrollToRealTime();
                }, 100);
            }
        } else {
            // Incremental update: no start change, just append or update tail
            // Rely on rightBarStaysOnScroll to prevent auto-reset; no manual intervention needed
            const oldLen = lastDataRef.current.length;
            const newLen = rawMainData.length;
            if (chartType === 'area') {
                const getAreaPoint = (d) => ({ time: d.time, value: d.close });
                if (newLen > oldLen) {
                    // Append new points (handles batch)
                    for (let i = oldLen; i < newLen; i++) {
                        mainSeriesRef.current.update(getAreaPoint(rawMainData[i]));
                    }
                } else if (newLen === oldLen && oldLen > 0) {
                    // Update last point (e.g., current candle)
                    mainSeriesRef.current.update(getAreaPoint(rawMainData[newLen - 1]));
                }
            } else {
                if (newLen > oldLen) {
                    // Append new points (handles batch)
                    for (let i = oldLen; i < newLen; i++) {
                        mainSeriesRef.current.update(rawMainData[i]);
                    }
                } else if (newLen === oldLen && oldLen > 0) {
                    // Update last point (e.g., current candle)
                    mainSeriesRef.current.update(rawMainData[newLen - 1]);
                }
            }
        }

        lastDataRef.current = [...rawMainData];

        // Apply rightOffset only if auto-scrolling (not interacted)
        if (autoScrollRef.current) {
            timeScale.applyOptions({ rightOffset: 20 });
        }
    }, [chartType, indicators, indicatorComputations]);

    useEffect(() => {
        isMounted.current = true;
        
        const container = chartContainerRef.current;
        const gainzOverlay = document.createElement("div");
        gainzOverlay.style.position = "absolute";
        gainzOverlay.style.top = "0";
        gainzOverlay.style.left = "0";
        gainzOverlay.style.width = "100%";
        gainzOverlay.style.height = "100%";
        gainzOverlay.style.pointerEvents = "none";
        gainzOverlayRef.current = gainzOverlay;

        chartContainerRef.current.style.position = "relative";
        chartContainerRef.current.appendChild(gainzOverlay);        if (!container) return;
        if (!container) return;
        if (chartRef.current) {
            try {
                chartRef.current.remove();
            } catch (e) {
                // Ignore
            }
        }
        seriesRef.current = {};
        lastDataRef.current = [];  // Reset on chart recreate
        container.innerHTML = '';

        const newWidth = container.clientWidth || 800;
        const newHeight = container.clientHeight || 600;
        const paneIndicators = indicators.filter(ind => ind.location === 'pane');
        numPanesRef.current = paneIndicators.length;
        const minSectionHeight = 150;  // Minimum height per section (main or pane) to avoid squishing
        const totalSections = 1 + numPanesRef.current;  // Main + panes
        let sectionHeight = Math.max(newHeight / totalSections, minSectionHeight);
        // If equal split exceeds available space with mins, adjust: give main more if needed
        const minTotal = totalSections * minSectionHeight;
        if (minTotal > newHeight) {
            sectionHeight = newHeight / totalSections;  // Allow smaller if necessary
        }
        const mainHeight = Math.max(newHeight - (numPanesRef.current * sectionHeight), sectionHeight);  // Main gets remaining or equal

        const chartOptions = {
            width: newWidth,
            height: newHeight,
            layout: {
                textColor: 'black',
                background: { type: 'solid', color: 'white' },
                panes: {
                    separatorColor: '#f22c3d',
                    separatorHoverColor: 'rgba(255, 0, 0, 0.1)',
                    enableResize: true,  // Enable manual resize of panes (drag separators)
                },
            },
            grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
            handleScroll: {
                mouseWheel: false,  // Disable wheel panning to allow zoom everywhere
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: {
                    time: true,
                    price: true,
                },
                mouseWheel: true,  // Wheel now zooms (time + price based on hover)
                pinch: true,
            },
            timeScale: { 
                timeVisible: true, 
                secondsVisible: false,
                rightOffset: 20,
                barSpacing: 5,  // Increased for better drag responsiveness
                rightBarStaysOnScroll: false,  // Start with auto-follow; toggle to true on interaction
            },
            localization: {},
            // 👇 REQUIRED FOR V5 PRIMITIVES
            enablePrimitiveRendering: true,
        };
        const chart = createChart(container, chartOptions);
        chartRef.current = chart;
        const addCandlestickCompat = (opts, paneIndex) => {
            if (!chart) return null;
            if (typeof chart.addCandlestickSeries === 'function') {
                return paneIndex != null ? chart.addCandlestickSeries(opts, paneIndex) : chart.addCandlestickSeries(opts);
            }
            if (typeof chart.addSeries === 'function') {
                return paneIndex != null ? chart.addSeries(CandlestickSeries, opts, paneIndex) : chart.addSeries(CandlestickSeries, opts);
            }
            throw new Error('No compatible candlestick creation method on chart');
        };

        const addLineCompat = (opts, paneIndex) => {
            if (!chart) return null;
            if (typeof chart.addLineSeries === 'function') {
                return paneIndex != null ? chart.addLineSeries(opts, paneIndex) : chart.addLineSeries(opts);
            }
            if (typeof chart.addSeries === 'function') {
                return paneIndex != null ? chart.addSeries(LineSeries, opts, paneIndex) : chart.addSeries(LineSeries, opts);
            }
            throw new Error('No compatible line creation method on chart');
        };
        const addHistogramCompat = (opts, paneIndex) => {
           if (!chart) return null;
           if (typeof chart.addHistogramSeries === 'function') {
               return paneIndex != null ? chart.addHistogramSeries(opts, paneIndex) : chart.addHistogramSeries(opts);
           }
           if (typeof chart.addSeries === 'function') {
               return paneIndex != null ? chart.addSeries(HistogramSeries, opts, paneIndex) : chart.addSeries(HistogramSeries, opts);
           }
           // degrade gracefully by returning null
           return null;
       };
       // Subscribe to visible time range changes to detect manual pan/zoom to past
        const timeScale = chart.timeScale();
        const handleRangeChange = (range) => {
            if (!range || !latestTimeRef.current) return;

            const currentTo = range.to;
            const currentFrom = range.from;
            const currentWidth = currentTo - currentFrom;

            // Detect pan to past: if end of view is significantly before latest (e.g., <95% to avoid minor drifts)
            if (currentTo < latestTimeRef.current * 0.95) {
                userInteractedRef.current = true;
                autoScrollRef.current = false;
                timeScale.applyOptions({ rightBarStaysOnScroll: true });  // Lock: prevent auto-scroll to new data
                console.log('User panned to past—auto-scroll disabled and right bar locked');
            }

            // Detect zoom in/out by comparing range width
            if (prevRangeWidthRef.current !== null) {
                const prevWidth = prevRangeWidthRef.current;
                if (currentWidth < prevWidth * 0.9) {  // Zoomed in (width decreased >10%)
                    isZoomedInRef.current = true;
                    autoScrollRef.current = false;
                    timeScale.applyOptions({ rightBarStaysOnScroll: true });  // Lock on zoom in too
                    console.log('Zoomed in—view locked until zoom out');
                } else if (currentWidth > prevWidth * 1.1 && isZoomedInRef.current) {  // Zoomed out (width increased >10%) and was zoomed in
                    isZoomedInRef.current = false;
                    // Optionally re-enable auto-scroll here if desired, or keep manual reset
                    console.log('Zoomed out—zoom lock released');
                }
            }
            prevRangeWidthRef.current = currentWidth;
        };
        timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);
        rangeChangeHandlerRef.current = handleRangeChange;
        chart.timeScale().subscribeVisibleTimeRangeChange(() => {
            renderHaOverlayArrows();
        });

        let mainSeries;
        if (chartType === 'area' || !hasOHLC) {
            // area series compat
            mainSeries = (typeof chart.addAreaSeries === 'function')
                ? chart.addAreaSeries({
                    topColor: 'rgba(128, 128, 128, 0.3)',
                    bottomColor: 'rgba(128, 128, 128, 0.1)',
                    lineColor: '#808080',
                    lineWidth: 2,
                })
                : chart.addSeries(AreaSeries, {
                 topColor: 'rgba(128, 128, 128, 0.3)',
                 bottomColor: 'rgba(128, 128, 128, 0.1)',
                 lineColor: '#808080',
                 lineWidth: 2,
            });
        } else if (chartType === 'ohlc') {
            mainSeries = (typeof chart.addBarSeries === 'function')
                ? chart.addBarSeries({
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: true,
                    borderUpColor: '#26a69a',
                    borderDownColor: '#ef5350',
                })
                : chart.addSeries(BarSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: true,
                borderUpColor: '#26a69a',
                borderDownColor: '#ef5350',
            });
        } else {
            const candleOptions = {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            };
            if (chartType === 'hollow') {
                candleOptions.upColor = 'transparent';
                candleOptions.downColor = 'transparent';
                candleOptions.borderVisible = true;
                candleOptions.borderUpColor = '#26a69a';
                candleOptions.borderDownColor = '#ef5350';
            }
            mainSeries = addCandlestickCompat(candleOptions);
        }
        mainSeriesRef.current = mainSeries;

        const overlays = indicators.filter(ind => ind.location === 'overlay');
        overlays.forEach(ind => {
            let overlaySeries;
            switch (ind.type) {
                case 'heikenAshiBas': {
                    const haSeries = addCandlestickCompat({
                        upColor: '#26a69a',
                        downColor: '#ef5350',
                        borderUpColor: '#26a69a',
                        borderDownColor: '#ef5350',
                        wickUpColor: '#26a69a',
                        wickDownColor: '#ef5350',
                    });
                    const kijunSeries = addLineCompat({
                        color: '#1E88E5',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    const emaSeries = addLineCompat({
                        color: '#8E24AA',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    const sigLongSeries = addHistogramCompat({ color: '#00C853', priceFormat: { type: 'price', precision: 2 }, lastValueVisible: false, priceLineVisible: false });
                    const sigShortSeries = addHistogramCompat({ color: '#D50000', priceFormat: { type: 'price', precision: 2 }, lastValueVisible: false, priceLineVisible: false });

                    seriesRef.current[`${ind.id}-ha`] = haSeries;
                    seriesRef.current[`${ind.id}-kijun`] = kijunSeries;
                    seriesRef.current[`${ind.id}-ema200`] = emaSeries;
                    seriesRef.current[`${ind.id}-sig-long`] = sigLongSeries;
                    seriesRef.current[`${ind.id}-sig-short`] = sigShortSeries;

                    break;
                }
                case 'SMA':
                case 'EMA':
                case 'WMA':
                case 'RMA':
                case 'ZIGZAG':
                case 'SAR':
                case 'ICHIMOKU':
                case 'ALLIGATOR':
                case 'FC_BANDS':
                    overlaySeries = chart.addSeries(LineSeries, { 
                        color: ind.color || '#ff6d00', 
                        lineWidth: 2,
                        lineStyle: 0,
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    seriesRef.current[ind.id] = overlaySeries;
                    break;
                case 'ENVELOPE':
                    const upperEnv = chart.addSeries(LineSeries, { 
                        color: ind.color || '#00C853',
                        lineWidth: 1,
                        lineStyle: 0,
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    const middleEnv = chart.addSeries(LineSeries, { 
                        color: ind.color || '#00C853',
                        lineWidth: 1,
                        lineStyle: 0,
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    const lowerEnv = chart.addSeries(LineSeries, { 
                        color: ind.color || '#00C853',
                        lineWidth: 1,
                        lineStyle: 0,
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                    seriesRef.current[`${ind.id}-upper`] = upperEnv;
                    seriesRef.current[`${ind.id}-middle`] = middleEnv;
                    seriesRef.current[`${ind.id}-lower`] = lowerEnv;
                    break;
                case 'BBANDS':
                    const upperBB = chart.addSeries(LineSeries, { color: ind.color || '#2962FF' });
                    const middleBB = chart.addSeries(LineSeries, { color: ind.color || '#2962FF', lineWidth: 1 });
                    const lowerBB = chart.addSeries(LineSeries, { color: ind.color || '#2962FF' });
                    seriesRef.current[`${ind.id}-upper`] = upperBB;
                    seriesRef.current[`${ind.id}-middle`] = middleBB;
                    seriesRef.current[`${ind.id}-lower`] = lowerBB;
                    break;
                case 'DONCHIAN':
                    const upperDon = chart.addSeries(LineSeries, { color: ind.color || '#FF6D00' });
                    const lowerDon = chart.addSeries(LineSeries, { color: ind.color || '#FF6D00' });
                    seriesRef.current[`${ind.id}-upper`] = upperDon;
                    seriesRef.current[`${ind.id}-lower`] = lowerDon;
                    break;
                case 'MACD':
                case 'MACD_RE': {
                    const macdLine = addLineCompat({
                        color: ind.macdColor || '#426BE6',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });

                    const signalLine = addLineCompat({
                        color: ind.signalColor || '#FF0000',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });

                    const histSeries = addHistogramCompat({
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });

                    seriesRef.current[`${ind.id}-macd`] = macdLine;
                    seriesRef.current[`${ind.id}-signal`] = signalLine;
                    seriesRef.current[`${ind.id}-hist`] = histSeries;
                    break;
                }

                case 'RAINBOW':
                    const rainbowSeries = [];
                    (ind.types || []).forEach((type, idx) => {
                        const color = ind.colors?.[idx] || '#2962FF';
                        const series = chart.addSeries(LineSeries, { 
                            color, 
                            lineWidth: 1,
                            lineStyle: 0,
                            lastValueVisible: false,
                            priceLineVisible: false
                        });
                        rainbowSeries.push(series);
                    });
                    seriesRef.current[ind.id] = rainbowSeries;
                    break;
                default:
                    const defaultSeries = chart.addSeries(LineSeries, { color: ind.color || '#2962FF' });
                    seriesRef.current[ind.id] = defaultSeries;
            }
        });

        let currentPaneIndex = 1;
        paneIndicators.forEach(ind => {
            const paneIndex = currentPaneIndex++;
            let paneSeries;
            switch (ind.type) {
                case 'heikenAshiBas':
                    paneSeries = chart.addCandlestickSeries({
                        upColor: '#26a69a',
                        downColor: '#ef5350',
                        borderUpColor: '#26a69a',
                        borderDownColor: '#ef5350',
                        wickUpColor: '#26a69a',
                        wickDownColor: '#ef5350',
                    }, paneIndex);
                    seriesRef.current[`${ind.id}-ha`] = paneSeries;
                    seriesRef.current[`${ind.id}-kijun`] = chart.addLineSeries({ color: '#1E88E5', lineWidth: 2 }, paneIndex);
                    seriesRef.current[`${ind.id}-ema200`] = chart.addLineSeries({ color: '#8E24AA', lineWidth: 2 }, paneIndex);
                    break;
                case 'RSI':
                    paneSeries = chart.addSeries(LineSeries, {
                        color: ind.color || '#FF6D00',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const overbought = chart.addSeries(LineSeries, {
                        color: 'rgba(255,0,0,0.3)',
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const oversold = chart.addSeries(LineSeries, {
                        color: 'rgba(0,150,136,0.3)',
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    seriesRef.current[`${ind.id}-overbought`] = overbought;
                    seriesRef.current[`${ind.id}-oversold`] = oversold;
                    seriesRef.current[ind.id] = paneSeries;
                    break;

                case 'MACD':
                case 'MACD_RE': {
                    const macdLine = chart.addSeries(LineSeries, {
                        color: ind.macdColor || '#426BE6',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const signalLine = chart.addSeries(LineSeries, {
                        color: ind.signalColor || '#FF0000',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const histSeries = chart.addSeries(HistogramSeries, {
                        priceLineVisible: false,
                        lastValueVisible: false,
                    }, paneIndex);

                    seriesRef.current[`${ind.id}-macd`] = macdLine;
                    seriesRef.current[`${ind.id}-signal`] = signalLine;
                    seriesRef.current[`${ind.id}-hist`] = histSeries;

                    break;
                }

                case 'AO':
                    paneSeries = chart.addSeries(HistogramSeries, {
                        color: ind.color || '#2962FF',
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);
                    seriesRef.current[ind.id] = paneSeries;
                    break;

                // Missing cases - ADD THESE:
                case 'DPO':
                    paneSeries = chart.addSeries(LineSeries, {
                        color: ind.color || '#FF6D00',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);
                    seriesRef.current[ind.id] = paneSeries;
                    break;

                case 'ROC':
                    paneSeries = chart.addSeries(LineSeries, {
                        color: ind.color || '#00C853',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);
                    seriesRef.current[ind.id] = paneSeries;
                    break;

                case 'STOCH':
                    const stochK = chart.addSeries(LineSeries, {
                        color: ind.color || '#2962FF',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const stochD = chart.addSeries(LineSeries, {
                        color: '#FF6D00',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    seriesRef.current[`${ind.id}-k`] = stochK;
                    seriesRef.current[`${ind.id}-d`] = stochD;
                    break;

                case 'SMI':
                    paneSeries = chart.addSeries(LineSeries, {
                        color: ind.color || '#00C853',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);
                    seriesRef.current[ind.id] = paneSeries;
                    break;

                case 'WILLIAMS':
                    paneSeries = chart.addSeries(LineSeries, {
                        color: ind.color || '#FF6D00',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);
                    seriesRef.current[ind.id] = paneSeries;
                    break;

                case 'AROON':
                    const aroonUp = chart.addSeries(LineSeries, {
                        color: '#00C853',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const aroonDown = chart.addSeries(LineSeries, {
                        color: '#FF6D00',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    seriesRef.current[`${ind.id}-up`] = aroonUp;
                    seriesRef.current[`${ind.id}-down`] = aroonDown;
                    break;

                case 'ADX':
                    const adxLine = chart.addSeries(LineSeries, {
                        color: ind.adxColor || '#2962FF',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const plusDI = chart.addSeries(LineSeries, {
                        color: ind.plusDIColor || '#00C853',
                        lineWidth: 1,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const minusDI = chart.addSeries(LineSeries, {
                        color: ind.minusDIColor || '#FF6D00',
                        lineWidth: 1,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    seriesRef.current[`${ind.id}-adx`] = adxLine;
                    seriesRef.current[`${ind.id}-plus`] = plusDI;
                    seriesRef.current[`${ind.id}-minus`] = minusDI;
                    break;

                case 'CCI':
                    paneSeries = chart.addSeries(LineSeries, {
                        color: ind.color || '#FF6D00',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const cciOverbought = chart.addSeries(LineSeries, {
                        color: 'rgba(255,0,0,0.3)',
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    const cciOversold = chart.addSeries(LineSeries, {
                        color: 'rgba(0,150,136,0.3)',
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);

                    seriesRef.current[`${ind.id}-overbought`] = cciOverbought;
                    seriesRef.current[`${ind.id}-oversold`] = cciOversold;
                    seriesRef.current[ind.id] = paneSeries;
                    break;

                default:
                    paneSeries = chart.addSeries(LineSeries, {
                        color: ind.color || '#2962FF',
                        lastValueVisible: false,
                        priceLineVisible: false,
                    }, paneIndex);
                    seriesRef.current[ind.id] = paneSeries;
            }
        });

        // Ensure pane order
        const panes = chart.panes();
        panes.forEach((pane, index) => {
            pane.moveTo(index);
        });

        // Set pane heights with equal division
        if (panes.length > 0) {
            panes[0].setHeight(mainHeight);
        }
        for (let i = 1; i < panes.length; i++) {
            panes[i].setHeight(sectionHeight);
        }

        // Set price scale margins for indicator panes
        for (let i = 1; i < panes.length; i++) {
            const pane = panes[i];
            let scaleMargins = { top: 0.1, bottom: 0.1 };
            // For RSI, adjust to show levels better
            const ind = paneIndicators[i - 1];
            if (ind && ind.type === 'RSI') {
                scaleMargins = { top: 0.8, bottom: 0.1 };
            }
            const priceScale = pane.priceScale('right');
            priceScale.applyOptions({ scaleMargins });
        }

        const handleResize = () => {
            const cont = chartContainerRef.current;
            const gainzOverlay = document.createElement("div");
            gainzOverlay.style.position = "absolute";
            gainzOverlay.style.top = "0";
            gainzOverlay.style.left = "0";
            gainzOverlay.style.width = "100%";
            gainzOverlay.style.height = "100%";
            gainzOverlay.style.pointerEvents = "none";
            gainzOverlayRef.current = gainzOverlay;

            chartContainerRef.current.style.position = "relative";
            chartContainerRef.current.appendChild(gainzOverlay);

            if (!cont || !chartRef.current) return;
            const nWidth = cont.clientWidth || 800;
            const nHeight = cont.clientHeight || 600;
            if (nWidth > 0 && nHeight > 0) {
                chartRef.current.applyOptions({ width: nWidth, height: nHeight });
                const numPanes = numPanesRef.current;
                const totalSecs = 1 + numPanes;
                const minSecHeight = 150;
                let secHeight = Math.max(nHeight / totalSecs, minSecHeight);
                const minTotal = totalSecs * minSecHeight;
                if (minTotal > nHeight) {
                    secHeight = nHeight / totalSecs;
                }
                const minMainHeight = Math.max(nHeight - (numPanes * secHeight), secHeight);
                const ps = chartRef.current.panes();
                if (ps.length > 0) {
                    ps[0].setHeight(minMainHeight);
                }
                for (let i = 1; i < ps.length; i++) {
                    if (i - 1 < numPanes) {
                        ps[i].setHeight(secHeight);
                    }
                }
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        fitContentRef.current = true;
        // Initial process after chart creation
        processData(processedMainData);

        return () => {
            isMounted.current = false;
            window.removeEventListener('resize', handleResize);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            if (chartRef.current) {
                const timeScale = chartRef.current.timeScale();
                if (rangeChangeHandlerRef.current) {
                    timeScale.unsubscribeVisibleTimeRangeChange(rangeChangeHandlerRef.current);
                }
                try {
                    chartRef.current.remove();
                } catch (e) {
                    // Ignore
                }
            }
            chartRef.current = null;
            mainSeriesRef.current = null;
        };
    }, [chartType, indicators, symbol, hasOHLC]);  // Depend on symbol for recreation; hasOHLC if it affects series type
    // Note: This effect already recreates the chart (and indicators) when the `symbol` prop changes,
    // which can be driven by URL parameters (e.g., via useParams in the parent component). If the URL
    // changes (updating the symbol), the chart will automatically refresh and recreate based on the new URL-derived symbol.

    // Separate effect for data updates: only calls processData without recreating chart
    useEffect(() => {
        if (isMounted.current && processedMainData.length > 0) {
            processData(processedMainData);
        }
    }, [processedMainData, processData]);

    console.log('Rendering TradingChart for symbol:', symbol);

    useImperativeHandle(ref, () => ({
        isReady: !!chartRef.current,
        zoom: (direction) => {
            if (chartRef.current && isMounted.current) {
                const factor = direction === 'in' ? 1.2 : 0.833;
                try {
                    chartRef.current.timeScale().zoom(factor);
                    userInteractedRef.current = true;
                    if (direction === 'in') {
                        isZoomedInRef.current = true;
                        autoScrollRef.current = false;
                        chartRef.current.timeScale().applyOptions({ rightBarStaysOnScroll: true });
                        console.log('Zoomed in via imperative—view locked');
                    } else if (direction === 'out' && isZoomedInRef.current) {
                        // Check if zoomed out enough after zoom out
                        setTimeout(() => {
                            const range = chartRef.current.timeScale().getVisibleRange();
                            if (range && latestTimeRef.current) {
                                const fullWidth = latestTimeRef.current - (processedMainData[0]?.time || 0);
                                const currentWidth = range.to - range.from;
                                if (currentWidth > fullWidth * 0.95) {  // Nearly full view
                                    isZoomedInRef.current = false;
                                    console.log('Zoomed out to near full—zoom lock released');
                                }
                            }
                        }, 50);
                    }
                    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                } catch (e) {
                    console.error('Zoom error:', e);
                }
            }
        },
        // Method to reset auto-scroll and zoom lock (can be called from parent, e.g., on button click)
        resetView: () => {
            userInteractedRef.current = false;
            autoScrollRef.current = true;
            isZoomedInRef.current = false;
            prevRangeWidthRef.current = null;
            if (chartRef.current) {
                const timeScale = chartRef.current.timeScale();
                timeScale.applyOptions({ 
                    rightBarStaysOnScroll: false,
                    rightOffset: 20 
                });
            }
            console.log('View reset—auto-scroll and zoom lock re-enabled');
            if (chartRef.current) {
                const timeScale = chartRef.current.timeScale();
                timeScale.scrollToRealTime();
                timeScale.fitContent();
            }
        }
    }));
    // Controls UI: simple HTML-style control bar above chart
    const heikenIndicator = indicators.find(i => i.type === 'heikenAshiBas');

    // If parent supplies initial options, sync them once
    useEffect(() => {
        if (heikenIndicator?.options) setHaOptions(prev => ({ ...prev, ...heikenIndicator.options }));
    }, [heikenIndicator?.options]);

    return (
        <>
            
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%', pointerEvents: 'auto' }} />
        </>
    );
}));

TradingChart.displayName = 'TradingChart';

export default TradingChart;