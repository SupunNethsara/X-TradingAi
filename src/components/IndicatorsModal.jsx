import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Settings, Search, ChevronRight } from 'lucide-react';
import {
    CheckCircle, Zap, TrendingUp, AlertTriangle, Layers, MoreHorizontal,
    BarChart3, Activity, Percent, Shuffle, TrendingDown, Minimize2,
    ArrowUpDown, DollarSign, Target, CornerDownLeft, LineChart,
    Square, Palette, Mouse, Waves, GitBranch
} from 'lucide-react';

const indicatorOptions = [
    { name: 'Awesome Oscillator', type: 'AO', category: 'momentum', location: 'pane', icon: BarChart3, defaultParams: { fastPeriod: 5, slowPeriod: 34, color: '#2962FF' } },
    { name: 'Detrended Price Oscillator', type: 'DPO', category: 'momentum', location: 'pane', icon: TrendingDown, defaultParams: { period: 20, color: '#FF6D00' } },
    { name: 'MACD', type: 'MACD', category: 'momentum', location: 'pane', icon: Activity, defaultParams: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, macdColor: '#2962FF', signalColor: '#FF6D00' } },
    { name: 'Price Rate of Change', type: 'ROC', category: 'momentum', location: 'pane', icon: Percent, defaultParams: { period: 12, color: '#00C853' } },
    { name: 'Relative Strength Index (RSI)', type: 'RSI', category: 'momentum', location: 'pane', icon: TrendingUp, defaultParams: { period: 14, color: '#FF6D00' } },
    { name: 'Stochastic Oscillator', type: 'STOCH', category: 'momentum', location: 'pane', icon: Shuffle, defaultParams: { kPeriod: 14, kSmoothing: 3, dPeriod: 3, color: '#2962FF' } },
    { name: 'Stochastic Momentum Index', type: 'SMI', category: 'momentum', location: 'pane', icon: TrendingUp, defaultParams: { qPeriod: 10, rPeriod: 10, sPeriod: 3, color: '#00C853' } },
    { name: "Williams Percent Range", type: 'WILLIAMS', category: 'momentum', location: 'pane', icon: Minimize2, defaultParams: { period: 14, color: '#FF6D00' } },
    { name: 'Aroon', type: 'AROON', category: 'trend', location: 'pane', icon: ArrowUpDown, defaultParams: { period: 14, color: '#2962FF' } },
    { name: 'ADX/DMI', type: 'ADX', category: 'trend', location: 'pane', icon: TrendingUp, defaultParams: { period: 14, adxColor: '#2962FF', plusDIColor: '#00C853', minusDIColor: '#FF6D00' } },
    { name: 'Commodity Channel Index', type: 'CCI', category: 'trend', location: 'pane', icon: DollarSign, defaultParams: { period: 20, color: '#FF6D00' } },
    { name: 'Ichimoku Clouds', type: 'ICHIMOKU', category: 'trend', location: 'overlay', icon: Waves, defaultParams: { conversionPeriod: 9, basePeriod: 26, laggingSpanPeriod: 52, displacement: 26, color: '#2962FF' } },
    { name: 'Parabolic SAR', type: 'SAR', category: 'trend', location: 'overlay', icon: Target, defaultParams: { acceleration: 0.02, maximum: 0.2, color: '#FF6D00' } },
    { name: 'Zig Zag', type: 'ZIGZAG', category: 'trend', location: 'overlay', icon: CornerDownLeft, defaultParams: { deviation: 5, signalColor: '#2962FF' } },
    { name: 'Moving Average (MA)', type: 'SMA', category: 'moving_averages', location: 'overlay', icon: LineChart, defaultParams: { period: 14, color: '#ff6d00' } },
    { name: 'Moving Average Envelope', type: 'ENVELOPE', category: 'moving_averages', location: 'overlay', icon: Square, defaultParams: { period: 20, percent: 2, color: '#00C853' } },
    { name: 'Rainbow Moving Average', type: 'RAINBOW', category: 'moving_averages', location: 'overlay', icon: Palette, defaultParams: { step: 2, source: 'close', periods: [10,12,14,16,18,20,22,24,26,28], colors: ['#FF0000','#FF6D00','#FFD600','#00C853','#2962FF','#9C27B0','#607D8B','#795548','#E91E63','#4CAF50'], types: ['SMA','SMA','SMA','SMA','SMA','SMA','SMA','SMA','SMA','SMA'] } },
    { name: 'Bollinger Bands', type: 'BBANDS', category: 'volatility', location: 'overlay', icon: Layers, defaultParams: { period: 20, stdDev: 2, color: '#2962FF' } },
    { name: 'Donchian Channel', type: 'DONCHIAN', category: 'volatility', location: 'overlay', icon: GitBranch, defaultParams: { period: 20, color: '#FF6D00' } },
    { name: 'Alligator', type: 'ALLIGATOR', category: 'others', location: 'overlay', icon: Mouse, defaultParams: { jawPeriod: 13, jawShift: 8, teethPeriod: 8, teethShift: 5, lipsPeriod: 5, lipsShift: 3, color: '#2962FF' } },
    { name: 'Fractal Chaos Band', type: 'FC_BANDS', category: 'others', location: 'overlay', icon: Waves, defaultParams: { period: 5, color: '#00C853' } },
    { name: 'MACD RE', type: 'MACD_RE', category: 'xtradingai', location: 'pane', icon: Activity, defaultParams: { shortLen: 12, longLen: 26, signalLen: 9, maType: 'VAR' } },
    { name: 'Heiken Ashi Bas', type: 'heikenAshiBas', category: 'xtradingai', location: 'overlay', icon: TrendingUp, isSpecial: true },
    { name: 'Gainz Algo V2 Alpha', type: 'GAINZ_ALGO', category: 'xtradingai', location: 'overlay', icon: DollarSign, defaultParams: { candle_stability_index_param: 0.5, rsi_index_param: 30, candle_delta_length_param: 5, disable_repeating_signals_param: true, tp_sl_multi: 1.5, rrr: '1:2', show_tp_sl: true, tp_sl_prec: 0.01, buy_label_color: '#00C853', sell_label_color: '#FF6D00' } }
];

