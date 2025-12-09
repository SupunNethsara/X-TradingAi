import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Info, Minus, Plus, Calendar as CalendarIcon, ChevronUp, ChevronDown, Target, X } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PredictionPanel from './PredictionPanel';
import { useDerivAPI } from '@/contexts/DerivContext';
import CallPutExecution from "@/components/CallPutExecution.jsx";
import TurbosExecution from "@/components/TurbosExecution.jsx";

const RiseFallExecution = ({ selectedMarket, tradeType = 'rise_fall', aiPrediction }) => {
  const [stake, setStake] = useState(10);
  const [durationValue, setDurationValue] = useState(5);
  const [endDate, setEndDate] = useState(new Date('2025-11-02T23:59:59'));
  const [durationOrEndtime, setDurationOrEndtime] = useState('duration');
  const [allowEquals, setAllowEquals] = useState(false);
  const [callProposal, setCallProposal] = useState(null);
  const [putProposal, setPutProposal] = useState(null);
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
      ...extra,
    };
    if (durationOrEndtime === 'duration') {
      baseParams.duration = durationValue;
      baseParams.duration_unit = 't';
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
      const callType = allowEquals ? 'CALLE' : 'CALL';
      const putType = allowEquals ? 'PUTE' : 'PUT';
      const [callRes, putRes] = await Promise.all([
        fetchProposal(callType),
        fetchProposal(putType),
      ]);
      setCallProposal(callRes);
      setPutProposal(putRes);
    };
    fetchProposals();
  }, [stake, durationValue, endDate, durationOrEndtime, allowEquals, selectedMarket?.symbol]);

  const handleStakeChange = (amount) => {
    setStake(prev => Math.max(0, prev + amount));
  };

  const handleDurationChange = (amount) => {
    setDurationValue(prev => Math.max(1, prev + amount));
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
          title: `Purchased ${contractType}`,
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
                <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(callProposal)}%</p>
            </div>
            <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('RISE', callProposal)}>
                <ChevronUp className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                <span className="text-xs sm:text-sm">Rise</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(callProposal)}%</span>
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
            <div className="hidden sm:flex-1">
                <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                <p className="font-semibold text-red-600 text-sm sm:ml-2">{getPayoutDisplay(putProposal)}%</p>
            </div>
            <Button className="bg-red-500 hover:bg-red-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('FALL', putProposal)}>
                <ChevronDown className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                <span className="text-xs sm:text-sm">Fall</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(putProposal)}%</span>
            </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
      <Tabs value={durationOrEndtime} onValueChange={setDurationOrEndtime} defaultValue="duration">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
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
                <Input defaultValue="Ticks" readOnly className="w-16 sm:w-20 h-8 sm:h-10 text-sm" />
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
      <div>
        <Label htmlFor="stake" className="text-sm">Stake</Label>
          <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(-1)}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
            <Input id="stake" type="number" value={stake} onChange={(e) => setStake(parseFloat(e.target.value) || 0)} className="text-center h-8 sm:h-10 w-16 sm:w-20 flex-shrink-0" min={0} />
            <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(1)}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
            <Input defaultValue="USD" readOnly className="w-16 sm:w-20 h-8 sm:h-10 text-sm" />
        </div>
      </div>
   
      <div className="flex items-center space-x-2">
        <Checkbox id="allow-equals" className="h-4 w-4" checked={allowEquals} onCheckedChange={setAllowEquals} />
        <label htmlFor="allow-equals" className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Allow equals
        </label>
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

