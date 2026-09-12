# PRIME App Requirements

## 1. Identity & Purpose
- Application called "PRIME", AI-powered E-Commerce.

## 2. Security 
- Telegram-only access (block native browser). 
- Server-side HMAC SHA256 validation (Telegram initData).
- Session security via cryptotokens.

## 3. Data Persistence & Capture
- Capture Telegram User (Name, Handle, ID, Phone, Groups, Channels) + Generate/bind unique 12-char Alphanumeric PRIME Member ID to Telegram User ID.
- Persistent storage in Firestore.

## 4. Fraud Detection (Fingerprinting)
- Capture/Re-capture per session: Enrollment Date, Last Seen, Device ID, App ID, Browser, Graphics, IP (Enrollment+Session), ISP, VPN, GPS/lat-long (IPLocate/Geoapify).
- Bind to Telegram ID/PRIME Member ID. Do not expose to customer frontend.

## 5. Shopfront UI
- Mobile-first, portrait, 3-column product grid, clean typography (Oswald headings, Montserrat body).
- Real-time inventory check ('Out of Stock' badges, purchase prevention for 0 count).
- Interactive Product Detail (Descriptions, 'Buy More, Save More' bundle config).
- Global shopping cart (state-based + local storage).
- Search bar + Category filter at the top.

## 6. Admin Panel (`/admin`)
- Secure gated access (`ADMIN_ACCESS_CODE` only).
- Compact, dense, vertical-scroll-only layout (no tables, no horizontal scroll, collapsible details).
- Modules: Customer Management, Inventory Management, Product Configurator.

## 7. Prohibitions
- No AI Studio or Engineering terminology on customer-facing pages.
