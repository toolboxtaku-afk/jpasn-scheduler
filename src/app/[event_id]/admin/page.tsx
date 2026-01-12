'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Users, SpinnerGap, Check, Copy, Clock, ArrowLeft, ChartBar } from '@phosphor-icons/react';
import Header from '@/components/Header';
import ResultsHeatmap from '@/components/ResultsHeatmap';
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as demoStore from '@/lib/demoStore';
import { Event, generateTimeSlots, getSlotEndTime } from '@/types/database';

// 曜日表示用
const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekDays[date.getDay()];
    return `${month}/${day}(${weekday})`;
}

export default function AdminPage({ params }: { params: Promise<{ event_id: string }> }) {
    const resolvedParams = use(params);
    const eventId = resolvedParams.event_id;
    const router = useRouter();

    const [event, setEvent] = useState<Event | null>(null);
    const [copied, setCopied] = useState(false);
    const [eventLoading, setEventLoading] = useState(true);
    const [eventError, setEventError] = useState<string | null>(null);

    const { options, loading: optionsLoading } = useRealtimeEvent(eventId);

    // イベント情報を取得
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                if (!isSupabaseConfigured) {
                    const eventData = demoStore.getEvent(eventId);
                    if (eventData) {
                        setEvent(eventData);
                    } else {
                        setEventError('イベントが見つかりませんでした');
                    }
                } else {
                    const { data, error } = await supabase
                        .from('events')
                        .select('*')
                        .eq('id', eventId)
                        .single();

                    if (error) throw error;
                    setEvent(data);
                }
            } catch (err) {
                console.error('Error fetching event:', err);
                setEventError('イベントが見つかりませんでした');
            } finally {
                setEventLoading(false);
            }
        };

        fetchEvent();
    }, [eventId]);

    // 参加者リストを取得
    const participants = Array.from(
        new Set(options.flatMap(opt => opt.responses.map(r => r.user_name)))
    ).sort();

    // URLをコピー
    const handleCopyUrl = async () => {
        try {
            const url = `${window.location.origin}/${eventId}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    // 最適な時間帯を計算（全員がNGでないスロット）
    const findBestSlots = () => {
        if (!event) return [];

        const results: { optionId: string; slot: string; okCount: number; ngCount: number }[] = [];

        options.forEach(opt => {
            const availableSlots = generateTimeSlots(opt.start_time, opt.end_time, event.duration);

            availableSlots.forEach(slot => {
                let okCount = 0;
                let ngCount = 0;

                participants.forEach(p => {
                    const response = opt.responses.find(r => r.user_name === p);
                    if (response) {
                        if (response.selected_slots.includes(slot)) {
                            ngCount++;
                        } else {
                            okCount++;
                        }
                    }
                });

                results.push({ optionId: opt.id, slot, okCount, ngCount });
            });
        });

        return results
            .filter(r => r.ngCount === 0 && r.okCount > 0)
            .sort((a, b) => b.okCount - a.okCount);
    };

    const bestSlots = findBestSlots();

    // ローディング画面
    if (eventLoading || optionsLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
                <Header />
                <div className="flex flex-col items-center justify-center py-20">
                    <SpinnerGap size={40} className="text-purple-600 animate-spin mb-4" />
                    <p className="text-gray-600 text-lg">読み込み中...</p>
                </div>
            </div>
        );
    }

    // エラー画面
    if (eventError || !event) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
                <Header />
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="text-red-500 text-6xl mb-4">😢</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {eventError || 'エラーが発生しました'}
                        </h2>
                        <button
                            onClick={() => router.push('/create')}
                            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
                        >
                            新しく作成する
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-8">
            <Header />

            <main className="max-w-6xl mx-auto px-4 py-6">
                {/* ナビゲーション */}
                <div className="mb-4">
                    <button
                        onClick={() => router.push(`/${eventId}`)}
                        className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-bold"
                    >
                        <ArrowLeft size={16} />
                        入力画面に戻る
                    </button>
                </div>

                {/* イベント情報ヘッダー */}
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-purple-600 text-sm font-bold mb-1">
                                <ChartBar size={16} weight="fill" />
                                管理画面 - 集計結果
                                {!isSupabaseConfigured && (
                                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                        デモモード
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                {event.title}
                            </h1>
                            <div className="flex items-center gap-4 mt-2 text-gray-500 text-sm">
                                <div className="flex items-center gap-1">
                                    <Clock size={16} />
                                    <span>会議時間: {event.duration}分</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users size={16} />
                                    <span>{participants.length}人が回答済み</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleCopyUrl}
                            className={`
                                flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all
                                ${copied
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                }
                            `}
                        >
                            {copied ? (
                                <>
                                    <Check size={20} weight="bold" />
                                    コピー済み
                                </>
                            ) : (
                                <>
                                    <Copy size={20} />
                                    共有URLをコピー
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 全員OK時間帯 */}
                {bestSlots.length > 0 && (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-4 md:p-6 mb-6 text-white">
                        <h2 className="text-lg md:text-xl font-bold mb-3">
                            🏆 全員参加可能な時間帯
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {bestSlots.slice(0, 10).map((s, i) => {
                                const option = options.find(o => o.id === s.optionId);
                                return (
                                    <div
                                        key={i}
                                        className="bg-white/20 backdrop-blur px-3 py-2 rounded-lg text-sm font-bold"
                                    >
                                        {option && formatDate(option.date)} {s.slot}-{getSlotEndTime(s.slot, event.duration)}
                                        <span className="ml-1 opacity-80">({s.okCount}人)</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 回答者一覧 */}
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">
                        👥 回答者 ({participants.length}人)
                    </h2>
                    {participants.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {participants.map(name => (
                                <span
                                    key={name}
                                    className="px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-700"
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">まだ回答がありません</p>
                    )}
                </div>

                {/* ヒートマップ */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-3 px-1">
                        📊 回答状況ヒートマップ
                    </h2>
                    {participants.length > 0 ? (
                        <ResultsHeatmap
                            options={options}
                            duration={event.duration}
                            participants={participants}
                        />
                    ) : (
                        <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
                            回答があると、ここにヒートマップが表示されます
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
