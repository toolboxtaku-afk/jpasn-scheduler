'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Link as LinkIcon, Copy, Check, Clock, ChartBar, PencilSimple, Users, ArrowSquareOut, ClockCountdown, Trash } from '@phosphor-icons/react';
import Header from '@/components/Header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as demoStore from '@/lib/demoStore';
import { getMeetings, getRemainingDays, MeetingHistoryItem } from '@/lib/meetingHistory';

export default function CreatePage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(60);
    const [isCreating, setIsCreating] = useState(false);
    const [createdEventId, setCreatedEventId] = useState<string | null>(null);
    const [copiedLeader, setCopiedLeader] = useState(false);
    const [copiedParticipant, setCopiedParticipant] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [meetingHistory, setMeetingHistory] = useState<MeetingHistoryItem[]>([]);
    const [copiedHistory, setCopiedHistory] = useState<Record<string, boolean>>({});

    // 会議履歴を読み込み
    useEffect(() => {
        const loadMeetings = async () => {
            const meetings = await getMeetings();
            setMeetingHistory(meetings);
        };
        loadMeetings();
    }, []);

    const DURATION_OPTIONS = [
        { value: 30, label: '30分' },
        { value: 60, label: '60分（1時間）' },
        { value: 90, label: '90分（1時間30分）' },
        { value: 120, label: '120分（2時間）' },
    ];

    const handleCreate = async () => {
        // バリデーション
        if (!title.trim()) {
            setError('会議名を入力してください');
            return;
        }

        setError(null);
        setIsCreating(true);

        try {
            let eventId: string;

            if (isSupabaseConfigured) {
                // Supabaseを使用
                const { data: eventData, error: eventError } = await supabase
                    .from('events')
                    .insert({ title: title.trim(), duration })
                    .select()
                    .single();

                if (eventError) throw eventError;
                eventId = eventData.id;
            } else {
                // デモモード: ローカルストレージを使用
                const event = demoStore.createEvent(title.trim(), duration);
                eventId = event.id;
            }

            // 会議履歴を再読込（Supabaseで自動保存済み）
            const updatedMeetings = await getMeetings();
            setMeetingHistory(updatedMeetings);

            // 成功したらURLを表示
            setCreatedEventId(eventId);
        } catch (err) {
            console.error('Error creating event:', err);
            setError('イベントの作成に失敗しました。もう一度お試しください。');
        } finally {
            setIsCreating(false);
        }
    };

    const getLeaderUrl = () => `${window.location.origin}/${createdEventId}/edit`;
    const getParticipantUrl = () => `${window.location.origin}/${createdEventId}`;
    const getAdminUrl = () => `${window.location.origin}/${createdEventId}/admin`;

    const handleCopyLeader = async () => {
        try {
            await navigator.clipboard.writeText(getLeaderUrl());
            setCopiedLeader(true);
            setTimeout(() => setCopiedLeader(false), 2000);
        } catch {
            // ignore
        }
    };

    const handleCopyParticipant = async () => {
        try {
            await navigator.clipboard.writeText(getParticipantUrl());
            setCopiedParticipant(true);
            setTimeout(() => setCopiedParticipant(false), 2000);
        } catch {
            // ignore
        }
    };

    // 作成完了画面
    if (createdEventId) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
                <Header />
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                        <div className="text-center mb-6">
                            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={40} weight="bold" className="text-green-600" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                                作成しました！
                            </h2>
                            <p className="text-gray-600">
                                2種類のURLが発行されました
                            </p>
                        </div>

                        {/* リーダー用URL */}
                        <div className="bg-purple-50 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <PencilSimple size={20} weight="fill" className="text-purple-600" />
                                <span className="text-sm font-bold text-purple-700">リーダー用URL（候補日設定）</span>
                            </div>
                            <p className="text-xs text-purple-600 mb-2">
                                このURLから候補日を設定してください
                            </p>
                            <input
                                type="text"
                                value={getLeaderUrl()}
                                readOnly
                                className="w-full bg-white text-sm p-2 rounded-lg border border-purple-200 text-gray-700 mb-2"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button
                                type="button"
                                onClick={handleCopyLeader}
                                className={`
                                    w-full py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
                                    ${copiedLeader
                                        ? 'bg-green-500 text-white'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                    }
                                `}
                            >
                                {copiedLeader ? (
                                    <>
                                        <Check size={16} weight="bold" />
                                        コピーしました
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        コピー
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 参加者用URL */}
                        <div className="bg-blue-50 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Users size={20} weight="fill" className="text-blue-600" />
                                <span className="text-sm font-bold text-blue-700">参加者用URL（予定入力）</span>
                            </div>
                            <p className="text-xs text-blue-600 mb-2">
                                このURLを参加者に共有してください
                            </p>
                            <input
                                type="text"
                                value={getParticipantUrl()}
                                readOnly
                                className="w-full bg-white text-sm p-2 rounded-lg border border-blue-200 text-gray-700 mb-2"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button
                                type="button"
                                onClick={handleCopyParticipant}
                                className={`
                                    w-full py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
                                    ${copiedParticipant
                                        ? 'bg-green-500 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }
                                `}
                            >
                                {copiedParticipant ? (
                                    <>
                                        <Check size={16} weight="bold" />
                                        コピーしました
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        コピー
                                    </>
                                )}
                            </button>
                        </div>

                        {/* アクションボタン */}
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => router.push(`/${createdEventId}/edit`)}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <PencilSimple size={24} weight="bold" />
                                候補日を設定する
                            </button>

                            <button
                                type="button"
                                onClick={() => router.push(getAdminUrl())}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <ChartBar size={20} weight="fill" />
                                集計結果を見る
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // 作成フォーム
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <Header />
            <main className="max-w-lg mx-auto px-4 py-6 md:py-8">
                {/* タイトル入力 */}
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <CalendarPlus size={24} weight="fill" className="text-blue-600" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                            新しい日程調整
                        </h2>
                    </div>

                    <label className="block text-lg font-bold text-gray-700 mb-2">
                        会議名
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setError(null);
                        }}
                        placeholder="例：運営委員会"
                        className="w-full text-xl p-4 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 placeholder:text-gray-300"
                    />
                </div>

                {/* 会議時間選択 */}
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Clock size={24} weight="fill" className="text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700">
                            会議時間
                        </h3>
                    </div>
                    <select
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full text-xl p-4 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 bg-white cursor-pointer"
                    >
                        {DURATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 説明 */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600">
                    <p className="font-bold mb-2">📝 作成後の流れ</p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>リーダー用URLから候補日を設定</li>
                        <li>参加者用URLを参加者に共有</li>
                        <li>参加者が予定を入力</li>
                        <li>集計結果を確認して日程決定</li>
                    </ol>
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-base">
                        {error}
                    </div>
                )}

                {/* 作成ボタン */}
                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isCreating || !title.trim()}
                    className={`
                        w-full py-4 text-xl font-bold rounded-xl
                        transition-all duration-200
                        flex items-center justify-center gap-2
                        ${isCreating || !title.trim()
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg active:scale-[0.98]'
                        }
                    `}
                >
                    {isCreating ? (
                        <span className="animate-pulse">作成中...</span>
                    ) : (
                        <>
                            <CalendarPlus size={24} />
                            作成する
                        </>
                    )}
                </button>

                {/* 最近作成した会議 */}
                {meetingHistory.length > 0 && (
                    <div className="mt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <ClockCountdown size={20} weight="fill" className="text-gray-500" />
                            <h3 className="text-lg font-bold text-gray-700">最近の会議（チーム共通）</h3>
                        </div>
                        <div className="space-y-3">
                            {meetingHistory.map((meeting) => {
                                const remainingDays = getRemainingDays(meeting.createdAt);
                                return (
                                    <div
                                        key={meeting.eventId}
                                        className="bg-white rounded-xl shadow-md p-4 border border-gray-100"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h4 className="font-bold text-gray-800 text-lg truncate flex-1">
                                                {meeting.title}
                                            </h4>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-3">
                                            {meeting.duration}分 • 残り{remainingDays}日で期限切れ
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/${meeting.eventId}/edit`)}
                                                className="flex-1 py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                <PencilSimple size={16} weight="bold" />
                                                候補日設定
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(`${window.location.origin}/${meeting.eventId}`);
                                                        setCopiedHistory(prev => ({ ...prev, [meeting.eventId]: true }));
                                                        setTimeout(() => {
                                                            setCopiedHistory(prev => ({ ...prev, [meeting.eventId]: false }));
                                                        }, 2000);
                                                    } catch {
                                                        // ignore
                                                    }
                                                }}
                                                className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${copiedHistory[meeting.eventId]
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                                    }`}
                                            >
                                                {copiedHistory[meeting.eventId] ? (
                                                    <>
                                                        <Check size={16} weight="bold" />
                                                        コピー済み
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={16} />
                                                        参加者URL
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/${meeting.eventId}/admin`)}
                                                className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                                title="集計結果"
                                            >
                                                <ChartBar size={16} weight="fill" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!confirm('この会議を削除してもよろしいですか？')) return;
                                                    try {
                                                        if (isSupabaseConfigured) {
                                                            // 関連するレスポンスを先に削除
                                                            const { data: options } = await supabase
                                                                .from('options')
                                                                .select('id')
                                                                .eq('event_id', meeting.eventId);

                                                            if (options && options.length > 0) {
                                                                const optionIds = options.map(o => o.id);
                                                                const { error: respError } = await supabase
                                                                    .from('responses')
                                                                    .delete()
                                                                    .in('option_id', optionIds);

                                                                if (respError) {
                                                                    console.error('Failed to delete responses:', respError);
                                                                }

                                                                const { error: optError } = await supabase
                                                                    .from('options')
                                                                    .delete()
                                                                    .eq('event_id', meeting.eventId);

                                                                if (optError) {
                                                                    console.error('Failed to delete options:', optError);
                                                                }
                                                            }

                                                            // イベントを削除
                                                            const { error: eventError } = await supabase
                                                                .from('events')
                                                                .delete()
                                                                .eq('id', meeting.eventId);

                                                            if (eventError) {
                                                                console.error('Failed to delete event:', eventError);
                                                                alert('会議の削除に失敗しました: ' + eventError.message);
                                                                return;
                                                            }
                                                        }
                                                        // 履歴を再読み込み
                                                        const meetings = await getMeetings();
                                                        setMeetingHistory(meetings);
                                                    } catch (err) {
                                                        console.error('Failed to delete meeting:', err);
                                                        alert('会議の削除に失敗しました。');
                                                    }
                                                }}
                                                className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                                                title="削除"
                                            >
                                                <Trash size={16} weight="fill" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-400 mt-3 text-center">
                            ※ どのデバイスからでも同じ履歴が表示されます（1週間で自動削除）
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
