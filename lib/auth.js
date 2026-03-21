import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                login: { label: 'Username or Email', type: 'text' },
                password: { label: 'Password', type: 'password' },
                rememberMe: { label: 'Remember Me', type: 'text' },
            },
            async authorize(credentials) {
                if (!credentials?.login || !credentials?.password) return null;

                const loginValue = credentials.login.trim().toLowerCase();
                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: loginValue },
                            { username: loginValue },
                        ],
                        active: true,
                    },
                });
                if (!user) return null;

                const valid = compareSync(credentials.password, user.password);
                if (!valid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    rememberMe: credentials.rememberMe === 'true',
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.rememberMe = user.rememberMe || false;
                if (!user.rememberMe) {
                    // Non-remember-me: expire after 8 hours
                    token.maxAge = 8 * 60 * 60;
                    token.loginAt = Math.floor(Date.now() / 1000);
                }
            }
            // Check 8h expiry for non-remember-me sessions
            if (!token.rememberMe && token.loginAt) {
                const elapsed = Math.floor(Date.now() / 1000) - token.loginAt;
                if (elapsed > 8 * 60 * 60) {
                    return null; // Force re-login
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 15 * 24 * 60 * 60, // 15 days (max for remember me)
    },
    secret: process.env.NEXTAUTH_SECRET,
};
