'use client';

import { useState } from 'react';
import { CaretLeft, CaretRight, Plus, X, Clock, Warning } from '@phosphor-icons/react';
import { BusyTime, formatBusyTimes } from '@/lib/googleCalendar';

interface DateTimePickerProps {
    selectedDates: { date: string; time: string; endTime?: string }[];
    onAdd: (date: string, time: string, endTime?: string) => void;
    onRemove: (index: number) => void;
    busyTimes?: BusyTime[];
    isGoogleConnected?: boolean;
    onDateSelect?: (dateStr: string) => void;
}

// 時間オプション（9:00〜22:00、30分単位）
const TIME_OPTIONS = Array.from({ length: 27 }, (_, i) => {
    const totalMinutes = 9 * 60 + i * 30; // 9:00から30分刻み
    const hour = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export default function DateTimePicker({
    selectedDates,
    onAdd,
    onRemove,
    busyTimes = [],
    isGoogleConnected = false,
    onDateSelect,
}: DateTimePickerProps) {
    const today = new Date();
    // 翌月をデフォルト表示
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const [currentMonth, setCurrentMonth] = useState(nextMonth.getMonth());
    const [currentYear, setCurrentYear] = useState(nextMonth.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('18:00');
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    // カレンダーの日付を生成
    const getDaysInMonth = (year: number, month: number) => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: (number | null)[] = [];

        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(i);
        }

        return days;
    };

    const days = getDaysInMonth(currentYear, currentMonth);
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleSelectDate = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        onDateSelect?.(dateStr);
    };

    // 重複する予定の時間帯を取得
    const getConflictingBusyTimes = () => {
        if (!selectedDate) return [];
        const [year, month, day] = selectedDate.split('-').map(Number);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const rangeStart = new Date(year, month - 1, day, startHour, startMinute).getTime();
        const rangeEnd = new Date(year, month - 1, day, endHour, endMinute).getTime();

        return busyTimes.filter(busy => {
            const busyStart = new Date(busy.start).getTime();
            const busyEnd = new Date(busy.end).getTime();
            return rangeStart < busyEnd && rangeEnd > busyStart;
        });
    };

    const handleAddDateTime = () => {
        if (selectedDate) {
            const conflicts = getConflictingBusyTimes();
            if (conflicts.length > 0) {
                // 重複する時間帯をフォーマット
                const conflictTimes = conflicts.map(busy => {
                    const start = new Date(busy.start);
                    const end = new Date(busy.end);
                    return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}〜${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                }).join('、');
                setConflictWarning(`${conflictTimes}は、すでにJPASNの他の予定が入っています。可能な限り候補から外してください。`);
                return;
            }
            setConflictWarning(null);
            onAdd(selectedDate, startTime, endTime);
            setSelectedDate(null);
        }
    };

    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = weekDays[date.getDay()];
        return `${month}/${day}(${weekday})`;
    };

    const isPast = (day: number) => {
        const date = new Date(currentYear, currentMonth, day);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return date < todayStart;
    };

    // 開始時間が変更されたら、終了時間を調整
    const handleStartTimeChange = (time: string) => {
        setStartTime(time);
        // 開始時間が終了時間以上なら、終了時間を開始時間+1時間に
        const startIndex = TIME_OPTIONS.indexOf(time);
        const endIndex = TIME_OPTIONS.indexOf(endTime);
        if (startIndex >= endIndex && startIndex < TIME_OPTIONS.length - 1) {
            setEndTime(TIME_OPTIONS[startIndex + 1]);
        }
    };

    // 終了時間の選択肢（開始時間より後のみ）
    const getEndTimeOptions = () => {
        const startIndex = TIME_OPTIONS.indexOf(startTime);
        return TIME_OPTIONS.slice(startIndex + 1);
    };

    return (
        <div className="space-y-6">
            {/* カレンダー */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="前の月"
                    >
                        <CaretLeft size={24} className="text-gray-600" />
                    </button>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                        {currentYear}年 {monthNames[currentMonth]}
                    </h3>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="次の月"
                    >
                        <CaretRight size={24} className="text-gray-600" />
                    </button>
                </div>

                {/* 曜日 */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day, i) => (
                        <div
                            key={day}
                            className={`
                                text-center text-sm font-bold py-2
                                ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}
                            `}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* 日付 */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="p-2" />;
                        }

                        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = selectedDate === dateStr;
                        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                        const isPastDay = isPast(day);
                        const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();

                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => !isPastDay && handleSelectDate(day)}
                                disabled={isPastDay}
                                className={`
                                    p-2 md:p-3 rounded-xl text-lg md:text-xl font-bold
                                    transition-all duration-200
                                    ${isPastDay
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : isSelected
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : isToday
                                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                : dayOfWeek === 0
                                                    ? 'text-red-500 hover:bg-red-50'
                                                    : dayOfWeek === 6
                                                        ? 'text-blue-500 hover:bg-blue-50'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                    }
                                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 時間帯選択 */}
            {selectedDate && (
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={20} className="text-blue-600" />
                        <h4 className="text-lg font-bold text-gray-700">
                            {formatDisplayDate(selectedDate)} の調整可能時間帯
                        </h4>
                    </div>

                    <div className="space-y-4">
                        {/* 開始時間 */}
                        <div>
                            <label className="block text-base font-bold text-gray-600 mb-2">
                                会議開始可能時間
                            </label>
                            <select
                                value={startTime}
                                onChange={(e) => handleStartTimeChange(e.target.value)}
                                className="w-full text-xl p-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 bg-white cursor-pointer"
                            >
                                {TIME_OPTIONS.slice(0, -1).map((time) => (
                                    <option key={time} value={time}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 終了時間 */}
                        <div>
                            <label className="block text-base font-bold text-gray-600 mb-2">
                                次の予定までの時間（この時間までに終了）
                            </label>
                            <select
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full text-xl p-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 bg-white cursor-pointer"
                            >
                                {getEndTimeOptions().map((time) => (
                                    <option key={time} value={time}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Googleカレンダーのbusy時間帯表示 */}
                        {isGoogleConnected && busyTimes.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1">
                                    <Warning size={18} weight="fill" />
                                    この日の既存予定
                                </div>
                                <div className="text-red-600 text-sm">
                                    {formatBusyTimes(busyTimes).map((time, i) => (
                                        <span key={i} className="inline-block bg-red-100 px-2 py-1 rounded mr-2 mb-1">
                                            {time}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 選択中の時間帯プレビュー */}
                        {(() => {
                            const hasConflict = selectedDate && busyTimes.some(busy => {
                                const [year, month, day] = selectedDate.split('-').map(Number);
                                const [startHour, startMinute] = startTime.split(':').map(Number);
                                const [endHour, endMinute] = endTime.split(':').map(Number);
                                const rangeStart = new Date(year, month - 1, day, startHour, startMinute).getTime();
                                const rangeEnd = new Date(year, month - 1, day, endHour, endMinute).getTime();
                                const busyStart = new Date(busy.start).getTime();
                                const busyEnd = new Date(busy.end).getTime();
                                return rangeStart < busyEnd && rangeEnd > busyStart;
                            });
                            return (
                                <div className={`rounded-xl p-3 text-center ${hasConflict ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50'}`}>
                                    <span className={`text-lg font-bold ${hasConflict ? 'text-orange-700' : 'text-blue-700'}`}>
                                        {startTime} 〜 {endTime} の間で調整
                                        {hasConflict && ' ⚠️ 予定と重複'}
                                    </span>
                                </div>
                            );
                        })()}

                        {/* 重複エラーメッセージ */}
                        {conflictWarning && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded mt-3">
                                <div className="flex items-start gap-2">
                                    <Warning size={20} weight="fill" className="flex-shrink-0 mt-0.5" />
                                    <p className="text-sm font-bold">{conflictWarning}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddDateTime}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-xl transition-colors"
                    >
                        <Plus size={20} weight="bold" />
                        この日程を追加
                    </button>
                </div>
            )}

            {/* 選択済み日程 */}
            {selectedDates.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                    <h4 className="text-lg font-bold text-gray-700 mb-3">
                        選択した候補日 ({selectedDates.length}件)
                    </h4>
                    <ul className="space-y-2">
                        {selectedDates.map((item, index) => (
                            <li
                                key={`${item.date}-${item.time}-${index}`}
                                className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3"
                            >
                                <span className="text-lg font-bold text-blue-800">
                                    {formatDisplayDate(item.date)} {item.time}
                                    {item.endTime && ` 〜 ${item.endTime}`}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onRemove(index)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                    aria-label="削除"
                                >
                                    <X size={20} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
