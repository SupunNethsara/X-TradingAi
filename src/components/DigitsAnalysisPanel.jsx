// src/components/digits/DigitsAnalysisPanel.jsx
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';

const TICK_COUNTS = [25, 50, 100, 150, 200];

const getLastDigit = (value) => {
  if (value == null) return null;
  return parseInt(String(value).slice(-1), 10) || 0;
};

export const DigitsAnalysisPanel = ({
  chartData = [],
  selectedTickCount = 100,
  setSelectedTickCount,
  recentDigits = [],
  selectedDigit,
  onSelectDigit,
}) => {
  const availableTicks = Math.min(selectedTickCount, chartData.length);
  const recentData = useMemo(() => chartData.slice(-availableTicks), [chartData, availableTicks]);

  const { digitStats, percentages, maxPerc, minPerc, hotDigit, coldDigits } = useMemo(() => {
    const stats = Array(10).fill(0);
    recentData.forEach((tick) => {
      const d = getLastDigit(tick?.value);
      if (d !== null) stats[d]++;
    });

    const percs = stats.map(count => availableTicks > 0 ? (count / availableTicks) * 100 : 0);
    const maxP = Math.max(...percs, 0);
    const minP = Math.min(...percs);

    const hot = percs.indexOf(maxP);
    const colds = percs
      .map((p, i) => (p === minP ? i : null))
      .filter(i => i !== null);

    return {
      digitStats: stats,
      percentages: percs,
      maxPerc: maxP,
      minPerc: minP,
      hotDigit: hot,
      coldDigits: colds,
    };
  }, [recentData, availableTicks]);

  const total = availableTicks;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-y-auto">
      {/* ====== RECENT DIGITS CAROUSEL - NOW SCROLLS WITH CONTENT ====== */}
      <div className="px-6 pt-20 md:pt-24 pb-8 bg-gradient-to-b from-white via-white to-transparent">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {recentDigits.slice(0, 12).map((digit, i) => (
            <div
              key={i}
              onClick={() => onSelectDigit?.(digit)}
              className={`relative rounded-full font-black text-white shadow-2xl transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center border-4 border-white/70 ${
                i === 0
                  ? 'w-16 h-16 text-4xl bg-gradient-to-br from-blue-500 to-blue-600 ring-4 ring-blue-300/50'
                  : 'w-14 h-14 text-3xl bg-gradient-to-br from-gray-800 to-black'
              }`}
            >
              {digit}
              {i === 0 && <div className="absolute inset-0 rounded-full bg-blue-400 opacity-40 animate-ping"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Tick Count Buttons */}
      <div className="flex justify-center gap-3 px-4">
        {TICK_COUNTS.map((count) => (
          <Button
            key={count}
            variant={selectedTickCount === count ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTickCount(count)}
            className={`rounded-full font-bold min-w-14 h-10 ${selectedTickCount === count ? 'bg-black text-white' : 'bg-white'}`}
          >
            {count}t
          </Button>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 mt-8 pb-20">
        {/* BAR CHART */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <h3 className="text-center text-lg font-semibold text-gray-600 mb-8">
            LAST {total} TICKS DISTRIBUTION
          </h3>
          <div className="grid grid-cols-10 gap-3">
            {percentages.map((percentage, index) => {
              const count = digitStats[index];
              const isSelected = selectedDigit === index;
              const isHot = index === hotDigit;
              const isCold = coldDigits.includes(index);

              const barHeight = maxPerc > 0
                ? count > 0
                  ? Math.max((percentage / maxPerc) * 100, 5)
                  : 0
                : 0;

              const barColor = isSelected
                ? 'bg-blue-500 ring-4 ring-blue-300'
                : isHot
                ? 'bg-emerald-500 ring-4 ring-emerald-300'
                : isCold
                ? 'bg-red-500 ring-4 ring-red-300'
                : 'bg-gray-400';

              const textColor = isSelected
                ? 'text-blue-600'
                : isHot
                ? 'text-emerald-600'
                : isCold
                ? 'text-red-600'
                : 'text-gray-700';

              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-end h-72 cursor-pointer group"
                  onClick={() => onSelectDigit?.(index)}
                >
                  <div className={`mb-2 text-sm font-bold ${textColor}`}>
                    {percentage.toFixed(1)}%
                  </div>
                  <div
                    className={`relative w-full rounded-t-2xl shadow-lg transition-all duration-500 hover:shadow-2xl ${barColor}`}
                    style={{ height: `${barHeight}%` }}
                  >
                    <div className="absolute inset-0 rounded-t-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </div>
                  <div className={`mt-4 text-2xl font-black ${textColor} transition-all hover:scale-125`}>
                    {index}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DOUGHNUT CHART - unchanged */}
        <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100 flex flex-col items-center justify-center">
          {/* ... your existing doughnut SVG code ... */}
          <div className="relative">
            <svg viewBox="0 0 240 240" className="w-64 h-64">
              <circle cx="120" cy="120" r="110" fill="none" stroke="#f1f5f9" strokeWidth="22" />
              {(() => {
                let start = -Math.PI / 2;
                return digitStats.map((count, i) => {
                  if (count === 0) return null;
                  const angle = (count / total) * Math.PI * 2;
                  const end = start + angle;
                  const large = angle > Math.PI ? 1 : 0;
                  const x1 = 120 + 105 * Math.cos(start);
                  const y1 = 120 + 105 * Math.sin(start);
                  const x2 = 120 + 105 * Math.cos(end);
                  const y2 = 120 + 105 * Math.sin(end);
                  start = end;
                  return (
                    <path
                      key={i}
                      d={`M120,120 L${x1},${y1} A105,105 0 ${large},1 ${x2},${y2} Z`}
                      fill={i === hotDigit ? '#10b981' : '#e2e8f0'}
                      stroke="#fff"
                      strokeWidth={i === hotDigit ? 6 : 3}
                    />
                  );
                });
              })()}
              <circle cx="120" cy="120" r="78" fill="white" />
              <text x="120" y="108" textAnchor="middle" className="text-5xl font-black fill-gray-800">{total}</text>
              <text x="120" y="135" textAnchor="middle" className="text-lg fill-gray-500 font-medium">ticks</text>
            </svg>

            {total > 0 && (
              <div className="absolute -top-6 right-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-full shadow-2xl font-black text-2xl border-4 border-white">
                Hot Digit: {hotDigit}
                <br />
                <span className="text-3xl">{percentages[hotDigit].toFixed(1)}%</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 text-sm">
            {digitStats.map((count, i) => count > 0 && (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full shadow-md ${i === hotDigit ? 'ring-4 ring-emerald-400' : ''}`}
                  style={{ backgroundColor: i === hotDigit ? '#10b981' : '#e2e8f0' }}
                />
                <span className={i === hotDigit ? 'font-bold text-emerald-700' : 'text-gray-600'}>
                  {i} ({percentages[i].toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};