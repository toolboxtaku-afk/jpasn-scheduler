'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Clock } from '@phosphor-icons/react';
import { generateTimeSlots, getSlotEndTime } from '@/types/database';
import { OptionWithResponses } from '@/types/database';

interface WeeklyTimeGridProps {
    options: OptionWithResponses[];
    duration: number;
    userName: string;
    onSlotsChange: (optionId: string, ngSlots: string[]) => void;
    userResponses: Record<string, string[]>; // NGスロット
}

// 曜日表示（月曜始まり、全角括弧）
const weekDayLabels = ['（月）', '（火）', '（水）', '（木）', '（金）', '（土）', '（日）'];

function getDayOfWeekMondayStart(dateStr: string): number {
    const date = new Date(dateStr);
    const day = date.getDay(); // 0=日, 1=月, ..., 6=土
    return day === 0 ? 6 : day - 1; // 月=0, 火=1, ..., 日=6
}

function formatDateFull(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

// 時間表示のフォーマット（:30は「:30」のみ表示）
function formatTimeLabel(slot: string): string {
    if (slot.endsWith(':00')) {
        return slot; // "10:00" のまま
    } else {
        return ':' + slot.split(':')[1]; // ":30"
    }
}

export default function WeeklyTimeGrid({
    options,
    duration,
    userName,
    onSlotsChange,
    userResponses,
}: WeeklyTimeGridProps) {
    // 全候補日の時間スロットを計算
    const timeSlots = useMemo(() => {
        if (options.length === 0) return [];

        // 全候補日の中で最も早い開始時刻と最も遅い終了時刻を取得
        let minStart = '23:59';
        let maxEnd = '00:00';

        options.forEach(opt => {
            if (opt.start_time < minStart) minStart = opt.start_time;
            if (opt.end_time > maxEnd) maxEnd = opt.end_time;
        });

        return generateTimeSlots(minStart, maxEnd, duration);
    }, [options, duration]);

    // 候補日を日付でソート
    const sortedOptions = useMemo(() => {
        return [...options].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.start_time.localeCompare(b.start_time);
        });
    }, [options]);

    // スロットがこのオプションで有効かどうか
    const isSlotAvailable = (option: OptionWithResponses, slot: string): boolean => {
        const optionSlots = generateTimeSlots(option.start_time, option.end_time, duration);
        return optionSlots.includes(slot);
    };

    // スロットがNGとしてマークされているか
    const isSlotNG = (optionId: string, slot: string): boolean => {
        return (userResponses[optionId] || []).includes(slot);
    };

    // スロットをトグル
    const toggleSlot = (optionId: string, slot: string) => {
        const currentNG = userResponses[optionId] || [];
        let newNG: string[];

        if (currentNG.includes(slot)) {
            newNG = currentNG.filter(s => s !== slot);
        } else {
            newNG = [...currentNG, slot].sort();
        }

        onSlotsChange(optionId, newNG);
    };

    // 列ごとに全てNG/全てOKをトグル
    const toggleColumn = (optionId: string) => {
        const option = options.find(o => o.id === optionId);
        if (!option) return;

        const availableSlots = generateTimeSlots(option.start_time, option.end_time, duration);
        const currentNG = userResponses[optionId] || [];

        if (currentNG.length === availableSlots.length) {
            onSlotsChange(optionId, []);
        } else {
            onSlotsChange(optionId, [...availableSlots]);
        }
    };

    // :00 か :30 かを判定
    const isOnTheHour = (slot: string): boolean => {
        return slot.endsWith(':00');
    };

    if (options.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8">
                候補日がありません
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-800">
                    📅 参加できない時間帯をクリック
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={16} />
                    <span>会議: {duration}分</span>
                </div>
            </div>

            {/* 凡例 */}
            <div className="flex gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-green-100 border border-green-300 rounded"></div>
                    <span className="text-gray-600">参加可能</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-red-100 border border-red-300 rounded flex items-center justify-center">
                        <X size={12} className="text-red-500" />
                    </div>
                    <span className="text-gray-600">NG</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-gray-100 border border-gray-200 rounded"></div>
                    <span className="text-gray-600">対象外</span>
                </div>
            </div>

            {/* グリッド */}
            <div className="min-w-[400px]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 text-left text-sm font-bold text-gray-500 w-16 align-bottom">
                                時間
                            </th>
                            {sortedOptions.map((opt) => {
                                const dayIndex = getDayOfWeekMondayStart(opt.date);
                                const allNG = (userResponses[opt.id] || []).length === generateTimeSlots(opt.start_time, opt.end_time, duration).length;

                                return (
                                    <th key={opt.id} className="p-1 text-center min-w-[70px]">
                                        <button
                                            type="button"
                                            onClick={() => toggleColumn(opt.id)}
                                            className={`
                                                w-full p-2 rounded-xl transition-colors
                                                ${allNG ? 'bg-red-50 hover:bg-red-100' : 'bg-blue-50 hover:bg-blue-100'}
                                            `}
                                        >
                                            <div className="text-lg font-bold text-gray-800">
                                                {formatDateFull(opt.date)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {weekDayLabels[dayIndex]}
                                            </div>
                                        </button>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((slot, index) => {
                            const onTheHour = isOnTheHour(slot);

                            return (
                                <tr
                                    key={slot}
                                    className={`
                                        ${onTheHour
                                            ? 'border-t-2 border-gray-300'
                                            : 'border-t border-dashed border-gray-200'
                                        }
                                    `}
                                >
                                    <td className={`
                                        p-2 text-sm font-bold whitespace-nowrap text-right
                                        ${onTheHour ? 'text-gray-700' : 'text-gray-400 text-xs'}
                                    `}>
                                        {formatTimeLabel(slot)}
                                    </td>
                                    {sortedOptions.map((opt) => {
                                        const available = isSlotAvailable(opt, slot);
                                        const isNG = isSlotNG(opt.id, slot);

                                        if (!available) {
                                            return (
                                                <td key={opt.id} className="p-1">
                                                    <div className="w-full h-10 bg-gray-50 rounded"></div>
                                                </td>
                                            );
                                        }

                                        return (
                                            <td key={opt.id} className="p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSlot(opt.id, slot)}
                                                    className={`
                                                        w-full h-10 rounded-lg border-2 transition-all duration-150
                                                        flex items-center justify-center
                                                        ${isNG
                                                            ? 'bg-red-100 border-red-300 hover:bg-red-200'
                                                            : 'bg-green-50 border-green-200 hover:bg-green-100'
                                                        }
                                                    `}
                                                >
                                                    {isNG && <X size={20} className="text-red-500" />}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* サマリー */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-2 text-sm">
                    {sortedOptions.map(opt => {
                        const dayIndex = getDayOfWeekMondayStart(opt.date);
                        const availableSlots = generateTimeSlots(opt.start_time, opt.end_time, duration);
                        const ngCount = (userResponses[opt.id] || []).length;
                        const okCount = availableSlots.length - ngCount;

                        return (
                            <div key={opt.id} className="px-3 py-1 bg-gray-100 rounded-full">
                                <span className="font-bold text-gray-700">
                                    {formatDateFull(opt.date)}{weekDayLabels[dayIndex]}
                                </span>
                                <span className="text-gray-500 ml-1">
                                    {okCount}/{availableSlots.length} OK
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