const categories = [
    { id: 'active', label: 'Active', icon: CheckCircle },
    { id: 'momentum', label: 'Momentum', icon: Zap },
    { id: 'trend', label: 'Trend', icon: TrendingUp },
    { id: 'volatility', label: 'Volatility', icon: AlertTriangle },
    { id: 'moving_averages', label: 'Moving averages', icon: Layers },
    { id: 'others', label: 'Others', icon: MoreHorizontal },
    { id: 'xtradingai', label: 'XTradingAI', icon: Zap }
];

const IndicatorSettings = ({ indicator, updateIndicator }) => {
    const { type } = indicator;
    switch (type) {
        case 'AO':
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Fast</Label>
                        <Input type="number" value={indicator.fastPeriod || 5} onChange={(e) => updateIndicator(indicator.id, 'fastPeriod', parseInt(e.target.value))} className="h-8 w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Slow</Label>
                        <Input type="number" value={indicator.slowPeriod || 34} onChange={(e) => updateIndicator(indicator.id, 'slowPeriod', parseInt(e.target.value))} className="h-8 w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Color</Label>
                        <Input type="color" value={indicator.color || '#2962FF'} onChange={(e) => updateIndicator(indicator.id, 'color', e.target.value)} className="h-8 w-16 p-0.5" />
                    </div>
                </div>
            );
        case 'RSI':
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Period</Label>
                        <Input type="number" value={indicator.period || 14} onChange={(e) => updateIndicator(indicator.id, 'period', parseInt(e.target.value))} className="h-8 w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Color</Label>
                        <Input type="color" value={indicator.color || '#FF6D00'} onChange={(e) => updateIndicator(indicator.id, 'color', e.target.value)} className="h-8 w-16 p-0.5" />
                    </div>
                </div>
            );
        case 'BBANDS':
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Period</Label>
                        <Input type="number" value={indicator.period || 20} onChange={(e) => updateIndicator(indicator.id, 'period', parseInt(e.target.value))} className="h-8 w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Std Dev</Label>
                        <Input type="number" step="0.1" value={indicator.stdDev || 2} onChange={(e) => updateIndicator(indicator.id, 'stdDev', parseFloat(e.target.value))} className="h-8 w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Color</Label>
                        <Input type="color" value={indicator.color || '#2962FF'} onChange={(e) => updateIndicator(indicator.id, 'color', e.target.value)} className="h-8 w-16 p-0.5" />
                    </div>
                </div>
            );
        default:
            return <p className="text-xs text-gray-500">Settings for {type} not yet implemented.</p>;
    }
};

