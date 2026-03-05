import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle, Activity, Users, Eye, TrendingUp, RefreshCw, X, Youtube, Twitch, PlaySquare, LayoutGrid } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../lib/api';

// --- TypeScript Interfaces ---
interface InsightsSummary {
    total_followers: number;
    total_views: number;
    total_content: number;
    avg_engagement_rate: number;
    best_performing_platform: string | null;
}

interface PlatformStat {
    platform: string;
    platform_username: string;
    followers: number;
    total_views: number;
    total_content: number;
    avg_engagement_rate: number;
    last_synced_at: string | null;
}

interface GrowthDataPoint {
    recorded_at: string;
    followers: number;
    platform: string;
}

interface TopContentItem {
    id: string;
    title: string;
    platform: string;
    content_type: string;
    view_count: number;
    engagement_rate: number;
    published_at: string | null;
}

interface ToastNotification {
    id: string;
    platform: string;
    message: string;
}

// NEW: Strict interface for Recharts data format
interface FormattedGrowthData {
    date: string;
    [key: string]: string | number; // Allows dynamic platform keys like 'youtube': 500
}

// --- Helper Component for Animated Toasts ---
function ToastCard({ toast, onDismiss }: { toast: ToastNotification, onDismiss: (id: string) => void }) {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => closeToast(), 4500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closeToast = () => {
        setIsClosing(true);
        setTimeout(() => onDismiss(toast.id), 300);
    };

    return (
        <div className={`bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-2xl p-5 flex items-start gap-4 w-96 ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
            <div className="bg-indigo-500/20 rounded-xl p-2.5 mt-0.5 border border-indigo-500/30">
                <CheckCircle className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1">
                <h4 className="text-base font-black text-white capitalize tracking-tight">{toast.platform} Sync Complete</h4>
                <p className="text-sm text-slate-400 mt-1.5 font-medium leading-snug">{toast.message}</p>
            </div>
            <button onClick={closeToast} className="text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function Dashboard() {
    const { creator, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialConnected = searchParams.get('connected');
    const [connectedPlatform, setConnectedPlatform] = useState<string | null>(initialConnected);

    // Data State
    const [summary, setSummary] = useState<InsightsSummary | null>(null);
    const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
    // Fixed: Strictly typed state array
    const [growthData, setGrowthData] = useState<FormattedGrowthData[]>([]);
    const [topContent, setTopContent] = useState<TopContentItem[]>([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [timeRange, setTimeRange] = useState<string>('30');
    const [activeFilter, setActiveFilter] = useState<'all' | 'youtube' | 'twitch'>('all');
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    const { isConnected, lastMessage, clearMessage } = useWebSocket();

    // --- Data Formatting ---
    const formatGrowthData = (data: GrowthDataPoint[]) => {
        // 1. Group by raw timestamp to handle cross-year overlaps safely
        const grouped = data.reduce<Record<number, FormattedGrowthData & { _timestamp: number }>>((acc, curr) => {
            const dateObj = new Date(curr.recorded_at);
            dateObj.setHours(0, 0, 0, 0); // Normalize to midnight so same-day syncs group perfectly
            const timeKey = dateObj.getTime();

            const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            if (!acc[timeKey]) acc[timeKey] = { date: displayDate, _timestamp: timeKey };
            acc[timeKey][curr.platform] = curr.followers;
            return acc;
        }, {});

        // 2. Convert to array and explicitly sort by the timestamp from oldest to newest
        return Object.values(grouped)
            .sort((a, b) => a._timestamp - b._timestamp);
    };

    // --- Independent Chart Fetcher ---
    const fetchGrowthData = async (range: string) => {
        setIsChartLoading(true);
        try {
            const queryDays = range === 'all' ? 36500 : range;
            const growthRes = await api.get(`/insights/growth?days=${queryDays}`);
            setGrowthData(formatGrowthData(growthRes.data));
        } catch (error) {
            console.error('Failed to fetch growth data:', error);
        } finally {
            setIsChartLoading(false);
        }
    };

    // --- Main Dashboard Fetcher ---
    const fetchDashboardData = async () => {
        try {
            const [summaryRes, platformsRes, topContentRes] = await Promise.all([
                api.get('/insights/summary'),
                api.get('/platforms/stats'),
                api.get('/insights/top-content?limit=500')
            ]);

            setSummary(summaryRes.data);
            setPlatforms(platformsRes.data);
            setTopContent(topContentRes.data);

            await fetchGrowthData(timeRange);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (initialConnected) {
            searchParams.delete('connected');
            setSearchParams(searchParams, { replace: true });
            const timer = setTimeout(() => setConnectedPlatform(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [initialConnected, searchParams, setSearchParams]);

    useEffect(() => {
        if (lastMessage?.type === 'sync_complete') {
            fetchDashboardData();
            setIsSyncing(false);

            const newToast: ToastNotification = {
                id: Math.random().toString(36).substring(2, 9),
                platform: String(lastMessage.platform),
                message: String(lastMessage.message)
            };

            setToasts((prev) => [...prev, newToast]);
            clearMessage();
        }
    }, [lastMessage, clearMessage]);

    // FIXED: Moved these hooks ABOVE the early return!
    const displayedContent = activeFilter === 'all'
        ? topContent.slice(0, 5)
        : topContent.filter(c => c.platform === activeFilter).slice(0, 5);

    const activeStats = useMemo(() => {
        if (activeFilter === 'all') {
            return {
                followers: summary?.total_followers || 0,
                views: summary?.total_views || 0,
                engagement: summary?.avg_engagement_rate || 0,
                card4Label: 'Top Platform',
                card4Value: summary?.best_performing_platform || 'N/A',
                card4Icon: <TrendingUp className="w-6 h-6 text-orange-400" />,
                color: 'indigo'
            };
        } else {
            const pStat = platforms.find(p => p.platform === activeFilter);
            return {
                followers: pStat?.followers || 0,
                views: pStat?.total_views || 0,
                engagement: pStat?.avg_engagement_rate || 0,
                card4Label: 'Total Content',
                card4Value: pStat?.total_content || 0,
                card4Icon: <PlaySquare className={`w-6 h-6 ${activeFilter === 'youtube' ? 'text-red-400' : 'text-purple-400'}`} />,
                color: activeFilter === 'youtube' ? 'red' : 'purple'
            };
        }
    }, [activeFilter, summary, platforms]);


    // --- EARLY RETURNS (Must be below all hooks) ---
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium tracking-wide animate-pulse">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    // --- Handlers & Render ---
    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await api.post('/platforms/sync');
        } catch (error) {
            console.error('Failed to trigger sync:', error);
            setIsSyncing(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const getPlatformColors = (platformName: string) => {
        switch (platformName.toLowerCase()) {
            case 'youtube': return { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-500', glow: 'shadow-red-500/20', icon: <Youtube className="w-6 h-6 text-red-500" /> };
            case 'twitch': return { border: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'shadow-purple-500/20', icon: <Twitch className="w-6 h-6 text-purple-400" /> };
            default: return { border: 'border-slate-700', bg: 'bg-slate-800', text: 'text-slate-300', glow: '', icon: null };
        }
    };

    const connectedPlatformNames = platforms.map(p => p.platform.toLowerCase());
    const needsYoutube = !connectedPlatformNames.includes('youtube');
    const needsTwitch = !connectedPlatformNames.includes('twitch');

    return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-indigo-500/30">

            {/* Glassmorphism Navbar */}
            <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0B0F19]/80 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center shadow-2xl shadow-black/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        ContentBridge
                    </h1>
                    <div className={`ml-4 flex items-center px-3 py-1 rounded-full border ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} text-xs font-semibold tracking-wide backdrop-blur-sm`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                        {isConnected ? 'LIVE' : 'OFFLINE'}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Data'}
                    </button>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-slate-500 flex items-center justify-center">
                            <span className="font-bold text-white">{creator?.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="hidden md:block text-sm">
                            <p className="font-bold text-white">{creator?.display_name || creator?.username}</p>
                        </div>
                        <button onClick={handleLogout} className="ml-2 p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-10">

                {connectedPlatform && (
                    <div className="mb-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center shadow-lg shadow-emerald-500/5">
                        <CheckCircle className="w-6 h-6 text-emerald-400 mr-3" />
                        <p className="text-sm text-emerald-100 font-medium">
                            Successfully authenticated and connected <span className="capitalize font-bold text-emerald-400">{connectedPlatform}</span>!
                        </p>
                    </div>
                )}

                {/* --- GLOBAL PLATFORM FILTER --- */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div className="flex bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeFilter === 'all' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Overview
                        </button>
                        {!needsYoutube && (
                            <button
                                onClick={() => setActiveFilter('youtube')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeFilter === 'youtube' ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-md shadow-red-500/10' : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'}`}
                            >
                                <Youtube className="w-4 h-4" /> YouTube
                            </button>
                        )}
                        {!needsTwitch && (
                            <button
                                onClick={() => setActiveFilter('twitch')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeFilter === 'twitch' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-md shadow-purple-500/10' : 'text-slate-400 hover:text-purple-400 hover:bg-purple-500/10'}`}
                            >
                                <Twitch className="w-4 h-4" /> Twitch
                            </button>
                        )}
                    </div>
                </div>

                {/* Top Level Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className={`bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl hover:border-${activeStats.color}-500/50 transition-all group`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 bg-${activeStats.color}-500/10 rounded-2xl group-hover:bg-${activeStats.color}-500/20 transition-colors`}>
                                <Users className={`w-6 h-6 text-${activeStats.color}-400`} />
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{activeFilter === 'all' ? 'Total Audience' : 'Followers'}</p>
                        <h3 className="text-4xl font-black text-white mt-1 tracking-tight">{activeStats.followers.toLocaleString()}</h3>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl hover:border-blue-500/50 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                                <Eye className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Lifetime Views</p>
                        <h3 className="text-4xl font-black text-white mt-1 tracking-tight">{activeStats.views.toLocaleString()}</h3>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl hover:border-emerald-500/50 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                                <Activity className="w-6 h-6 text-emerald-400" />
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Avg Engagement</p>
                        <h3 className="text-4xl font-black text-white mt-1 tracking-tight">{activeStats.engagement}%</h3>
                    </div>
                    <div className={`bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl hover:border-orange-500/50 transition-all group`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-orange-500/10 rounded-2xl group-hover:bg-orange-500/20 transition-colors">
                                {activeStats.card4Icon}
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{activeStats.card4Label}</p>
                        <h3 className="text-3xl font-black text-white mt-1 capitalize tracking-tight">{activeStats.card4Value}</h3>
                    </div>
                </div>

                {/* --- Charts and Top Content Section --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">

                    <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col relative">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h3 className="text-xl font-black text-white tracking-tight">Audience Growth</h3>
                            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                                {[
                                    { label: '30D', value: '30' },
                                    { label: '90D', value: '90' },
                                    { label: '1Y', value: '365' },
                                    { label: 'All Time', value: 'all' }
                                ].map((range) => (
                                    <button
                                        key={range.value}
                                        disabled={isChartLoading}
                                        onClick={() => {
                                            setTimeRange(range.value);
                                            fetchGrowthData(range.value);
                                        }}
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

                        {isChartLoading && (
                            <div className="absolute inset-0 z-10 bg-[#0B0F19]/50 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}

                        {growthData.length > 0 ? (
                            <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

                                        {/* LEFT Y-AXIS (YouTube) */}
                                        {(activeFilter === 'all' || activeFilter === 'youtube') && !needsYoutube && (
                                            <YAxis yAxisId="youtube" orientation="left" stroke="#ef4444" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} />
                                        )}

                                        {/* RIGHT Y-AXIS (Twitch) - Moves to the left if Twitch is the only active filter! */}
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

                                        {/* AREA RENDERERS (Tied to their specific Y-Axis ID) */}
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

                    <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white tracking-tight">
                                {activeFilter === 'all' ? 'Top Content' : `Top ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`}
                            </h3>
                            <span className="p-2 bg-orange-500/10 rounded-lg text-orange-400"><TrendingUp className="w-4 h-4" /></span>
                        </div>

                        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                            {displayedContent.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-10">No content found for this filter.</p>
                            ) : (
                                displayedContent.map((item, idx) => (
                                    <div key={item.id} className="bg-[#0B0F19] p-4 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors flex items-start gap-3">
                                        <div className="text-2xl font-black text-slate-700 mt-1 w-6 text-center">{idx + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate mb-1" title={item.title}>{item.title}</p>
                                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                                                <span className={`capitalize ${item.platform === 'youtube' ? 'text-red-400' : 'text-purple-400'}`}>{item.platform}</span>
                                                <div className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.view_count.toLocaleString()}</div>
                                                <div className="flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-400" /> {item.engagement_rate}%</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Missing Platform Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Connected Platforms</h2>
                    </div>

                    <div className="flex gap-3">
                        {platforms.length > 0 && needsYoutube && (
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await api.get('/auth/youtube/connect');
                                        window.location.href = res.data.auth_url;
                                    } catch (e) { console.error(e); }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                            >
                                <Youtube className="w-4 h-4" /> Connect YouTube
                            </button>
                        )}

                        {platforms.length > 0 && needsTwitch && (
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await api.get('/auth/twitch/connect');
                                        window.location.href = res.data.auth_url;
                                    } catch (e) { console.error(e); }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                            >
                                <Twitch className="w-4 h-4" /> Connect Twitch
                            </button>
                        )}
                    </div>
                </div>

                {/* Connected Platform Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {platforms.length === 0 ? (
                        <div className="col-span-2 flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-lg">
                                <Users className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-xl text-white font-black mb-2 tracking-tight">No platforms connected</p>
                            <p className="text-sm text-slate-400 mb-8 font-medium">Connect your accounts to start syncing your live audience data.</p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                {needsYoutube && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await api.get('/auth/youtube/connect');
                                                window.location.href = res.data.auth_url;
                                            } catch (e) { console.error(e); }
                                        }}
                                        className="flex items-center gap-3 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 font-bold transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Youtube className="w-5 h-5" /> Connect YouTube
                                    </button>
                                )}

                                {needsTwitch && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await api.get('/auth/twitch/connect');
                                                window.location.href = res.data.auth_url;
                                            } catch (e) { console.error(e); }
                                        }}
                                        className="flex items-center gap-3 px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 font-bold transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Twitch className="w-5 h-5" /> Connect Twitch
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        platforms.map(p => {
                            const theme = getPlatformColors(p.platform);
                            return (
                                <div key={p.platform} className={`relative overflow-hidden bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border ${theme.border} shadow-xl hover:shadow-2xl ${theme.glow} transition-all duration-300 flex flex-col ${activeFilter !== 'all' && activeFilter !== p.platform.toLowerCase() ? 'opacity-40 grayscale-[50%]' : ''}`}>
                                    <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full ${theme.bg} blur-3xl opacity-50 pointer-events-none`}></div>
                                    <div className="flex items-center justify-between mb-8 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl ${theme.bg} border ${theme.border} flex items-center justify-center shadow-lg`}>
                                                {theme.icon || <span className="text-2xl font-black uppercase">{p.platform.charAt(0)}</span>}
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-white capitalize tracking-tight">{p.platform}</h4>
                                                <p className={`text-sm font-bold ${theme.text}`}>@{p.platform_username}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-auto relative z-10">
                                        <div className="bg-[#0B0F19] p-4 rounded-2xl border border-slate-800">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Followers</p>
                                            <p className="text-2xl font-black text-white">{p.followers.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#0B0F19] p-4 rounded-2xl border border-slate-800">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Views</p>
                                            <p className="text-2xl font-black text-white">{p.total_views.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50 overflow-hidden px-4 pb-4 -mr-4 -mb-4">
                {toasts.map((toast) => (
                    <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
                ))}
            </div>
        </div>
    );
}