'use client';

import { useState, useEffect } from 'react';
import { Check, Clock } from 'lucide-react';
import { generateTimeSlots, getSlotEndTime } from '@/types/database';

interface TimeSlotSelectorProps {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    selectedSlots: string[];
    onSlotsChange: (slots: string[]) => void;
    disabled?: boolean;
}

// 曜日表示用
const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekDays[date.getDay()];
    return `${month}/${day}(${weekday})`;
}

export default function TimeSlotSelector({
    date,
    startTime,
    endTime,
    duration,
    selectedSlots,
    onSlotsChange,
    disabled = false,
}: TimeSlotSelectorProps) {
    const [localSlots, setLocalSlots] = useState<string[]>(selectedSlots);

    useEffect(() => {
        setLocalSlots(selectedSlots);
    }, [selectedSlots]);

    // 利用可能な時間スロットを生成
    const availableSlots = generateTimeSlots(startTime, endTime, duration);

    const toggleSlot = (slot: string) => {
        if (disabled) return;

        let newSlots: string[];
        if (localSlots.includes(slot)) {
            newSlots = localSlots.filter(s => s !== slot);
        } else {
            newSlots = [...localSlots, slot].sort();
        }

        setLocalSlots(newSlots);
        onSlotsChange(newSlots);
    };

    const selectAll = () => {
        if (disabled) return;
        setLocalSlots([...availableSlots]);
        onSlotsChange([...availableSlots]);
    };

    const clearAll = () => {
        if (disabled) return;
        setLocalSlots([]);
        onSlotsChange([]);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4">
            {/* 日付ヘッダー */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-800">
                        {formatDate(date)}
                    </span>
                    <span className="text-sm text-gray-500">
                        {startTime} 〜 {endTime}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={selectAll}
                        disabled={disabled}
                        className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                        全て選択
                    </button>
                    <button
                        type="button"
                        onClick={clearAll}
                        disabled={disabled}
                        className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        クリア
                    </button>
                </div>
            </div>

            {/* 時間スロットグリッド */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {availableSlots.map((slot) => {
                    const isSelected = localSlots.includes(slot);
                    const slotEnd = getSlotEndTime(slot, duration);

                    return (
                        <button
                            key={slot}
                            type="button"
                            onClick={() => toggleSlot(slot)}
                            disabled={disabled}
                            className={`
                                flex items-center justify-center gap-1 py-3 px-2 rounded-xl
                                font-bold text-sm transition-all duration-200
                                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                ${isSelected
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
                            `}
                        >
                            {isSelected && <Check className="w-4 h-4" />}
                            <span>{slot}-{slotEnd}</span>
                        </button>
                    );
                })}
            </div>

            {/* 選択状況サマリー */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>会議時間: {duration}分</span>
                </div>
                <div className={`text-sm font-bold ${localSlots.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {localSlots.length > 0
                        ? `${localSlots.length}件選択中`
                        : '時間帯を選択してください'
                    }
                </div>
            </div>
        </div>
    );
}
