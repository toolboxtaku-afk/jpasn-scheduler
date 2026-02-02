import { NextResponse } from 'next/server';

export interface BusyTime {
    start: string;
    end: string;
}

/**
 * iCalデータをパースしてイベント一覧を取得
 * 終日イベントはisAllDay: trueでマークされる
 */
function parseICalEvents(icalData: string): { start: Date; end: Date; isAllDay: boolean }[] {
    const events: { start: Date; end: Date; isAllDay: boolean }[] = [];

    // VEVENTブロックを抽出
    const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
    const eventBlocks = icalData.match(eventRegex) || [];

    for (const block of eventBlocks) {
        let dtstart: Date | null = null;
        let dtend: Date | null = null;
        let isAllDay = false;

        // DTSTARTを取得
        const dtstartMatch = block.match(/DTSTART[^:]*:(\d{8}T\d{6}Z?|\d{8})/);
        if (dtstartMatch) {
            dtstart = parseICalDate(dtstartMatch[1]);
            // 終日イベントかどうか（日付のみで時刻がない場合）
            if (dtstartMatch[1].length === 8) {
                isAllDay = true;
            }
        }

        // DTENDを取得
        const dtendMatch = block.match(/DTEND[^:]*:(\d{8}T\d{6}Z?|\d{8})/);
        if (dtendMatch) {
            dtend = parseICalDate(dtendMatch[1]);
        }

        // DURATIONが指定されている場合
        if (dtstart && !dtend) {
            const durationMatch = block.match(/DURATION:PT(\d+)H/);
            if (durationMatch) {
                dtend = new Date(dtstart.getTime() + parseInt(durationMatch[1]) * 60 * 60 * 1000);
            }
        }

        // 終日イベントの場合（時刻なし）
        if (dtstart && !dtend && dtstartMatch && dtstartMatch[1].length === 8) {
            // 終日イベント: 翌日の0:00まで
            dtend = new Date(dtstart.getTime() + 24 * 60 * 60 * 1000);
        }

        if (dtstart && dtend) {
            // 24時間以上の予定も終日イベントとして扱う
            const durationMs = dtend.getTime() - dtstart.getTime();
            if (durationMs >= 24 * 60 * 60 * 1000) {
                isAllDay = true;
            }
            events.push({ start: dtstart, end: dtend, isAllDay });
        }
    }

    return events;
}

/**
 * iCal形式の日時文字列をDateオブジェクトに変換
 */
function parseICalDate(dateStr: string): Date {
    // 形式: 20260115T100000Z または 20260115T100000 または 20260115
    if (dateStr.length === 8) {
        // 終日イベント (20260115)
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day, 0, 0, 0);
    }

    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(9, 11));
    const minute = parseInt(dateStr.substring(11, 13));
    const second = parseInt(dateStr.substring(13, 15));

    if (dateStr.endsWith('Z')) {
        // UTC時刻
        return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
        // ローカル時刻として扱う
        return new Date(year, month, day, hour, minute, second);
    }
}

/**
 * POST /api/ical
 * 指定された日付のbusy時間帯を取得
 */
export async function POST(request: Request): Promise<NextResponse> {
    try {
        const { date } = await request.json();

        if (!date) {
            return NextResponse.json(
                { error: 'date is required' },
                { status: 400 }
            );
        }

        // 環境変数からiCal URLを取得
        const icalUrl = process.env.ICAL_URL;

        if (!icalUrl) {
            // iCal URLが設定されていない場合は空のbusy時間を返す
            return NextResponse.json({ busyTimes: [] });
        }

        // iCalデータを取得
        const response = await fetch(icalUrl, {
            headers: {
                'User-Agent': 'jpasn-scheduler/1.0',
            },
            // キャッシュを10分に設定
            next: { revalidate: 600 },
        });

        if (!response.ok) {
            console.error('Failed to fetch iCal data:', response.status, response.statusText);
            return NextResponse.json({ busyTimes: [] });
        }

        const icalData = await response.text();
        const events = parseICalEvents(icalData);

        // 指定された日付のイベントのみをフィルタリング
        const targetDate = new Date(date);
        const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
        const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

        const busyTimes: BusyTime[] = events
            .filter(event => {
                // 終日イベントは重複チェックから除外
                if (event.isAllDay) {
                    return false;
                }
                // イベントが指定日と重複するかチェック
                return event.start < dayEnd && event.end > dayStart;
            })
            .map(event => ({
                start: event.start.toISOString(),
                end: event.end.toISOString(),
            }))
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return NextResponse.json({ busyTimes });
    } catch (error) {
        console.error('Error in iCal API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
