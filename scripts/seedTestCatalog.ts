import { firestoreService } from "../server/firestoreService.js";

const REQUIRED_CONFIRMATION = "SEED_TEST_CATALOG";

const products = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    sku: "AMSTERDAM-PINK-TEST",
    name: "Amsterdam (Pink)",
    price: 599,
    stockQuantity: 4,
    active: true,
    metadata: {
      subname: "10mL",
      badge: "NEW",
      ratingAverage: 4.8,
      ratingCount: 12,
      image: "https://images.pexels.com/photos/12563417/pexels-photo-12563417.jpeg?auto=compress&cs=tinysrgb&w=900",
      imageSource: "Pexels",
      testData: true,
    },
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    sku: "THAI-WHITE-V01-TEST",
    name: "Thai White v0.1",
    price: 699,
    stockQuantity: 11,
    active: true,
    metadata: {
      subname: "10g | -12u",
      badge: "NEW",
      ratingAverage: 4.8,
      ratingCount: 12,
      image: "https://images.pexels.com/photos/16266286/pexels-photo-16266286.jpeg?auto=compress&cs=tinysrgb&w=900",
      imageSource: "Pexels",
      testData: true,
    },
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    sku: "THAI-WHITE-V10-TEST",
    name: "Thai White v1.0",
    price: 3499,
    stockQuantity: 7,
    active: true,
    metadata: {
      subname: "10g | -120u",
      ratingAverage: 4.8,
      ratingCount: 12,
      image: "https://images.pexels.com/photos/12146871/pexels-photo-12146871.jpeg?auto=compress&cs=tinysrgb&w=900",
      imageSource: "Pexels",
      testData: true,
    },
  },
] as const;

async function main() {
  if (process.env.TEST_CATALOG_SEED_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Refusing to run. Set TEST_CATALOG_SEED_CONFIRM=${REQUIRED_CONFIRMATION} explicitly before executing this one-time test-catalog seed.`
    );
  }

  for (const product of products) {
    await firestoreService.setDocument("products", product.id, product, false);
    console.log(`Seeded ${product.name} (${product.sku}) — ₱${product.price} — stock ${product.stockQuantity}`);
  }

  console.log("Test catalog seed completed successfully.");
}

main().catch((error) => {
  console.error("Test catalog seed failed:", error);
  process.exitCode = 1;
});
