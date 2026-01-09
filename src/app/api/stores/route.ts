import { NextRequest, NextResponse } from 'next/server';
import { getPosConfigs } from '@/lib/odoo/api';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const credentials = { uid: session.userId, password: session.password };
        const stores = await getPosConfigs(credentials);
        return NextResponse.json(stores);
    } catch (error) {
        console.error('Stores API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }
}
