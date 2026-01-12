'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarBlank, Users, SpinnerGap, Check, Copy, Clock, ChartBar, ArrowLeft, Plus } from '@phosphor-icons/react';
import Header from '@/components/Header';
import DateTimePicker from '@/components/DateTimePicker';
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as demoStore from '@/lib/demoStore';
import { Event } from '@/types/database';

interface SelectedDate {
    date: string;
    time: string;
    endTime?: string;
}

export default function EditPage({ params }: { params: Promise<{ event_id: string }> }) {
    const resolvedParams = use(params);
    const eventId = resolvedParams.event_id;
    const router = useRouter();

    const [event, setEvent] = useState<Event | null>(null);
    const [copiedParticipant, setCopiedParticipant] = useState(false);
    const [eventLoading, setEventLoading] = useState(true);
    const [eventError, setEventError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDates, setSelectedDates] = useState<SelectedDate[]>([]);

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

    // 既存のオプションをselectedDatesに変換
    useEffect(() => {
        if (options.length > 0) {
            const dates = options.map(opt => ({
                date: opt.date,
                time: opt.start_time,
                endTime: opt.end_time,
            }));
            setSelectedDates(dates);
        }
    }, [options]);

    const getParticipantUrl = () => `${window.location.origin}/${eventId}`;

    const handleCopyParticipant = async () => {
        try {
            await navigator.clipboard.writeText(getParticipantUrl());
            setCopiedParticipant(true);
            setTimeout(() => setCopiedParticipant(false), 2000);
        } catch {
            // ignore
        }
    };

    const handleAddDate = (date: string, time: string, endTime?: string) => {
        // 重複チェック
        const exists = selectedDates.some(d => d.date === date && d.time === time);
        if (!exists) {
            setSelectedDates([...selectedDates, { date, time, endTime }]);
        }
    };

    const handleRemoveDate = (index: number) => {
        setSelectedDates(selectedDates.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (selectedDates.length === 0) return;

        setIsSaving(true);
        try {
            if (isSupabaseConfigured) {
                // 既存のoptionsを削除
                await supabase
                    .from('options')
                    .delete()
                    .eq('event_id', eventId);

                // 新しいoptionsを作成
                const newOptions = selectedDates.map(d => ({
                    event_id: eventId,
                    date: d.date,
                    start_time: d.time,
                    end_time: d.endTime || '18:00',
                }));

                const { error } = await supabase
                    .from('options')
                    .insert(newOptions);

                if (error) throw error;
            } else {
                // デモモード
                demoStore.deleteOptions(eventId);
                const dateOptions = selectedDates.map(d => ({
                    date: d.date,
                    startTime: d.time,
                    endTime: d.endTime || '18:00',
                }));
                demoStore.createOptions(eventId, dateOptions);
            }

            // 成功したらリロード（リアルタイム更新を待つ）
            window.location.reload();
        } catch (err) {
            console.error('Error saving options:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // 既存の候補日と選択中の候補日が異なるかチェック
    const hasChanges = () => {
        if (selectedDates.length !== options.length) return true;
        return selectedDates.some((d, i) => {
            const opt = options[i];
            if (!opt) return true;
            return d.date !== opt.date || d.time !== opt.start_time || d.endTime !== opt.end_time;
        });
    };

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

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* ナビゲーション */}
                <div className="mb-4">
                    <button
                        onClick={() => router.push(`/${eventId}/admin`)}
                        className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-bold"
                    >
                        <ChartBar size={16} weight="fill" />
                        集計結果を見る
                    </button>
                </div>

                {/* イベント情報ヘッダー */}
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
                    <div className="flex items-center gap-2 text-purple-600 text-sm font-bold mb-1">
                        <CalendarBlank size={16} />
                        リーダー用画面
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
                    </div>
                </div>

                {/* 参加者用URL */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={20} weight="fill" className="text-blue-600" />
                        <span className="text-sm font-bold text-blue-700">参加者用URL</span>
                    </div>
                    <p className="text-xs text-blue-600 mb-2">
                        このURLを参加者に共有してください
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={getParticipantUrl()}
                            readOnly
                            className="flex-1 bg-white text-sm p-2 rounded-lg border border-blue-200 text-gray-700"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                            type="button"
                            onClick={handleCopyParticipant}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1
                                ${copiedParticipant
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }
                            `}
                        >
                            {copiedParticipant ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* 候補日設定 */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-700 mb-3 px-1 flex items-center gap-2">
                        <Plus size={20} weight="bold" />
                        候補日を設定
                    </h3>
                    <DateTimePicker
                        selectedDates={selectedDates}
                        onAdd={handleAddDate}
                        onRemove={handleRemoveDate}
                    />
                </div>

                {/* 保存ボタン */}
                {hasChanges() && selectedDates.length > 0 && (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <span className="animate-pulse">保存中...</span>
                        ) : (
                            <>
                                <Check size={24} weight="bold" />
                                候補日を保存
                            </>
                        )}
                    </button>
                )}
            </main>
        </div>
    );
}
