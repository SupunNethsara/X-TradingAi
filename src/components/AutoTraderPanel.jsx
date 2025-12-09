import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const AutoTraderPanel = ({ selectedMarket }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [strategy, setStrategy] = useState('martingale');
  const [initialStake, setInitialStake] = useState(10);
  const [maxTrades, setMaxTrades] = useState(10);
  const [stopLoss, setStopLoss] = useState(100);
  const [takeProfit, setTakeProfit] = useState(200);
  const [useAI, setUseAI] = useState(true);
  const { toast } = useToast();

  const strategies = [
    { value: 'martingale', label: 'Martingale' },
    { value: 'anti-martingale', label: 'Anti-Martingale' },
    { value: 'dalembert', label: "D'Alembert" },
    { value: 'fibonacci', label: 'Fibonacci' },
    { value: 'ai-based', label: 'AI-Based' }
  ];

  const handleToggleTrader = () => {
    if (!selectedMarket) {
      toast({
        title: "No Market Selected",
        description: "Please select a market first",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(!isRunning);
    toast({
      title: isRunning ? "Auto Trader Stopped" : "Auto Trader Started",
      description: isRunning 
        ? "Trading bot has been stopped" 
        : `Trading ${selectedMarket.display_name} with ${strategy} strategy`,
    });
  };

  return (
    <ScrollArea className="h-full pr-0"> {/* Added pr-0 to eliminate any right padding in the scroll area */}
      <div className="p-4 space-y-4">
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-500" />
              <span className="font-semibold text-gray-800">Auto Trader</span>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              isRunning 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </div>
          </div>

          <Button
            onClick={handleToggleTrader}
            className={`w-full h-12 font-semibold ${
              isRunning
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Stop Trading
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start Trading
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Trading Strategy</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategies.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
            <Label htmlFor="use-ai">Use AI Predictions</Label>
            <Switch
              id="use-ai"
              checked={useAI}
              onCheckedChange={setUseAI}
            />
          </div>

          <div className="space-y-2">
            <Label>Initial Stake (USD)</Label>
            <Input
              type="number"
              value={initialStake}
              onChange={(e) => setInitialStake(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Trades</Label>
            <Input
              type="number"
              value={maxTrades}
              onChange={(e) => setMaxTrades(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Stop Loss</Label>
              <Input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Take Profit</Label>
              <Input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border rounded-lg p-4 space-y-3"
          >
            <div className="text-sm font-medium text-gray-700">Trading Stats</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-100 rounded p-2">
                <div className="text-xs text-gray-500">Trades</div>
                <div className="text-lg font-bold text-black">0</div>
              </div>
              <div className="bg-gray-100 rounded p-2">
                <div className="text-xs text-gray-500">Win Rate</div>
                <div className="text-lg font-bold text-green-600">0%</div>
              </div>
              <div className="bg-gray-100 rounded p-2">
                <div className="text-xs text-gray-500">Profit</div>
                <div className="text-lg font-bold text-green-600">$0.00</div>
              </div>
              <div className="bg-gray-100 rounded p-2">
                <div className="text-xs text-gray-500">Loss</div>
                <div className="text-lg font-bold text-red-600">$0.00</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
};

export default AutoTraderPanel;