const HigherLowerExecution = ({ selectedMarket, tradeType = 'higher_lower', aiPrediction }) => {
  const [stake, setStake] = useState(10);
  const [durationValue, setDurationValue] = useState(5);
  const [endDate, setEndDate] = useState(new Date('2025-11-02T23:59:59'));
  const [durationOrEndtime, setDurationOrEndtime] = useState('duration');
  const [allowEquals, setAllowEquals] = useState(false);
  const [barrier, setBarrier] = useState(0);
  const [callProposal, setCallProposal] = useState(null);
  const [putProposal, setPutProposal] = useState(null);
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
      const callType = allowEquals ? 'CALLE' : 'CALL';
      const putType = allowEquals ? 'PUTE' : 'PUT';
      const [callRes, putRes] = await Promise.all([
        fetchProposal(callType),
        fetchProposal(putType),
      ]);
      setCallProposal(callRes);
      setPutProposal(putRes);
    };
    fetchProposals();
  }, [stake, durationValue, endDate, durationOrEndtime, allowEquals, barrier, selectedMarket?.symbol]);

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
          title: `Purchased ${contractType}`,
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
                <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(callProposal)}%</p>
            </div>
            <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('HIGHER', callProposal)}>
                <ChevronUp className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                <span className="text-xs sm:text-sm">Higher</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(callProposal)}%</span>
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
            <div className="hidden sm:flex-1">
                <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                <p className="font-semibold text-red-600 text-sm sm:ml-2">{getPayoutDisplay(putProposal)}%</p>
            </div>
            <Button className="bg-red-500 hover:bg-red-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('LOWER', putProposal)}>
                <ChevronDown className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                <span className="text-xs sm:text-sm">Lower</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(putProposal)}%</span>
            </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
      <Tabs value={durationOrEndtime} onValueChange={setDurationOrEndtime} defaultValue="duration">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
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
        <Label htmlFor="barrier" className="text-sm">Barrier (offset)</Label>
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
   
      <div className="flex items-center space-x-2">
        <Checkbox id="allow-equals" className="h-4 w-4" checked={allowEquals} onCheckedChange={setAllowEquals} />
        <label htmlFor="allow-equals" className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Allow equals
        </label>
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

