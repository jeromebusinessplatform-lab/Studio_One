import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function checkAdminAuth(req: NextRequest): boolean {
  const code = req.headers.get('x-admin-code');
  const valid = process.env.ADMIN_ACCESS_CODE || 'PRIME_ADMIN_2026';
  return code === valid;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usersRef = collection(db, 'users');
    const userDocs = await getDocs(usersRef);

    const customers: any[] = [];
    for (const uDoc of userDocs.docs) {
      const userData = uDoc.data();
      const fingerprintsRef = collection(db, 'users', uDoc.id, 'fingerprints');
      let fingerprints: any[] = [];
      try {
        const fpDocs = await getDocs(fingerprintsRef);
        fingerprints = fpDocs.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Could not read fingerprints for user', uDoc.id, err);
      }

      customers.push({
        id: uDoc.id,
        ...userData,
        fingerprints,
      });
    }

    return NextResponse.json({ customers });
  } catch (error: any) {
    console.error('Error getting customers:', error);
    return NextResponse.json({ customers: [] });
  }
}
