import { NextResponse } from 'next/server';
import { compareSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const SECRET = process.env.NEXTAUTH_SECRET;
const TOKEN_EXPIRY = '8h';

export async function POST(request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tài khoản và mật khẩu' },
        { status: 400 }
      );
    }

    const loginValue = login.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginValue },
          { username: loginValue },
        ],
        active: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const valid = compareSync(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json(
      { error: 'Lỗi đăng nhập, vui lòng thử lại' },
      { status: 500 }
    );
  }
}
