'use client';

import { CalendarBlank } from '@phosphor-icons/react';
import Link from 'next/link';

export default function Header() {
    return (
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
            <div className="max-w-4xl mx-auto px-4 py-4">
                <Link href="/" className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <CalendarBlank size={28} weight="fill" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold">日程調整</h1>
                        <p className="text-blue-100 text-xs md:text-sm">かんたん・リアルタイム</p>
                    </div>
                </Link>
            </div>
        </header>
    );
}
