import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Activity, LogIn } from 'lucide-react';
import { isAxiosError } from 'axios';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/creators/login', {
                username,
                password,
            });

            login(response.data.access_token, response.data.creator);
            navigate('/dashboard');
        } catch (err: unknown) {
            if (isAxiosError(err)) {
                setError(err.response?.data?.detail || 'Failed to login. Please try again.');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-indigo-500/30">

            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-md w-full space-y-8 bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl border border-slate-800 shadow-2xl relative z-10">

                {/* Header / Logo */}
                <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6">
                        <Activity className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        ContentBridge
                    </h2>
                    <p className="mt-2 text-sm text-slate-400 font-medium">
                        Sign in to your creator dashboard
                    </p>
                </div>

                {/* Form */}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5 text-rose-400 mr-3 shrink-0" />
                            <p className="text-sm text-rose-300 font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 tracking-wide mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                required
                                className="block w-full px-4 py-3.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 tracking-wide mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                className="block w-full px-4 py-3.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/25 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F19] focus:ring-indigo-500 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5 mr-2" />
                                Sign in
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}