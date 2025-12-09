import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronDown, Search, Star, Globe, Coins, ChevronRight, ChevronLeft, X,  } from 'lucide-react';
import { useDerivAPI } from '@/contexts/DerivContext';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Sparkline from '@/components/Sparkline';
import { cn } from '@/lib/utils';
import {CandleWithImage, CryptoIcon, Forex, GlobalImage, Gold, StockChart} from "@/components/CandleWithImage.jsx";
// Simple custom debounce hook to avoid external dependency
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue];
}

const currencyToCountry = {
  'EUR': 'eu',
  'USD': 'us',
  'GBP': 'gb',
  'JPY': 'jp',
  'AUD': 'au',
  'CAD': 'ca',
  'CHF': 'ch',
  'NZD': 'nz',
  'SGD': 'sg',
  'NOK': 'no',
  'SEK': 'se',
  'DKK': 'dk',
  'PLN': 'pl',
  'CZK': 'cz',
  'HUF': 'hu',
  'ILS': 'il',
  'ZAR': 'za',
  'TRY': 'tr',
  'MXN': 'mx',
  'HKD': 'hk',
  'KRW': 'kr',
  'INR': 'in',
  'CNY': 'cn',
  'BRL': 'br',
  'RUB': 'ru',
  'THB': 'th',
  'MYR': 'my',
  'IDR': 'id',
  'PHP': 'ph',
  'VND': 'vn',
  'AED': 'ae',
  'SAR': 'sa',
  'KWD': 'kw',
  'QAR': 'qa',
  'OMR': 'om',
  'BHD': 'bh',
  'JOD': 'jo',
  'LBP': 'lb',
  'EGP': 'eg',
  // Add more as needed
};

const MarketIcon = ({ market, flags, className }) => {
  if (market === 'forex' && flags?.length === 2) {
    return (
      <div className="flex -space-x-2 overflow-hidden">
        {flags.map(flag => {
          const countryCode = currencyToCountry[flag.toUpperCase()] || flag.toLowerCase();
          return (
            <img
              key={flag}
              className="inline-block h-6 w-6 rounded-full"
              src={`/flags/${countryCode}.svg`}
              alt={flag}
            />
          );
        })}
      </div>
    );
  }
 
  const icons = {
    forex: Forex,
    indices: StockChart,
    synthetic_index: CandleWithImage,
    commodities: Gold,
    cryptocurrency: CryptoIcon,
  };
  const Icon = icons[market] || Globe;
  return <Icon className={cn("h-5 w-5 text-gray-500", className)} />;
};

const MarketRow = ({ symbol, onSelect, history, className }) => {
    const isUp = history && history.length > 1 && history[history.length - 1].value > history[0].value;
    const color = isUp ? 'text-green-500' : 'text-red-500';
    return (
        <Button
            variant="ghost"
            className={cn("w-full justify-between h-auto p-4 md:p-2 border-b border-gray-100 hover:bg-gray-50 rounded-lg mx-2 mt-1", className)}
            onClick={() => onSelect(symbol)}
        >
            <div className="flex items-center gap-4">
                <MarketIcon market={symbol.market} flags={symbol.flags} className="h-8 w-8 md:h-6 md:w-6 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base md:text-sm truncate">{symbol.name}</p>
                  <p className="text-xs text-gray-500 hidden md:block">{symbol.market_display_name}</p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1 md:flex-row md:gap-4 md:items-center">
                <div className="w-24 h-5 md:w-20 md:h-6">
                    <Sparkline data={history} color={isUp ? '#22c55e' : '#ef4444'} />
                </div>
                <div className="flex items-center text-xs">
                  <span className={cn("sr-only", color)}>{isUp ? 'Uptrend' : 'Downtrend'}</span>
                </div>
                <Star className="h-5 w-5 text-gray-300 hover:text-yellow-400 self-end md:self-auto" />
            </div>
        </Button>
    );
};

