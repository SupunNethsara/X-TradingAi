import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

const DerivContext = createContext();

export const useDerivAPI = () => {
  const context = useContext(DerivContext);
  if (!context) {
    throw new Error('useDerivAPI must be used within DerivProvider');
  }
  return context;
};

const mapCategory = (market) => {
  const map = {
    synthetic_index: 'Derived',
    forex: 'Forex',
    indices: 'Stock Indices',
    commodities: 'Commodities',
    cryptocurrency: 'Cryptocurrencies',
  };
  return map[market] || market;
};

const mapSubcategory = (submarket, subgroup, market) => {
  const map = {
    major_pairs: 'Major Pairs',
    minor_pairs: 'Minor Pairs',
    smart_fx: 'Smart FX',
    basket_index: 'Basket Indices',
    derived_fx: 'Derived FX',
    jump_index: 'Jump Indices',
    volidx: 'Volatility Indices',
    crashdraw: 'Crash/Boom',
  };
  return map[submarket] || map[subgroup] || map[market] || submarket;
};

export const DerivProvider = ({ children }) => {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [activeSymbols, setActiveSymbols] = useState([]);
  const [tickData, setTickData] = useState({});
  const [marketHistory, setMarketHistory] = useState({});
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const historyCallback = useRef(null);
  const streamSubscriptions = useRef(new Map());
  const apiCallbacks = useRef(new Map());
  const reqId = useRef(0);

  const sendRequest = useCallback((request) => {
    return new Promise((resolve, reject) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        reqId.current += 1;
        const currentReqId = reqId.current;
        apiCallbacks.current.set(currentReqId, { resolve, reject });
        ws.current.send(JSON.stringify({ ...request, req_id: currentReqId }));
      } else {
        reject(new Error('WebSocket not connected'));
      }
    });
  }, []);

  const fetchAllMarketHistory = useCallback(async (symbols) => {
    const delayMs = 150;
    const allResults = [];

    for (const symbol of symbols) {
      try {
        const data = await sendRequest({
          ticks_history: symbol.id,
          end: 'latest',
          count: 50,
          style: 'ticks',
        });
        if (data.history) {
          allResults.push({ symbol: symbol.id, history: data.history });
        }
      } catch (err) {}
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const newHistory = {};
    allResults.forEach(({ symbol, history }) => {
      const prices = history.prices.map((price, index) => ({
        time: history.times[index] * 1000,
        value: parseFloat(price),
      }));
      newHistory[symbol] = prices;
    });
    setMarketHistory((prev) => ({ ...prev, ...newHistory }));
  }, [sendRequest]);

  const forgetStream = useCallback((streamId) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && streamId) {
      ws.current.send(JSON.stringify({ forget: streamId }));
    }
  }, []);

  const fetchActiveSymbols = useCallback(
    async (retries = 3, delay = 100) => {
      for (let i = 0; i < retries; i++) {
        try {
          if (ws.current?.readyState !== WebSocket.OPEN) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          const response = await sendRequest({
            active_symbols: 'full',
            product_type: 'basic',
          });
          return response;
        } catch (error) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
      }
    },
    [sendRequest],
  );

  useEffect(() => {
    ws.current = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=114864');

    ws.current.onopen = () => {
      setConnected(true);
      setTimeout(() => {
        fetchActiveSymbols().then((response) => {
          if (response && response.active_symbols) {
            const processedSymbols = response.active_symbols
              .map((s) => {
                const {
                  symbol: id,
                  display_name: name,
                  market,
                  market_display_name: marketDisplay,
                  subgroup,
                  subgroup_display_name: subgroupDisplay,
                  submarket,
                  submarket_display_name: submarketDisplay,
                  exchange_is_open: isOpen,
                  is_trading_suspended: isSuspended,
                } = s;
                let flags = [];
                let category = marketDisplay || mapCategory(market);
                let subcategory =
                  submarketDisplay || subgroupDisplay || mapSubcategory(submarket, subgroup, market);

                if (market === 'forex') {
                  const pair = name.replace(/\/|\s/g, '');
                  const base = pair.slice(0, 3);
                  const quote = pair.slice(3, 6);
                  flags = [base, quote];
                }

                return {
                  id,
                  name,
                  category,
                  subcategory,
                  flags,
                  market,
                  display_order: s.display_order,
                  pip: s.pip,
                  isOpen,
                  isSuspended,
                  ...s,
                };
              })
              .sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name));

            setActiveSymbols(processedSymbols);
            setTimeout(() => fetchAllMarketHistory(processedSymbols), 100);
          }
        }).catch((err) => {});
      }, 0);
    };

    ws.current.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

      if (data.req_id && apiCallbacks.current.has(data.req_id)) {
        const { resolve, reject } = apiCallbacks.current.get(data.req_id);
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data);
        }
        apiCallbacks.current.delete(data.req_id);
        if (data.msg_type === 'active_symbols') {
          const processedSymbols = data.active_symbols
            .map((s) => {
              const {
                symbol: id,
                display_name: name,
                market,
                market_display_name: marketDisplay,
                subgroup,
                subgroup_display_name: subgroupDisplay,
                submarket,
                submarket_display_name: submarketDisplay,
                exchange_is_open: isOpen,
                is_trading_suspended: isSuspended,
              } = s;
              let flags = [];
              let category = marketDisplay || mapCategory(market);
              let subcategory =
                submarketDisplay || subgroupDisplay || mapSubcategory(submarket, subgroup, market);

              if (market === 'forex') {
                const pair = name.replace(/\/|\s/g, '');
                const base = pair.slice(0, 3);
                const quote = pair.slice(3, 6);
                flags = [base, quote];
              }

              return {
                id,
                name,
                category,
                subcategory,
                flags,
                market,
                display_order: s.display_order,
                pip: s.pip,
                isOpen,
                isSuspended,
                ...s,
              };
            })
            .sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name));

          setActiveSymbols(processedSymbols);
          setTimeout(() => fetchAllMarketHistory(processedSymbols), 100);
        }
        return;
      }

      if (data.error) {
        if (data.error.code !== 'AlreadySubscribed') {
        }
        return;
      }

      const subId = data.subscription?.id;

      switch (data.msg_type) {
        case 'tick':
          setTickData((prev) => ({ ...prev, [data.tick.symbol]: data.tick }));
          if (subId) streamSubscriptions.current.set(`ticks-${data.tick.symbol}`, subId);
          break;
        case 'history':
          if (data.history) {
            const history = data.history.prices.map((price, index) => ({
              time: data.history.times[index] * 1000,
              value: parseFloat(price),
            }));
            if (historyCallback.current && typeof historyCallback.current === 'function')
              historyCallback.current(history);
          }
          break;
        case 'candles':
          if (data.candles) {
            const candles = data.candles.map((c) => ({
              time: parseInt(c.epoch) * 1000,
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
            }));
            if (historyCallback.current && typeof historyCallback.current === 'function')
              historyCallback.current(candles);
            if (subId) streamSubscriptions.current.set(`candles-${data.echo_req.ticks_history}`, subId);
          }
          break;
        case 'ohlc':
          if (data.ohlc) {
            const candle = {
              time: parseInt(data.ohlc.open_time) * 1000,
              open: parseFloat(data.ohlc.open),
              high: parseFloat(data.ohlc.high),
              low: parseFloat(data.ohlc.low),
              close: parseFloat(data.ohlc.close),
            };
            if (historyCallback.current && typeof historyCallback.current === 'function')
              historyCallback.current([candle], true);
            if (subId) streamSubscriptions.current.set(`candles-${data.ohlc.symbol}`, subId);
          }
          break;
        case 'authorize':
          setUser(data.authorize);
          break;
        default:
          break;
      }
    };

    ws.current.onerror = (err) => {
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to Deriv API',
        variant: 'destructive',
      });
    };

    ws.current.onclose = () => {
      setConnected(false);
    };
    const websocket = ws.current;
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [toast, fetchAllMarketHistory, sendRequest, fetchActiveSymbols]);

  const subscribeTick = useCallback((symbol) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const streamKey = `ticks-${symbol}`;
      if (streamSubscriptions.current.has(streamKey)) {
        return;
      }
      ws.current.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
        }),
      );
    }
  }, []);

  const getHistory = useCallback(
    (symbol, style, granularity, count, callback) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        historyCallback.current = callback;
        const candleStreamKey = `candles-${symbol}`;
        if (streamSubscriptions.current.has(candleStreamKey)) {
          forgetStream(streamSubscriptions.current.get(candleStreamKey));
          streamSubscriptions.current.delete(candleStreamKey);
        }
        ws.current.send(
          JSON.stringify({
            ticks_history: symbol,
            end: 'latest',
            count: count || 1000,
            style: style,
            granularity: granularity,
            subscribe: style === 'candles' ? 1 : undefined,
          }),
        );
      }
    },
    [forgetStream],
  );

  const login = useCallback(
    (token) => {
      return sendRequest({ authorize: token }).catch((error) => {
        toast({
          title: 'Authorization Error',
          description: error.message || 'Failed to authorize with Deriv API',
          variant: 'destructive',
        });
        throw error;
      });
    },
    [sendRequest, toast],
  );

  return (
    <DerivContext.Provider
      value={{
        connected,
        activeSymbols,
        tickData,
        marketHistory,
        user,
        subscribeTick,
        getHistory,
        forgetStream,
        login,
      }}
    >
      {children}
    </DerivContext.Provider>
  );
};