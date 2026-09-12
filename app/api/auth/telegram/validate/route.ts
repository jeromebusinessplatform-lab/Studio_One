import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validateTelegramInitData, generatePrimeMemberId, generateSessionToken } from '@/lib/crypto';
import { PrimeUser } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData, fingerprint, simulatedUser } = body;

    let tgUser: any = null;

    if (initData) {
      const validation = validateTelegramInitData(initData);
      if (validation.valid && validation.user) {
        tgUser = validation.user;
      }
    }

    // Allow development / simulated mode if initData was not provided or in testing
    if (!tgUser && simulatedUser) {
      tgUser = simulatedUser;
    }

    if (!tgUser || !tgUser.id) {
      return NextResponse.json(
        { error: 'Telegram authentication failed or invalid initData' },
        { status: 401 }
      );
    }

    const tgUserId = String(tgUser.id);
    const userRef = doc(db, 'users', tgUserId);

    let primeUser: PrimeUser;
    let existingSnap: any = null;
    try {
      existingSnap = await getDoc(userRef);
    } catch (e) {
      console.warn('Firestore user fetch note:', e);
    }

    const now = new Date().toISOString();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';

    if (existingSnap && existingSnap.exists()) {
      const data = existingSnap.data() as PrimeUser;
      primeUser = {
        ...data,
        tgName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || data.tgName,
        tgUsername: tgUser.username ? `@${tgUser.username}` : data.tgUsername,
        lastSeen: now,
      };
      try {
        await setDoc(userRef, { lastSeen: now, tgName: primeUser.tgName, tgUsername: primeUser.tgUsername }, { merge: true });
      } catch (err) {
        console.warn('Firestore setDoc user merge error:', err);
      }
    } else {
      // New member enrollment
      const primeMemberId = generatePrimeMemberId();
      primeUser = {
        tgUserId,
        tgName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Prime Member',
        tgUsername: tgUser.username ? `@${tgUser.username}` : 'unknown',
        phoneNumber: tgUser.phone || '',
        primeMemberId,
        groups: tgUser.groups || [],
        channels: tgUser.channels || [],
        createdAt: now,
        lastSeen: now,
      };
      try {
        await setDoc(userRef, primeUser);
      } catch (err) {
        console.warn('Firestore setDoc new user error:', err);
      }
    }

    // Save fraud detection fingerprint under /users/{userId}/fingerprints/{fingerprintId}
    if (fingerprint) {
      const fingerprintId = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fpDocRef = doc(db, 'users', tgUserId, 'fingerprints', fingerprintId);

      const fpData = {
        userId: tgUserId,
        deviceId: fingerprint.deviceId || 'unknown',
        enrollmentDate: primeUser.createdAt,
        lastSeen: now,
        appId: fingerprint.appId || 'Telegram-MiniApp',
        browser: fingerprint.browser || req.headers.get('user-agent') || 'Unknown',
        graphics: fingerprint.graphics || 'Unknown',
        ipEnrollment: clientIp,
        ipSession: clientIp,
        isp: req.headers.get('x-client-isp') || 'Standard Network',
        vpnDetected: Boolean(req.headers.get('x-vpn-detected') === 'true'),
        location: fingerprint.location || null,
        createdAt: now,
      };

      try {
        await setDoc(fpDocRef, fpData);
      } catch (fpErr) {
        console.warn('Firestore fingerprint store error:', fpErr);
      }
    }

    const sessionToken = generateSessionToken(tgUserId);

    return NextResponse.json({
      success: true,
      user: primeUser,
      sessionToken,
    });
  } catch (err: any) {
    console.error('Error in Telegram auth handler:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
