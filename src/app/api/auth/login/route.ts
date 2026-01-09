import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/odoo/client';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
        }

        const uid = await authenticateUser(username, password);

        // Creating session with password to allow subsequent XMLRPC calls
        await createSession(uid, username, password);

        return NextResponse.json({ success: true, uid });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Authentication failed. Please check your credentials.' },
            { status: 401 }
        );
    }
}
