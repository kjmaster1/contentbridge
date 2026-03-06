import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface FormattedGrowthData {
    date: string;
    [key: string]: string | number;
}

interface GrowthChartProps {
    data: FormattedGrowthData[];
    isLoading: boolean;
    timeRange: string;
    onTimeRangeChange: (range: string) => void;
    activeFilter: 'all' | 'youtube' | 'twitch';
    needsYoutube: boolean;
    needsTwitch: boolean;
}

export function GrowthChart({
                                data,
                                isLoading,
                                timeRange,
                                onTimeRangeChange,
                                activeFilter,
                                needsYoutube,
                                needsTwitch
                            }: GrowthChartProps) {
    const timeRanges = [
        { label: '30D', value: '30' },
        { label: '90D', value: '90' },
        { label: '1Y', value: '365' },
        { label: 'All Time', value: 'all' }
    ];

    return (
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-xl font-black text-white tracking-tight">Audience Growth</h3>
                <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                    {timeRanges.map((range) => (
                        <button
                            key={range.value}
                            disabled={isLoading}
                            onClick={() => onTimeRangeChange(range.value)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                timeRange === range.value
                                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && (
                <div className="absolute inset-0 z-10 bg-[#0B0F19]/50 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {data.length > 0 ? (
                <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorYoutube" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorTwitch" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />

                            {(activeFilter === 'all' || activeFilter === 'youtube') && !needsYoutube && (
                                <YAxis yAxisId="youtube" orientation="left" stroke="#ef4444" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} />
                            )}

                            {(activeFilter === 'all' || activeFilter === 'twitch') && !needsTwitch && (
                                <YAxis
                                    yAxisId="twitch"
                                    orientation={activeFilter === 'all' && !needsYoutube ? "right" : "left"}
                                    stroke="#a855f7"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                />
                            )}

                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                                itemStyle={{ color: '#e2e8f0' }}
                            />

                            {(activeFilter === 'all' || activeFilter === 'youtube') && !needsYoutube && (
                                <Area yAxisId="youtube" type="monotone" dataKey="youtube" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorYoutube)" />
                            )}
                            {(activeFilter === 'all' || activeFilter === 'twitch') && !needsTwitch && (
                                <Area yAxisId="twitch" type="monotone" dataKey="twitch" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorTwitch)" />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center min-h-[300px] border border-dashed border-slate-700 rounded-2xl">
                    <p className="text-slate-500 text-sm font-medium">Not enough historical data yet. Sync again tomorrow!</p>
                </div>
            )}
        </div>
    );
}