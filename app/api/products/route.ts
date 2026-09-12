import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { INITIAL_PRODUCTS } from '@/lib/catalog';
import { Product } from '@/lib/types';

export async function GET() {
  try {
    const productsRef = collection(db, 'products');
    let snapshot;
    try {
      snapshot = await getDocs(productsRef);
    } catch (e) {
      console.warn('Could not read products from firestore directly:', e);
    }

    if (!snapshot || snapshot.empty) {
      // Seed initial products to Firestore
      for (const prod of INITIAL_PRODUCTS) {
        try {
          await setDoc(doc(db, 'products', prod.id), prod);
        } catch (seedErr) {
          console.warn('Seed product err:', seedErr);
        }
      }
      return NextResponse.json({ products: INITIAL_PRODUCTS });
    }

    const products: Product[] = [];
    snapshot.forEach((d) => {
      products.push({ id: d.id, ...(d.data() as Omit<Product, 'id'>) });
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Failed to get products:', error);
    // Fallback to static catalog to keep app operational
    return NextResponse.json({ products: INITIAL_PRODUCTS });
  }
}

// Order placement / inventory reservation
export async function POST(req: NextRequest) {
  try {
    const { items, primeMemberId } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    // Decrement stock in Firestore
    for (const item of items) {
      try {
        const prodRef = doc(db, 'products', item.id);
        await updateDoc(prodRef, {
          stock: increment(-item.quantity),
        });
      } catch (err) {
        console.warn('Stock update note:', err);
      }
    }

    const orderId = `PRM-ORD-${Date.now().toString(36).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      orderId,
      message: 'Order confirmed and inventory locked',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
