/**
 * Monetization architecture — intentionally inert.
 *
 * Nothing in the game imports a real provider and there is no store UI.
 * Rules any future implementation must follow:
 *   - cosmetic only (outfits, scene themes, music packs); never income, offline
 *     caps, prestige or anything that affects the leaderboards;
 *   - no loot boxes, timers designed to frustrate, or fake scarcity;
 *   - purchases are verified server-side before granting anything.
 */
export interface CosmeticProduct {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
}

export interface MonetizationProvider {
  readonly enabled: boolean;
  listProducts(): Promise<CosmeticProduct[]>;
  purchase(productId: string): Promise<{ ok: boolean; message: string }>;
  ownedProducts(): Promise<string[]>;
}

/** Default provider: no products, no purchases. */
export const nullProvider: MonetizationProvider = {
  enabled: false,
  async listProducts() {
    return [];
  },
  async purchase() {
    return { ok: false, message: 'Purchases are not available in this build.' };
  },
  async ownedProducts() {
    return [];
  },
};

export const monetization: MonetizationProvider = nullProvider;
