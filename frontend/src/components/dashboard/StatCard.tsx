import type {ReactNode} from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    color: 'indigo' | 'blue' | 'emerald' | 'orange' | 'red' | 'purple';
}

export function StatCard({ title, value, icon, color }: StatCardProps) {
    // Tailwind needs full class names to compile correctly, so we map the colors
    const colorStyles = {
        indigo: 'hover:border-indigo-500/50 text-indigo-400 bg-indigo-500/10 group-hover:bg-indigo-500/20',
        blue: 'hover:border-blue-500/50 text-blue-400 bg-blue-500/10 group-hover:bg-blue-500/20',
        emerald: 'hover:border-emerald-500/50 text-emerald-400 bg-emerald-500/10 group-hover:bg-emerald-500/20',
        orange: 'hover:border-orange-500/50 text-orange-400 bg-orange-500/10 group-hover:bg-orange-500/20',
        red: 'hover:border-red-500/50 text-red-400 bg-red-500/10 group-hover:bg-red-500/20',
        purple: 'hover:border-purple-500/50 text-purple-400 bg-purple-500/10 group-hover:bg-purple-500/20',
    };

    const style = colorStyles[color];
    // Split the styles to apply borders to the container and backgrounds to the icon wrapper
    const [borderStyle, iconColor, iconBg, iconHoverBg] = style.split(' ');

    return (
        <div className={`bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-xl transition-all group ${borderStyle}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl transition-colors ${iconBg} ${iconHoverBg} ${iconColor}`}>
                    {icon}
                </div>
            </div>
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
            <h3 className="text-4xl font-black text-white mt-1 tracking-tight capitalize">{value}</h3>
        </div>
    );
}