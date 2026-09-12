import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { accessCode } = await req.json();
    const validCode = process.env.ADMIN_ACCESS_CODE || 'PRIME_ADMIN_2026';

    if (accessCode && accessCode.trim() === validCode.trim()) {
      return NextResponse.json({ success: true, authorized: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid Admin Access Code' }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
