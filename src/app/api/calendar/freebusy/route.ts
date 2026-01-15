import { NextResponse } from 'next/server';

// 環境変数で指定されたカレンダーIDを使用（未設定の場合は'primary'）
const DEFAULT_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accessToken, timeMin, timeMax, calendarId = DEFAULT_CALENDAR_ID } = body;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Access token is required' },
                { status: 401 }
            );
        }

        if (!timeMin || !timeMax) {
            return NextResponse.json(
                { error: 'timeMin and timeMax are required' },
                { status: 400 }
            );
        }

        // Google Calendar FreeBusy API を呼び出し
        const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timeMin,
                timeMax,
                items: [{ id: calendarId }],
                timeZone: 'Asia/Tokyo',
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('FreeBusy API error:', data);
            return NextResponse.json(
                { error: data.error?.message || 'Failed to fetch busy times' },
                { status: response.status }
            );
        }

        // busy時間帯を抽出
        const busyTimes = data.calendars?.[calendarId]?.busy || [];

        return NextResponse.json({ busyTimes });
    } catch (err) {
        console.error('FreeBusy API error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
