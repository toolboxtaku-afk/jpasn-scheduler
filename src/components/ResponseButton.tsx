'use client';

import { ResponseStatus, RESPONSE_LABELS } from '@/types/database';

interface ResponseButtonProps {
    status: ResponseStatus;
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
}

const BUTTON_STYLES: Record<ResponseStatus, {
    base: string;
    selected: string;
    ring: string;
}> = {
    2: { // ○
        base: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
        selected: 'bg-green-500 text-white border-green-600 shadow-lg',
        ring: 'ring-green-300',
    },
    1: { // △
        base: 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100',
        selected: 'bg-yellow-500 text-white border-yellow-600 shadow-lg',
        ring: 'ring-yellow-300',
    },
    0: { // ×
        base: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
        selected: 'bg-red-500 text-white border-red-600 shadow-lg',
        ring: 'ring-red-300',
    },
};

export default function ResponseButton({
    status,
    selected,
    onClick,
    disabled = false,
}: ResponseButtonProps) {
    const styles = BUTTON_STYLES[status];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`
        w-14 h-14 md:w-16 md:h-16 
        text-2xl md:text-3xl font-bold
        rounded-xl border-2
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        focus:outline-none focus:ring-4 ${styles.ring}
        ${selected ? styles.selected : styles.base}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      `}
            aria-label={`${RESPONSE_LABELS[status]}を選ぶ`}
            aria-pressed={selected}
        >
            {RESPONSE_LABELS[status]}
        </button>
    );
}