const AccumulatorsExecution = ({ selectedMarket, tradeType = 'accumulators', aiPrediction }) => {
  const [growthRate, setGrowthRate] = useState(3);
  const [stake, setStake] = useState(10);
  const [accuProposal, setAccuProposal] = useState(null);
  const { toast } = useToast();
  const { api } = useDerivAPI();

  const fetchProposal = async (extra = {}) => {
    if (!selectedMarket?.symbol || stake <= 0 || !api) return null;
    const baseParams = {
      proposal: 1,
      amount: stake,
      basis: 'stake',
      contract_type: 'ACCU',
      currency: 'USD',
      symbol: selectedMarket.symbol,
      growth_rate: growthRate / 100,
      ...extra,
    };
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
    const fetchAccuProposal = async () => {
      const res = await fetchProposal();
      setAccuProposal(res);
    };
    fetchAccuProposal();
  }, [stake, growthRate, selectedMarket?.symbol]);

  const handleStakeChange = (amount) => {
    setStake(prev => Math.max(1, prev + amount));
  };

  const handlePurchase = async (proposal) => {
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
          title: 'Purchased Accumulator',
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

  const actionButtons = (
    <div className="space-y-2">
      <div className="bg-gray-100 p-2 sm:p-3 rounded-md space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between">
            <span className="text-gray-500">Est. Payout</span>
            <span className="font-semibold">{getPayoutDisplay(accuProposal)}%</span>
        </div>
        <div className="flex justify-between">
            <span className="text-gray-500">Max. ticks</span>
            <span className="font-semibold">85 ticks</span>
        </div>
      </div>
      <Button className="w-full bg-green-500 hover:bg-green-600 h-10 sm:h-12" onClick={() => handlePurchase(accuProposal)}>Buy</Button>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 space-y-4 sm:space-y-6 max-h-[600px] overflow-y-auto">
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0">
            <Label className="text-sm">Growth rate</Label>
            <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
          {[1, 2, 3, 4, 5].map(rate => (
            <Button key={rate} variant={growthRate === rate ? 'secondary' : 'outline'} size="sm" className="h-8 sm:h-10 text-xs sm:text-sm" onClick={() => setGrowthRate(rate)}>
              {rate}%
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="stake-accumulators" className="text-sm">Stake</Label>
        <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(-1)}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
          <Input id="stake-accumulators" type="number" value={stake} onChange={e => setStake(parseFloat(e.target.value) || 0)} className="text-center h-8 sm:h-10 w-16 sm:w-20 flex-shrink-0" min={1} />
          <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(1)}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
          <Input defaultValue="USD" readOnly className="w-16 sm:w-20 h-8 sm:h-10 text-sm" />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="take-profit" className="h-4 w-4" />
        <label htmlFor="take-profit" className="text-xs sm:text-sm font-medium">Take profit</label>
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

const DigitsExecution = ({ selectedMarket, tradeType, aiPrediction, digitPrediction, digitConfidence }) => {
    const [stake, setStake] = useState(10);
    const [selectedDigit, setSelectedDigit] = useState(4);
    const [barrier, setBarrier] = useState(4.5);
    const [lastDigit, setLastDigit] = useState(null);
    const [digitStats, setDigitStats] = useState(Array(10).fill(0));
    const [matchesProposal, setMatchesProposal] = useState(null);
    const [differsProposal, setDiffersProposal] = useState(null);
    const [evenProposal, setEvenProposal] = useState(null);
    const [oddProposal, setOddProposal] = useState(null);
    const [overProposal, setOverProposal] = useState(null);
    const [underProposal, setUnderProposal] = useState(null);
    const [durationValue, setDurationValue] = useState(5);
    const [durationOrEndtime, setDurationOrEndtime] = useState('duration');
    const [endDate, setEndDate] = useState(new Date('2025-11-02T23:59:59'));
    const { toast } = useToast();
    const { lastTick, api } = useDerivAPI();

    useEffect(() => {
        if (lastTick && lastTick.symbol === selectedMarket?.symbol) {
            const priceStr = lastTick.quote.toString();
            const currentLastDigit = parseInt(priceStr[priceStr.length - 1]);
            setLastDigit(currentLastDigit);
            setDigitStats(prevStats => {
                const newStats = [...prevStats];
                newStats[currentLastDigit]++;
                return newStats;
            });
        }
    }, [lastTick, selectedMarket]);

    const fetchProposal = async (contractType, extra = {}) => {
        if (!selectedMarket?.symbol || stake <= 0 || !api) return null;
        const baseParams = {
            proposal: 1,
            amount: stake,
            basis: 'stake',
            contract_type: contractType,
            currency: 'USD',
            symbol: selectedMarket.symbol,
            ...extra,
        };
        if (durationOrEndtime === 'duration') {
            baseParams.duration = durationValue;
            baseParams.duration_unit = 't';
        } else {
            baseParams.date_expiry = Math.floor(endDate.getTime() / 1000);
            delete baseParams.duration;
            delete baseParams.duration_unit;
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
            if (!selectedMarket?.symbol || stake <= 0 || !api) return;
            let proposals = {};
            switch (tradeType) {
                case 'matches_differs':
                    const [matchesRes, differsRes] = await Promise.all([
                        fetchProposal('DIGITMATCH', { prediction: selectedDigit }),
                        fetchProposal('DIGITDIFF', { prediction: selectedDigit }),
                    ]);
                    proposals.matches = matchesRes;
                    proposals.differs = differsRes;
                    break;
                case 'even_odd':
                    const [evenRes, oddRes] = await Promise.all([
                        fetchProposal('DIGITEVEN'),
                        fetchProposal('DIGITODD'),
                    ]);
                    proposals.even = evenRes;
                    proposals.odd = oddRes;
                    break;
                case 'over_under':
                    const [overRes, underRes] = await Promise.all([
                        fetchProposal('DIGITOVER', { barrier }),
                        fetchProposal('DIGITUNDER', { barrier }),
                    ]);
                    proposals.over = overRes;
                    proposals.under = underRes;
                    break;
                default:
                    return;
            }
            if (tradeType === 'matches_differs') {
                setMatchesProposal(proposals.matches);
                setDiffersProposal(proposals.differs);
            } else if (tradeType === 'even_odd') {
                setEvenProposal(proposals.even);
                setOddProposal(proposals.odd);
            } else if (tradeType === 'over_under') {
                setOverProposal(proposals.over);
                setUnderProposal(proposals.under);
            }
        };
        fetchProposals();
    }, [stake, selectedDigit, barrier, durationValue, endDate, durationOrEndtime, selectedMarket?.symbol, tradeType]);

    const totalStats = digitStats.reduce((a, b) => a + b, 0);

    const handleStakeChange = (amount) => {
        setStake(prev => Math.max(1, prev + amount));
    };

    const handleDurationChange = (amount) => {
        setDurationValue(prev => Math.max(1, prev + amount));
    };

    const handlePurchase = async (action, proposal) => {
        if (!proposal || !proposal.id) {
            toast({
                title: 'Error',
                description: 'Proposal not available. Please try again.',
                variant: 'destructive',
            });
            return;
        }
        let contractType;
        switch(tradeType) {
            case 'matches_differs':
                contractType = action === 'Matches' ? 'DIGITMATCH' : 'DIGITDIFF';
                break;
            case 'even_odd':
                contractType = action === 'Even' ? 'DIGITEVEN' : 'DIGITODD';
                break;
            case 'over_under':
                contractType = action === 'Over' ? 'DIGITOVER' : 'DIGITUNDER';
                break;
            default:
                contractType = 'DIGIT';
        }
        try {
            const response = await api.send({
                buy: proposal.id,
                price: proposal.ask_price,
            });
            if (response.buy) {
                toast({
                    title: `Purchased ${action}`,
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
        const profit = proposal?.payout || 10;
        return ((profit / stake) * 100).toFixed(2);
    };

    const getPercentage = (proposal) => {
        if (stake <= 0 || !proposal) return '0.00';
        const profit = proposal?.payout || 10;
        return ((profit / stake) * 100).toFixed(2);
    };

    const renderButtons = () => {
        let positiveProposal, negativeProposal, positiveAction, negativeAction, positiveLabel, negativeLabel, positiveIcon, negativeIcon;
        switch (tradeType) {
            case 'matches_differs':
                positiveProposal = matchesProposal;
                negativeProposal = differsProposal;
                positiveAction = 'Matches';
                negativeAction = 'Differs';
                positiveLabel = 'Matches';
                negativeLabel = 'Differs';
                positiveIcon = <X className="h-4 w-4" />;
                negativeIcon = <X className="h-4 w-4" strokeWidth={2} />;
                break;
            case 'even_odd':
                positiveProposal = evenProposal;
                negativeProposal = oddProposal;
                positiveAction = 'Even';
                negativeAction = 'Odd';
                positiveLabel = 'Even';
                negativeLabel = 'Odd';
                positiveIcon = <span className="text-xs">●</span>;
                negativeIcon = <span className="text-xs">○</span>;
                break;
            case 'over_under':
                positiveProposal = overProposal;
                negativeProposal = underProposal;
                positiveAction = 'Over';
                negativeAction = 'Under';
                positiveLabel = 'Over';
                negativeLabel = 'Under';
                positiveIcon = <ChevronUp className="h-4 w-4" />;
                negativeIcon = <ChevronDown className="h-4 w-4" />;
                break;
            default:
                return (
                    <div className="border-t border-gray-200 pt-3 sm:pt-4">
                        <Button className="w-full bg-blue-500 hover:bg-blue-600 h-10 sm:h-12" onClick={() => {}}>
                            Purchase
                        </Button>
                    </div>
                );
        }
        return (
            <div className="border-t border-gray-200 pt-3 sm:pt-4">
              <div className="flex flex-row gap-2">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
                    <div className="hidden sm:flex-1">
                        <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                        <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(positiveProposal)}%</p>
                    </div>
                    <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase(positiveAction, positiveProposal)}>
                        <span className="mr-1 sm:mr-2 hidden sm:block">{positiveIcon}</span>
                        <span className="text-xs sm:text-sm">{positiveLabel}</span>
                        <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(positiveProposal)}%</span>
                    </Button>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
                    <div className="hidden sm:flex-1">
                        <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                        <p className="font-semibold text-red-600 text-sm sm:ml-2">{getPayoutDisplay(negativeProposal)}%</p>
                    </div>
                    <Button className="bg-red-500 hover:bg-red-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase(negativeAction, negativeProposal)}>
                        <span className="mr-1 sm:mr-2 hidden sm:block">{negativeIcon}</span>
                        <span className="text-xs sm:text-sm">{negativeLabel}</span>
                        <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(negativeProposal)}%</span>
                    </Button>
                </div>
              </div>
            </div>
        );
    };

    return (
        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
            <Tabs value={durationOrEndtime} onValueChange={setDurationOrEndtime} defaultValue="duration">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
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
                            <Input defaultValue="Ticks" readOnly className="w-16 sm:w-20 h-8 sm:h-10 text-sm" />
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
            {tradeType === 'matches_differs' && (
                <div>
                    <Label className="text-sm">Select a digit</Label>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2 mt-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <Button
                                key={i}
                                variant={selectedDigit === i ? 'secondary' : 'outline'}
                                size="sm"
                                className="h-8 sm:h-10 text-xs sm:text-sm"
                                onClick={() => setSelectedDigit(i)}
                            >
                                {i}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
            {tradeType === 'over_under' && (
                <div className="space-y-1">
                    <Label htmlFor="barrier" className="text-sm">Barrier</Label>
                    <Input
                        id="barrier"
                        type="number"
                        step="0.1"
                        value={barrier}
                        onChange={(e) => setBarrier(parseFloat(e.target.value) || 4.5)}
                        className="h-8 sm:h-10 text-sm"
                        placeholder="e.g. 4.5"
                        min={0}
                        max={9.9}
                    />
                </div>
            )}
            <div>
                <Label htmlFor="stake-digits" className="text-sm">Stake</Label>
                <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                    <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(-1)}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Input id="stake-digits" type="number" value={stake} onChange={e => setStake(parseFloat(e.target.value) || 0)} className="text-center h-8 sm:h-10 w-16 sm:w-20 flex-shrink-0" min={1} />
                    <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(1)}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                    <Input defaultValue="USD" readOnly className="w-16 sm:w-20 h-8 sm:h-10 text-sm" />
                </div>
            </div>
            {renderButtons()}
            <div className="mt-4 border-t pt-2">
              <PredictionPanel 
                symbol={selectedMarket?.symbol} 
                tradeType={tradeType} 
                aiPrediction={aiPrediction || { prediction: 'over', confidence: 0.75 }}
                digitPrediction={digitPrediction || 5}
                digitConfidence={digitConfidence || 0.8}
                mode="compact" 
              />
            </div>
        </div>
    );
};

const OneTouchNoTouchExecution = ({ selectedMarket, tradeType = 'touch_no_touch', aiPrediction }) => {
  const [stake, setStake] = useState(10);
  const [durationValue, setDurationValue] = useState(5);
  const [endDate, setEndDate] = useState(new Date('2025-11-02T23:59:59'));
  const [durationOrEndtime, setDurationOrEndtime] = useState('duration');
  const [barrier, setBarrier] = useState(0);
  const [touchProposal, setTouchProposal] = useState(null);
  const [noTouchProposal, setNoTouchProposal] = useState(null);
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
      const [touchRes, noTouchRes] = await Promise.all([
        fetchProposal('ONETOUCH'),
        fetchProposal('NOTOUCH'),
      ]);
      setTouchProposal(touchRes);
      setNoTouchProposal(noTouchRes);
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

  const handlePurchase = async (action, proposal) => {
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
          title: `Purchased ${action}`,
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
                <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(touchProposal)}%</p>
            </div>
            <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('TOUCH', touchProposal)}>
                <Target className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                <span className="text-xs sm:text-sm">Touch</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(touchProposal)}%</span>
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
            <div className="hidden sm:flex-1">
                <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                <p className="font-semibold text-red-600 text-sm sm:ml-2">{getPayoutDisplay(noTouchProposal)}%</p>
            </div>
            <Button className="bg-red-500 hover:bg-red-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('NO TOUCH', noTouchProposal)}>
                <X className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                <span className="text-xs sm:text-sm">No Touch</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(noTouchProposal)}%</span>
            </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
      <Tabs value={durationOrEndtime} onValueChange={setDurationOrEndtime} defaultValue="duration">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
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
        <Label htmlFor="barrier" className="text-sm">Barrier (offset from current price)</Label>
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

