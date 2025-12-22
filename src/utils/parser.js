
export function parseGameMaster(json) {
    const now = new Date();

    // 1. Create Lookup Maps
    const weaponItemById = new Map();
    const weaponItemByConstant = new Map();
    if (json.WeaponItem) {
        json.WeaponItem.forEach(item => {
            weaponItemById.set(item.Id, item);
            weaponItemByConstant.set(item.Constant, item);
        });
    }

    const aestheticsByWeaponConstant = new Map();
    if (json.WeaponAesthetics) {
        json.WeaponAesthetics.forEach(aes => {
            const constant = aes.WeaponItemConstant;
            if (!aestheticsByWeaponConstant.has(constant)) {
                aestheticsByWeaponConstant.set(constant, []);
            }
            aestheticsByWeaponConstant.get(constant).push(aes);
        });
    }

    const modifiersByConstant = new Map();
    if (json.Modifiers) {
        json.Modifiers.forEach(mod => {
            mod.isLegendary = false;
            modifiersByConstant.set(mod.Constant, mod);
        });
    }
    if (json.LegendaryModifiers) {
        json.LegendaryModifiers.forEach(mod => {
            mod.isLegendary = true;
            modifiersByConstant.set(mod.Constant, mod);
        });
    }

    const offerDetailsMap = new Map();
    if (json.OfferDetails) {
        json.OfferDetails.forEach(detail => {
            if (!offerDetailsMap.has(detail.OfferId)) {
                offerDetailsMap.set(detail.OfferId, []);
            }
            offerDetailsMap.get(detail.OfferId).push(detail);
        });
    }

    // 2. Process Offers
    const offers = [];
    if (json.Offers) {
        json.Offers.forEach(offer => {
            // Filter by Tab (Weapons only for now, as requested)
            if (offer.Tab !== 'WEAPON') return;

            const startDate = new Date(offer.StartDate);
            const endDate = new Date(offer.EndDate);
            const isAvailable = startDate <= now && endDate > now;
            const isUpcoming = startDate > now;

            if (!isAvailable && !isUpcoming) return;

            const details = offerDetailsMap.get(offer.Id) || [];
            const processedItems = details.map(detail => {
                // Try to resolve weapon
                let weapon = null;
                let aesthetic = null;
                const modifiers = [];

                if (detail.WeaponId) {
                    weapon = weaponItemById.get(detail.WeaponId);
                    if (weapon) {
                        // Find visible aesthetic
                        // Logic: 
                        // 1. If detail has SkinId? (Not common for weapons)
                        // 2. Use Level/Rarity to pick aesthetic from the weapon's aesthetic list
                        // 3. Fallback to first aesthetic

                        const aesList = aestheticsByWeaponConstant.get(weapon.Constant) || [];

                        // Try to match specific aesthetic based on detail info if possible
                        // For now, simple logic: find aesthetic that matches level range or is legendary if rarity says so
                        const targetRarity = detail.Rarity === 'LEGENDARY';

                        aesthetic = aesList.find(a => {
                            if (targetRarity && a.IsLegendary) return true;
                            if (!targetRarity && !a.IsLegendary && detail.Level >= a.MinLevel && detail.Level <= a.MaxLevel) return true;
                            return false;
                        });

                        if (!aesthetic && aesList.length > 0) aesthetic = aesList[0];
                    }
                }

                // Resolve Modifiers
                [detail.Modifier1, detail.Modifier2, detail.Modifier3].forEach(modConst => {
                    if (modConst) {
                        const mod = modifiersByConstant.get(modConst);
                        if (mod) modifiers.push(mod);
                    }
                });

                return {
                    detail,
                    weapon,
                    aesthetic,
                    modifiers,
                    price: offer.Price,
                    currency: offer.CurrencyType
                };
            }).filter(item => item.weapon); // Only keep valid weapon items

            // Check if any item in the offer is legendary
            const hasLegendary = processedItems.some(item => {
                const isLegendary = (item.aesthetic && item.aesthetic.IsLegendary) ||
                    (item.detail && item.detail.Rarity === 'LEGENDARY');
                return isLegendary;
            });

            if (processedItems.length > 0 && hasLegendary) {
                offers.push({
                    Id: offer.Id,
                    name: offer.Name,
                    startDate: offer.StartDate,
                    endDate: offer.EndDate,
                    isAvailable,
                    isUpcoming,
                    items: processedItems
                });
            }
        });
    }

    // Sort by date (nearest first)
    offers.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    return offers;
}
