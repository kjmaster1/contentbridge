import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Eye, LayoutGrid, PlaySquare, TrendingUp, Youtube, Twitch, Users, Activity } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../lib/api';
import { useDashboardData } from '../hooks/useDashboardData';
import { Navbar } from '../components/layout/Navbar';
import { StatCard } from '../components/dashboard/StatCard';
import { GrowthChart } from '../components/dashboard/GrowthChart';
import { TopContentList } from '../components/dashboard/TopContentList';
import { PlatformManager } from '../components/dashboard/PlatformManager';
import { ToastCard, type ToastNotification } from '../components/ui/ToastCard';

export default function Dashboard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialConnected = searchParams.get('connected');

    // UI State
    const [connectedPlatform, setConnectedPlatform] = useState<string | null>(initialConnected);
    const [isSyncing, setIsSyncing] = useState(false);
    const [timeRange, setTimeRange] = useState<string>('30');
    const [activeFilter, setActiveFilter] = useState<'all' | 'youtube' | 'twitch'>('all');
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    // Custom Hooks
    const { isConnected, lastMessage, clearMessage } = useWebSocket();
    const { summary, platforms, growthData, topContent, isLoading, isChartLoading, fetchDashboardData, fetchGrowthData } = useDashboardData();

    useEffect(() => {
        void fetchDashboardData(timeRange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle OAuth connection success message
    useEffect(() => {
        if (initialConnected) {
            searchParams.delete('connected');
            setSearchParams(searchParams, { replace: true });
            const timer = setTimeout(() => setConnectedPlatform(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [initialConnected, searchParams, setSearchParams]);

    // Handle incoming WebSockets
    useEffect(() => {
        if (lastMessage?.type === 'sync_complete') {
            void fetchDashboardData(timeRange);
            setIsSyncing(false);
            setToasts((prev) => [...prev, {
                id: Math.random().toString(36).substring(2, 9),
                platform: String(lastMessage.platform),
                message: String(lastMessage.message)
            }]);
            clearMessage();
        }
    }, [lastMessage, clearMessage, fetchDashboardData, timeRange]);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await api.post('/platforms/sync');
        } catch (error) {
            console.error('Failed to trigger sync:', error);
            setIsSyncing(false);
        }
    };

    // Derived Data
    const displayedContent = activeFilter === 'all' ? topContent.slice(0, 5) : topContent.filter(c => c.platform === activeFilter).slice(0, 5);
    const connectedPlatformNames = platforms.map(p => p.platform.toLowerCase());
    const needsYoutube = !connectedPlatformNames.includes('youtube');
    const needsTwitch = !connectedPlatformNames.includes('twitch');

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

    return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-indigo-500/30">
            <Navbar isConnected={isConnected} isSyncing={isSyncing} onSync={handleManualSync} />

            <main className="max-w-7xl mx-auto px-6 py-10">
                {connectedPlatform && (
                    <div className="mb-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center shadow-lg shadow-emerald-500/5">
                        <CheckCircle className="w-6 h-6 text-emerald-400 mr-3" />
                        <p className="text-sm text-emerald-100 font-medium">
                            Successfully authenticated and connected <span className="capitalize font-bold text-emerald-400">{connectedPlatform}</span>!
                        </p>
                    </div>
                )}

                {/* Platform Filter */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div className="flex bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
                        <button onClick={() => setActiveFilter('all')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeFilter === 'all' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                            <LayoutGrid className="w-4 h-4" /> Overview
                        </button>
                        {!needsYoutube && (
                            <button onClick={() => setActiveFilter('youtube')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeFilter === 'youtube' ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-md shadow-red-500/10' : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'}`}>
                                <Youtube className="w-4 h-4" /> YouTube
                            </button>
                        )}
                        {!needsTwitch && (
                            <button onClick={() => setActiveFilter('twitch')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeFilter === 'twitch' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-md shadow-purple-500/10' : 'text-slate-400 hover:text-purple-400 hover:bg-purple-500/10'}`}>
                                <Twitch className="w-4 h-4" /> Twitch
                            </button>
                        )}
                    </div>
                </div>

                {/* Top Level Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard title={activeFilter === 'all' ? 'Total Audience' : 'Followers'} value={activeStats.followers.toLocaleString()} icon={<Users className="w-6 h-6" />} color={activeStats.color as never} />
                    <StatCard title="Lifetime Views" value={activeStats.views.toLocaleString()} icon={<Eye className="w-6 h-6" />} color="blue" />
                    <StatCard title="Avg Engagement" value={`${activeStats.engagement}%`} icon={<Activity className="w-6 h-6" />} color="emerald" />
                    <StatCard title={activeStats.card4Label} value={activeStats.card4Value} icon={activeStats.card4Icon} color={activeFilter === 'all' ? 'orange' : activeStats.color as never} />
                </div>

                {/* Charts and Content Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    <GrowthChart data={growthData} isLoading={isChartLoading} timeRange={timeRange} activeFilter={activeFilter} needsYoutube={needsYoutube} needsTwitch={needsTwitch} onTimeRangeChange={(range) => { setTimeRange(range); void fetchGrowthData(range); }} />
                    <TopContentList content={displayedContent} activeFilter={activeFilter} />
                </div>

                <PlatformManager platforms={platforms} needsYoutube={needsYoutube} needsTwitch={needsTwitch} activeFilter={activeFilter} />
            </main>

            {/* Toasts overlay */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50 overflow-hidden px-4 pb-4 -mr-4 -mb-4">
                {toasts.map((toast) => (
                    <ToastCard key={toast.id} toast={toast} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
                ))}
            </div>
        </div>
    );
}