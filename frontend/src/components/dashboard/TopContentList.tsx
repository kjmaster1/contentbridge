import { TrendingUp, Eye, Activity } from 'lucide-react';

export interface TopContentItem {
    id: string;
    title: string;
    platform: string;
    content_type: string;
    view_count: number;
    engagement_rate: number;
    published_at: string | null;
}

interface TopContentListProps {
    content: TopContentItem[];
    activeFilter: 'all' | 'youtube' | 'twitch';
}

export function TopContentList({ content, activeFilter }: TopContentListProps) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white tracking-tight">
                    {activeFilter === 'all' ? 'Top Content' : `Top ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`}
                </h3>
                <span className="p-2 bg-orange-500/10 rounded-lg text-orange-400"><TrendingUp className="w-4 h-4" /></span>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                {content.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-10">No content found for this filter.</p>
                ) : (
                    content.map((item, idx) => (
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
    );
}