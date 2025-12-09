import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BarChart3, Download, Pencil, ZoomIn, ZoomOut,ListFilter, Search, Settings2, SlidersHorizontal, Terminal, MoreHorizontal, ChevronDown, Play, Code2, Lock, Unlock, TrendingUp, TrendingDown, CheckSquare, Square } from 'lucide-react';
import { useDerivAPI } from '@/contexts/DerivContext';
import TradingChart from '@/components/TradingChart';
import MarketSelector from '@/components/MarketSelector';
import ChartSettingsModal from '@/components/ChartSettingsModal';
import IndicatorsModal from '@/components/IndicatorsModal';
import DrawingToolsModal from '@/components/DrawingToolsModal';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DigitsAnalysisPanel } from './DigitsAnalysisPanel';

const ChartArea = ({
                       selectedMarket,
                       setSelectedMarket,
                       chartData,
                       setChartData,
                       chartType,
                       setChartType,
                       timeInterval,
                       setTimeInterval,
                       isScriptRunnerOpen,
                       setIsScriptRunnerOpen,
                       tradeType,
                       onSelectDigit,
                       selectedDigit,
                       onOpenTradeTypeSelector
                   }) => {
    const { subscribeTick, getHistory, tickData } = useDerivAPI();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
    const [isDrawingToolsOpen, setIsDrawingToolsOpen] = useState(false);
    const [activeIndicators, setActiveIndicators] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTickCount, setSelectedTickCount] = useState(100);
    const [hasCarouselData, setHasCarouselData] = useState(false);
    const [isZoomLocked, setIsZoomLocked] = useState(false);
    const [stake, setStake] = useState(10);
    const [duration, setDuration] = useState(5);
    const [allowEquals, setAllowEquals] = useState(false);
    const [growthRate, setGrowthRate] = useState(3);
    const [scriptCode, setScriptCode] = useState('// Write your trading script here\n// Example:\nif (lastDigit === 5) {\n  console.log("Digit 5 appeared!");\n}');
    const tradingChartRef = useRef();
    const lastTickRef = useRef(null);
    const { toast } = useToast();
    const digitsTradeTypes = ['matches_differs', 'even_odd', 'over_under'];
    const isDigitsTrade = tradeType && digitsTradeTypes.includes(tradeType);
    const isCandle = chartType !== 'area';

    const tickCounts = [25, 50, 100, 150, 200];

    const lastTick = tickData?.[selectedMarket?.symbol];

    const getPeriodStart = useCallback((timestampMs, granularitySeconds) => {
        return Math.floor(timestampMs / 1000 / granularitySeconds) * granularitySeconds * 1000;
    }, []);

    const getGranularity = useCallback((interval) => {
        const unit = interval.slice(-1);
        const value = parseInt(interval.slice(0, -1));
        if (unit === 'm') return value * 60;
        if (unit === 'h') return value * 3600;
        if (unit === 'd') return value * 86400;
        return 1;
    }, []);

    const handleHistory = useCallback((history, isUpdate = false) => {
        setIsLoading(false);
        const cleanHistory = history.filter(d => {
            if (isCandle) return d && d.time && d.open != null && d.high != null && d.low != null && d.close != null;
            return d && d.time && d.value != null;
        }).map(point => ({
            ...point,
            time: isCandle ? getPeriodStart(point.time, getGranularity(timeInterval)) : point.time
        }));
        if (isUpdate) {
            setChartData(prevData => {
                if (!prevData || prevData.length === 0) return cleanHistory;
                const uniqueNew = cleanHistory.filter(newPt => !prevData.some(oldPt => oldPt.time === newPt.time));
                return [...prevData, ...uniqueNew];
            });
        } else {
            setChartData(cleanHistory);
        }
    }, [setChartData, isCandle, timeInterval, getPeriodStart, getGranularity]);

    useEffect(() => {
        if (selectedMarket) {
            setIsLoading(true);
            setChartData([]);
            const style = isDigitsTrade ? 'ticks' : (timeInterval.endsWith('t') ? 'ticks' : 'candles');
            let granularity;
            if (!isDigitsTrade && style === 'candles') {
                granularity = getGranularity(timeInterval);
            }
            const historyCount = isDigitsTrade ? 200 : 100;

            getHistory(selectedMarket.symbol, style, granularity, historyCount, handleHistory);

            subscribeTick(selectedMarket.symbol);
        }
    }, [selectedMarket, timeInterval, getHistory, subscribeTick, handleHistory, isCandle, isDigitsTrade, getGranularity]);

    useEffect(() => {
        if (lastTick && selectedMarket?.symbol === lastTick.symbol && lastTick.quote != null) {
            if (lastTickRef.current && lastTickRef.current.epoch === lastTick.epoch && lastTickRef.current.quote === lastTick.quote) {
                return;
            }
            lastTickRef.current = lastTick;
            const tickTime = lastTick.epoch * 1000;
            const tickValue = lastTick.quote;
            setChartData(prevData => {
                if (isDigitsTrade || !isCandle) {
                    if (!prevData || prevData.length === 0) {
                        return [{ time: tickTime, value: tickValue }];
                    }
                    const lastPoint = prevData[prevData.length - 1];
                    if (lastPoint.time === tickTime) {
                        return [...prevData.slice(0, -1), { ...lastPoint, value: tickValue }];
                    }
                    return [...prevData, { time: tickTime, value: tickValue }];
                } else {
                    const granularity = getGranularity(timeInterval);
                    const currentPeriodStart = getPeriodStart(tickTime, granularity);
                    if (!prevData || prevData.length === 0) {
                        return [{
                            time: currentPeriodStart,
                            open: tickValue,
                            high: tickValue,
                            low: tickValue,
                            close: tickValue,
                        }];
                    }
                    const lastPoint = prevData[prevData.length - 1];
                    const lastPeriodStart = getPeriodStart(lastPoint.time, granularity);
                    if (currentPeriodStart === lastPeriodStart) {
                        return [
                            ...prevData.slice(0, -1),
                            {
                                ...lastPoint,
                                high: Math.max(lastPoint.high || tickValue, tickValue),
                                low: Math.min(lastPoint.low || tickValue, tickValue),
                                close: tickValue,
                            },
                        ];
                    } else {
                        return [
                            ...prevData,
                            {
                                time: currentPeriodStart,
                                open: lastPoint.close,
                                high: tickValue,
                                low: tickValue,
                                close: tickValue,
                            },
                        ];
                    }
                }
            });
        }
    }, [lastTick, isDigitsTrade, isCandle, selectedMarket, timeInterval, getGranularity, getPeriodStart]);

    const recentDigits = useMemo(() => {
        if (!isDigitsTrade || chartData.length === 0) return [];
        const digits = chartData
            .slice(-10)
            .filter(d => d?.value != null)
            .map(d => {
                const valStr = d.value.toString();
                const digitStr = valStr.slice(-1);
                const digit = parseInt(digitStr) || 0;
                return digit;
            })
            .reverse();
        return digits;
    }, [chartData, isDigitsTrade]);

    const lastDigit = useMemo(() => {
        if (lastTick?.quote != null) {
            const valStr = lastTick.quote.toString();
            return parseInt(valStr.slice(-1)) || 0;
        }
        if (chartData.length > 0) {
            const lastData = chartData[chartData.length - 1];
            if (lastData?.value != null) {
                const valStr = lastData.value.toString();
                return parseInt(valStr.slice(-1)) || 0;
            }
        }
        return null;
    }, [lastTick, chartData]);

    useEffect(() => {
        if (recentDigits.length > 0) {
            setHasCarouselData(true);
        }
    }, [recentDigits]);

    const availableTicks = useMemo(() => Math.min(selectedTickCount, chartData.length), [selectedTickCount, chartData.length]);

    const recentData = useMemo(() => chartData.slice(-availableTicks), [chartData, availableTicks]);

    const currentDigitStats = useMemo(() => {
        const stats = Array(10).fill(0);
        recentData.forEach(d => {
            if (d?.value != null) {
                const valStr = d.value.toString();
                const digit = parseInt(valStr.slice(-1)) || 0;
                if (!isNaN(digit) && digit >= 0 && digit <= 9) {
                    stats[digit]++;
                }
            }
        });
        return stats;
    }, [recentData]);

    const totalStats = availableTicks;

    const evenCount = useMemo(() => currentDigitStats.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0), [currentDigitStats]);
    const oddCount = totalStats - evenCount;
    const underCount = useMemo(() => currentDigitStats.slice(0, 5).reduce((a, b) => a + b, 0), [currentDigitStats]);
    const overCount = totalStats - underCount;

    const maxDigit = useMemo(() => {
        const maxPerc = Math.max(...currentDigitStats);
        return currentDigitStats.indexOf(maxPerc);
    }, [currentDigitStats]);

    const bestSuggestions = useMemo(() => {
        const suggestions = [];
        if (tradeType === 'matches_differs') {
            const maxPerc = totalStats > 0 ? (currentDigitStats[maxDigit] / totalStats) * 100 : 0;
            suggestions.push(`Predict: Digit ${maxDigit} (${maxPerc.toFixed(1)}%)`);
        }
        if (tradeType === 'even_odd') {
            const evenPerc = totalStats > 0 ? (evenCount / totalStats) * 100 : 0;
            const oddPerc = 100 - evenPerc;
            const best = evenPerc > oddPerc ? 'Even' : 'Odd';
            suggestions.push(`Predict: ${best} (${Math.max(evenPerc, oddPerc).toFixed(1)}%)`);
        }
        if (tradeType === 'over_under') {
            const underPerc = totalStats > 0 ? (underCount / totalStats) * 100 : 0;
            const overPerc = 100 - underPerc;
            const best = underPerc > overPerc ? 'Under 4.5' : 'Over 4.5';
            suggestions.push(`Predict: ${best} (${Math.max(underPerc, overPerc).toFixed(1)}%)`);
        }
        return suggestions.length > 0 ? suggestions : [`Analyze trends for ${tradeType?.replace('_', ' ')}`];
    }, [tradeType, currentDigitStats, totalStats, evenCount, underCount, maxDigit]);

    const pieData = useMemo(() => {
        if (!isDigitsTrade || totalStats === 0) return [];
        if (tradeType === 'even_odd') {
            return [
                { label: 'Even', perc: (evenCount / totalStats) * 100, color: evenCount > oddCount ? '#10B981' : '#D1D5DB', isPredicted: evenCount > oddCount },
                { label: 'Odd', perc: (oddCount / totalStats) * 100, color: oddCount > evenCount ? '#10B981' : '#D1D5DB', isPredicted: oddCount > evenCount }
            ];
        }
        if (tradeType === 'over_under') {
            return [
                { label: 'Under 4.5', perc: (underCount / totalStats) * 100, color: underCount > overCount ? '#10B981' : '#D1D5DB', isPredicted: underCount > overCount },
                { label: 'Over 4.5', perc: (overCount / totalStats) * 100, color: overCount > underCount ? '#10B981' : '#D1D5DB', isPredicted: overCount > underCount }
            ];
        }
        return currentDigitStats.map((count, i) => ({
            label: `${i}`,
            perc: (count / totalStats) * 100,
            color: i === maxDigit ? '#10B981' : i === selectedDigit ? '#3B82F6' : '#D1D5DB',
            isPredicted: i === maxDigit
        })).filter(d => d.perc > 0);
    }, [isDigitsTrade, totalStats, tradeType, evenCount, oddCount, underCount, overCount, currentDigitStats, maxDigit, selectedDigit]);

    const handleZoom = (direction) => {
        if (tradingChartRef.current?.isReady && !isZoomLocked) {
            tradingChartRef.current.zoom(direction);
            toast({
                description: `Zoom ${direction === 'in' ? 'in' : 'out'} applied! 🔍`,
                duration: 1000,
            });
        } else if (isZoomLocked) {
            toast({
                title: "Zoom Locked",
                description: "Unlock zoom to adjust the chart view.",
                variant: "default",
            });
        } else {
            toast({
                title: "Chart Not Ready",
                description: "Please select a market to enable chart controls.",
                variant: "destructive"
            });
        }
    };

    const toggleZoomLock = () => {
        setIsZoomLocked(!isZoomLocked);
        toast({
            description: isZoomLocked ? 'Zoom unlocked! 🔓' : 'Zoom locked—pinch to navigate. 🔒',
            duration: 1500,
        });
    };

    const handleNotImplemented = () => {
        toast({
            description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
    }

    const handleDigitSelect = (digit) => {
        if (onSelectDigit) {
            onSelectDigit(digit);
        }
    };

    const handleBuy = (direction) => {
        toast({
            title: `${direction === 'rise' ? 'Rise' : 'Fall'} order placed! 🚀`,
            description: `Stake: $${stake} for ${duration} ticks`,
        });
    };

    const chartTools = [
        { id: 'settings', label: 'Chart Settings', icon: Settings2, action: () => setIsSettingsOpen(true) },
        { id: 'indicators', label: 'Indicators', icon: SlidersHorizontal, action: () => setIsIndicatorsOpen(true) },
        { id: 'draw', label: 'Drawing Tools', icon: Pencil, action: () => setIsDrawingToolsOpen(true) },
        { id: 'download', label: 'Download', icon: Download, action: handleNotImplemented },
    ];

    const zoomTools = [
        { id: 'zoom-lock', label: isZoomLocked ? 'Unlock Zoom' : 'Lock Zoom', icon: isZoomLocked ? Lock : Unlock, action: toggleZoomLock },
        { id: 'zoom-in', label: 'Zoom In', icon: ZoomIn, action: () => handleZoom('in') },
        { id: 'search', label: 'Search', icon: Search, action: handleNotImplemented },
        { id: 'zoom-out', label: 'Zoom Out', icon: ZoomOut, action: () => handleZoom('out') },
    ];

    const isChartReady = tradingChartRef.current?.isReady ?? false;

    const currentPrice = lastTick?.quote?.toFixed(2) || '918.86';
    const maxPayout = (stake * 600).toLocaleString();

    const handleScriptRunnerToggle = useCallback(() => {
        setIsScriptRunnerOpen(!isScriptRunnerOpen);
    }, [isScriptRunnerOpen, setIsScriptRunnerOpen]);

    const durationOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-br from-white to-gray-50 relative z-5 min-w-0 h-full">
            {isLoading && <Progress value={null} className="absolute top-0 left-0 right-0 h-1 z-30 animate-pulse bg-blue-500" />}

            <div className="w-full hidden md:block md:absolute md:top-4 md:left-16 md:z-20 pt-8 md:pt-0">
                <MarketSelector
                    selectedMarket={selectedMarket}
                    setSelectedMarket={setSelectedMarket}
                    className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg w-full md:w-auto"
                />
            </div>

            <div className="absolute top-20 left-0 z-20 flex flex-col items-start gap-2 md:gap-12 md:top-32 md:left-0 w-12 md:w-16 pt-8 md:pt-0">
                {!isDigitsTrade && (
                    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-1.5 md:p-2 shadow-lg hover:shadow-xl transition-shadow duration-200 flex flex-col gap-1">
                        {chartTools.map(tool => (
                            <button
                                key={tool.id}
                                onClick={tool.action}
                                className="p-2 md:p-2.5 rounded-lg transition-all duration-150 hover:bg-blue-50 hover:text-blue-600 hover:scale-105 active:scale-95 text-gray-700"
                                title={tool.label}
                            >
                                <tool.icon className="h-5 w-5 md:h-4 w-4" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Mobile Market Selector */}
            <div className="md:hidden absolute top-16 right-4 z-20">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const event = new CustomEvent('openMobileMarketSelector');
                        window.dispatchEvent(event);
                    }}
                    className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm h-7"
                >
                    <ListFilter className="h-3 w-3 mr-1" />
                    Markets
                </Button>
            </div>

            <div className={`flex-1 pr-0 ${isScriptRunnerOpen ? 'pb-40 md:pb-52' : 'pb-0'} relative md:pb-0 pb-12 md:pt-0 w-full h-full min-h-[350px] max-h-[calc(100vh-220px)] md:max-h-none`}>
                <div className="relative h-full w-full rounded-2xl overflow-hidden sm:border sm:border-gray-200 sm:rounded-none sm:m-1 sm:shadow-inner flex flex-col">
                    {selectedMarket ? (
                        <>
                            {isDigitsTrade ? (
                                <div className="flex-1 min-h-[250px] sm:min-h-[450px] relative">
                                    <DigitsAnalysisPanel
                                        chartData={chartData}
                                        selectedTickCount={selectedTickCount}
                                        setSelectedTickCount={setSelectedTickCount}
                                        recentDigits={recentDigits}
                                        lastDigit={lastDigit}
                                        selectedDigit={selectedDigit}
                                        tradeType={tradeType}
                                        onSelectDigit={handleDigitSelect}
                                    />
                                </div>
                            ):(
                                <div className="flex-1 h-auto sm:min-h-[450px] relative">
                                    <div className="absolute inset-0 rounded-b-2xl overflow-hidden h-full w-full">
                                        <TradingChart
                                            ref={tradingChartRef}
                                            data={chartData}
                                            chartType={chartType}
                                            symbol={selectedMarket.symbol}
                                            indicators={activeIndicators}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white min-h-[350px]">
                            <div className="text-center text-gray-500 p-4">
                                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-10" />
                                <p className="text-lg font-semibold mb-2">No Market Selected</p>
                                <p className="text-sm">Choose a market to view charts</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Script Runner Toggle Button - Always visible */}
            {/*<div className="w-full min-h-[6px] bg-white border-t border-gray-200 px-1.5 py-1 flex items-center justify-start gap-1 md:hidden">*/}
            {/*    {selectedMarket && (*/}
            {/*        <Button*/}
            {/*            onClick={handleScriptRunnerToggle}*/}
            {/*            variant="outline"*/}
            {/*            size="sm"*/}
            {/*            className="bg-white/90 backdrop-blur-md border-gray-300 hover:bg-white hover:border-gray-400 shadow-sm transition-all duration-200 text-[11px] font-medium h-7 px-2"*/}
            {/*        >*/}
            {/*            <Terminal className="h-3 w-3 mr-1" />*/}
            {/*            Script Runner*/}
            {/*        </Button>*/}
            {/*    )}*/}
            {/*</div>*/}

            {/* Desktop Script Runner Toggle */}
            <div className="hidden md:block w-full min-h-[4px] bg-white border-t border-gray-200 px-1.5 py-[2px]">
                {selectedMarket && (
                    <Button
                        onClick={handleScriptRunnerToggle}
                        variant="outline"
                        size="sm"
                        className="bg-white/90 backdrop-blur-md border-gray-300 hover:bg-white hover:border-gray-400 shadow-sm transition-all duration-200 text-[11px] font-medium h-6 px-1"
                    >
                        <Terminal className="h-3 w-3 mr-1" />
                        Script Runner
                    </Button>
                )}
            </div>

            {/* Script Runner Panel - Now positioned above bottom navigation */}
            {isScriptRunnerOpen && selectedMarket && (
                <div
                    className={`fixed left-0 right-0 bg-white border-t border-gray-200 shadow-2xl transition-all duration-300 ease-out z-40
            ${isScriptRunnerOpen ? 'bottom-14 md:bottom-0 md:left-16' : 'bottom-[-100%]'}`}
                    style={{ height: '40vh' }} // Fixed height as percentage of viewport
                >
                    <div className="h-full flex flex-col p-3 md:p-4 overflow-hidden">
                        <div className="flex justify-between items-center mb-2 md:mb-4 border-b border-gray-200 pb-2">
                            <h3 className="text-sm md:text-lg font-semibold flex items-center">
                                <Terminal className="h-4 w-4 md:h-5 md:w-5 mr-2 text-blue-600" />
                                Script Runner
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleScriptRunnerToggle}
                                className="h-6 w-6 md:h-8 md:w-8 p-0"
                            >
                                <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded border p-2 mb-2 md:mb-3 overflow-y-auto">
              <textarea
                  value={scriptCode}
                  onChange={(e) => setScriptCode(e.target.value)}
                  placeholder="Enter your script code here..."
                  className="w-full h-full resize-none outline-none bg-transparent text-xs md:text-sm font-mono text-gray-800"
                  rows={6}
              />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button size="sm" className="flex-1 text-xs md:text-sm" onClick={handleNotImplemented}>
                                Run Script
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={handleNotImplemented}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ChartSettingsModal isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} chartType={chartType} setChartType={setChartType} timeInterval={timeInterval} setTimeInterval={setTimeInterval} />
            <IndicatorsModal isOpen={isIndicatorsOpen} setIsOpen={setIsIndicatorsOpen} activeIndicators={activeIndicators} setActiveIndicators={setActiveIndicators} chartData={chartData} />
            <DrawingToolsModal isOpen={isDrawingToolsOpen} setIsOpen={setIsDrawingToolsOpen} />
        </div>
    );
};

ChartArea.displayName = 'ChartArea';

export default ChartArea;