const SubmarketButton = ({ subKey, label, activeCategory, onClick }) => (
  <Button
    variant={activeCategory === subKey ? 'secondary' : 'ghost'}
    className="w-full justify-start pl-8 text-sm font-medium text-gray-600 px-3 py-2"
    onClick={() => onClick(subKey)}
  >
    {label}
  </Button>
);

const CategoryButtonMobile = ({ catKey, catLabel, icon: Icon, activeCategory, onClick, hasSubs }) => (
  <Button
    variant={activeCategory === catKey || activeCategory.startsWith(`${catKey}_`) ? 'secondary' : 'ghost'}
    size="sm"
    className="w-full justify-start text-sm font-medium px-3 py-3 rounded-md mb-1 flex items-center gap-2 min-h-[48px]"
    onClick={onClick}
  >
    <Icon className="h-4 w-4" />
    {catLabel}
    {hasSubs && <ChevronRight className="h-4 w-4 ml-auto" />}
  </Button>
);

const NoMarkets = ({ isShowingSubs, debouncedSearchQuery, onClearSearch }) => (
  <div className="flex items-center justify-center h-48 text-gray-500 text-base text-center px-4 bg-gray-50 rounded-lg m-4">
    <div>
      <p>{isShowingSubs ? `Select a subcategory to view markets` : `No markets found${debouncedSearchQuery ? ` for "${debouncedSearchQuery}"` : ''}`}</p>
      {debouncedSearchQuery && <p className="text-sm mt-1">Try "EUR/USD" or "Volatility".</p>}
      {debouncedSearchQuery && (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3" 
          onClick={onClearSearch}
        >
          Clear Search
        </Button>
      )}
    </div>
  </div>
);