const IndicatorsModal = ({ isOpen, setIsOpen, activeIndicators, setActiveIndicators }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('active');
    const [showSettingsFor, setShowSettingsFor] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [viewMode, setViewMode] = useState('categories');

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setViewMode('categories');
            else {
                setViewMode('content');
                setSelectedCategory('active');
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (isMobile) setViewMode('categories');
            else setViewMode('content');
        }
    }, [isOpen, isMobile]);

    const addIndicator = (indicator) => {
        let newInd;

        if (indicator.isSpecial && indicator.type === 'heikenAshiBas') {
            newInd = {
                id: 'HeikenAshiBas',
                type: 'heikenAshiBas',
                location: 'overlay',
                options: { useTrendFilter: true, showSignals: true, showEma: false }
            };
        } else {
            newInd = {
                ...indicator.defaultParams,
                type: indicator.type,
                name: indicator.name,
                id: Date.now().toString(),
                location: indicator.location,
                enabled: true
            };
        }

        setActiveIndicators(prev => [...prev, newInd]);

        if (isMobile) {
            setSelectedCategory('active');
            setViewMode('content');
        }
    };

    const removeIndicator = (id) => {
        setActiveIndicators(prev => prev.filter(ind => ind.id !== id));
        if (showSettingsFor === id) setShowSettingsFor(null);
    };

    const updateIndicator = (id, param, value) => {
        setActiveIndicators(prev => prev.map(ind => 
            ind.id === id ? { ...ind, [param]: value } : ind
        ));
    };

    const filteredActive = activeIndicators.filter(ind =>
        (ind.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ind.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredOptions = indicatorOptions.filter(opt =>
        opt.category === selectedCategory &&
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCategoryCount = (catId) => {
        if (catId === 'active') return activeIndicators.length;
        return indicatorOptions.filter(opt => opt.category === catId).length;
    };

    const handleCategorySelect = (categoryId) => {
        setSelectedCategory(categoryId);
        if (isMobile) setViewMode('content');
    };

    const handleBackToCategories = () => {
        setViewMode('categories');
        setSearchTerm('');
    };

    const currentCategory = categories.find(cat => cat.id === selectedCategory);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] max-w-6xl h-[90vh] sm:h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="flex-row items-center justify-between border-b pb-3 px-4 pt-4">
                    <div className="flex items-center gap-2">
                        {isMobile && viewMode === 'content' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBackToCategories}>
                                <ChevronRight className="h-4 w-4 rotate-180" />
                            </Button>
                        )}
                        <DialogTitle className="text-base sm:text-lg">
                            {isMobile ? (viewMode === 'categories' ? 'Indicator Categories' : currentCategory?.label || 'Indicators') : 'Indicators'}
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isMobile && (
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input placeholder="Search indicators..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-40 sm:w-48 h-8 sm:h-9 text-sm" />
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {isMobile && viewMode === 'content' && (
                    <div className="px-4 py-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder={`Search ${currentCategory?.label?.toLowerCase() || 'indicators'}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full h-9 text-sm" />
                        </div>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden">
                    {!isMobile && (
                        <div className="hidden md:block w-48 bg-gray-50 border-r p-2 space-y-1 overflow-y-auto">
                            {categories.map(cat => {
                                const count = getCategoryCount(cat.id);
                                return (
                                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                                        className={`w-full flex items-center p-2 rounded-md text-left transition-colors ${selectedCategory === cat.id ? 'bg-white border border-gray-200 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}>
                                        <cat.icon className={`h-4 w-4 mr-2 flex-shrink-0 ${selectedCategory === cat.id ? 'text-blue-600' : 'text-gray-500'}`} />
                                        <span className="text-sm font-medium flex-1">{cat.label}</span>
                                        {count > 0 && <span className={`text-xs rounded-full px-2 py-0.5 ${selectedCategory === cat.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>{count}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {isMobile && viewMode === 'categories' && (
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-2">
                                {categories.map(cat => {
                                    const count = getCategoryCount(cat.id);
                                    return (
                                        <button key={cat.id} onClick={() => handleCategorySelect(cat.id)}
                                            className="w-full flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-left">
                                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3">
                                                <cat.icon className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{cat.label}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {cat.id === 'active' ? `${count} active indicator${count !== 1 ? 's' : ''}` : `${count} indicator${count !== 1 ? 's' : ''}`}
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}

                    {(viewMode === 'content' || !isMobile) && (
                        <ScrollArea className="flex-1 p-3 sm:p-4">
                            {isMobile && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                            {currentCategory?.icon && React.createElement(currentCategory.icon, { className: "h-5 w-5 text-blue-600" })}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-sm">{currentCategory?.label || 'Indicators'}</h3>
                                            <p className="text-xs text-gray-600">
                                                {selectedCategory === 'active' ? `${activeIndicators.length} active indicator${activeIndicators.length !== 1 ? 's' : ''}` : `${getCategoryCount(selectedCategory)} indicator${getCategoryCount(selectedCategory) !== 1 ? 's' : ''} available`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedCategory === 'active' ? (
                                filteredActive.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 text-center px-4">
                                        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                            <BarChart3 className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <p className="font-medium text-sm mb-2">No Active Indicators</p>
                                        <p className="text-xs text-gray-500 mb-4 max-w-xs">Add technical indicators from the categories to start analyzing your charts</p>
                                        {isMobile ? (
                                            <Button size="sm" onClick={handleBackToCategories}>Browse Indicators</Button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setSelectedCategory('momentum')}>Momentum</Button>
                                                <Button size="sm" variant="outline" onClick={() => setSelectedCategory('trend')}>Trend</Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4 text-xs text-gray-500">{filteredActive.length} of {activeIndicators.length} indicators shown</div>
                                        {filteredActive.map(indicator => {
                                            const foundOption = indicatorOptions.find(opt => opt.type === indicator.type) || {};
                                            const IconComponent = foundOption.icon || BarChart3;
                                            return (
                                                <div key={indicator.id} className="mb-3 p-3 bg-white rounded-lg border shadow-sm">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center flex-1 min-w-0">
                                                            <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center mr-2">
                                                                <IconComponent className="h-4 w-4 text-gray-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="font-medium text-sm block truncate">{indicator.name || indicator.type || 'Heiken Ashi Bas'}</span>
                                                                <span className="text-xs text-gray-500 capitalize">{indicator.location || 'overlay'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 ml-2">
                                                            {indicator.options === undefined && (
                                                                <Button size="icon" variant="ghost" onClick={() => setShowSettingsFor(showSettingsFor === indicator.id ? null : indicator.id)} className="h-7 w-7 sm:h-8 sm:w-8">
                                                                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="ghost" onClick={() => removeIndicator(indicator.id)} className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    {showSettingsFor === indicator.id && (
                                                        <div className="mt-2 p-2 bg-gray-50 rounded border">
                                                            <IndicatorSettings indicator={indicator} updateIndicator={updateIndicator} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                )
                            ) : (
                                filteredOptions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 text-center px-4">
                                        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                            <Search className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <p className="font-medium text-sm mb-2">No Indicators Found</p>
                                        <p className="text-xs text-gray-500 mb-4 max-w-xs">
                                            {searchTerm ? `No indicators found for "${searchTerm}"` : `No indicators in ${currentCategory?.label?.toLowerCase() || 'this category'}`}
                                        </p>
                                        <div className="flex gap-2">
                                            {searchTerm && <Button size="sm" variant="outline" onClick={() => setSearchTerm('')}>Clear Search</Button>}
                                            {isMobile && <Button size="sm" onClick={handleBackToCategories}>Change Category</Button>}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4 text-xs text-gray-500">Showing {filteredOptions.length} of {getCategoryCount(selectedCategory)} indicators</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {filteredOptions.map(opt => (
                                                <div key={opt.type} className="flex flex-col p-3 bg-white rounded-lg border hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all active:scale-[0.99]" onClick={() => addIndicator(opt)}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                                            <opt.icon className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <h4 className="font-medium text-sm mb-1">{opt.name}</h4>
                                                    <div className="flex items-center justify-between mt-auto">
                                                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded capitalize">{opt.location}</span>
                                                        <span className="text-xs text-gray-400">{opt.category.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )
                            )}
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ChartComponent = () => {
    const [activeIndicators, setActiveIndicators] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsModalOpen(true)}>Open Indicators</Button>
            <IndicatorsModal
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                activeIndicators={activeIndicators}
                setActiveIndicators={setActiveIndicators}
            />
        </>
    );
};

export default IndicatorsModal;