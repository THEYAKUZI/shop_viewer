
import React from 'react';
import LikeButton from './LikeButton';

export default function OfferCard({ offer }) {
    const item = offer.items[0]; // Primary item
    const { weapon, aesthetic, modifiers, detail } = item;

    if (!weapon || !aesthetic) return null;

    const iconUrl = `icons/${aesthetic.IconName}.png`;

    const isLegendary = aesthetic.IsLegendary || detail.Rarity === 'LEGENDARY';
    const borderColor = isLegendary ? 'var(--color-rarity-legendary)' : '#333';

    const renderStars = (level) => {
        if (!level || level < 1) return null;
        return (
            <span style={{ color: '#ffcc00', marginLeft: '4px' }}>
                {'★'.repeat(level)}
            </span>
        );
    };

    const getModifierName = (mod) => {
        if (mod.isLegendary) return mod.Name;

        // Map for regular modifier types to friendly names
        const typeMap = {
            'DAMAGE': 'Damage',
            'STUN': 'Stun',
            'SLOW': 'Slow',
            'CRIPPLE': 'Cripple',
            'ROOT': 'Root',
            'KNOCKBACK': 'Knockback',
            'PULL': 'Pull',
            'CHILLING': 'Chilling',
            'BURNING': 'Burning',
            'SHOCKING': 'Shocking',
            'POISON': 'Poison',
            'CRIT_CHANCE': 'Crit Chance',
            'CRIT_DAMAGE': 'Crit Damage',
            'CHAIN': 'Chain',
            'PIERCE': 'Pierce',
            'ATKSPD': 'Attack Speed',
            'INCREASE_COLLISION': 'Attack Size', // Fix for "Troll's"
            'COOLDOWN_REDUC': 'Cooldown',
            'CHARGE_REDUC': 'Charge Time',
            'MANA_COST': 'Mana Cost',
            'SPAWN_FOOD_ON_HIT': 'Food on Hit',
            'DEATH_FOOD': 'Food on Kill',
            'SCALING': 'Projectile Count',
            'BUFF_GRANT_DURATION_MULTIPLIER': 'Buff Duration'
        };

        if (typeMap[mod.MODIFIER_TYPE]) {
            return typeMap[mod.MODIFIER_TYPE];
        }

        // Fallback: Title Case the type
        if (mod.MODIFIER_TYPE) {
            return mod.MODIFIER_TYPE.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }

        return mod.Name || mod.Constant;
    };

    return (
        <div
            className="offer-card"
            style={{ borderColor, boxShadow: isLegendary ? '0 0 15px rgba(191, 0, 255, 0.5)' : 'none' }}
        >
            <div className="card-icon">
                <div className={`icon-frame ${isLegendary ? 'legendary' : ''}`}>
                    {isLegendary && (
                        <img src="icons/legendary_bg.svg" className="legendary-bg" alt="" />
                    )}
                    <img
                        src={iconUrl}
                        className="weapon-img"
                        alt={aesthetic.Name}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/128?text=No+Icon' }}
                    />
                </div>
            </div>
            {isLegendary && <div className="legendary-badge">LEGENDARY</div>}

            <div className="card-title" style={{
                color: isLegendary ? 'var(--color-rarity-legendary)' : 'white',
                textShadow: isLegendary ? '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' : 'none',
                letterSpacing: '1px'
            }}>
                {offer.name}
            </div>
            <div className="card-subtitle">
                {aesthetic.Name}
            </div>

            <div className="card-stats">
                <div className="stat-row">
                    <span>Level</span>
                    <span style={{ color: '#fff' }}>{detail.Level || 1}</span>
                </div>
                <div className="stat-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <img
                            src="icons/power_icon.svg"
                            alt=""
                            style={{ width: '16px', height: '16px', verticalAlign: 'middle' }}
                        />
                        <span>Power</span>
                    </div>
                    <span style={{ color: '#fff' }}>{detail.WeaponPower || weapon.Power}</span>
                </div>
                <div className="stat-row">
                    <span>Speed</span>
                    <span style={{ color: '#fff' }}>{weapon.Speed}</span>
                </div>

                {/* Modifiers Section */}
                {modifiers.length > 0 && (
                    <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase' }}>Modifiers</div>
                        {modifiers.map((mod, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '6px',
                                borderRadius: '4px',
                                position: 'relative' // For tooltip if we add one properly
                            }}
                                title={mod.Description} // Native tooltip
                            >
                                {/* Modifier Icon */}
                                {mod.IconName && (
                                    <img
                                        src={`icons/${mod.IconName}.png`}
                                        style={{ width: '24px', height: '24px' }}
                                        onError={(e) => { e.target.style.display = 'none'; }} // Hide if missing
                                        alt=""
                                    />
                                )}

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', color: '#aaf', fontWeight: 'bold' }}>
                                        {getModifierName(mod)}
                                        {renderStars(mod.MODIFIER_LEVEL)}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#ccc' }}>
                                        {mod.Description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="price-tag">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    {item.price.toLocaleString()}
                    <img
                        src="icons/doober_coin.png"
                        style={{ width: '28px', height: '28px', verticalAlign: 'middle' }}
                        alt="Coins"
                    />
                </div>
            </div>

            <div style={{ position: 'absolute', top: '40px', right: '10px', zIndex: 10 }}>
                <LikeButton offerId={offer.Id} />
            </div>

            <div className="dates">
                {new Date(offer.startDate).toLocaleDateString()}
            </div>
        </div>
    );
}
