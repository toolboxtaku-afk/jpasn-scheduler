'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarBlank, Users, SpinnerGap, Check, Copy, Clock } from '@phosphor-icons/react';
import Header from '@/components/Header';
import NameInputModal from '@/components/NameInputModal';
import WeeklyTimeGrid from '@/components/WeeklyTimeGrid';
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as demoStore from '@/lib/demoStore';
import { Event } from '@/types/database';

// 曜日表示用
const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekDays[date.getDay()];
    return `${month}/${day}(${weekday})`;
}

export default function EventPage({ params }: { params: Promise<{ event_id: string }> }) {
    const resolvedParams = use(params);
    const eventId = resolvedParams.event_id;
    const router = useRouter();

    const [event, setEvent] = useState<Event | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [showNameModal, setShowNameModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [eventLoading, setEventLoading] = useState(true);
    const [eventError, setEventError] = useState<string | null>(null);
    const [userNGSlots, setUserNGSlots] = useState<Record<string, string[]>>({});

    const { options, loading: optionsLoading, refetch } = useRealtimeEvent(eventId);

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

    // ローカルストレージからユーザー名を復元
    useEffect(() => {
        const stored = localStorage.getItem(`userName_${eventId}`);
        if (stored) {
            setUserName(stored);
        } else {
            setShowNameModal(true);
        }
    }, [eventId]);

    // ユーザーの既存回答を読み込み（selected_slotsはNGスロット）
    useEffect(() => {
        if (userName && options.length > 0) {
            const ngSlots: Record<string, string[]> = {};
            options.forEach(opt => {
                const userResponse = opt.responses.find(r => r.user_name === userName);
                if (userResponse) {
                    ngSlots[opt.id] = userResponse.selected_slots;
                }
            });
            setUserNGSlots(ngSlots);
        }
    }, [userName, options]);

    // 参加者リストを取得
    const participants = Array.from(
        new Set(options.flatMap(opt => opt.responses.map(r => r.user_name)))
    ).sort();

    // NGスロット変更
    const handleNGSlotsChange = async (optionId: string, ngSlots: string[]) => {
        if (!userName) return;

        // ローカル状態を更新
        setUserNGSlots(prev => ({ ...prev, [optionId]: ngSlots }));

        try {
            if (!isSupabaseConfigured) {
                demoStore.upsertResponse(optionId, userName, ngSlots);
                refetch();
            } else {
                const { data: existing } = await supabase
                    .from('responses')
                    .select('id')
                    .eq('option_id', optionId)
                    .eq('user_name', userName)
                    .single();

                if (existing) {
                    await supabase
                        .from('responses')
                        .update({ selected_slots: ngSlots })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('responses')
                        .insert({ option_id: optionId, user_name: userName, selected_slots: ngSlots });
                }
            }
        } catch (err) {
            console.error('Error saving response:', err);
        }
    };

    // 名前を設定
    const handleSetName = (name: string) => {
        setUserName(name);
        localStorage.setItem(`userName_${eventId}`, name);
        setShowNameModal(false);
    };

    // URLをコピー
    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    // ローディング画面
    if (eventLoading || optionsLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
                <Header />
                <div className="flex flex-col items-center justify-center py-20">
                    <SpinnerGap size={40} className="text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600 text-lg">読み込み中...</p>
                </div>
            </div>
        );
    }

    // エラー画面
    if (eventError || !event) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
                <Header />
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="text-red-500 text-6xl mb-4">😢</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {eventError || 'エラーが発生しました'}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            URLをお確かめの上、もう一度お試しください
                        </p>
                        <button
                            onClick={() => router.push('/create')}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            新しく作成する
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-8">
            <Header />

            <NameInputModal
                isOpen={showNameModal}
                onSubmit={handleSetName}
            />

            <main className="max-w-6xl mx-auto px-4 py-6">
                {/* イベント情報ヘッダー */}
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-blue-600 text-sm font-bold mb-1">
                                <CalendarBlank size={16} />
                                日程調整
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
                                {participants.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        <Users size={16} />
                                        <span>{participants.length}人が回答済み</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleCopyUrl}
                            className={`
                                flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all
                                ${copied
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
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
                                    URLをコピー
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 現在のユーザー */}
                {userName && (
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl px-4 py-3 mb-6 flex items-center justify-between text-white">
                        <span>
                            <span className="font-bold text-lg">{userName}</span> さんとして回答中
                        </span>
                        <button
                            onClick={() => setShowNameModal(true)}
                            className="text-white/80 hover:text-white text-sm font-bold hover:underline"
                        >
                            変更
                        </button>
                    </div>
                )}

                {/* 週間グリッド */}
                {userName && options.length > 0 && (
                    <WeeklyTimeGrid
                        options={options}
                        duration={event.duration}
                        userName={userName}
                        onSlotsChange={handleNGSlotsChange}
                        userResponses={userNGSlots}
                    />
                )}



                {/* 候補日が0件の場合 */}
                {options.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="text-gray-400 text-6xl mb-4">⏳</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">
                            候補日を設定中です
                        </h3>
                        <p className="text-gray-500">
                            リーダーが候補日を設定するまで、しばらくお待ちください
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
