-- Disposable Studio_One test catalog seed data.
-- These rows are intentionally test-only and are not application startup defaults.
-- Product images use public Pexels image URLs for test presentation.

delete from public.products
where sku in ('AMSTERDAM-PINK-TEST', 'THAI-WHITE-V01-TEST', 'THAI-WHITE-V10-TEST');

insert into public.products
  (sku, name, description, category, price, stock_quantity, active, metadata)
values
  (
    'AMSTERDAM-PINK-TEST',
    'Amsterdam (Pink)',
    'Disposable test fragrance product.',
    'GENERAL',
    599,
    4,
    true,
    '{"subname":"10mL","badge":"NEW","ratingAverage":4.8,"ratingCount":12,"image":"https://images.pexels.com/photos/12563417/pexels-photo-12563417.jpeg?auto=compress&cs=tinysrgb&w=900","imageSource":"Pexels","testData":true}'::jsonb
  ),
  (
    'THAI-WHITE-V01-TEST',
    'Thai White v0.1',
    'Disposable test fragrance product.',
    'GENERAL',
    699,
    11,
    true,
    '{"subname":"10g | -12u","badge":"NEW","ratingAverage":4.8,"ratingCount":12,"image":"https://images.pexels.com/photos/16266286/pexels-photo-16266286.jpeg?auto=compress&cs=tinysrgb&w=900","imageSource":"Pexels","testData":true}'::jsonb
  ),
  (
    'THAI-WHITE-V10-TEST',
    'Thai White v1.0',
    'Disposable test fragrance product.',
    'GENERAL',
    3499,
    7,
    true,
    '{"subname":"10g | -120u","ratingAverage":4.8,"ratingCount":12,"image":"https://images.pexels.com/photos/12146871/pexels-photo-12146871.jpeg?auto=compress&cs=tinysrgb&w=900","imageSource":"Pexels","testData":true}'::jsonb
  );
