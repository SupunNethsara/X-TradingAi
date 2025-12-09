import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import ChartArea from '@/components/ChartArea';
import TradePanel from '@/components/TradePanel';
import ScriptRunnerPanel from '@/components/ScriptRunnerPanel';
import { DerivProvider, useDerivAPI } from '@/contexts/DerivContext';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import FloatingTradeTypeSelector from '@/components/FloatingTradeTypeSelector';
import MobileTradeTypeCarousel, { getActionButtonLabels, getTradeTypeConfig } from '@/components/MobileTradeTypeCarousel';
import TradeExecution from '@/components/TradeExecution'; // Import TradeExecution
import { BarChart3, User, ListFilter, Bell, ChevronUp, ChevronDown, Terminal, Target, Repeat, Waves, Zap, Layers, TrendingUp, FileText, ArrowUpDown, ChevronsUpDown, ChevronRight, X, Settings } from 'lucide-react';
import MobileMarketSelector from "@/components/MobileMarketSelector.jsx";
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const AppContent = () => {
    const { activeSymbols, tickData, api } = useDerivAPI();
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [isScriptRunnerOpen, setIsScriptRunnerOpen] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [chartType, setChartType] = useState('area');
    const [timeInterval, setTimeInterval] = useState('1t');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [tradeType, setTradeType] = useState('rise_fall');
    const [isTradeTypeSelectorOpen, setIsTradeTypeSelectorOpen] = useState(false);
    const [isMarketSelectorOpen, setIsMarketSelectorOpen] = useState(false);
    const [stake, setStake] = useState(10);
    const [durationValue, setDurationValue] = useState(5);
    const [callProposal, setCallProposal] = useState(null);
    const [putProposal, setPutProposal] = useState(null);

    // New state for mobile trade panel
    const [isMobileTradePanelOpen, setIsMobileTradePanelOpen] = useState(false);

    const { toast } = useToast();

    const [aiPrediction, setAiPrediction] = useState({
        direction: 'RISE',
        confidence: 75,
        reason: 'Based on recent momentum and RSI indicators.',
        lastUpdated: new Date().toISOString(),
        digitPrediction: 5,
        digitConfidence: 0.8
    });

    useEffect(() => {
        if (!selectedMarket && activeSymbols.length > 0) {
            const defaultMarket = activeSymbols.find(s => s.symbol === 'R_100') ||
                activeSymbols.find(s => s.market === 'synthetic_index') ||
                activeSymbols[0];
            setSelectedMarket(defaultMarket);
        }
    }, [activeSymbols, selectedMarket]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAiPrediction(prev => ({
                ...prev,
                confidence: Math.floor(Math.random() * 50) + 50,
                direction: Math.random() > 0.5 ? 'RISE' : 'FALL',
                digitPrediction: Math.floor(Math.random() * 10),
                digitConfidence: Math.random() * 0.5 + 0.5,
                lastUpdated: new Date().toISOString()
            }));
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const openAuthModal = (mode) => {
        setAuthMode(mode);
        setIsAuthModalOpen(true);
    };

    const handleSelectTradeType = (type) => {
        setTradeType(type);
        setIsMobileTradePanelOpen(true);
    };

    const lastTick = selectedMarket ? tickData?.[selectedMarket.symbol] : null;

    useEffect(() => {
        const handleOpenMarketSelector = () => {
            setIsMarketSelectorOpen(true);
        };

        window.addEventListener('openMobileMarketSelector', handleOpenMarketSelector);

        return () => {
            window.removeEventListener('openMobileMarketSelector', handleOpenMarketSelector);
        };
    }, []);

    useEffect(() => {
        const fetchProposals = async () => {
            if (!selectedMarket?.symbol || stake <= 0 || !api) {
                setCallProposal({
                    payout: 19.50 + Math.random() * 2,
                    id: 'default_call',
                    ask_price: 10
                });
                setPutProposal({
                    payout: 18.75 + Math.random() * 2,
                    id: 'default_put',
                    ask_price: 10
                });
                return;
            }

            const baseParams = (contractType) => ({
                proposal: 1,
                amount: stake,
                basis: 'stake',
                contract_type: contractType,
                currency: 'USD',
                symbol: selectedMarket.symbol,
                duration: durationValue,
                duration_unit: 't'
            });

            try {
                const [callRes, putRes] = await Promise.all([
                    api.send(baseParams('CALL')),
                    api.send(baseParams('PUT'))
                ]);

                if (callRes.proposal) {
                    setCallProposal({
                        ...callRes.proposal,
                        payout: callRes.proposal.payout || 19.50
                    });
                }
                if (putRes.proposal) {
                    setPutProposal({
                        ...putRes.proposal,
                        payout: putRes.proposal.payout || 18.75
                    });
                }
            } catch (error) {
                console.error('Error fetching mobile proposals:', error);
                setCallProposal({
                    payout: 19.50 + Math.random() * 2,
                    id: 'default_call_' + Date.now(),
                    ask_price: 10
                });
                setPutProposal({
                    payout: 18.75 + Math.random() * 2,
                    id: 'default_put_' + Date.now(),
                    ask_price: 10
                });
            }
        };

        fetchProposals();

        const interval = setInterval(() => {
            fetchProposals();
        }, 10000);

        return () => clearInterval(interval);
    }, [stake, durationValue, selectedMarket?.symbol, api, tradeType]);

    const handlePurchase = async (actionType, proposal) => {
        // if (!proposal || !proposal.id || proposal.id.includes('default')) {
        //     toast({
        //         title: 'Demo Mode',
        //         description: `In demo mode: Would purchase ${actionType} with stake $${stake}`,
        //     });
        //     return;
        // }

        const buttonLabels = getActionButtonLabels(tradeType);

        toast({
            title: `Purchased ${buttonLabels.positive === actionType ? buttonLabels.positive : buttonLabels.negative}`,
            description: `Stake: $${stake} for ${durationValue} ticks`,
        });

        try {
            let contractType;
            switch(tradeType) {
                case 'rise_fall':
                    contractType = actionType === 'RISE' ? 'CALL' : 'PUT';
                    break;
                case 'higher_lower':
                    contractType = actionType === 'HIGHER' ? 'CALL' : 'PUT';
                    break;
                case 'touch_no_touch':
                    contractType = actionType === 'TOUCH' ? 'ONETOUCH' : 'NOTOUCH';
                    break;
                case 'ends_in_out':
                    contractType = actionType === 'ENDS_IN' ? 'EXPIRYRANGE' : 'EXPIRYMISS';
                    break;
                case 'stays_in_goes_out':
                    contractType = actionType === 'STAYS_IN' ? 'RANGE' : 'UPORDOWN';
                    break;
                case 'matches_differs':
                    contractType = actionType === 'MATCHES' ? 'DIGITMATCH' : 'DIGITDIFF';
                    break;
                case 'even_odd':
                    contractType = actionType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD';
                    break;
                case 'over_under':
                    contractType = actionType === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER';
                    break;
                case 'accumulators':
                    contractType = 'ACCU';
                    break;
                case 'multipliers':
                    contractType = actionType === 'UP' ? 'MULTUP' : 'MULTDOWN';
                    break;
                case 'call_put':
                    contractType = actionType === 'CALL' ? 'CALL' : 'PUT';
                    break;
                case 'turbos':
                    contractType = actionType === 'UP' ? 'TURBOSLONG' : 'TURBOSSHORT';
                    break;
                default:
                    contractType = actionType === 'RISE' ? 'CALL' : 'PUT';
            }

            const response = await api.send({
                buy: proposal.id,
                price: proposal.ask_price,
            });

            if (response.buy) {
                toast({
                    title: `Purchase Successful`,
                    description: `Contract ID: ${response.buy.contract_id}`,
                });
            }
        } catch (error) {
            console.error('Error purchasing contract:', error);
            toast({
                title: 'Purchase Failed',
                description: 'Failed to purchase contract. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const getPayoutDisplay = (proposal) => {
        if (!proposal || stake <= 0) {
            return tradeType === 'accumulators' ? '185.00' : '195.00';
        }
        const profit = proposal.payout || 19.50;
        return ((profit / stake) * 100).toFixed(2);
    };

    const getPercentage = (proposal) => {
        if (!proposal || stake <= 0) {
            return tradeType === 'accumulators' ? '185.00' : '195.00';
        }
        const profit = proposal.payout || 19.50;
        return ((profit / stake) * 100).toFixed(2);
    };

    const getActionButtonsConfig = () => {
        const buttonLabels = getActionButtonLabels(tradeType);
        const colorClass = getActionButtonLabels(tradeType).color;

        let positiveIcon, negativeIcon;

        switch(tradeType) {
            case 'rise_fall':
                positiveIcon = <ChevronUp className="h-4 w-4" />;
                negativeIcon = <ChevronDown className="h-4 w-4" />;
                break;
            case 'higher_lower':
                positiveIcon = <ChevronUp className="h-4 w-4" />;
                negativeIcon = <ChevronDown className="h-4 w-4" />;
                break;
            case 'touch_no_touch':
                positiveIcon = <Target className="h-4 w-4" />;
                negativeIcon = <span className="text-lg font-bold">✕</span>;
                break;
            case 'ends_in_out':
                positiveIcon = <Repeat className="h-4 w-4" />;
                negativeIcon = <Repeat className="h-4 w-4 rotate-45" />;
                break;
            case 'stays_in_goes_out':
                positiveIcon = <Waves className="h-4 w-4" />;
                negativeIcon = <Waves className="h-4 w-4 rotate-90" />;
                break;
            case 'matches_differs':
                positiveIcon = <span className="text-lg font-bold">✓</span>;
                negativeIcon = <span className="text-lg font-bold">≠</span>;
                break;
            case 'even_odd':
                positiveIcon = <span className="text-lg font-bold">●</span>;
                negativeIcon = <span className="text-lg font-bold">○</span>;
                break;
            case 'over_under':
                positiveIcon = <ChevronUp className="h-4 w-4" />;
                negativeIcon = <ChevronDown className="h-4 w-4" />;
                break;
            case 'accumulators':
                positiveIcon = <Layers className="h-4 w-4" />;
                negativeIcon = null;
                break;
            case 'multipliers':
                positiveIcon = <TrendingUp className="h-4 w-4" />;
                negativeIcon = <TrendingUp className="h-4 w-4 rotate-180" />;
                break;
            case 'call_put':
                positiveIcon = <ArrowUpDown className="h-4 w-4" />;
                negativeIcon = <ArrowUpDown className="h-4 w-4 rotate-180" />;
                break;
            case 'turbos':
                positiveIcon = <Zap className="h-4 w-4" />;
                negativeIcon = <Zap className="h-4 w-4 rotate-180" />;
                break;
            default:
                positiveIcon = <ChevronUp className="h-4 w-4" />;
                negativeIcon = <ChevronDown className="h-4 w-4" />;
        }

        return {
            positive: {
                label: buttonLabels.positive,
                icon: positiveIcon,
                color: colorClass || 'bg-green-500 hover:bg-green-600',
                action: tradeType === 'accumulators' ? 'BUY' :
                    tradeType === 'rise_fall' ? 'RISE' :
                        tradeType === 'higher_lower' ? 'HIGHER' :
                            tradeType === 'touch_no_touch' ? 'TOUCH' :
                                tradeType === 'ends_in_out' ? 'ENDS_IN' :
                                    tradeType === 'stays_in_goes_out' ? 'STAYS_IN' :
                                        tradeType === 'matches_differs' ? 'MATCHES' :
                                            tradeType === 'even_odd' ? 'EVEN' :
                                                tradeType === 'over_under' ? 'OVER' :
                                                    tradeType === 'multipliers' ? 'UP' :
                                                        tradeType === 'call_put' ? 'CALL' :
                                                            tradeType === 'turbos' ? 'UP' : 'RISE'
            },
            negative: buttonLabels.negative ? {
                label: buttonLabels.negative,
                icon: negativeIcon,
                color: tradeType === 'accumulators' ? colorClass : 'bg-red-500 hover:bg-red-600',
                action: tradeType === 'rise_fall' ? 'FALL' :
                    tradeType === 'higher_lower' ? 'LOWER' :
                        tradeType === 'touch_no_touch' ? 'NO_TOUCH' :
                            tradeType === 'ends_in_out' ? 'ENDS_OUT' :
                                tradeType === 'stays_in_goes_out' ? 'GOES_OUT' :
                                    tradeType === 'matches_differs' ? 'DIFFERS' :
                                        tradeType === 'even_odd' ? 'ODD' :
                                            tradeType === 'over_under' ? 'UNDER' :
                                                tradeType === 'multipliers' ? 'DOWN' :
                                                    tradeType === 'call_put'  ? 'PUT' :
                                                        tradeType === 'turbos' ? 'DOWN' : 'FALL'
            } : null
        };
    };

    const actionButtons = getActionButtonsConfig();
    const tradeConfig = getTradeTypeConfig(tradeType);

    return (
        <>
            <Helmet>
                <title>X TradingAI - Advanced Trading Platform</title>
                <meta name="description" content="Professional trading platform with AI predictions, auto-trading, and real-time market analysis powered by Deriv API" />
            </Helmet>
            <div className="h-screen w-screen bg-white text-black flex flex-col overflow-hidden">
                <Header onLogin={() => {}} onSignup={() => {}} />

                <div className="md:hidden border-b border-gray-100 shadow-sm">
                    <MobileTradeTypeCarousel
                        selectedType={tradeType}
                        onSelectType={handleSelectTradeType}
                        className="h-13"
                    />
                </div>

                <main className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <ChartArea
                            className="flex-1"
                            selectedMarket={selectedMarket}
                            setSelectedMarket={setSelectedMarket}
                            chartData={chartData}
                            setChartData={setChartData}
                            chartType={chartType}
                            setChartType={setChartType}
                            timeInterval={timeInterval}
                            setTimeInterval={setTimeInterval}
                            isScriptRunnerOpen={isScriptRunnerOpen}
                            setIsScriptRunnerOpen={setIsScriptRunnerOpen}
                            tradeType={tradeType}
                            onOpenTradeTypeSelector={() => setIsTradeTypeSelectorOpen(true)}
                        />
                    </div>

                    <div className="hidden md:flex w-auto border-l border-gray-200">
                        <TradePanel
                            selectedMarket={selectedMarket}
                            tradeType={tradeType}
                            setTradeType={setTradeType}
                            aiPrediction={aiPrediction}
                            onOpenTradeTypeSelector={() => setIsTradeTypeSelectorOpen(true)}
                        />
                    </div>
                </main>

                <MobileMarketSelector
                    isOpen={isMarketSelectorOpen}
                    onClose={() => setIsMarketSelectorOpen(false)}
                    selectedMarket={selectedMarket}
                    setSelectedMarket={setSelectedMarket}
                />

                <div className="hidden md:block">
                    <FloatingTradeTypeSelector
                        isOpen={isTradeTypeSelectorOpen}
                        onClose={() => setIsTradeTypeSelectorOpen(false)}
                        selectedType={tradeType}
                        onSelectType={handleSelectTradeType}
                        selectedMarket={selectedMarket}
                        aiPrediction={aiPrediction}
                    />
                </div>

                <AnimatePresence>
                    {isMobileTradePanelOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileTradePanelOpen(false)}
                            className="fixed inset-0 bg-black/20 z-40 md:hidden"
                        />
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {isMobileTradePanelOpen && (
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 md:hidden flex flex-col bg-white rounded-t-2xl shadow-2xl"
                            style={{ maxHeight: '85vh' }}
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-2xl">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${tradeConfig.color === 'blue' ? 'bg-blue-50' :
                                        tradeConfig.color === 'purple' ? 'bg-purple-50' :
                                            tradeConfig.color === 'green' ? 'bg-green-50' :
                                                tradeConfig.color === 'orange' ? 'bg-orange-50' : 'bg-red-50'}`}>
                                        {tradeType === 'rise_fall' ? <ArrowUpDown className="h-5 w-5" /> :
                                            tradeType === 'higher_lower' ? <ChevronsUpDown className="h-5 w-5" /> :
                                                tradeType === 'touch_no_touch' ? <Target className="h-5 w-5" /> :
                                                    tradeType === 'ends_in_out' ? <Repeat className="h-5 w-5" /> :
                                                        tradeType === 'stays_in_goes_out' ? <Waves className="h-5 w-5" /> :
                                                            tradeType === 'matches_differs' ? <Zap className="h-5 w-5" /> :
                                                                tradeType === 'even_odd' ? <ArrowUpDown className="h-5 w-5" /> :
                                                                    tradeType === 'over_under' ? <ChevronsUpDown className="h-5 w-5" /> :
                                                                        tradeType === 'accumulators' ? <Layers className="h-5 w-5" /> :
                                                                            tradeType === 'multipliers' ? <TrendingUp className="h-5 w-5" /> :
                                                                                tradeType === 'call_put' ? <FileText className="h-5 w-5" /> :
                                                                                    <Zap className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{tradeConfig.label}</h3>
                                        <p className="text-xs text-gray-500">{tradeConfig.category}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileTradePanelOpen(false)}
                                    className="p-2 rounded-full hover:bg-gray-100"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <TradeExecution
                                    tradeType={tradeType}
                                    selectedMarket={selectedMarket}
                                    aiPrediction={aiPrediction}
                                    digitPrediction={aiPrediction.digitPrediction}
                                    digitConfidence={aiPrediction.digitConfidence}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-[#87b52a] border-t border-green-200 flex flex-col z-30 shadow-lg transition-transform duration-300 ${
                    isMobileTradePanelOpen ? 'translate-y-full' : ''
                }`}>
                    <button
                        onClick={() => setIsMobileTradePanelOpen(true)}
                        className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#87b52a] to-[#6a9c1f] border-none rounded-t-lg px-5 py-1.5 flex items-center justify-center shadow-lg shadow-green-900/30 hover:shadow-green-900/50 transition-all duration-300 z-50"
                    >
                        <ChevronUp className="h-4 w-4 text-white mr-1.5 animate-bounce" />
                        <span className="text-xs font-semibold text-white">TRADE SETTINGS</span>
                    </button>

                    <div className="flex px-2 py-2 border-b border-gray-100 bg-gray-50 gap-2">
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 rounded-md gap-2 flex-1 min-w-0">
                            <div className="hidden sm:flex-1">
                                <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                                <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(callProposal)}%</p>
                            </div>
                            <Button
                                className={`${actionButtons.positive.color} w-full sm:w-32 h-10 justify-center transition-all duration-300`}
                                onClick={() => handlePurchase(actionButtons.positive.action, callProposal)}
                            >
                                <span className="mr-1 sm:mr-2 flex items-center">
                                    {actionButtons.positive.icon}
                                </span>
                                <span className="text-xs sm:text-sm font-medium">{actionButtons.positive.label}</span>
                                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(callProposal)}%</span>
                            </Button>
                        </div>

                        {actionButtons.negative && (
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 rounded-md gap-2 flex-1 min-w-0">
                                <div className="hidden sm:flex-1">
                                    <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                                    <p className="font-semibold text-red-600 text-sm sm:ml-2">{getPayoutDisplay(putProposal)}%</p>
                                </div>
                                <Button
                                    className={`${actionButtons.negative.color} w-full sm:w-32 h-10 justify-center transition-all duration-300`}
                                    onClick={() => handlePurchase(actionButtons.negative.action, putProposal)}
                                >
                                    <span className="mr-1 sm:mr-2 flex items-center">
                                        {actionButtons.negative.icon}
                                    </span>
                                    <span className="text-xs sm:text-sm font-medium">{actionButtons.negative.label}</span>
                                    <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(putProposal)}%</span>
                                </Button>
                            </div>
                        )}

                        {tradeType === 'accumulators' && !actionButtons.negative && (
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 rounded-md gap-2 flex-1 min-w-0">
                                <div className="hidden sm:flex-1">
                                    <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                                    <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(callProposal)}%</p>
                                </div>
                                <Button
                                    className={`${actionButtons.positive.color} w-full sm:w-64 h-10 justify-center transition-all duration-300`}
                                    onClick={() => handlePurchase(actionButtons.positive.action, callProposal)}
                                >
                                    <span className="mr-1 sm:mr-2 flex items-center">
                                        {actionButtons.positive.icon}
                                    </span>
                                    <span className="text-xs sm:text-sm font-medium">{actionButtons.positive.label} Accumulator</span>
                                    <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(callProposal)}%</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Script Runner Button */}
                    <div className="fixed bottom-16 left-4 z-50">
                        <button
                            onClick={() => setIsScriptRunnerOpen(!isScriptRunnerOpen)}
                            className="bg-gray-800 hover:bg-gray-900 text-white rounded-full p-2 shadow-lg transition-colors"
                            title="Script Runner"
                        >
                            <Terminal className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Bottom Navigation Icons */}
                    <div className="flex justify-around items-center py-0 bg-white">
                        <button
                            onClick={() => setIsMobileTradePanelOpen(true)}
                            className={`flex flex-col items-center py-0 px-2 flex-1 max-w-[20%] ${
                                isMobileTradePanelOpen ? 'text-blue-600' : 'text-gray-600'
                            }`}
                        >
                            <div className={`p-1.5 rounded-lg mb-0.5 ${
                                isMobileTradePanelOpen ? 'bg-blue-50' : 'bg-gray-50'
                            }`}>
                                <BarChart3 className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-medium">Trade</span>
                        </button>
                        {/*<button*/}
                        {/*    onClick={() => setIsMarketSelectorOpen(true)}*/}
                        {/*    className="flex flex-col items-center py-1 px-2 flex-1 max-w-[20%] text-gray-600"*/}
                        {/*>*/}
                        {/*    <div className="p-1.5 rounded-lg bg-gray-50 mb-0.5">*/}
                        {/*        <ListFilter className="h-4 w-4" />*/}
                        {/*    </div>*/}
                        {/*    <span className="text-[10px] font-medium">Markets</span>*/}
                        {/*</button>*/}

                        <button className="flex flex-col items-center py-1 px-2 flex-1 max-w-[20%] text-gray-600">
                            <div className="p-1.5 rounded-lg bg-gray-50 mb-0.5">
                                <User className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-medium">Account</span>
                        </button>

                    </div>
                </div>

                <ScriptRunnerPanel
                    isOpen={isScriptRunnerOpen}
                    setIsOpen={setIsScriptRunnerOpen}
                    chartData={chartData}
                    selectedMarket={selectedMarket}
                    lastTick={lastTick}
                    aiPrediction={aiPrediction}
                    tradeType={tradeType}
                />

                <AuthModal
                    isOpen={isAuthModalOpen}
                    setIsOpen={setIsAuthModalOpen}
                    mode={authMode}
                    setMode={setAuthMode}
                />

                <Toaster />
            </div>
        </>
    );
}

function App() {
    return (
        <React.StrictMode>
            <DerivProvider>
                <AppContent />
            </DerivProvider>
        </React.StrictMode>
    );
}

export default App;