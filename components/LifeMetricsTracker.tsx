"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, TooltipProps } from 'recharts';
import { ArrowUp, ArrowRight, ArrowDown, MessageSquare, ChevronLeft, ChevronRight, Calendar, TrendingUp, Grid } from 'lucide-react';

interface MetricColors {
  [key: string]: string;
}

const METRIC_COLORS: MetricColors = {
  'Free Time': '#059669',
  'Loving Relationships': '#dc2626',
  'Strength and Energy': '#d97706',
  'Fun and Joy': '#7c3aed',
  'Creativity': '#2563eb',
  'Mental Wellbeing': '#db2777',
  'Money Moves': '#854d0e'
};

interface Week {
  display: string;
  month: string;
  weekNum: number;
  start: Date;
  end: Date;
}

interface TooltipPayload {
  color: string;
  name: string;
  value: number;
  payload: {
    [key: string]: string | string[] | number | undefined;
  };
}

interface CustomTooltipProps extends TooltipProps<number, string> {
    active?: boolean;
    label?: string;
    isMonthly?: boolean;
    color?: string;
  }
const generateWeeks = (): Week[] => {
  const weeks: Week[] = [];
  const startDate = new Date('2025-01-01');
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
  
  const formatDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };
  
  for (let i = 0; i < 52; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    weeks.push({
      display: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
      month: weekEnd.toLocaleString('default', { month: 'long' }),
      weekNum: i + 1,
      start: weekStart,
      end: weekEnd
    });
  }
  return weeks;
};

const WEEKS = generateWeeks();
const VISIBLE_WEEKS = 12;

