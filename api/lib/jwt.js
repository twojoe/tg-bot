import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(SECRET);
}

export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 });
        return payload;
    } catch {
        return null;
    }
}

export function parseCookie(req) {
    const cookieHeader = req.headers.cookie || '';
    const cookies = {};
    cookieHeader.split(';').forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) cookies[name] = rest.join('=');
    });
    return cookies;
}

export function getAuthUser(req) {
    const cookies = parseCookie(req);
    const token = cookies['auth_token'];
    if (!token) return null;
    return verifyToken(token);
}
