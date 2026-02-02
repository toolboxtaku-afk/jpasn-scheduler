// 会議履歴をSupabaseから取得するユーティリティ
// 全ての会議が全デバイスで共有されます

import { supabase, isSupabaseConfigured } from './supabase';

const RETENTION_DAYS = 7;

export interface MeetingHistoryItem {
    eventId: string;
    title: string;
    duration: number;
    createdAt: string; // ISO 8601 形式
}

/**
 * Supabaseから会議履歴を取得（7日以内のもののみ）
 */
export async function getMeetings(): Promise<MeetingHistoryItem[]> {
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    if (isSupabaseConfigured) {
        const { data, error } = await supabase
            .from('events')
            .select('id, title, duration, created_at')
            .gte('created_at', cutoffDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch meetings:', error);
            return [];
        }


        return (data || []).map(event => ({
            eventId: event.id,
            title: event.title,
            duration: event.duration || 60,
            createdAt: event.created_at,
        }));
    } else {
        // デモモード: ローカルストレージを使用
        // Note: demoStore doesn't export getEvents, so we return empty array in demo mode
        // Real Supabase mode will be used in production
        return [];
    }
}

/**
 * 残り日数を計算
 */
export function getRemainingDays(createdAt: string): number {
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
