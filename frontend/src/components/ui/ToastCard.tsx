import { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

export interface ToastNotification {
    id: string;
    platform: string;
    message: string;
}

interface ToastCardProps {
    toast: ToastNotification;
    onDismiss: (id: string) => void;
}

export function ToastCard({ toast, onDismiss }: ToastCardProps) {
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