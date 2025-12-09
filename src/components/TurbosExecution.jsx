import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Minus, Plus, Calendar as CalendarIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PredictionPanel from './PredictionPanel';
import { useDerivAPI } from '@/contexts/DerivContext';

const TurbosExecution = ({ selectedMarket, tradeType = 'turbos', aiPrediction }) => {
    const [stake, setStake] = useState(10);
    const [durationValue, setDurationValue] = useState(5);
    const [endDate, setEndDate] = useState(new Date('2025-11-02T23:59:59'));
    const [durationOrEndtime, setDurationOrEndtime] = useState('duration');
    const [barrier, setBarrier] = useState(0);
    const [upProposal, setUpProposal] = useState(null);
    const [downProposal, setDownProposal] = useState(null);
    const { toast } = useToast();
    const { api } = useDerivAPI();

    const fetchProposal = async (contractType, extra = {}) => {
        if (!selectedMarket?.symbol || stake <= 0 || !api) return null;
        const baseParams = {
            proposal: 1,
            amount: stake,
            basis: 'stake',
            contract_type: contractType,
            currency: 'USD',
            symbol: selectedMarket.symbol,
            barrier: barrier.toString(),
            ...extra,
        };
        if (durationOrEndtime === 'duration') {
            baseParams.duration = durationValue;
            baseParams.duration_unit = 'm';
        } else {
            baseParams.date_expiry = Math.floor(endDate.getTime() / 1000);
        }
        try {
            const response = await api.send(baseParams);
            if (response.proposal) {
                return response.proposal;
            }
        } catch (error) {
            console.error('Error fetching proposal:', error);
            toast({
                description: 'Failed to fetch proposal. Using default values.',
            });
        }
        return null;
    };

    useEffect(() => {
        const fetchProposals = async () => {
            const [upRes, downRes] = await Promise.all([
                fetchProposal('TURBOSLONG'),
                fetchProposal('TURBOSSHORT'),
            ]);
            setUpProposal(upRes);
            setDownProposal(downRes);
        };
        fetchProposals();
    }, [stake, durationValue, endDate, durationOrEndtime, barrier, selectedMarket?.symbol]);

    const handleStakeChange = (amount) => {
        setStake(prev => Math.max(0, prev + amount));
    };

    const handleDurationChange = (amount) => {
        setDurationValue(prev => Math.max(1, prev + amount));
    };

    const handleBarrierChange = (e) => {
        setBarrier(parseFloat(e.target.value) || 0);
    };

    const handlePurchase = async (contractType, proposal) => {
        if (!proposal || !proposal.id) {
            toast({
                title: 'Error',
                description: 'Proposal not available. Please try again.',
                variant: 'destructive',
            });
            return;
        }
        try {
            const response = await api.send({
                buy: proposal.id,
                price: proposal.ask_price,
            });
            if (response.buy) {
                toast({
                    title: `Purchased Turbo ${contractType}`,
                    description: `Contract ID: ${response.buy.contract_id}`,
                });
            } else {
                throw new Error('Buy failed');
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
        if (stake <= 0 || !proposal) return '0.00';
        const profit = proposal.payout || 10;
        return ((profit / stake) * 100).toFixed(2);
    };

    const getPercentage = (proposal) => {
        if (stake <= 0 || !proposal) return '0.00';
        const profit = proposal.payout || 10;
        return ((profit / stake) * 100).toFixed(2);
    };

    const actionButtons = (
        <div className="border-t border-gray-200 pt-3 sm:pt-4">
            <div className="flex flex-row gap-2">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
                    <div className="hidden sm:flex-1">
                        <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                        <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(upProposal)}%</p>
                    </div>
                    <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('Up', upProposal)}>
                        <ChevronUp className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                        <span className="text-xs sm:text-sm">Up</span>
                        <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(upProposal)}%</span>
                    </Button>
                </div>

            </div>
        </div>
    );

    return (
        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
            <Tabs value={durationOrEndtime} onValueChange={setDurationOrEndtime} defaultValue="duration">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-1">
                    <TabsTrigger value="duration">Duration</TabsTrigger>
                    <TabsTrigger value="endtime">End time</TabsTrigger>
                </TabsList>
                <TabsContent value="duration" className="mt-3 sm:mt-4">
                    <div className="space-y-1">
                        <Label htmlFor="duration" className="text-sm">Duration</Label>
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleDurationChange(-1)}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                            <Input
                                id="duration"
                                type="number"
                                value={durationValue}
                                onChange={(e) => setDurationValue(parseInt(e.target.value) || 0)}
                                className="text-center h-8 sm:h-10 w-16 sm:w-20 flex-shrink-0"
                                min={1}
                            />
                            <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleDurationChange(1)}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                            <Input defaultValue="Minutes" readOnly className="w-16 sm:w-20 h-8 sm:h-10 text-sm" />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="endtime" className="mt-3 sm:mt-4">
                    <div className="space-y-1">
                        <Label className="text-sm">Expiry</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal h-10 sm:h-auto", !endDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span className="text-xs sm:text-sm">{endDate ? format(endDate, "dd MMM yyyy, HH:mm:ss 'GMT'XXX") : <span>Pick a date</span>}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </TabsContent>
            </Tabs>
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <Label htmlFor="barrier" className="text-sm">Barrier (offset from current price)</Label>
                    <Info className="h-3 w-3 text-gray-400" />
                </div>
                <Input
                    id="barrier"
                    type="number"
                    step="0.001"
                    value={barrier}
                    onChange={handleBarrierChange}
                    className="h-8 sm:h-10 text-sm"
                    placeholder="e.g. 0.001"
                    min={-1}
                    max={1}
                />
            </div>
            <div>
                <Label htmlFor="stake" className="text-sm">Stake</Label>
                <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                    <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(-1)}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Input id="stake" type="number" value={stake} onChange={(e) => setStake(parseFloat(e.target.value) || 0)} className="text-center h-8 sm:h-10 w-16 sm:w-20 flex-shrink-0" min={0} />
                    <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(1)}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Input defaultValue="USD" readOnly className="w-16 sm:w-20 h-8 sm:h-10 text-sm" />
                </div>
            </div>
            {actionButtons}
            <div className="mt-4 border-t pt-2">
                <PredictionPanel
                    symbol={selectedMarket?.symbol}
                    tradeType={tradeType}
                    aiPrediction={aiPrediction || { prediction: 'rise', confidence: 0.65 }}
                    mode="compact"
                />
            </div>
        </div>
    );
};

export default TurbosExecution;