import { Users, Youtube, Twitch } from 'lucide-react';
import { api } from '../../lib/api';

export interface PlatformStat {
    platform: string;
    platform_username: string;
    followers: number;
    total_views: number;
    total_content: number;
    avg_engagement_rate: number;
    last_synced_at: string | null;
}

interface PlatformManagerProps {
    platforms: PlatformStat[];
    needsYoutube: boolean;
    needsTwitch: boolean;
    activeFilter: 'all' | 'youtube' | 'twitch';
}

export function PlatformManager({ platforms, needsYoutube, needsTwitch, activeFilter }: PlatformManagerProps) {
    const handleConnect = async (platform: 'youtube' | 'twitch') => {
        try {
            const res = await api.get(`/auth/${platform}/connect`);
            window.location.href = res.data.auth_url;
        } catch (e) {
            console.error(`Failed to connect ${platform}:`, e);
        }
    };

    const getPlatformColors = (platformName: string) => {
        switch (platformName.toLowerCase()) {
            case 'youtube': return { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-500', glow: 'shadow-red-500/20', icon: <Youtube className="w-6 h-6 text-red-500" /> };
            case 'twitch': return { border: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'shadow-purple-500/20', icon: <Twitch className="w-6 h-6 text-purple-400" /> };
            default: return { border: 'border-slate-700', bg: 'bg-slate-800', text: 'text-slate-300', glow: '', icon: null };
        }
    };

    return (
        <>
            {/* Header & Missing Platform Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Connected Platforms</h2>
                </div>

                <div className="flex gap-3">
                    {platforms.length > 0 && needsYoutube && (
                        <button
                            onClick={() => handleConnect('youtube')}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                        >
                            <Youtube className="w-4 h-4" /> Connect YouTube
                        </button>
                    )}

                    {platforms.length > 0 && needsTwitch && (
                        <button
                            onClick={() => handleConnect('twitch')}
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
                                    onClick={() => handleConnect('youtube')}
                                    className="flex items-center gap-3 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 font-bold transition-all hover:scale-105 active:scale-95"
                                >
                                    <Youtube className="w-5 h-5" /> Connect YouTube
                                </button>
                            )}

                            {needsTwitch && (
                                <button
                                    onClick={() => handleConnect('twitch')}
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
        </>
    );
}