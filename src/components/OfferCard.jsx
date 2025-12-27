import React, { useRef, useState } from 'react';
import LikeButton from './LikeButton';
import html2canvas from 'html2canvas';

// Cache to store Data URLs for images to speed up repeated copies
const imgCache = new Map();

export default function OfferCard({ offer, isMostRecommended }) {
    const cardRef = useRef(null);
    const [isCopying, setIsCopying] = useState(false);
    const item = offer.items && offer.items[0]; // Primary item
    if (!item) return null;

    const { weapon, aesthetic, modifiers, detail } = item;

    if (!weapon || !aesthetic) return null;

    const iconUrl = `icons/${aesthetic.IconName}.png`;

    const isLegendary = aesthetic.IsLegendary || detail.Rarity === 'LEGENDARY';
    const borderColor = isLegendary ? (isMostRecommended ? '#ffcc00' : 'var(--color-rarity-legendary)') : '#333';

    // Golden filter for recommended items
    const goldenFilter = 'sepia(1) saturate(3) hue-rotate(0deg) brightness(1.2)';

    const cardId = `offer-card-${offer.Id}`;

    const handleCopy = async () => {
        if (!cardRef.current || isCopying) return;
        setIsCopying(true);

        // Helper to convert image source to Data URL with caching and optional filter
        const toDataURL = async (src, filter = null) => {
            const cacheKey = src + (filter || '');
            if (imgCache.has(cacheKey)) return imgCache.get(cacheKey);

            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || 500;
                    canvas.height = img.naturalHeight || 500;
                    const ctx = canvas.getContext('2d');

                    if (filter) {
                        ctx.filter = filter;
                    }

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/png');
                    imgCache.set(cacheKey, dataUrl);
                    resolve(dataUrl);
                };
                img.onerror = () => {
                    resolve(null);
                };
                img.src = src;
            });
        };

        const legendaryImg = cardRef.current.querySelector('.legendary-bg');
        const weaponImg = cardRef.current.querySelector('.weapon-img');

        try {
            // Apply golden filter to the legendary BG capture if recommended
            const bgFilter = isMostRecommended ? goldenFilter : null;

            // Pre-load images concurrently
            const [base64Leg, base64Wep] = await Promise.all([
                legendaryImg ? toDataURL(legendaryImg.src || 'icons/legendary_bg.svg', bgFilter) : Promise.resolve(null),
                weaponImg ? toDataURL(weaponImg.src) : Promise.resolve(null)
            ]);

            const captureCanvas = await html2canvas(cardRef.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#1a1a1a',
                scale: 2,
                onclone: (clonedDoc) => {
                    // Find the SPECIFIC cloned card using the unique ID
                    const clonedCard = clonedDoc.getElementById(cardId);
                    if (!clonedCard) return;

                    // Apply Safe Legendary BG
                    if (base64Leg) {
                        const bgEl = clonedCard.querySelector('.legendary-bg');
                        if (bgEl) {
                            bgEl.src = base64Leg;
                            bgEl.style.animation = 'none';
                            bgEl.style.transform = 'translate(-50%, -50%)';
                            bgEl.style.width = '500%';
                            bgEl.style.height = '500%';
                            // The filter is baked into the image, so we remove CSS filter from clone if any
                            bgEl.style.filter = 'none';
                        }
                    }

                    // Apply Safe Weapon Image
                    if (base64Wep) {
                        const wepEl = clonedCard.querySelector('.weapon-img');
                        if (wepEl) {
                            wepEl.src = base64Wep;
                            wepEl.style.zIndex = '5';
                            wepEl.style.position = 'relative';
                        }
                    }
                }
            });

            navigateClipboardWrite(captureCanvas);

        } catch (err) {
            console.error('Screenshot failed:', err);
            setIsCopying(false);
        }
    };

    const navigateClipboardWrite = (canvas) => {
        canvas.toBlob(async (blob) => {
            try {
                if (navigator.clipboard && navigator.clipboard.write) {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    setTimeout(() => setIsCopying(false), 2000);
                } else {
                    throw new Error('Clipboard API not available');
                }
            } catch (err) {
                console.error('Copy failed:', err);
                alert('Failed to copy. ' + err.message);
                setIsCopying(false);
            }
        });
    };

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

    const shouldShowSubtitle = !isMostRecommended && offer.name !== aesthetic.Name;

    return (
        <div
            id={cardId}
            ref={cardRef}
            className="offer-card"
            style={{
                borderColor,
                boxShadow: isLegendary ? (isMostRecommended ? '0 0 15px rgba(255, 204, 0, 0.5)' : '0 0 15px rgba(191, 0, 255, 0.5)') : 'none'
            }}
        >
            <div className="card-icon">
                <div className={`icon-frame ${isLegendary ? 'legendary' : ''}`} style={isMostRecommended ? { borderColor: '#ffcc00', boxShadow: '0 0 15px rgba(255, 204, 0, 0.4), inset 0 0 10px rgba(0,0,0,0.5)' } : {}}>
                    {isLegendary && (
                        <img
                            src="icons/legendary_bg.svg"
                            className="legendary-bg"
                            alt=""
                            style={isMostRecommended ? { filter: goldenFilter } : {}}
                        />
                    )}
                    <img
                        src={iconUrl}
                        className="weapon-img"
                        alt={aesthetic.Name}
                        crossOrigin="anonymous"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/128?text=No+Icon' }}
                    />
                </div>
            </div>
            {isLegendary && <div className="legendary-badge" style={isMostRecommended ? { background: 'linear-gradient(45deg, #ffcc00, #ffaa00)', color: 'black' } : {}}>LEGENDARY</div>}

            <div className="card-title" style={{
                color: isLegendary ? (isMostRecommended ? '#ffcc00' : 'var(--color-rarity-legendary)') : 'white',
                textShadow: isLegendary ? '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' : 'none',
                letterSpacing: '1px'
            }}>
                {offer.name}
            </div>

            <div className="card-subtitle" style={{ minHeight: '1.2rem' }}>
                {isMostRecommended ? (
                    <span style={{ color: '#ffcc00', fontWeight: 'bold', letterSpacing: '1px' }}>MOST RECOMMENDED</span>
                ) : (
                    shouldShowSubtitle ? aesthetic.Name : null
                )}
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

            {/* Like Button */}
            <div style={{ position: 'absolute', top: '40px', right: '10px', zIndex: 10 }}>
                <LikeButton offerId={offer.Id} />
            </div>

            {/* Copy Button */}
            <button
                className="copy-btn"
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
                <div className="hover-label-copy">COPY</div>
            </button>

            <div className="dates">
                {new Date(offer.startDate).toLocaleDateString()}
            </div>
        </div>
    );
}
