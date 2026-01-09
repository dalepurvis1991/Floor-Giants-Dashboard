import xmlrpc from 'xmlrpc';

function getClientConfig() {
    const url = process.env.ODOO_URL || 'https://staging-floorg.odoo.com';
    const db = process.env.ODOO_DB || '';
    const username = process.env.ODOO_USERNAME || '';
    const password = process.env.ODOO_PASSWORD || '';

    try {
        const parsedUrl = new URL(url);
        const isSecure = parsedUrl.protocol === 'https:';
        const host = parsedUrl.hostname;
        const port = isSecure ? 443 : 80;
        return { host, port, isSecure, db, username, password };
    } catch {
        return {
            host: 'staging-floorg.odoo.com',
            port: 443,
            isSecure: true,
            db,
            username,
            password,
        };
    }
}

let commonClient: any = null;
let objectClient: any = null;

function getClients() {
    const config = getClientConfig();
    if (commonClient && objectClient) return { commonClient, objectClient, config };

    const options = { host: config.host, port: config.port };

    commonClient = config.isSecure
        ? xmlrpc.createSecureClient({ host: config.host, port: config.port, path: '/xmlrpc/2/common' })
        : xmlrpc.createClient({ host: config.host, port: config.port, path: '/xmlrpc/2/common' });

    objectClient = config.isSecure
        ? xmlrpc.createSecureClient({ host: config.host, port: config.port, path: '/xmlrpc/2/object' })
        : xmlrpc.createClient({ host: config.host, port: config.port, path: '/xmlrpc/2/object' });

    return { commonClient, objectClient, config };
}

// ... imports and config ...

export async function authenticateUser(username: string, password: string): Promise<number> {
    const { commonClient, config } = getClients();
    return new Promise((resolve, reject) => {
        commonClient.methodCall(
            'authenticate',
            [config.db, username, password, {}],
            (error: any, uid: number) => {
                if (error) reject(error);
                else if (!uid) reject(new Error('Authentication failed'));
                else resolve(uid);
            }
        );
    });
}

// Keep the internal/env-based auth for backward compatibility or server-side tasks
export async function authenticate(): Promise<number> {
    const { commonClient, config } = getClients();
    return new Promise((resolve, reject) => {
        commonClient.methodCall(
            'authenticate',
            [config.db, config.username, config.password, {}],
            (error: any, uid: number) => {
                if (error) reject(error);
                else resolve(uid);
            }
        );
    });
}

export async function execute<T>(
    uid: number,
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {},
    password?: string // Optional password for user-context execution
): Promise<T> {
    const { objectClient, config } = getClients();
    const headers = JSON.stringify({ args, kwargs });
    // Truncate long logs
    const logHeaders = headers.length > 500 ? headers.substring(0, 500) + '...' : headers;
    console.log(`[Odoo Client] execute: ${model}.${method} (UID: ${uid})`, logHeaders);

    // Use provided password or fallback to env password
    const execPassword = password || config.password;

    return new Promise((resolve, reject) => {
        objectClient.methodCall(
            'execute_kw',
            [config.db, uid, execPassword, model, method, args, kwargs],
            (error: any, result: T) => {
                if (error) {
                    console.error(`[Odoo Client] Error in ${model}.${method}:`, error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
    });
}

let cachedUid: number | null = null;

export async function getUid(): Promise<number> {
    if (cachedUid) return cachedUid;
    cachedUid = await authenticate();
    return cachedUid;
}

export async function searchRead<T>(
    model: string,
    domain: unknown[],
    fields: string[],
    options: { limit?: number; offset?: number; order?: string } = {},
    credentials?: { uid: number; password: string }
): Promise<T[]> {
    let uid: number;
    let password: string | undefined;

    if (credentials) {
        uid = credentials.uid;
        password = credentials.password;
    } else {
        uid = await getUid();
    }

    return execute<T[]>(uid, model, 'search_read', [domain], { fields, ...options }, password);
}
