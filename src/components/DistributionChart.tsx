/**
 * Interactive Distribution Chart Component with UFJF Palette & Theme Support
 * Touch-enabled SVG chart with interactive drag/scrubbing of cutoff bounds,
 * shaded probability tails, continuous/discrete modes, and PDF vs CDF toggle.
 */

import React, { useRef, useState } from 'react';
import { DistributionInfo, TailMode } from '../math/distributions';

interface DistributionChartProps {
  dist: DistributionInfo;
  params: Record<string, number>;
  mode: TailMode;
  x1: number;
  x2: number;
  onBoundsChange: (newX1: number, newX2: number) => void;
  showCDF?: boolean;
  theme?: 'light' | 'dark';
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  dist,
  params,
  mode,
  x1,
  x2,
  onBoundsChange,
  showCDF = false,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<'x1' | 'x2' | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; xVal: number; yVal: number } | null>(null);

  // SVG internal coordinate dimensions
  const width = 640;
  const height = 300;
  const padding = { top: 28, right: 30, bottom: 44, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Determine domain range
  const range = dist.getRange(params);
  const xMin = range.min;
  const xMax = range.max;
  const xSpan = Math.max(0.001, xMax - xMin);

  // Coordinate transforms
  const toSvgX = (xVal: number) => {
    return padding.left + ((xVal - xMin) / xSpan) * plotWidth;
  };

  const fromSvgX = (svgX: number) => {
    const clampedSvgX = Math.max(padding.left, Math.min(padding.left + plotWidth, svgX));
    return xMin + ((clampedSvgX - padding.left) / plotWidth) * xSpan;
  };

  // Sample points for the curve or bars
  const numSamples = dist.type === 'discrete' ? Math.min(100, Math.ceil(xSpan) + 1) : 200;
  const points: { x: number; y: number; isInTail: boolean }[] = [];

  let maxY = 0.0001;

  if (dist.type === 'continuous') {
    const step = xSpan / (numSamples - 1);
    for (let i = 0; i < numSamples; i++) {
      const curX = xMin + i * step;
      const curY = showCDF ? dist.cdf(curX, params) : dist.pdf(curX, params);
      if (!isNaN(curY) && isFinite(curY) && curY > maxY) {
        maxY = curY;
      }
    }
  } else {
    // Discrete
    const startInt = Math.floor(xMin);
    const endInt = Math.ceil(xMax);
    for (let k = startInt; k <= endInt; k++) {
      const curY = showCDF ? dist.cdf(k, params) : dist.pdf(k, params);
      if (!isNaN(curY) && isFinite(curY) && curY > maxY) {
        maxY = curY;
      }
    }
  }

  // Add 15% top margin for aesthetics and label room
  maxY = showCDF ? 1.05 : maxY * 1.18;

  const toSvgY = (yVal: number) => {
    return padding.top + plotHeight - (Math.max(0, yVal) / maxY) * plotHeight;
  };

  // Check if an x value is inside the active probability region
  const isInRegion = (val: number): boolean => {
    const low = Math.min(x1, x2);
    const high = Math.max(x1, x2);
    switch (mode) {
      case 'leq':
        return val <= x1;
      case 'geq':
        return val >= x1;
      case 'between':
        return val >= low && val <= high;
      case 'two_tail':
        return val <= low || val >= high;
      case 'equal':
        return dist.type === 'discrete' ? Math.round(val) === Math.round(x1) : Math.abs(val - x1) < 0.02 * xSpan;
    }
  };

  // Build continuous curve path and shaded area path
  let pathD = '';
  let shadedPathD = '';

  if (dist.type === 'continuous') {
    const step = xSpan / (numSamples - 1);

    for (let i = 0; i < numSamples; i++) {
      const curX = xMin + i * step;
      const curY = showCDF ? dist.cdf(curX, params) : dist.pdf(curX, params);
      const sx = toSvgX(curX);
      const sy = toSvgY(curY);

      if (i === 0) {
        pathD += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      } else {
        pathD += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      }

      points.push({ x: curX, y: curY, isInTail: isInRegion(curX) });
    }

    // Build shaded polygon for PDF mode
    if (!showCDF) {
      let inTail = false;

      for (let i = 0; i < numSamples; i++) {
        const pt = points[i];
        const sx = toSvgX(pt.x);
        const sy = toSvgY(pt.y);

        if (pt.isInTail) {
          if (!inTail) {
            inTail = true;
            shadedPathD += `M ${sx.toFixed(1)} ${toSvgY(0).toFixed(1)} L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
          } else {
            shadedPathD += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
          }
        } else {
          if (inTail) {
            inTail = false;
            const prevSx = toSvgX(points[i - 1].x);
            shadedPathD += ` L ${prevSx.toFixed(1)} ${toSvgY(0).toFixed(1)} Z `;
          }
        }
      }
      if (inTail && points.length > 0) {
        const lastSx = toSvgX(points[points.length - 1].x);
        shadedPathD += ` L ${lastSx.toFixed(1)} ${toSvgY(0).toFixed(1)} Z`;
      }
    }
  }

  // Handle Dragging
  const handlePointerDown = (bound: 'x1' | 'x2', e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveDrag(bound);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const svgPointerX = (e.clientX - rect.left) * scaleX;
    const val = fromSvgX(svgPointerX);

    // Update hover inspector
    const clampedVal = dist.type === 'discrete' ? Math.round(val) : val;
    const computedY = showCDF ? dist.cdf(clampedVal, params) : dist.pdf(clampedVal, params);
    setHoverCoord({
      x: toSvgX(clampedVal),
      y: toSvgY(computedY),
      xVal: clampedVal,
      yVal: computedY,
    });

    if (!activeDrag) return;

    if (dist.type === 'discrete') {
      const rounded = Math.round(val);
      if (activeDrag === 'x1') {
        onBoundsChange(rounded, x2);
      } else {
        onBoundsChange(x1, rounded);
      }
    } else {
      const snapped = Math.round(val * 100) / 100;
      if (activeDrag === 'x1') {
        onBoundsChange(snapped, x2);
      } else {
        onBoundsChange(x1, snapped);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // Safe catch
      }
      setActiveDrag(null);
    }
  };

  // Mean indicator
  let meanX: number | null = null;
  const moments = dist.moments(params);
  if (typeof moments.mean === 'number' && !isNaN(moments.mean) && isFinite(moments.mean)) {
    if (moments.mean >= xMin && moments.mean <= xMax) {
      meanX = toSvgX(moments.mean);
    }
  }

  // X Axis Ticks
  const xTicks: { val: number; svgX: number }[] = [];
  const tickCount = 6;
  const tickStep = xSpan / tickCount;
  for (let i = 0; i <= tickCount; i++) {
    const val = xMin + i * tickStep;
    const displayVal = dist.type === 'discrete' ? Math.round(val) : Number(val.toFixed(2));
    xTicks.push({ val: displayVal, svgX: toSvgX(displayVal) });
  }

  // Theme-specific colors (UFJF Blue #003882, Red #C4161C, Gold #D99B00)
  const colors = {
    bgClass: isDark ? 'bg-[#0a1b33] border-[#183664]' : 'bg-white border-slate-200',
    gridStroke: isDark ? '#172c4c' : '#e2e8f0',
    axisStroke: isDark ? '#475569' : '#64748b',
    curveStart: isDark ? '#38bdf8' : '#003882',
    curveMid: isDark ? '#818cf8' : '#1d5db3',
    curveEnd: isDark ? '#f59e0b' : '#c4161c',
    areaStart: isDark ? '#0284c7' : '#003882',
    areaEnd: isDark ? '#f59e0b' : '#d99b00',
    areaOpacityStart: isDark ? '0.45' : '0.35',
    areaOpacityEnd: isDark ? '0.05' : '0.04',
    meanColor: isDark ? '#f59e0b' : '#b47800',
    bound1Color: isDark ? '#38bdf8' : '#003882',
    bound2Color: isDark ? '#f43f5e' : '#c4161c',
    tickColor: isDark ? '#94a3b8' : '#1e293b',
    tooltipBg: isDark ? '#071326' : '#ffffff',
    tooltipBorder: isDark ? '#1e3a64' : '#cbd5e1',
    tooltipText: isDark ? '#e2e8f0' : '#0f172a',
  };

  return (
    <div className={`relative w-full rounded-2xl border p-3 shadow-lg select-none transition-colors ${colors.bgClass}`}>
      {/* Top Chart Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: colors.curveStart }}>
            <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ backgroundColor: colors.curveStart }} />
            {showCDF ? 'CDF F(x)' : dist.type === 'discrete' ? 'PMF P(X=k)' : 'PDF f(x)'}
          </span>
          <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
          <span className="font-semibold" style={{ color: colors.meanColor }}>
            Área: {mode === 'between' || mode === 'two_tail' ? 'Intervalo' : 'Cauda'}
          </span>
        </div>
        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Arraste as hastes verticais para alterar os limites
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          setHoverCoord(null);
          if (activeDrag) setActiveDrag(null);
        }}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <linearGradient id={`areaGrad-${theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.areaStart} stopOpacity={colors.areaOpacityStart} />
            <stop offset="100%" stopColor={colors.areaEnd} stopOpacity={colors.areaOpacityEnd} />
          </linearGradient>
          <linearGradient id={`curveGrad-${theme}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.curveStart} />
            <stop offset="50%" stopColor={colors.curveMid} />
            <stop offset="100%" stopColor={colors.curveEnd} />
          </linearGradient>
          <filter id="handleShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity={isDark ? '0.5' : '0.25'} />
          </filter>
        </defs>

        {/* Horizontal Grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
          const gy = padding.top + plotHeight * (1 - ratio);
          return (
            <line
              key={ratio}
              x1={padding.left}
              y1={gy}
              x2={padding.left + plotWidth}
              y2={gy}
              stroke={colors.gridStroke}
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        {/* X Axis Baseline */}
        <line
          x1={padding.left}
          y1={toSvgY(0)}
          x2={padding.left + plotWidth}
          y2={toSvgY(0)}
          stroke={colors.axisStroke}
          strokeWidth="1.5"
        />

        {/* Shaded Tail Area (Continuous) */}
        {!showCDF && dist.type === 'continuous' && shadedPathD && (
          <path d={shadedPathD} fill={`url(#areaGrad-${theme})`} className="transition-all duration-75" />
        )}

        {/* Discrete Bar Stems */}
        {dist.type === 'discrete' && (
          <g>
            {Array.from({ length: Math.ceil(xMax) - Math.floor(xMin) + 1 }, (_, idx) => {
              const k = Math.floor(xMin) + idx;
              const prob = showCDF ? dist.cdf(k, params) : dist.pdf(k, params);
              const sx = toSvgX(k);
              const sy = toSvgY(prob);
              const baseSy = toSvgY(0);
              const inTail = isInRegion(k);

              return (
                <g key={k} className="transition-all duration-75">
                  <line
                    x1={sx}
                    y1={baseSy}
                    x2={sx}
                    y2={sy}
                    stroke={inTail ? colors.bound1Color : colors.axisStroke}
                    strokeWidth={inTail ? '3' : '1.5'}
                  />
                  <circle
                    cx={sx}
                    cy={sy}
                    r={inTail ? '5' : '3.5'}
                    fill={inTail ? colors.bound1Color : (isDark ? '#334155' : '#cbd5e1')}
                    stroke={inTail ? '#ffffff' : colors.axisStroke}
                    strokeWidth="1.5"
                  />
                  {inTail && (
                    <rect
                      x={sx - 7}
                      y={sy}
                      width={14}
                      height={Math.max(1, baseSy - sy)}
                      fill={colors.bound1Color}
                      fillOpacity={isDark ? '0.2' : '0.12'}
                      rx="3"
                    />
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Continuous Distribution Curve */}
        {dist.type === 'continuous' && (
          <path
            d={pathD}
            fill="none"
            stroke={`url(#curveGrad-${theme})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Mean Indicator (μ) in UFJF Gold */}
        {meanX !== null && (
          <g>
            <line
              x1={meanX}
              y1={padding.top}
              x2={meanX}
              y2={toSvgY(0)}
              stroke={colors.meanColor}
              strokeDasharray="4 3"
              strokeWidth="2"
              strokeOpacity="0.85"
            />
            <text
              x={meanX}
              y={padding.top - 6}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
              fill={colors.meanColor}
              textAnchor="middle"
              fontWeight="700"
            >
              μ={typeof moments.mean === 'number' ? moments.mean.toFixed(2) : moments.mean}
            </text>
          </g>
        )}

        {/* Cutoff Vertical Line 1 (x1) in UFJF Blue */}
        {x1 >= xMin && x1 <= xMax && (
          <g className="cursor-ew-resize">
            <line
              x1={toSvgX(x1)}
              y1={padding.top}
              x2={toSvgX(x1)}
              y2={toSvgY(0)}
              stroke={colors.bound1Color}
              strokeWidth="2.5"
            />
            <circle
              cx={toSvgX(x1)}
              cy={toSvgY(0) + 12}
              r="9"
              fill={colors.bound1Color}
              stroke="#ffffff"
              strokeWidth="2.5"
              filter="url(#handleShadow)"
              onPointerDown={(e) => handlePointerDown('x1', e)}
              className="hover:scale-125 transition-transform"
            />
            <text
              x={toSvgX(x1)}
              y={toSvgY(0) + 32}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
              fill={colors.bound1Color}
              fontWeight="800"
              textAnchor="middle"
            >
              {Number.isInteger(x1) ? x1 : x1.toFixed(2)}
            </text>
          </g>
        )}

        {/* Cutoff Vertical Line 2 (x2) in UFJF Red */}
        {(mode === 'between' || mode === 'two_tail') && x2 >= xMin && x2 <= xMax && (
          <g className="cursor-ew-resize">
            <line
              x1={toSvgX(x2)}
              y1={padding.top}
              x2={toSvgX(x2)}
              y2={toSvgY(0)}
              stroke={colors.bound2Color}
              strokeWidth="2.5"
            />
            <circle
              cx={toSvgX(x2)}
              cy={toSvgY(0) + 12}
              r="9"
              fill={colors.bound2Color}
              stroke="#ffffff"
              strokeWidth="2.5"
              filter="url(#handleShadow)"
              onPointerDown={(e) => handlePointerDown('x2', e)}
              className="hover:scale-125 transition-transform"
            />
            <text
              x={toSvgX(x2)}
              y={toSvgY(0) + 32}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
              fill={colors.bound2Color}
              fontWeight="800"
              textAnchor="middle"
            >
              {Number.isInteger(x2) ? x2 : x2.toFixed(2)}
            </text>
          </g>
        )}

        {/* X Axis Labels */}
        {xTicks.map((t, idx) => (
          <text
            key={idx}
            x={t.svgX}
            y={height - 6}
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            fill={colors.tickColor}
            textAnchor="middle"
          >
            {t.val}
          </text>
        ))}

        {/* Hover Inspector Crosshair / Tooltip */}
        {hoverCoord && (
          <g>
            <circle cx={hoverCoord.x} cy={hoverCoord.y} r="4.5" fill={colors.bound1Color} />
            <rect
              x={Math.min(width - 110, Math.max(10, hoverCoord.x - 50))}
              y={Math.max(10, hoverCoord.y - 32)}
              width="100"
              height="22"
              rx="6"
              fill={colors.tooltipBg}
              stroke={colors.tooltipBorder}
              strokeWidth="1.5"
            />
            <text
              x={Math.min(width - 60, Math.max(60, hoverCoord.x))}
              y={Math.max(25, hoverCoord.y - 17)}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="10"
              fill={colors.tooltipText}
              fontWeight="600"
              textAnchor="middle"
            >
              x:{hoverCoord.xVal.toFixed(2)} y:{hoverCoord.yVal.toFixed(4)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
