// 会議履歴をローカルストレージで管理するユーティリティ
// 作成した会議のURLを1週間保持し、自動的にクリーンアップ

const STORAGE_KEY = 'jpasn_meeting_history';
const RETENTION_DAYS = 7;

export interface MeetingHistoryItem {
    eventId: string;
    title: string;
    duration: number;
    createdAt: string; // ISO 8601 形式
}

/**
 * ローカルストレージから会議履歴を取得（期限切れのものは自動削除）
 */
export function getMeetings(): MeetingHistoryItem[] {
    if (typeof window === 'undefined') {
        return [];
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return [];
    }

    try {
        const meetings: MeetingHistoryItem[] = JSON.parse(stored);
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

        // 期限切れのものを除外
        const validMeetings = meetings.filter(m => {
            const createdAt = new Date(m.createdAt);
            return createdAt > cutoffDate;
        });

        // 期限切れがあった場合は保存し直す
        if (validMeetings.length !== meetings.length) {
            saveMeetingsToStorage(validMeetings);
        }

        // 新しい順にソート
        return validMeetings.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch {
        return [];
    }
}

/**
 * 新しい会議を履歴に保存
 */
export function saveMeeting(eventId: string, title: string, duration: number): void {
    if (typeof window === 'undefined') return;

    const meetings = getMeetings();

    // 同じイベントIDがある場合は更新しない（重複防止）
    if (meetings.some(m => m.eventId === eventId)) {
        return;
    }

    const newMeeting: MeetingHistoryItem = {
        eventId,
        title,
        duration,
        createdAt: new Date().toISOString(),
    };

    meetings.unshift(newMeeting); // 先頭に追加
    saveMeetingsToStorage(meetings);
}

/**
 * 会議を履歴から手動削除
 */
export function removeMeeting(eventId: string): void {
    if (typeof window === 'undefined') return;

    const meetings = getMeetings();
    const filtered = meetings.filter(m => m.eventId !== eventId);
    saveMeetingsToStorage(filtered);
}

/**
 * ローカルストレージに保存
 */
function saveMeetingsToStorage(meetings: MeetingHistoryItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
}

/**
 * 残り日数を計算
 */
export function getRemainingDays(createdAt: string): number {
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