const MarketSelector = ({ selectedMarket, setSelectedMarket }) => {
  const { activeSymbols, tickData, marketHistory } = useDerivAPI();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [activeCategory, setActiveCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['derived']));
  const [expandedSubcategories, setExpandedSubcategories] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [navigationStack, setNavigationStack] = useState([]); // For mobile back navigation

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    setIsMobile(media.matches);
    const listener = (e) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const { categories, subcategoriesByCategory, symbolsBySubcategory } = useMemo(() => {
    if (!activeSymbols.length) return { categories: [], subcategoriesByCategory: {}, symbolsBySubcategory: {} };
    const categoryMap = new Map();
    const subcategoriesMap = new Map();
    const symbolsMap = {};
    activeSymbols.forEach(rawSymbol => {
      const processedSymbol = {
        ...rawSymbol,
        id: rawSymbol.symbol,
        name: rawSymbol.display_name,
        flags: rawSymbol.market === 'forex' && rawSymbol.display_name.includes('/')
          ? rawSymbol.display_name.split('/')
          : [],
      };
      const catKey = processedSymbol.market_display_name.toLowerCase().replace(/\s/g, '_');
      const catLabel = processedSymbol.market_display_name;
      let iconComponent;
      if (processedSymbol.market === 'forex') iconComponent = Forex;
      else if (processedSymbol.market === 'indices') iconComponent = StockChart;
      else if (processedSymbol.market === 'cryptocurrency') iconComponent = CryptoIcon ;
      else if (processedSymbol.market === 'commodities') iconComponent = Gold;
      else iconComponent = GlobalImage;
      if (!categoryMap.has(catKey)) {
        categoryMap.set(catKey, {
          key: catKey,
          label: catLabel,
          icon: iconComponent
        });
      }
      // For Derived, use subgroup_display_name as subcategory; for others, use submarket_display_name
      let subKey, subLabel;
      if (processedSymbol.market === 'synthetic_index') {
        subKey = processedSymbol.subgroup_display_name.toLowerCase().replace(/\s/g, '_');
        subLabel = processedSymbol.subgroup_display_name;
      } else {
        subKey = processedSymbol.submarket_display_name.toLowerCase().replace(/\s/g, '_');
        subLabel = processedSymbol.submarket_display_name;
      }
      subKey = subKey === 'none' ? 'all' : subKey; // Treat 'none' as 'all' for no sub
      subLabel = subLabel === 'none' ? 'All' : subLabel;
      if (!subcategoriesMap.has(catKey)) {
        subcategoriesMap.set(catKey, new Map());
      }
      if (!subcategoriesMap.get(catKey).has(subKey)) {
        subcategoriesMap.get(catKey).set(subKey, {
          key: subKey,
          label: subLabel,
        });
      }
     
      const fullSubKey = `${catKey}_${subKey}`;
      if (!symbolsMap[fullSubKey]) {
        symbolsMap[fullSubKey] = [];
      }
      symbolsMap[fullSubKey].push(processedSymbol);
    });
    let categories = Array.from(categoryMap.values());
    // Preferred order: Derived first
    const preferredOrder = [
      'derived',
      'forex',
      'stock_indices',
      'commodities',
      'cryptocurrencies'
    ];
    categories = categories.sort((a, b) => {
      const indexA = preferredOrder.indexOf(a.key);
      const indexB = preferredOrder.indexOf(b.key);
      return (indexA === -1 ? preferredOrder.length : indexA) - (indexB === -1 ? preferredOrder.length : indexB);
    });
    const subcategoriesByCategory = {};
    subcategoriesMap.forEach((subs, catKey) => {
      subcategoriesByCategory[catKey] = Array.from(subs.values()).sort((a, b) => a.label.localeCompare(b.label));
    });
    return {
      categories,
      subcategoriesByCategory,
      symbolsBySubcategory: symbolsMap
    };
  }, [activeSymbols]);

  const rawFilteredSymbols = useMemo(() => {
    if (debouncedSearchQuery) {
      return activeSymbols
        .map(rawSymbol => ({
          ...rawSymbol,
          id: rawSymbol.symbol,
          name: rawSymbol.display_name,
          flags: rawSymbol.market === 'forex' && rawSymbol.display_name.includes('/')
            ? rawSymbol.display_name.split('/')
            : [],
        }))
        .filter(symbol => symbol.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
    } else {
      return (symbolsBySubcategory[activeCategory] || []);
    }
  }, [activeSymbols, symbolsBySubcategory, activeCategory, debouncedSearchQuery]);

  const filteredSymbols = useMemo(() => rawFilteredSymbols.sort((a, b) => a.display_order - b.display_order), [rawFilteredSymbols]);

  const groupedSymbols = useMemo(() => {
    if (debouncedSearchQuery || !activeCategory.startsWith('derived')) {
      return { groups: [], symbols: filteredSymbols };
    }
    const groups = {};
    rawFilteredSymbols.forEach(symbol => {
      const sub = symbol.submarket_display_name || 'Uncategorized';
      if (!groups[sub]) {
        groups[sub] = [];
      }
      groups[sub].push(symbol);
    });
    const sortedGroups = Object.entries(groups).map(([name, syms]) => ({
      name,
      symbols: syms.sort((a, b) => a.display_order - b.display_order)
    }));
    return { groups: sortedGroups, symbols: [] };
  }, [rawFilteredSymbols, activeCategory, debouncedSearchQuery, filteredSymbols]);

  // Set default active category for desktop
  useEffect(() => {
    if (categories.length && !activeCategory && !isMobile) {
      setActiveCategory(categories[0].key);
    }
  }, [categories, activeCategory, isMobile]);

  // Set default expansions for mobile tree
  useEffect(() => {
    if (categories.length && isMobile) {
      const firstCatKey = categories[0].key;
      setExpandedCategories(prev => new Set([firstCatKey])); // Single expansion
      const firstSubs = subcategoriesByCategory[firstCatKey] || [];
      if (firstSubs.length > 0) {
        const firstSubKey = firstSubs[0].key;
        const firstFullKey = `${firstCatKey}_${firstSubKey}`;
        setExpandedSubcategories(prev => new Set([firstFullKey])); // Expand first sub
        setNavigationStack([{ type: 'sub', key: firstFullKey }]);
      }
    }
  }, [categories, subcategoriesByCategory, isMobile]);

  const currentCat = activeCategory.includes('_') ? activeCategory.split('_')[0] : activeCategory;
  const currentSubs = subcategoriesByCategory[currentCat] || [];
  const isShowingSubs = currentSubs.length > 0 && !activeCategory.includes('_') && activeCategory !== '';

  const toggleExpanded = useCallback((catKey) => {
    setExpandedCategories(prev => {
      const newSet = new Set();
      if (prev.has(catKey)) {
        // Collapse
      } else {
        newSet.add(catKey);
      }
      return newSet;
    });
    // Collapse all subs when category changes
    setExpandedSubcategories(new Set());
    setNavigationStack([]); // Reset navigation on category change
  }, []);

  const toggleExpandedSub = useCallback((fullSubKey) => {
    setExpandedSubcategories(prev => {
      const newSet = new Set();
      if (prev.has(fullSubKey)) {
        // Collapse
      } else {
        newSet.add(fullSubKey);
      }
      return newSet;
    });
    // Push to navigation stack for back button
    setNavigationStack(prev => [...prev, { type: 'sub', key: fullSubKey }]);
  }, []);

  const handleBack = useCallback(() => {
    if (navigationStack.length > 0) {
      const last = navigationStack[navigationStack.length - 1];
      if (last.type === 'sub') {
        setExpandedSubcategories(prev => {
          const newSet = new Set(prev);
          newSet.delete(last.key);
          return newSet;
        });
      }
      setNavigationStack(prev => prev.slice(0, -1));
    }
  }, [navigationStack]);

  const [priceInfo, setPriceInfo] = useState({ price: '...', change: '...', pctChange: '...', isUp: true });
  useEffect(() => {
      if (selectedMarket && tickData[selectedMarket.id]) {
          const tick = tickData[selectedMarket.id];
          const history = marketHistory[selectedMarket.id];
          const pip = Number(selectedMarket.pip);
          let decimals = 4; // default
          if (pip === 0.00001) decimals = 5;
          else if (pip === 0.0001) decimals = 4;
          else if (pip === 0.001) decimals = 3;
          else if (pip === 0.01) decimals = 2;
          else if (pip === 0.1) decimals = 1;
         
          const price = tick.quote.toFixed(decimals);
         
          if (history && history.length > 0) {
              const openPrice = history[0].value;
              const change = (tick.quote - openPrice).toFixed(decimals);
              const pctChange = ((tick.quote - openPrice) / openPrice * 100).toFixed(2);
              setPriceInfo({ price, change, pctChange, isUp: tick.quote >= openPrice });
          } else {
              setPriceInfo({ price, change: '...', pctChange: '...', isUp: true });
          }
      }
  }, [selectedMarket, tickData, marketHistory]);

  const hasSymbols = rawFilteredSymbols.length > 0;

  const handleSelect = useCallback((s) => {
    setSelectedMarket(s);
    setOpen(false);
  }, [setSelectedMarket]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setExpandedCategories(new Set(['derived'])); // Reset to default on clear
    setExpandedSubcategories(new Set());
    setNavigationStack([]);
  }, []);

  const renderSymbolsForSub = useCallback((fullSubKey, catKey) => {
    const symbols = symbolsBySubcategory[fullSubKey] || [];
    if (symbols.length === 0) return null;
    if (catKey === 'derived') {
      const groups = {};
      symbols.forEach(symbol => {
        const submarket = symbol.submarket_display_name || 'Uncategorized';
        if (!groups[submarket]) groups[submarket] = [];
        groups[submarket].push(symbol);
      });
      const sortedGroups = Object.entries(groups)
        .map(([name, syms]) => ({
          name,
          symbols: syms.sort((a, b) => a.display_order - b.display_order),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return sortedGroups.map(({ name, symbols: groupSymbols }) => (
        <div key={name} className="mb-4">
          <div className="px-6 py-3 bg-gray-50 font-semibold text-sm uppercase text-gray-600 flex items-center gap-2 border-l-2 border-blue-200 ml-2 rounded-r-lg">
            <div className="w-1 h-4 bg-blue-500 rounded" />
            {name} ({groupSymbols.length})
          </div>
          <div className="space-y-1">
            {groupSymbols.map((symbol) => (
              <MarketRow
                key={symbol.id}
                symbol={symbol}
                history={marketHistory[symbol.id]}
                onSelect={handleSelect}
                className="ml-4"
              />
            ))}
          </div>
        </div>
      ));
    } else {
      const sortedSymbols = symbols.sort((a, b) => a.display_order - b.display_order);
      return (
        <div className="space-y-1">
          {sortedSymbols.map((symbol) => (
            <MarketRow
              key={symbol.id}
              symbol={symbol}
              history={marketHistory[symbol.id]}
              onSelect={handleSelect}
              className="ml-4"
            />
          ))}
        </div>
      );
    }
  }, [symbolsBySubcategory, marketHistory, handleSelect]);

  const renderTree = () => (
    <div className="space-y-2">
      {categories.map(({ key: catKey, label: catLabel, icon: Icon }) => {
        const isCatExpanded = expandedCategories.has(catKey);
        const subs = subcategoriesByCategory[catKey] || [];
        return (
          <div key={catKey} className="mb-3">
            <CategoryButtonMobile
              catKey={catKey}
              catLabel={catLabel}
              icon={Icon}
              activeCategory={activeCategory}
              onClick={() => toggleExpanded(catKey)}
              hasSubs={subs.length > 0}
            />
            {isCatExpanded && subs.length > 0 && (
              <div className="ml-6 space-y-2 mt-2">
                {subs.map(({ key: subKey, label: subLabel }) => {
                  const fullSubKey = `${catKey}_${subKey}`;
                  const isSubExpanded = expandedSubcategories.has(fullSubKey);
                  const subSymbols = symbolsBySubcategory[fullSubKey] || [];
                  return (
                    <div key={subKey} className="space-y-2">
                      <Button
                        variant={isSubExpanded ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start pl-6 pr-4 py-3 text-sm font-medium rounded-lg bg-white shadow-sm border hover:shadow-md transition-shadow min-h-[48px]",
                          isSubExpanded && "border-l-4 border-blue-500 bg-blue-50"
                        )}
                        onClick={() => toggleExpandedSub(fullSubKey)}
                      >
                        <span className="flex-1 text-left">{subLabel}</span>
                        {subSymbols.length > 0 && (
                          <ChevronRight className={cn("h-4 w-4 ml-auto transition-transform duration-200", isSubExpanded ? 'rotate-90' : '')} />
                        )}
                      </Button>
                      {isSubExpanded && renderSymbolsForSub(fullSubKey, catKey)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderSymbolsList = () => {
    if (groupedSymbols.symbols.length > 0) {
      return groupedSymbols.symbols.map((symbol) => (
        <MarketRow
          key={symbol.id}
          symbol={symbol}
          history={marketHistory[symbol.id]}
          onSelect={handleSelect}
        />
      ));
    } else {
      return groupedSymbols.groups.map(({ name, symbols }) => (
        <div key={name} className="mb-4">
          <div className="px-4 py-3 bg-gray-50 font-semibold text-sm uppercase text-gray-600 flex items-center gap-2 border-l-2 border-blue-200 rounded-r-lg">
            <div className="w-1 h-4 bg-blue-500 rounded" />
            {name} ({symbols.length})
          </div>
          <div className="space-y-1">
            {symbols.map((symbol) => (
              <MarketRow
                key={symbol.id}
                symbol={symbol}
                history={marketHistory[symbol.id]}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      ));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[320px] justify-between p-3 h-auto bg-white shadow-md border-gray-200"
        >
          {selectedMarket ? (
            <div className="flex items-center gap-3">
              <MarketIcon market={selectedMarket.market} flags={selectedMarket.flags} />
              <div className="flex flex-col items-start flex-1 min-w-0">
                <p className="font-bold text-base md:text-sm truncate">{selectedMarket.name}</p>
                <div className={cn("flex items-center text-sm md:text-xs", priceInfo.isUp ? 'text-green-500' : 'text-red-500')}>
                  <span>{priceInfo.price}</span>
                  <span className="ml-2">{priceInfo.change}</span>
                  <span className="ml-1">({priceInfo.pctChange}%)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-gray-400" />
              <span className="text-base">Select market...</span>
            </div>
          )}
          <ChevronDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(
        "w-full max-h-[90vh] md:w-[600px] md:h-[450px] p-0 max-w-none h-auto overflow-hidden",
        isMobile ? "max-w-full h-[90vh] md:max-h-[450px]" : ""
      )} align="start">
        <div className="flex flex-col h-full md:flex-row">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-[200px] bg-gray-50/50 border-r p-2 flex-shrink-0">
            <div className="space-y-1 mt-2">
              {categories.map(({ key: catKey, label: catLabel, icon: Icon }) => {
                const isExpanded = expandedCategories.has(catKey);
                const subs = subcategoriesByCategory[catKey] || [];
                const hasSubs = subs.length > 0;
                return (
                  <div key={catKey}>
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-sm font-medium"
                      onClick={() => {
                        if (hasSubs) {
                          toggleExpanded(catKey);
                        } else {
                          setActiveCategory(catKey);
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <Icon className="mr-2 h-4 w-4" />
                        {catLabel}
                      </div>
                      {hasSubs && (
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isExpanded ? 'rotate-90' : ''
                          )}
                        />
                      )}
                    </Button>
                    {hasSubs && isExpanded && (
                      <div className="ml-4 space-y-1 mt-1 border-l border-gray-200 pl-2">
                        {subs.map(({ key: subKey, label: subLabel }) => (
                          <SubmarketButton
                            key={subKey}
                            subKey={`${catKey}_${subKey}`}
                            label={subLabel}
                            activeCategory={activeCategory}
                            onClick={setActiveCategory}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Sticky header for mobile & desktop search */}
            <div className="sticky top-0 bg-white border-b z-10 p-4 flex-shrink-0 block md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <div className="relative flex">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg flex-1"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {navigationStack.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-blue-600 text-sm"
                  onClick={handleBack}
                >
                  <ChevronLeft className="h-4 w-4 mr-1 inline" />
                  Back
                </Button>
              )}
            </div>

            {/* Desktop Search */}
            <div className="hidden md:block p-4 border-b flex-shrink-0 bg-white">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
                />
              </div>
            </div>

            <ScrollArea 
              className="flex-1 min-h-0 pb-4" 
              style={{ 
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }} 
            >
              <div className="p-4 space-y-0">
                {debouncedSearchQuery ? (
                  hasSymbols ? (
                    renderSymbolsList()
                  ) : (
                    <NoMarkets isShowingSubs={false} debouncedSearchQuery={debouncedSearchQuery} onClearSearch={handleClearSearch} />
                  )
                ) : isMobile ? (
                  renderTree()
                ) : (
                  hasSymbols ? (
                    renderSymbolsList()
                  ) : (
                    <NoMarkets isShowingSubs={isShowingSubs} debouncedSearchQuery={debouncedSearchQuery} onClearSearch={handleClearSearch} />
                  )
                )}
              </div>
              <ScrollBar orientation="vertical" className="w-2 bg-gray-200" />
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MarketSelector;