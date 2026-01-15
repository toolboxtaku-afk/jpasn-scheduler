import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
    : 'http://localhost:3000/api/auth/google/callback';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '/';
    const error = url.searchParams.get('error');

    if (error) {
        // ユーザーが認証をキャンセルした場合
        return NextResponse.redirect(new URL(state, process.env.NEXTAUTH_URL || 'http://localhost:3000'));
    }

    if (!code) {
        return NextResponse.json(
            { error: 'No authorization code provided' },
            { status: 400 }
        );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.json(
            { error: 'Google OAuth is not configured' },
            { status: 500 }
        );
    }

    try {
        // アクセストークンを取得
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokenData);
            return NextResponse.json(
                { error: 'Failed to exchange authorization code' },
                { status: 500 }
            );
        }

        // トークンをクエリパラメータとして渡す（クライアントでlocalStorageに保存）
        const redirectUrl = new URL(state, process.env.NEXTAUTH_URL || 'http://localhost:3000');
        redirectUrl.searchParams.set('google_token', tokenData.access_token);
        if (tokenData.refresh_token) {
            redirectUrl.searchParams.set('google_refresh_token', tokenData.refresh_token);
        }
        redirectUrl.searchParams.set('google_expires_in', tokenData.expires_in);

        return NextResponse.redirect(redirectUrl.toString());
    } catch (err) {
        console.error('OAuth callback error:', err);
        return NextResponse.json(
            { error: 'OAuth callback failed' },
            { status: 500 }
        );
    }
}