const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
    active, 
    payload, 
    label, 
    isMonthly = false 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded shadow-lg">
          <p className="font-medium">{label}</p>
          {(payload as TooltipPayload[]).map((entry, index) => (
            <div key={index} className="mt-1">
              <p style={{ color: entry.color }}>
                {entry.name}: {entry.value > 0 ? '+' : ''}{entry.value}
              </p>
              {/* rest of the component */}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

interface Metric {
  name: string;
  color: string;
  weeks: (string | null)[];
  notes: string[];
  total: number;
}
const LifeMetricsTracker: React.FC = () => {
    const [metrics, setMetrics] = React.useState<Metric[]>(
      Object.keys(METRIC_COLORS).map(name => ({
        name,
        color: METRIC_COLORS[name],
        weeks: Array(52).fill(null),
        notes: Array(52).fill(''),
        total: 0
      }))
    );
    
    const [selectedMetric, setSelectedMetric] = React.useState(0);
    const [editingNoteIndex, setEditingNoteIndex] = React.useState<number | null>(null);
    const [visibleStartIndex, setVisibleStartIndex] = React.useState(0);
    const [viewMode, setViewMode] = React.useState<'single' | 'all' | 'monthly'>('single');
  
    const handleArrowClick = (weekIndex: number, direction: string) => {
      setMetrics(prev => {
        const newMetrics = [...prev];
        const metric = {...newMetrics[selectedMetric]};
        
        if (metric.weeks[weekIndex] === direction) {
          metric.weeks[weekIndex] = null;
        } else {
          metric.weeks[weekIndex] = direction;
        }
        
        metric.total = metric.weeks.reduce((sum, dir) => {
          if (dir === 'up') return sum + 1;
          if (dir === 'down') return sum - 1;
          return sum;
        }, 0);
        
        newMetrics[selectedMetric] = metric;
        return newMetrics;
      });
    };
  
    const handleNoteChange = (weekIndex: number, note: string) => {
      setMetrics(prev => {
        const newMetrics = [...prev];
        const metric = {...newMetrics[selectedMetric]};
        metric.notes[weekIndex] = note;
        newMetrics[selectedMetric] = metric;
        return newMetrics;
      });
    };
  
    const handleNoteBlur = () => {
      setEditingNoteIndex(null);
    };
  
    const scrollWeeks = (direction: number) => {
      const newStart = Math.max(0, Math.min(
        WEEKS.length - VISIBLE_WEEKS,
        visibleStartIndex + (direction * 4)
      ));
      setVisibleStartIndex(newStart);
    };
  
    interface MonthlyData {
      month: string;
      [key: string]: string | number | string[];
    }
  
    interface ChartData {
      week?: string;
      [key: string]: string | number | string[] | undefined;
    }
  
    const getChartData = (): (MonthlyData | ChartData)[] => {
      if (viewMode === 'monthly') {
        const monthlyData: { [key: string]: MonthlyData } = {};
        WEEKS.forEach((week, weekIndex) => {
          if (!monthlyData[week.month]) {
            monthlyData[week.month] = {
              month: week.month
            };
            metrics.forEach(metric => {
              monthlyData[week.month][metric.name] = 0;
              monthlyData[week.month][`${metric.name}_notes`] = [];
            });
          }
          
          metrics.forEach(metric => {
            const direction = metric.weeks[weekIndex];
            if (direction) {
              if (direction === 'up') monthlyData[week.month][metric.name] = (monthlyData[week.month][metric.name] as number) + 1;
              if (direction === 'down') monthlyData[week.month][metric.name] = (monthlyData[week.month][metric.name] as number) - 1;
            }
            if (metric.notes[weekIndex]) {
              (monthlyData[week.month][`${metric.name}_notes`] as string[]).push(
                `Week ${week.weekNum}: ${metric.notes[weekIndex]}`
              );
            }
          });
        });
        return Object.values(monthlyData).filter(monthData => 
          metrics.some(metric => monthData[metric.name] !== 0)
        );
      }
  
      const chartData: ChartData[] = [];
      const lastKnownValues: { [key: string]: number | undefined } = Object.fromEntries(metrics.map(m => [m.name, undefined]));
  
      WEEKS.forEach((week, index) => {
        const hasAnySelection = metrics.some(metric => metric.weeks[index]);
        if (!hasAnySelection) return;
  
        const data: ChartData = { week: week.display };
        metrics.forEach(metric => {
          const direction = metric.weeks[index];
          if (direction) {
            const change = direction === 'up' ? 1 : direction === 'down' ? -1 : 0;
            lastKnownValues[metric.name] = (lastKnownValues[metric.name] ?? 0) + change;
            data[metric.name] = lastKnownValues[metric.name];
          } else {
            data[metric.name] = undefined;
          }
          if (metric.notes[index]) {
            data[`${metric.name}_note`] = metric.notes[index];
          }
        });
        chartData.push(data);
      });
  
      return chartData;
    };
  
    const visibleWeeks = WEEKS.slice(visibleStartIndex, visibleStartIndex + VISIBLE_WEEKS);
    const canScrollLeft = visibleStartIndex > 0;
    const canScrollRight = visibleStartIndex + VISIBLE_WEEKS < WEEKS.length;
  
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Life Metrics Tracker</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('single')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                viewMode === 'single' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              <TrendingUp size={20} /> Single
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                viewMode === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              <Grid size={20} /> All
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                viewMode === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              <Calendar size={20} /> Monthly
            </button>
          </div>
        </div>
  
        <div className="flex gap-4 mb-6 flex-wrap">
          {metrics.map((metric, index) => (
            <button
              key={metric.name}
              onClick={() => setSelectedMetric(index)}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                selectedMetric === index && viewMode === 'single'
                  ? 'text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              style={{ 
                backgroundColor: selectedMetric === index && viewMode === 'single' 
                  ? metric.color 
                  : undefined 
              }}
            >
              {metric.name} {metric.total > 0 ? `+${metric.total}` : metric.total}
            </button>
          ))}
        </div>
  
        {viewMode === 'single' && (
          <div className="flex items-center gap-2 mb-6">
            <button 
              onClick={() => scrollWeeks(-1)}
              disabled={!canScrollLeft}
              className={`p-2 rounded ${
                canScrollLeft ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
  
            <div className="grid grid-cols-12 gap-1 flex-1">
              {visibleWeeks.map((week, localIndex) => {
                const globalIndex = visibleStartIndex + localIndex;
                return (
                  <div key={globalIndex} className="flex flex-col items-center p-1 border rounded">
                    <span className="text-xs font-medium mb-1">{week.display}</span>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleArrowClick(globalIndex, 'up')}
                        className={`p-1 rounded hover:bg-gray-100 ${
                          metrics[selectedMetric].weeks[globalIndex] === 'up' 
                            ? 'text-green-500' 
                            : 'text-gray-400'
                        }`}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleArrowClick(globalIndex, 'flat')}
                        className={`p-1 rounded hover:bg-gray-100 ${
                          metrics[selectedMetric].weeks[globalIndex] === 'flat' 
                            ? 'text-yellow-500' 
                            : 'text-gray-400'
                        }`}
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button
                        onClick={() => handleArrowClick(globalIndex, 'down')}
                        className={`p-1 rounded hover:bg-gray-100 ${
                          metrics[selectedMetric].weeks[globalIndex] === 'down' 
                            ? 'text-red-500' 
                            : 'text-gray-400'
                        }`}
                      >
                        <ArrowDown size={16} />
                      </button>
                      
                      {editingNoteIndex === globalIndex ? (
                        <input
                          type="text"
                          value={metrics[selectedMetric].notes[globalIndex] || ''}
                          onChange={(e) => handleNoteChange(globalIndex, e.target.value)}
                          onBlur={handleNoteBlur}
                          className="mt-2 w-full text-xs p-1 border rounded"
                          placeholder="Add note..."
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setEditingNoteIndex(globalIndex)}
                          className={`mt-2 p-1 rounded hover:bg-gray-100 ${
                            metrics[selectedMetric].notes[globalIndex] 
                              ? 'text-blue-500' 
                              : 'text-gray-400'
                          }`}
                          title={metrics[selectedMetric].notes[globalIndex] || 'Add note'}
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
  
            <button 
              onClick={() => scrollWeeks(1)}
              disabled={!canScrollRight}
              className={`p-2 rounded ${
                canScrollRight ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
  
        <div className="h-96">
          <div className="pl-12 -mb-2 relative z-10">
            <h3 className="text-base font-bold text-black">2025</h3>
          </div>
          <ResponsiveContainer>
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={viewMode === 'monthly' ? 'month' : 'week'}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip content={(props: CustomTooltipProps) => <CustomTooltip {...props} isMonthly={viewMode === 'monthly'} />} />
              <Legend />
              {viewMode === 'single' ? (
                <Line
                  type="monotone"
                  dataKey={metrics[selectedMetric].name}
                  stroke={metrics[selectedMetric].color}
                  connectNulls
                />
              ) : (
                metrics.map(metric => (
                  <Line
                    key={metric.name}
                    type="monotone"
                    dataKey={metric.name}
                    stroke={metric.color}
                    connectNulls
                  />
                ))
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };
  
  export default LifeMetricsTracker;