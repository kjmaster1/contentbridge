import { Activity, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
    isConnected: boolean;
    isSyncing: boolean;
    onSync: () => void;
}

export function Navbar({ isConnected, isSyncing, onSync }: NavbarProps) {
    const { creator, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
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
                    onClick={onSync}
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
    );
}