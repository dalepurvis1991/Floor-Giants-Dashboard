import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const USERNAME = process.env.ODOO_USERNAME;
const PASSWORD = process.env.ODOO_PASSWORD;

if (!USERNAME || !PASSWORD) {
    console.error('Credentials not found in .env.local');
    process.exit(1);
}

// Function to store cookies
let cookies: string[] = [];

async function login() {
    console.log(`\n1. Attempting login as ${USERNAME}...`);
    try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
        });

        console.log(`   Status: ${res.status}`);
        if (res.status === 200) {
            console.log('   Login SUCCESS');
            const setCookie = res.headers.get('set-cookie');
            if (setCookie) {
                cookies = setCookie.split(',').map(c => c.split(';')[0]);
                console.log('   Cookie obtained.');
            } else {
                console.error('   NO COOKIE SET!');
            }
        } else {
            const text = await res.text();
            console.error('   Login FAILED:', text);
        }
    } catch (e) {
        console.error('   Login ERROR:', e);
    }
}

async function checkDashboard() {
    console.log('\n2. Accessing Dashboard API with Cookie...');
    try {
        const res = await fetch(`${BASE_URL}/api/dashboard?dateFrom=2026-01-01&dateTo=2026-01-09`, {
            headers: {
                Cookie: cookies.join('; '),
            },
        });

        console.log(`   Status: ${res.status}`);
        if (res.status === 200) {
            const data = await res.json();
            console.log('   Dashboard Data OK');
            console.log('   Total Sales:', data.totalSales);
        } else {
            console.error('   Dashboard Access FAILED');
            console.log(await res.text());
        }
    } catch (e) {
        console.error('   Dashboard ERROR:', e);
    }
}

async function checkUnauthorized() {
    console.log('\n3. Accessing Dashboard API WITHOUT Cookie...');
    try {
        const res = await fetch(`${BASE_URL}/api/dashboard`);
        console.log(`   Status: ${res.status}`);
        if (res.status === 401) {
            console.log('   Correctly blocked (401)');
        } else {
            console.error('   Unexpected status (Should be 401):', res.status);
        }
    } catch (e) {
        console.error('   Error:', e);
    }
}

async function main() {
    await checkUnauthorized();
    await login();
    await checkDashboard();
}

main();
