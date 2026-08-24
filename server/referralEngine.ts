import { firestoreService } from "./firestoreService.js";

export type ReferralValidationContext = {
  refereeId: string;
  referralCode: string;
  orderAmount: number;
  region?: string | null;
  channel?: string | null;
  now?: number;
};

export type ReferralValidationResult = {
  valid: boolean;
  code: string;
  referrerId?: string;
  referrerPrimeMemberId?: string;
  reason?: string;
  campaignId?: string;
  rewardAmount?: number;
};

const DEFAULT_CAMPAIGN_ID = "default";

function numeric(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim().toUpperCase()).filter(Boolean) : [];
}

function inSchedule(campaign: any, now: number) {
  if (campaign.startAt && now < Date.parse(String(campaign.startAt))) return false;
  if (campaign.endAt && now >= Date.parse(String(campaign.endAt))) return false;

  const date = new Date(now);
  if (Array.isArray(campaign.daysOfWeek) && campaign.daysOfWeek.length > 0 && !campaign.daysOfWeek.includes(date.getDay())) return false;

  const start = campaign.startTimeOfDay ? String(campaign.startTimeOfDay) : null;
  const end = campaign.endTimeOfDay ? String(campaign.endTimeOfDay) : null;
  if (start || end) {
    const hhmm = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(now));
    const current = hhmm.replace(":", "");
    const startValue = start ? start.replace(":", "") : "0000";
    const endValue = end ? end.replace(":", "") : "2359";
    if (current < startValue || current > endValue) return false;
  }
  return true;
}

async function resolveCampaign() {
  const configured = await firestoreService.getDocument("referralCampaigns", DEFAULT_CAMPAIGN_ID);
  return configured || {
    id: DEFAULT_CAMPAIGN_ID,
    active: true,
    maxUses: null,
    minSpend: 0,
    rewardAmount: 50,
  };
}

export async function validateReferral(context: ReferralValidationContext): Promise<ReferralValidationResult> {
  const code = String(context.referralCode || "").trim().toUpperCase();
  const now = context.now ?? Date.now();
  if (!/^[A-Z0-9]{10}$/.test(code)) return { valid: false, code, reason: "Referral code must be a valid 10-character PRIME Member ID." };

  const campaign = await resolveCampaign();
  if (campaign.active === false) return { valid: false, code, campaignId: campaign.id, reason: "The referral campaign is currently inactive." };
  if (!inSchedule(campaign, now)) return { valid: false, code, campaignId: campaign.id, reason: "This referral campaign is not currently active." };

  const customerRecords = await firestoreService.getDocuments("customers");
  const referrer = customerRecords.find((customer: any) => String(customer.primeMemberId || "").toUpperCase() === code);
  if (!referrer) return { valid: false, code, campaignId: campaign.id, reason: "That PRIME Member ID is not a valid referral code." };

  const refereeId = String(context.refereeId || "").trim();
  if (!refereeId) return { valid: false, code, campaignId: campaign.id, reason: "Unable to identify the referee account." };
  if (String(referrer.id) === refereeId || String(referrer.telegramUserId) === refereeId) return { valid: false, code, campaignId: campaign.id, reason: "Self-referral is not permitted." };

  const referee = customerRecords.find((customer: any) => String(customer.id) === refereeId || String(customer.telegramUserId) === refereeId);
  // Referral entry is allowed only for a truly new customer. Existing/historical customer records are not eligible.
  if (referee) return { valid: false, code, campaignId: campaign.id, reason: "Referral codes are available to first-time customers only." };

  const status = String(referrer.accountStatus || referrer.status || "active").toLowerCase();
  if (["banned", "suspended", "inactive", "disabled"].includes(status) || referrer.isActive === false) {
    return { valid: false, code, campaignId: campaign.id, reason: "The referring member is not in good standing." };
  }

  const referrals = await firestoreService.getDocuments("referrals");
  const existingForReferee = referrals.find((entry: any) => String(entry.refereeId || entry.telegramUserId || "") === refereeId);
  if (existingForReferee) return { valid: false, code, campaignId: campaign.id, reason: "This account has already used a referral code." };

  const campaignRedemptions = referrals.filter((entry: any) => String(entry.campaignId || DEFAULT_CAMPAIGN_ID) === String(campaign.id));
  const codeRedemptions = campaignRedemptions.filter((entry: any) => String(entry.code || "").toUpperCase() === code);
  const maxUses = campaign.maxUses == null ? null : numeric(campaign.maxUses, 0);
  if (maxUses !== null && maxUses > 0 && codeRedemptions.length >= maxUses) return { valid: false, code, campaignId: campaign.id, reason: "This referral code has reached its usage limit." };

  const minSpend = Math.max(0, numeric(campaign.minSpend ?? campaign.minOrderAmount, 0));
  if (numeric(context.orderAmount, 0) < minSpend) return { valid: false, code, campaignId: campaign.id, reason: `A minimum qualifying order of PHP ${minSpend.toFixed(2)} is required.` };

  const allowedRegions = asList(campaign.allowedRegions || campaign.regions);
  if (allowedRegions.length > 0 && !allowedRegions.includes(String(context.region || "").trim().toUpperCase())) {
    return { valid: false, code, campaignId: campaign.id, reason: "This referral campaign is not available in your region." };
  }
  const allowedChannels = asList(campaign.allowedChannels || campaign.channels);
  if (allowedChannels.length > 0 && !allowedChannels.includes(String(context.channel || "").trim().toUpperCase())) {
    return { valid: false, code, campaignId: campaign.id, reason: "This referral campaign is not available through this channel." };
  }

  return {
    valid: true,
    code,
    referrerId: String(referrer.telegramUserId || referrer.id),
    referrerPrimeMemberId: code,
    campaignId: String(campaign.id || DEFAULT_CAMPAIGN_ID),
    rewardAmount: Math.max(0, numeric(campaign.rewardAmount ?? 50, 50)),
  };
}
