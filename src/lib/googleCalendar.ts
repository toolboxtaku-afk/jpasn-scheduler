// Google Calendar連携のユーティリティ

const STORAGE_KEY = 'jpasn_google_calendar';

export interface GoogleCalendarToken {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number; // Unix timestamp in milliseconds
}

export interface BusyTime {
    start: string; // ISO 8601
    end: string;   // ISO 8601
}

/**
 * ローカルストレージからGoogleトークンを取得
 */
export function getGoogleToken(): GoogleCalendarToken | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
        const token: GoogleCalendarToken = JSON.parse(stored);

        // 有効期限チェック（5分のバッファ）
        if (token.expiresAt < Date.now() + 5 * 60 * 1000) {
            // トークンが期限切れまたは期限切れ間近
            return null;
        }

        return token;
    } catch {
        return null;
    }
}

/**
 * Googleトークンをローカルストレージに保存
 */
export function saveGoogleToken(accessToken: string, expiresIn: number, refreshToken?: string): void {
    if (typeof window === 'undefined') return;

    const token: GoogleCalendarToken = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

/**
 * Googleトークンをローカルストレージから削除
 */
export function removeGoogleToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Google連携が有効かチェック
 */
export function isGoogleConnected(): boolean {
    return getGoogleToken() !== null;
}

/**
 * 指定した日付範囲のbusy時間を取得（iCal URL経由）
 * 環境変数 ICAL_URL が設定されている場合に使用
 */
export async function fetchBusyTimes(dateStr: string): Promise<BusyTime[]> {
    try {
        const response = await fetch('/api/ical', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: dateStr }),
        });

        if (!response.ok) {
            console.error('Failed to fetch busy times from iCal');
            return [];
        }

        const data = await response.json();
        return data.busyTimes || [];
    } catch (err) {
        console.error('Error fetching busy times:', err);
        return [];
    }
}

/**
 * 指定した日付範囲のbusy時間を取得（Google OAuth経由 - レガシー）
 * @deprecated OAuth審査が必要なため、iCal版のfetchBusyTimesを使用してください
 */
export async function fetchBusyTimesOAuth(dateStr: string): Promise<BusyTime[]> {
    const token = getGoogleToken();
    if (!token) return [];

    // その日の0:00から24:00まで（日本時間）
    const date = new Date(dateStr);
    const timeMin = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
    const timeMax = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();

    try {
        const response = await fetch('/api/calendar/freebusy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accessToken: token.accessToken,
                timeMin,
                timeMax,
            }),
        });

        if (!response.ok) {
            console.error('Failed to fetch busy times');
            return [];
        }

        const data = await response.json();
        return data.busyTimes || [];
    } catch (err) {
        console.error('Error fetching busy times:', err);
        return [];
    }
}

/**
 * 時刻文字列（HH:MM）がbusy時間帯に含まれるかチェック
 */
export function isTimeBusy(dateStr: string, timeStr: string, busyTimes: BusyTime[]): boolean {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    const checkTime = new Date(year, month - 1, day, hour, minute).getTime();

    return busyTimes.some(busy => {
        const busyStart = new Date(busy.start).getTime();
        const busyEnd = new Date(busy.end).getTime();
        return checkTime >= busyStart && checkTime < busyEnd;
    });
}

/**
 * 時間範囲（HH:MM - HH:MM）がbusy時間帯と重複するかチェック
 */
export function isTimeRangeBusy(dateStr: string, startTime: string, endTime: string, busyTimes: BusyTime[]): boolean {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const rangeStart = new Date(year, month - 1, day, startHour, startMinute).getTime();
    const rangeEnd = new Date(year, month - 1, day, endHour, endMinute).getTime();

    return busyTimes.some(busy => {
        const busyStart = new Date(busy.start).getTime();
        const busyEnd = new Date(busy.end).getTime();
        // 2つの範囲が重複するかチェック
        return rangeStart < busyEnd && rangeEnd > busyStart;
    });
}

/**
 * busy時間帯を表示用にフォーマット
 */
export function formatBusyTimes(busyTimes: BusyTime[]): string[] {
    return busyTimes.map(busy => {
        const start = new Date(busy.start);
        const end = new Date(busy.end);
        const startStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        const endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        return `${startStr}〜${endStr}`;
    });
}
