'use client';

import { OptionWithResponses, RESPONSE_LABELS, ResponseStatus } from '@/types/database';
import { Check, AlertTriangle } from 'lucide-react';

interface ResponseMatrixProps {
    options: OptionWithResponses[];
    participants: string[];
    currentUser?: string;
}

// ×の割合に応じた背景色
function getHeatmapColor(ngRatio: number): string {
    if (ngRatio === 0) return 'bg-white';
    if (ngRatio <= 0.2) return 'bg-red-50';
    if (ngRatio <= 0.4) return 'bg-red-100';
    if (ngRatio <= 0.6) return 'bg-red-200';
    if (ngRatio <= 0.8) return 'bg-red-300';
    return 'bg-red-400';
}

// 日時のフォーマット
function formatDateTime(dateStr: string): { date: string; time: string } {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return {
        date: `${month}/${day}(${weekday})`,
        time: `${hours}:${minutes}`,
    };
}

export default function ResponseMatrix({
    options,
    participants,
    currentUser,
}: ResponseMatrixProps) {
    if (options.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                候補日がまだありません
            </div>
        );
    }

    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse min-w-[300px]">
                <thead>
                    <tr>
                        <th className="sticky left-0 bg-gray-50 text-left p-3 text-sm md:text-base font-bold text-gray-700 border-b-2 border-gray-200 min-w-[100px]">
                            候補日
                        </th>
                        {participants.map((name) => (
                            <th
                                key={name}
                                className={`
                  p-3 text-center text-sm md:text-base font-bold border-b-2 border-gray-200 min-w-[60px]
                  ${name === currentUser ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}
                `}
                            >
                                <span className="block truncate max-w-[80px]" title={name}>
                                    {name}
                                </span>
                            </th>
                        ))}
                        <th className="p-3 text-center text-sm md:text-base font-bold bg-gray-50 text-gray-700 border-b-2 border-gray-200 min-w-[50px]">
                            状況
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {options.map((option) => {
                        const { date, time } = formatDateTime(option.start_at);

                        // 回答の集計
                        const totalResponses = option.responses.length;
                        const ngCount = option.responses.filter(r => r.status === 0).length;
                        const okCount = option.responses.filter(r => r.status === 2).length;
                        const ngRatio = totalResponses > 0 ? ngCount / totalResponses : 0;
                        const isAllOk = totalResponses > 0 && okCount === totalResponses;

                        return (
                            <tr
                                key={option.id}
                                className={`
                  ${getHeatmapColor(ngRatio)}
                  ${isAllOk ? 'ring-2 ring-green-500 ring-inset' : ''}
                  transition-colors duration-300
                `}
                            >
                                <td className="sticky left-0 bg-inherit p-3 border-b border-gray-100">
                                    <div className="text-base md:text-lg font-bold text-gray-800">
                                        {date}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {time}〜
                                    </div>
                                </td>
                                {participants.map((name) => {
                                    const response = option.responses.find(r => r.user_name === name);
                                    const status = response?.status;

                                    return (
                                        <td
                                            key={`${option.id}-${name}`}
                                            className={`
                        p-3 text-center border-b border-gray-100
                        ${name === currentUser ? 'bg-blue-50/50' : ''}
                      `}
                                        >
                                            {status !== undefined ? (
                                                <span
                                                    className={`
                            inline-flex items-center justify-center
                            w-10 h-10 md:w-12 md:h-12
                            text-xl md:text-2xl font-bold rounded-lg
                            ${status === 2 ? 'bg-green-100 text-green-600' : ''}
                            ${status === 1 ? 'bg-yellow-100 text-yellow-600' : ''}
                            ${status === 0 ? 'bg-red-100 text-red-600' : ''}
                          `}
                                                >
                                                    {RESPONSE_LABELS[status]}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-lg">—</span>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="p-3 text-center border-b border-gray-100">
                                    {isAllOk ? (
                                        <div className="flex items-center justify-center gap-1 text-green-600">
                                            <Check className="w-5 h-5" />
                                            <span className="text-sm font-bold">決定</span>
                                        </div>
                                    ) : ngCount > 0 ? (
                                        <div className="flex items-center justify-center gap-1 text-red-500">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span className="text-sm">×{ngCount}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-sm">
                                            {totalResponses > 0 ? `${okCount}/${totalResponses}` : '—'}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
