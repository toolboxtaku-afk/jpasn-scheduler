'use client';

import { useMemo } from 'react';
import { X, Check } from '@phosphor-icons/react';
import { generateTimeSlots } from '@/types/database';
import { OptionWithResponses } from '@/types/database';

interface ResultsHeatmapProps {
    options: OptionWithResponses[];
    duration: number;
    participants: string[];
}

// 曜日表示（月曜始まり、全角括弧）
const weekDayLabels = ['（月）', '（火）', '（水）', '（木）', '（金）', '（土）', '（日）'];

function getDayOfWeekMondayStart(dateStr: string): number {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
}

function formatDateFull(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatTimeLabel(slot: string): string {
    if (slot.endsWith(':00')) {
        return slot;
    } else {
        return ':' + slot.split(':')[1];
    }
}

// ヒートマップの色を計算（NGが多いほどグレーに、OKが多いほど緑に）
function getHeatmapColor(ngCount: number, respondentCount: number): string {
    if (respondentCount === 0) return 'bg-gray-100';

    const okRatio = 1 - (ngCount / respondentCount); // OK率（0～1）

    if (okRatio === 1) {
        return 'bg-green-400'; // 全員OK - 最も有力
    } else if (okRatio >= 0.8) {
        return 'bg-green-300'; // ほぼOK
    } else if (okRatio >= 0.6) {
        return 'bg-green-200'; // 多数OK
    } else if (okRatio >= 0.4) {
        return 'bg-gray-200'; // 半分
    } else if (okRatio >= 0.2) {
        return 'bg-gray-300'; // 少数OK
    } else if (okRatio > 0) {
        return 'bg-gray-400'; // ほぼNG
    } else {
        return 'bg-gray-500'; // 全員NG
    }
}

export default function ResultsHeatmap({
    options,
    duration,
    participants,
}: ResultsHeatmapProps) {
    // 全候補日の時間スロットを計算
    const timeSlots = useMemo(() => {
        if (options.length === 0) return [];

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

    // 各スロットのNG数を計算
    const getSlotNGCount = (optionId: string, slot: string): { ngCount: number; ngUsers: string[]; okUsers: string[] } => {
        const option = options.find(o => o.id === optionId);
        if (!option) return { ngCount: 0, ngUsers: [], okUsers: [] };

        const ngUsers: string[] = [];
        const okUsers: string[] = [];

        participants.forEach(p => {
            const response = option.responses.find(r => r.user_name === p);
            if (response && response.selected_slots.includes(slot)) {
                ngUsers.push(p);
            } else if (response) {
                okUsers.push(p);
            }
            // 未回答者はカウントに含めない
        });

        return { ngCount: ngUsers.length, ngUsers, okUsers };
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
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 overflow-x-auto">
            {/* 凡例 */}
            <div className="flex flex-wrap gap-3 mb-4 text-sm">
                <span className="text-gray-600 font-bold">OK率:</span>
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-green-400 rounded"></div>
                    <span className="text-gray-600">100%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-green-300 rounded"></div>
                    <span className="text-gray-600">80%+</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-green-200 rounded"></div>
                    <span className="text-gray-600">60%+</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    <span className="text-gray-600">40%+</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-gray-400 rounded"></div>
                    <span className="text-gray-600">20%-</span>
                </div>
            </div>

            {/* グリッド */}
            <div className="min-w-[400px]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 text-right text-sm font-bold text-gray-500 w-16 align-bottom">
                                時間
                            </th>
                            {sortedOptions.map((opt) => {
                                const dayIndex = getDayOfWeekMondayStart(opt.date);

                                return (
                                    <th key={opt.id} className="p-1 text-center min-w-[70px]">
                                        <div className="p-2 rounded-xl bg-blue-50">
                                            <div className="text-lg font-bold text-gray-800">
                                                {formatDateFull(opt.date)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {weekDayLabels[dayIndex]}
                                            </div>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((slot) => {
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

                                        if (!available) {
                                            return (
                                                <td key={opt.id} className="p-1">
                                                    <div className="w-full h-12 bg-gray-50 rounded"></div>
                                                </td>
                                            );
                                        }

                                        const { ngCount, ngUsers, okUsers } = getSlotNGCount(opt.id, slot);
                                        const respondentCount = ngCount + okUsers.length; // 実際に回答した人数
                                        const heatmapColor = getHeatmapColor(ngCount, respondentCount);
                                        const okCount = okUsers.length;

                                        return (
                                            <td key={opt.id} className="p-1">
                                                <div
                                                    className={`
                                                        w-full h-12 rounded-lg flex flex-col items-center justify-center
                                                        ${heatmapColor}
                                                    `}
                                                    title={`OK: ${okUsers.join(', ') || 'なし'}\nNG: ${ngUsers.join(', ') || 'なし'}`}
                                                >
                                                    <div className="flex items-center gap-1 text-sm font-bold">
                                                        {ngCount === 0 && respondentCount > 0 ? (
                                                            <Check size={16} weight="bold" className="text-green-700" />
                                                        ) : (
                                                            <span className="text-gray-700">{okCount}/{respondentCount}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
