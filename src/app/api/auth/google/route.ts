import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
    : 'http://localhost:3000/api/auth/google/callback';

const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

export async function GET(request: Request) {
    if (!GOOGLE_CLIENT_ID) {
        return NextResponse.json(
            { error: 'Google OAuth is not configured' },
            { status: 500 }
        );
    }

    // state パラメータでリダイレクト先を保存
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('returnTo') || '/';

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', returnTo);

    return NextResponse.redirect(authUrl.toString());
}
