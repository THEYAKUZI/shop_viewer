import React, { useState, useEffect } from 'react';
import LikeButton from './LikeButton';
import satori from 'satori';
import { html } from 'satori-html';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

// Initialize WASM globally once
let wasmInitialized = false;
const initResvgWasm = async () => {
    if (wasmInitialized) return;
    try {
        // Load wasm from unpkg for simplicity, or localized if configured
        await initWasm(fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm'));
        wasmInitialized = true;
    } catch (e) {
        console.error('Resvg WASM init failed:', e);
    }
};

export default function OfferCard({ offer }) {
    const [isCopying, setIsCopying] = useState(false);
    const item = offer.items[0]; // Primary item
    const { weapon, aesthetic, modifiers, detail } = item;

    // Ensure WASM is ready on component mount
    useEffect(() => {
        initResvgWasm();
    }, []);

    if (!weapon || !aesthetic) return null;

    const iconUrl = `icons/${aesthetic.IconName}.png`;
    const isLegendary = aesthetic.IsLegendary || detail.Rarity === 'LEGENDARY';
    const borderColor = isLegendary ? 'var(--color-rarity-legendary)' : '#333';
    // Resolved color for Satori
    const resolvedBorderColor = isLegendary ? '#bf00ff' : '#333';

    // Helper to get friendly names
    const getModifierName = (mod) => {
        if (mod.isLegendary) return mod.Name;
        const typeMap = {
            'DAMAGE': 'Damage', 'STUN': 'Stun', 'SLOW': 'Slow', 'CRIPPLE': 'Cripple',
            'ROOT': 'Root', 'KNOCKBACK': 'Knockback', 'PULL': 'Pull', 'CHILLING': 'Chilling',
            'BURNING': 'Burning', 'SHOCKING': 'Shocking', 'POISON': 'Poison', 'CRIT_CHANCE': 'Crit Chance',
            'CRIT_DAMAGE': 'Crit Damage', 'CHAIN': 'Chain', 'PIERCE': 'Pierce', 'ATKSPD': 'Attack Speed',
            'INCREASE_COLLISION': 'Attack Size', 'COOLDOWN_REDUC': 'Cooldown', 'CHARGE_REDUC': 'Charge Time',
            'MANA_COST': 'Mana Cost', 'SPAWN_FOOD_ON_HIT': 'Food on Hit', 'DEATH_FOOD': 'Food on Kill',
            'SCALING': 'Projectile Count', 'BUFF_GRANT_DURATION_MULTIPLIER': 'Buff Duration'
        };
        if (typeMap[mod.MODIFIER_TYPE]) return typeMap[mod.MODIFIER_TYPE];
        if (mod.MODIFIER_TYPE) return mod.MODIFIER_TYPE.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return mod.Name || mod.Constant;
    };

    const handleCopy = async () => {
        if (isCopying) return;
        setIsCopying(true);

        try {
            await initResvgWasm();

            // Fetch fonts
            // We'll use a standard font for simplicity to guarantee readable text in the image
            const fontData = await fetch('https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC0C4G-FiA.woff')
                .then(res => res.arrayBuffer())
                .catch(() => null);

            // Construct Satori Markup (Flexbox is key)
            // Note: Styles must be inline objects or strings for satori-html
            const markup = html`
                <div style="
                    display: flex;
                    flex-direction: column;
                    width: 400px;
                    background-color: #1a1a1a;
                    border: 4px solid ${resolvedBorderColor};
                    border-radius: 12px;
                    padding: 20px;
                    color: white;
                    font-family: 'Outfit';
                    box-shadow: ${isLegendary ? '0 0 0 6px rgba(191, 0, 255, 0.4)' : 'none'}; 
                    margin: 10px;
                ">
                    <!-- Icon Section -->
                    <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 100px;
                            height: 100px;
                            background-color: #111;
                            border: 2px solid ${isLegendary ? '#aa00ff' : '#333'};
                            border-radius: 16px;
                            position: relative;
                            overflow: hidden;
                            box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
                        ">
                             ${isLegendary ? `<img src="${window.location.origin}/icons/legendary_bg.svg" style="position: absolute; width: 100%; height: 100%; opacity: 0.8;" />` : ''}
                             <img src="${window.location.origin}/${iconUrl}" style="width: 90px; height: 90px; object-fit: contain; z-index: 2;" />
                        </div>
                    </div>

                    <!-- Title -->
                    <div style="display: flex; justify-content: center; margin-bottom: 5px;">
                        <span style="
                            font-size: 24px;
                            font-weight: bold;
                            text-align: center;
                            text-transform: uppercase;
                            color: ${isLegendary ? '#bf00ff' : 'white'};
                            text-shadow: ${isLegendary ? '2px 2px 0 #000' : 'none'};
                        ">${offer.name}</span>
                    </div>
                    <div style="display: flex; justify-content: center; margin-bottom: 20px; font-size: 14px; color: #888;">
                        ${aesthetic.Name}
                    </div>

                    <!-- Stats -->
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; font-size: 16px;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 4px;">
                            <span style="color: #ccc;">Level</span>
                            <span>${detail.Level || 1}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 4px;">
                            <span style="color: #ccc;">Power</span>
                            <span>${detail.WeaponPower || weapon.Power}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 4px;">
                            <span style="color: #ccc;">Speed</span>
                            <span>${weapon.Speed}</span>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    ${modifiers.length > 0 ? `
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                             <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Modifiers</div>
                             ${modifiers.map(mod => `
                                <div style="display: flex; align-items: center; gap: 10px; background-color: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
                                    ${mod.IconName ? `<img src="${window.location.origin}/icons/${mod.IconName}.png" style="width: 24px; height: 24px;" />` : ''}
                                    <div style="display: flex; flex-direction: column;">
                                        <div style="font-size: 14px; font-weight: bold; color: #aaf;">
                                            ${getModifierName(mod)} <span style="color: #ffcc00; font-size: 12px;">${'★'.repeat(mod.MODIFIER_LEVEL || 0)}</span>
                                        </div>
                                        <div style="font-size: 12px; color: #ccc;">${mod.Description}</div>
                                    </div>
                                </div>
                             `).join('')}
                        </div>
                    ` : ''}

                    <!-- Price -->
                    <div style="display: flex; justify-content: center; align-items: center; margin-top: 20px; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 6px;">
                         <span style="font-size: 20px; font-weight: bold; color: #ffcc00; margin-right: 5px;">${item.price.toLocaleString()}</span>
                         <img src="${window.location.origin}/icons/doober_coin.png" style="width: 24px; height: 24px;" />
                    </div>
                     <div style="display: flex; justify-content: center; margin-top: 5px; font-size: 12px; color: #666;">
                        ${new Date(offer.startDate).toLocaleDateString()}
                    </div>
                </div>
            `;

            const svg = await satori(markup, {
                width: 440, // Container + margins
                fonts: fontData ? [
                    {
                        name: 'Outfit',
                        data: fontData,
                        weight: 400,
                        style: 'normal',
                    }
                ] : [], // Fallback? Satori might fail without fonts.
                // If font fetch fails, debug it.
            });

            const resvg = new Resvg(svg, {
                fitTo: { mode: 'width', value: 880 }, // 2x scale
            });
            const image = resvg.render();
            const pngBuffer = image.asPng();
            const blob = new Blob([pngBuffer], { type: 'image/png' });

            if (navigator.clipboard) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            }

            setTimeout(() => setIsCopying(false), 2000);

        } catch (err) {
            console.error('Satori generation failed:', err);
            alert('Failed to copy: ' + err.message);
            setIsCopying(false);
        }
    };

    const renderStars = (level) => {
        if (!level || level < 1) return null;
        return (
            <span style={{ color: '#ffcc00', marginLeft: '4px' }}>
                {'★'.repeat(level)}
            </span>
        );
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
                                position: 'relative'
                            }}
                                title={mod.Description}
                            >
                                {/* Modifier Icon */}
                                {mod.IconName && (
                                    <img
                                        src={`icons/${mod.IconName}.png`}
                                        style={{ width: '24px', height: '24px' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
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

            {/* Like Button */}
            <div style={{ position: 'absolute', top: '40px', right: '10px', zIndex: 10 }}>
                <LikeButton offerId={offer.Id} />
            </div>

            {/* Copy Button */}
            <button
                onClick={handleCopy}
                disabled={isCopying}
                title="Copy card image to clipboard"
                style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isCopying ? '#4caf50' : '#888',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '4px',
                    transition: 'color 0.2s',
                    opacity: 0.7
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
            >
                {isCopying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                )}
                <span style={{ fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {isCopying ? 'Done' : 'Copy'}
                </span>
            </button>

            <div className="dates">
                {new Date(offer.startDate).toLocaleDateString()}
            </div>
        </div>
    );
}