const EndsInOutExecution = ({ selectedMarket, tradeType = 'ends_in_out', aiPrediction }) => {
  const [stake, setStake] = useState(10);
  const [durationValue, setDurationValue] = useState(5);
  const [endDate, setEndDate] = useState(new Date('2025-11-02T23:59:59'));
  const [durationOrEndtime, setDurationOrEndtime] = useState('duration');
  const [lowBarrier, setLowBarrier] = useState(-0.01);
  const [highBarrier, setHighBarrier] = useState(0.01);
  const [inProposal, setInProposal] = useState(null);
  const [outProposal, setOutProposal] = useState(null);
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
      barrier: highBarrier.toString(),
      barrier2: lowBarrier.toString(),
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
      const [inRes, outRes] = await Promise.all([
        fetchProposal('EXPIRYRANGE'),
        fetchProposal('EXPIRYMISS'),
      ]);
      setInProposal(inRes);
      setOutProposal(outRes);
    };
    fetchProposals();
  }, [stake, durationValue, endDate, durationOrEndtime, lowBarrier, highBarrier, selectedMarket?.symbol]);

  const handleStakeChange = (amount) => {
    setStake(prev => Math.max(0, prev + amount));
  };

  const handleDurationChange = (amount) => {
    setDurationValue(prev => Math.max(1, prev + amount));
  };

  const handleLowBarrierChange = (e) => {
    setLowBarrier(parseFloat(e.target.value) || -0.01);
  };

  const handleHighBarrierChange = (e) => {
    setHighBarrier(parseFloat(e.target.value) || 0.01);
  };

  const handlePurchase = async (action, proposal) => {
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
          title: `Purchased ${action}`,
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
                <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(inProposal)}%</p>
            </div>
            <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('Ends In', inProposal)}>
                <span className="mr-1 sm:mr-2 hidden sm:block">↔</span>
                <span className="text-xs sm:text-sm">Ends In</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(inProposal)}%</span>
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
            <div className="hidden sm:flex-1">
                <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                <p className="font-semibold text-red-600 text-sm sm:ml-2">{getPayoutDisplay(outProposal)}%</p>
            </div>
            <Button className="bg-red-500 hover:bg-red-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('Ends Out', outProposal)}>
                <span className="mr-1 sm:mr-2 hidden sm:block">↕</span>
                <span className="text-xs sm:text-sm">Ends Out</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(outProposal)}%</span>
            </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
      <Tabs value={durationOrEndtime} onValueChange={setDurationOrEndtime} defaultValue="duration">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
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
      <div className="space-y-2">
        <div>
          <Label htmlFor="low-barrier" className="text-sm">Low Barrier (offset)</Label>
          <Input
            id="low-barrier"
            type="number"
            step="0.001"
            value={lowBarrier}
            onChange={handleLowBarrierChange}
            className="h-8 sm:h-10 text-sm"
            placeholder="e.g. -0.01"
            min={-1}
            max={0}
          />
        </div>
        <div>
          <Label htmlFor="high-barrier" className="text-sm">High Barrier (offset)</Label>
          <Input
            id="high-barrier"
            type="number"
            step="0.001"
            value={highBarrier}
            onChange={handleHighBarrierChange}
            className="h-8 sm:h-10 text-sm"
            placeholder="e.g. 0.01"
            min={0}
            max={1}
          />
        </div>
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

