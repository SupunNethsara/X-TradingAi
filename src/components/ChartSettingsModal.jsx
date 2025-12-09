import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, AreaChart, CandlestickChart } from 'lucide-react';

const ChartSettingsModal = ({ isOpen, setIsOpen, chartType, setChartType, timeInterval, setTimeInterval }) => {
    const chartTypes = [
        { id: 'area', label: 'Area', icon: AreaChart },
        { id: 'candle', label: 'Candle', icon: CandlestickChart },
        { id: 'hollow', label: 'Hollow', icon: CandlestickChart },
        { id: 'ohlc', label: 'OHLC', icon: CandlestickChart },
    ];

    const timeIntervals = [
        { id: '1t', label: '1 tick' }, { id: '1m', label: '1 minute' }, { id: '2m', label: '2 minutes' }, { id: '3m', label: '3 minutes' },
        { id: '5m', label: '5 minutes' }, { id: '10m', label: '10 minutes' }, { id: '15m', label: '15 minutes' }, { id: '30m', label: '30 minutes' },
        { id: '1h', label: '1 hour' }, { id: '2h', label: '2 hours' }, { id: '4h', label: '4 hours' }, { id: '8h', label: '8 hours' },
        { id: '1d', label: '1 day' },
    ];

    const shouldDisableInterval = (id) => {
        if (chartType === 'area') {
            return false;
        }
        return id === '1t';
    };

    const shouldDisableChart = (id) => timeInterval === '1t' && id !== 'area';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Chart types</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-4">
                    {chartTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                            <Button
                                key={type.id}
                                variant={chartType === type.id ? 'secondary' : 'outline'}
                                className="flex flex-col h-16 sm:h-20 text-sm"
                                disabled={shouldDisableChart(type.id)}
                                onClick={() => {
                                    setChartType(type.id);
                                    if (type.id !== 'area') {
                                        setTimeInterval('1m');
                                    }
                                }}
                            >
                                <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
                                {type.label}
                            </Button>
                        );
                    })}
                </div>
                <div>
                    <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium">Time interval</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {timeIntervals.map((interval) => (
                            <Button
                                key={interval.id}
                                variant={timeInterval === interval.id ? 'secondary' : 'ghost'}
                                disabled={shouldDisableInterval(interval.id)}
                                className="text-xs sm:text-sm h-9 sm:h-10"
                                onClick={() => setTimeInterval(interval.id)}
                            >
                                {interval.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                    Only selected charts and time intervals are available for this trade type.
                </p>
            </DialogContent>
        </Dialog>
    );
};

export default ChartSettingsModal;