import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';

function checkAdminAuth(req: NextRequest): boolean {
  const code = req.headers.get('x-admin-code');
  const valid = process.env.ADMIN_ACCESS_CODE || 'PRIME_ADMIN_2026';
  return code === valid;
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const product: Product = await req.json();
    if (!product.id || !product.name || typeof product.price !== 'number') {
      return NextResponse.json({ error: 'Missing required product attributes' }, { status: 400 });
    }

    const prodRef = doc(db, 'products', product.id);
    await setDoc(prodRef, product, { merge: true });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save product' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, stock, price, bundleConfig } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (typeof stock === 'number') updates.stock = Math.max(0, stock);
    if (typeof price === 'number') updates.price = price;
    if (bundleConfig !== undefined) updates.bundleConfig = bundleConfig;

    const prodRef = doc(db, 'products', id);
    await updateDoc(prodRef, updates);

    return NextResponse.json({ success: true, updates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await deleteDoc(doc(db, 'products', id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