const StaysInGoesOutExecution = ({ selectedMarket, tradeType = 'stays_in_goes_out', aiPrediction }) => {
  const [stake, setStake] = useState(10);
  const [durationValue, setDurationValue] = useState(5);
  const [endDate, setEndDate] = useState(new Date('2025-11-02T23:59:59'));
  const [durationOrEndtime, setDurationOrEndtime] = useState('duration');
  const [lowBarrier, setLowBarrier] = useState(-0.01);
  const [highBarrier, setHighBarrier] = useState(0.01);
  const [inProposal, setInProposal] = useState(null);
  const [outProposal, setOutProposal] = useState(null);
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
      barrier: highBarrier.toString(),
      barrier2: lowBarrier.toString(),
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
      const [inRes, outRes] = await Promise.all([
        fetchProposal('RANGE'),
        fetchProposal('UPORDOWN'),
      ]);
      setInProposal(inRes);
      setOutProposal(outRes);
    };
    fetchProposals();
  }, [stake, durationValue, endDate, durationOrEndtime, lowBarrier, highBarrier, selectedMarket?.symbol]);

  const handleStakeChange = (amount) => {
    setStake(prev => Math.max(0, prev + amount));
  };

  const handleDurationChange = (amount) => {
    setDurationValue(prev => Math.max(1, prev + amount));
  };

  const handleLowBarrierChange = (e) => {
    setLowBarrier(parseFloat(e.target.value) || -0.01);
  };

  const handleHighBarrierChange = (e) => {
    setHighBarrier(parseFloat(e.target.value) || 0.01);
  };

  const handlePurchase = async (action, proposal) => {
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
          title: `Purchased ${action}`,
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
                <p className="font-semibold text-green-600 text-sm sm:ml-2">{getPayoutDisplay(inProposal)}%</p>
            </div>
            <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('Stays In', inProposal)}>
                <span className="mr-1 sm:mr-2 hidden sm:block">↔</span>
                <span className="text-xs sm:text-sm">Stays In</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(inProposal)}%</span>
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
            <div className="hidden sm:flex-1">
                <span className="text-xs text-gray-500 block sm:inline">Payout</span>
                <p className="font-semibold text-red-600 text-sm sm:ml-2">{getPayoutDisplay(outProposal)}%</p>
            </div>
            <Button className="bg-red-500 hover:bg-red-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('Goes Out', outProposal)}>
                <span className="mr-1 sm:mr-2 hidden sm:block">↕</span>
                <span className="text-xs sm:text-sm">Goes Out</span>
                <span className="ml-auto text-xs opacity-80 hidden sm:inline">{getPercentage(outProposal)}%</span>
            </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
      <Tabs value={durationOrEndtime} onValueChange={setDurationOrEndtime} defaultValue="duration">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
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
      <div className="space-y-2">
        <div>
          <Label htmlFor="low-barrier" className="text-sm">Low Barrier (offset)</Label>
          <Input
            id="low-barrier"
            type="number"
            step="0.001"
            value={lowBarrier}
            onChange={handleLowBarrierChange}
            className="h-8 sm:h-10 text-sm"
            placeholder="e.g. -0.01"
            min={-1}
            max={0}
          />
        </div>
        <div>
          <Label htmlFor="high-barrier" className="text-sm">High Barrier (offset)</Label>
          <Input
            id="high-barrier"
            type="number"
            step="0.001"
            value={highBarrier}
            onChange={handleHighBarrierChange}
            className="h-8 sm:h-10 text-sm"
            placeholder="e.g. 0.01"
            min={0}
            max={1}
          />
        </div>
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

