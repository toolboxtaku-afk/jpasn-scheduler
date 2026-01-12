'use client';

import { useState } from 'react';
import { User, X } from '@phosphor-icons/react';

interface NameInputModalProps {
    isOpen: boolean;
    onSubmit: (name: string) => void;
    onClose?: () => void;
}

export default function NameInputModal({
    isOpen,
    onSubmit,
    onClose,
}: NameInputModalProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError('お名前を入力してください');
            return;
        }

        if (trimmedName.length > 20) {
            setError('お名前は20文字以内でお願いします');
            return;
        }

        setError('');
        onSubmit(trimmedName);
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-modal-title"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8">
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        aria-label="閉じる"
                    >
                        <X size={24} />
                    </button>
                )}

                <div className="flex flex-col items-center mb-6">
                    <div className="bg-blue-100 rounded-full p-4 mb-4">
                        <User size={40} weight="fill" className="text-blue-600" />
                    </div>
                    <h2
                        id="name-modal-title"
                        className="text-2xl md:text-3xl font-bold text-gray-800 text-center"
                    >
                        お名前を教えてください
                    </h2>
                    <p className="text-gray-500 text-base md:text-lg mt-2 text-center">
                        他の方に表示されます
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError('');
                        }}
                        placeholder="例：田中太郎"
                        className={`
              w-full text-xl md:text-2xl p-4 
              border-2 rounded-xl
              focus:outline-none focus:ring-4 focus:ring-blue-200
              placeholder:text-gray-300
              ${error ? 'border-red-400' : 'border-gray-200 focus:border-blue-400'}
            `}
                        autoFocus
                        autoComplete="name"
                    />

                    {error && (
                        <p className="text-red-500 text-base mt-2">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="
              w-full mt-6 py-4 
              bg-blue-600 hover:bg-blue-700 
              text-white text-xl md:text-2xl font-bold
              rounded-xl
              transition-colors duration-200
              focus:outline-none focus:ring-4 focus:ring-blue-300
              active:scale-[0.98]
            "
                    >
                        次へすすむ
                    </button>
                </form>
            </div>
        </div>
    );
}
