import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutoTraderPanel from '@/components/AutoTraderPanel';
import TradeExecution from '@/components/TradeExecution';
import { ScrollArea } from '@/components/ui/scroll-area';
import TradeTypeSelector from '@/components/TradeTypeSelector';
import PredictionPanel from './PredictionPanel';

const TradePanel = ({ selectedMarket, tradeType, setTradeType, aiPrediction, onOpenTradeTypeSelector }) => {
  const [activeTab, setActiveTab] = useState('trade');
  const symbol = selectedMarket?.symbol;

  const getDigitPrediction = () => {
    if (!tradeType || !['matches_differs', 'even_odd', 'over_under'].includes(tradeType)) return { digitPrediction: undefined, digitConfidence: undefined };
    return {
      digitPrediction: aiPrediction?.digitPrediction,
      digitConfidence: aiPrediction?.digitConfidence,
    };
  };

  const { digitPrediction, digitConfidence } = getDigitPrediction();

  return (
      <div className="w-full lg:w-[340px] bg-white border-t lg:border-l lg:border-t-0 border-gray-200 flex flex-col flex-shrink-0 h-screen lg:h-auto relative z-10 isolate">
        <Tabs
            defaultValue="trade"
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 h-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-none p-0.5 sm:p-1 h-12 sm:h-14 shrink-0">
            <TabsTrigger
                value="trade"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-sm text-sm sm:text-base font-medium h-full flex items-center justify-center py-2"
            >
              Trade
            </TabsTrigger>
            <TabsTrigger
                value="autotrader"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-sm text-sm sm:text-base font-medium h-full flex items-center justify-center py-2"
            >
              Auto-Trade
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {activeTab === 'trade' && (
                <TabsContent
                    key="trade"
                    value="trade"
                    className="flex-1 flex flex-col overflow-hidden m-0 relative min-h-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                  <div className="p-3 sm:p-4 border-b bg-gray-50 shrink-0 min-h-[60px] flex items-center">
                    <TradeTypeSelector.Button
                        selectedType={tradeType}
                        onClick={onOpenTradeTypeSelector}
                        className="w-full h-10 sm:h-12 text-sm sm:text-base"
                    />
                  </div>

                  <div className="flex-1 overflow-hidden relative min-h-0">
                    <ScrollArea className="h-full w-full">
                      <TradeExecution
                          tradeType={tradeType}
                          selectedMarket={selectedMarket}
                          aiPrediction={aiPrediction}
                      />
                    </ScrollArea>
                  </div>
                </TabsContent>
            )}

            {activeTab === 'autotrader' && (
                <TabsContent
                    key="autotrader"
                    value="autotrader"
                    className="flex-1 flex flex-col overflow-hidden m-0 min-h-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                  <ScrollArea className="h-full w-full">
                    <AutoTraderPanel selectedMarket={selectedMarket} />
                  </ScrollArea>
                </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
      
      </div>
  );
};

export default TradePanel;