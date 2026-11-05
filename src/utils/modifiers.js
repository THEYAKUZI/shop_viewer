// Readable names for weapon modifiers.
const TYPE_MAP = {
    DAMAGE: 'Damage',
    STUN: 'Stun',
    SLOW: 'Slow',
    CRIPPLE: 'Cripple',
    ROOT: 'Root',
    KNOCKBACK: 'Knockback',
    PULL: 'Pull',
    CHILLING: 'Chilling',
    BURNING: 'Burning',
    SHOCKING: 'Shocking',
    POISON: 'Poison',
    CRIT_CHANCE: 'Crit Chance',
    CRIT_DAMAGE: 'Crit Damage',
    CHAIN: 'Chain',
    PIERCE: 'Pierce',
    ATKSPD: 'Attack Speed',
    INCREASE_COLLISION: 'Attack Size',
    COOLDOWN_REDUC: 'Cooldown',
    CHARGE_REDUC: 'Charge Time',
    MANA_COST: 'Mana Cost',
    SPAWN_FOOD_ON_HIT: 'Food on Hit',
    DEATH_FOOD: 'Food on Kill',
    SCALING: 'Projectile Count',
    BUFF_GRANT_DURATION_MULTIPLIER: 'Buff Duration'
};

export const titleCase = (s) => s.split(/[_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

export const modifierName = (modifier, t) => {
    if (modifier.isLegendary) return modifier.Name;
    if (TYPE_MAP[modifier.MODIFIER_TYPE]) return t(TYPE_MAP[modifier.MODIFIER_TYPE]);
    if (modifier.MODIFIER_TYPE) return titleCase(modifier.MODIFIER_TYPE);
    return modifier.Name || modifier.Constant;
};

// Level-scaled perks say e.g. "mana by 10 + Weapon Level * 0.4". Work out the number for this item's level.
const LEVEL_FORMULA = /(\d+(?:\.\d+)?) \+ (?:Weapon Level|Nível da Arma) \* ([\d.]+)/;

export const resolveLevelFormula = (text, level) =>
    text.replace(LEVEL_FORMULA, (_, base, perLevel) => String(Math.round(Number(base) + Number(perLevel) * (level || 1))));