const MultipliersExecution = ({ selectedMarket, tradeType = 'multipliers', aiPrediction }) => {
  const [stake, setStake] = useState(10);
  const [multiplier, setMultiplier] = useState(5);
  const [takeProfit, setTakeProfit] = useState(0);
  const [hasTakeProfit, setHasTakeProfit] = useState(false);
  const [upProposal, setUpProposal] = useState(null);
  const [downProposal, setDownProposal] = useState(null);
  const { toast } = useToast();
  const { api } = useDerivAPI();

  const multipliers = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];

  const fetchProposal = async (contractType, extra = {}) => {
    if (!selectedMarket?.symbol || stake <= 0 || !api) return null;
    const baseParams = {
      proposal: 1,
      amount: stake,
      basis: 'stake',
      contract_type: contractType,
      currency: 'USD',
      symbol: selectedMarket.symbol,
      multiplier: multiplier,
      ...extra,
    };
    if (hasTakeProfit && takeProfit > 0) {
      baseParams.limit_order = { take_profit: takeProfit };
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
        fetchProposal('MULTUP'),
        fetchProposal('MULTDOWN'),
      ]);
      setUpProposal(upRes);
      setDownProposal(downRes);
    };
    fetchProposals();
  }, [stake, multiplier, hasTakeProfit, takeProfit, selectedMarket?.symbol]);

  const handleStakeChange = (amount) => {
    setStake(prev => Math.max(0, prev + amount));
  };

  const handleTakeProfitChange = (e) => {
    setTakeProfit(parseFloat(e.target.value) || 0);
  };

  const handlePurchase = async (action, proposal) => {
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
          title: `Purchased ${action}`,
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

  const getMultiplierDisplay = () => `${multiplier}x`;

  const actionButtons = (
    <div className="border-t border-gray-200 pt-3 sm:pt-4">
      <div className="flex flex-row gap-2">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
            <div className="hidden sm:flex-1">
                <span className="text-xs text-gray-500 block sm:inline">Multiplier</span>
                <p className="font-semibold text-green-600 text-sm sm:ml-2">{getMultiplierDisplay()}</p>
            </div>
            <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('Up', upProposal)}>
                <ChevronUp className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                <span className="text-xs sm:text-sm">Up</span>
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-gray-100 p-2 sm:p-3 rounded-md gap-2 flex-1 min-w-0">
            <div className="hidden sm:flex-1">
                <span className="text-xs text-gray-500 block sm:inline">Multiplier</span>
                <p className="font-semibold text-red-600 text-sm sm:ml-2">{getMultiplierDisplay()}</p>
            </div>
            <Button className="bg-red-500 hover:bg-red-600 w-full sm:w-32 h-10 sm:h-auto justify-center" onClick={() => handlePurchase('Down', downProposal)}>
                <ChevronDown className="h-4 w-4 mr-1 sm:mr-2 hidden sm:block" />
                <span className="text-xs sm:text-sm">Down</span>
            </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
      <div>
        <Label className="text-sm">Multiplier</Label>
        <div className="grid grid-cols-5 gap-1 mt-2">
          {multipliers.map(m => (
            <Button key={m} variant={multiplier === m ? 'secondary' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setMultiplier(m)}>
              {m}x
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="stake-multipliers" className="text-sm">Stake</Label>
        <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(-1)}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
          <Input id="stake-multipliers" type="number" value={stake} onChange={(e) => setStake(parseFloat(e.target.value) || 0)} className="text-center h-8 sm:h-10 w-16 sm:w-20 flex-shrink-0" min={0} />
          <Button variant="outline" size="sm" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => handleStakeChange(1)}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
          <Input defaultValue="USD" readOnly className="w-16 sm:w-20 h-8 sm:h-10 text-sm" />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="take-profit-multi" className="h-4 w-4" checked={hasTakeProfit} onCheckedChange={setHasTakeProfit} />
        <label htmlFor="take-profit-multi" className="text-xs sm:text-sm font-medium">Take profit</label>
      </div>
      {hasTakeProfit && (
        <div className="space-y-1">
          <Label htmlFor="take-profit-value" className="text-sm">Take profit amount</Label>
          <Input
            id="take-profit-value"
            type="number"
            value={takeProfit}
            onChange={handleTakeProfitChange}
            className="h-8 sm:h-10 text-sm"
            min={0}
          />
        </div>
      )}
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

const TradeExecution = ({ tradeType, selectedMarket, aiPrediction, digitPrediction, digitConfidence }) => {
    switch (tradeType) {
        case 'accumulators':
            return <AccumulatorsExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
        case 'rise_fall':
            return <RiseFallExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
        case 'higher_lower':
            return <HigherLowerExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
        case 'call_put':
            return <CallPutExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction}  />;
            case 'matches_differs':
        case 'even_odd':
        case 'over_under':
            return <DigitsExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} digitPrediction={digitPrediction} digitConfidence={digitConfidence} />;
        case 'touch_no_touch':
            return <OneTouchNoTouchExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
        case 'ends_in_out':
            return <EndsInOutExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
        case 'stays_in_goes_out':
            return <StaysInGoesOutExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
        case 'multipliers':
            return <MultipliersExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
        case 'turbos':
            return <TurbosExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
        default:
            return <RiseFallExecution selectedMarket={selectedMarket} tradeType={tradeType} aiPrediction={aiPrediction} />;
    }
};

export default TradeExecution;