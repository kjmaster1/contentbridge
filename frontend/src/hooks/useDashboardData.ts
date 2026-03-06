import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type {FormattedGrowthData} from '../components/dashboard/GrowthChart';
import type {TopContentItem} from '../components/dashboard/TopContentList';
import type {PlatformStat} from '../components/dashboard/PlatformManager';

export interface InsightsSummary {
    total_followers: number;
    total_views: number;
    total_content: number;
    avg_engagement_rate: number;
    best_performing_platform: string | null;
}

export interface GrowthDataPoint {
    recorded_at: string;
    followers: number;
    platform: string;
}

export function useDashboardData() {
    const [summary, setSummary] = useState<InsightsSummary | null>(null);
    const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
    const [growthData, setGrowthData] = useState<FormattedGrowthData[]>([]);
    const [topContent, setTopContent] = useState<TopContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isChartLoading, setIsChartLoading] = useState(false);

    const formatGrowthData = (data: GrowthDataPoint[]) => {
        const grouped = data.reduce<Record<number, FormattedGrowthData & { _timestamp: number }>>((acc, curr) => {
            const dateObj = new Date(curr.recorded_at);
            dateObj.setHours(0, 0, 0, 0);
            const timeKey = dateObj.getTime();
            const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            if (!acc[timeKey]) acc[timeKey] = { date: displayDate, _timestamp: timeKey };
            acc[timeKey][curr.platform] = curr.followers;
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => a._timestamp - b._timestamp) as FormattedGrowthData[];
    };

    const fetchGrowthData = useCallback(async (range: string) => {
        setIsChartLoading(true);
        try {
            const queryDays = range === 'all' ? 36500 : range;
            const res = await api.get(`/insights/growth?days=${queryDays}`);
            setGrowthData(formatGrowthData(res.data));
        } catch (error) {
            console.error('Failed to fetch growth data:', error);
        } finally {
            setIsChartLoading(false);
        }
    }, []);

    const fetchDashboardData = useCallback(async (timeRange: string) => {
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
    }, [fetchGrowthData]);

    return {
        summary,
        platforms,
        growthData,
        topContent,
        isLoading,
        isChartLoading,
        fetchDashboardData,
        fetchGrowthData
    };
}