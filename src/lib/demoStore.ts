// デモモード用のローカルストレージベースのデータストア
// Supabaseが設定されていない場合に使用

import { Event, Option, Response } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'jpasn_demo_data_v2';

interface DemoData {
    events: Event[];
    options: Option[];
    responses: Response[];
}

function getData(): DemoData {
    if (typeof window === 'undefined') {
        return { events: [], options: [], responses: [] };
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return { events: [], options: [], responses: [] };
    }
    try {
        return JSON.parse(stored);
    } catch {
        return { events: [], options: [], responses: [] };
    }
}

function saveData(data: DemoData) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// イベント作成
export function createEvent(title: string, duration: number, description?: string): Event {
    const data = getData();
    const event: Event = {
        id: uuidv4(),
        title,
        description: description || null,
        duration,
        creator_token: uuidv4(),
        created_at: new Date().toISOString(),
    };
    data.events.push(event);
    saveData(data);
    return event;
}

// イベント取得
export function getEvent(id: string): Event | null {
    const data = getData();
    return data.events.find(e => e.id === id) || null;
}

// オプション（候補日）作成
export function createOptions(eventId: string, dateOptions: { date: string; startTime: string; endTime: string }[]): Option[] {
    const data = getData();
    const newOptions: Option[] = dateOptions.map(opt => ({
        id: uuidv4(),
        event_id: eventId,
        date: opt.date,
        start_time: opt.startTime,
        end_time: opt.endTime,
        created_at: new Date().toISOString(),
    }));
    data.options.push(...newOptions);
    saveData(data);
    return newOptions;
}

// オプション取得
export function getOptions(eventId: string): Option[] {
    const data = getData();
    return data.options
        .filter(o => o.event_id === eventId)
        .sort((a, b) => {
            // 日付でソート、同じ日付なら開始時刻でソート
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.start_time.localeCompare(b.start_time);
        });
}

// 回答作成/更新
export function upsertResponse(optionId: string, userName: string, selectedSlots: string[]): Response {
    const data = getData();
    const existingIndex = data.responses.findIndex(
        r => r.option_id === optionId && r.user_name === userName
    );

    if (existingIndex >= 0) {
        data.responses[existingIndex].selected_slots = selectedSlots;
        saveData(data);
        return data.responses[existingIndex];
    }

    const response: Response = {
        id: uuidv4(),
        option_id: optionId,
        user_name: userName,
        selected_slots: selectedSlots,
        created_at: new Date().toISOString(),
    };
    data.responses.push(response);
    saveData(data);
    return response;
}

// 回答取得
export function getResponses(optionIds: string[]): Response[] {
    const data = getData();
    return data.responses.filter(r => optionIds.includes(r.option_id));
}

// オプション追加
export function addOption(eventId: string, date: string, startTime: string, endTime: string): Option {
    const data = getData();
    const option: Option = {
        id: uuidv4(),
        event_id: eventId,
        date,
        start_time: startTime,
        end_time: endTime,
        created_at: new Date().toISOString(),
    };
    data.options.push(option);
    saveData(data);
    return option;
}

// オプション削除（イベント全体）
export function deleteOptions(eventId: string): void {
    const data = getData();
    data.options = data.options.filter(o => o.event_id !== eventId);
    // 関連する回答も削除
    const remainingOptionIds = data.options.map(o => o.id);
    data.responses = data.responses.filter(r => remainingOptionIds.includes(r.option_id));
    saveData(data);
}
