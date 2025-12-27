import React, { useRef, useState } from 'react';
import LikeButton from './LikeButton';
import html2canvas from 'html2canvas';

// Cache to store Data URLs for images to speed up repeated copies
const imgCache = new Map();

// ... imports
// import translations just in case or rely on prop
import { translations } from '../utils/translations';

// ...

export default function OfferCard({ offer, t = translations.en }) {
    // ... (refs, logic)

    // ...

    const renderStars = (level) => {
        if (!level || level < 1) return null;
        return (
            <span style={{ marginLeft: '4px', display: 'flex', alignItems: 'center', flex: 1 }}>
                {[...Array(5)].map((_, i) => (
                    <span
                        key={i}
                        style={{
                            color: '#ffcc00',
                            opacity: i < level ? 1 : 0.2
                        }}
                    >
                        ★
                    </span>
                ))}
                {level >= 5 && (
                    <span style={{
                        fontSize: '0.6rem',
                        color: '#ffaa00',
                        marginLeft: 'auto',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px'
                    }}>
                        {t.maxStars}
                    </span>
                )}
            </span>
        );
    };

    // ...

    return (
        <div
            id={cardId}
            ref={cardRef}
            className="offer-card"
            style={{ borderColor, boxShadow: isLegendary ? '0 0 15px rgba(191, 0, 255, 0.5)' : 'none' }}
        >
            {/* ... */}

            <div className="card-stats">
                <div className="stat-row">
                    <span>{t.level}</span>
                    <span style={{ color: '#fff' }}>{detail.Level || 1}</span>
                </div>
                <div className="stat-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <img
                            src="icons/power_icon.svg"
                            alt=""
                            style={{ width: '16px', height: '16px', verticalAlign: 'middle' }}
                        />
                        <span>{t.power}</span>
                    </div>
                    <span style={{ color: '#fff' }}>{detail.WeaponPower || weapon.Power}</span>
                </div>
                <div className="stat-row">
                    <span>{t.speed}</span>
                    <span style={{ color: '#fff' }}>{weapon.Speed}</span>
                </div>

                {/* Modifiers Section */}
                {modifiers.length > 0 && (
                    <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase' }}>{t.modifiers}</div>
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
                                {/* ... Icon ... */}
                                {mod.IconName && (
                                    <img
                                        src={`icons/${mod.IconName}.png`}
                                        style={{ width: '24px', height: '24px' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                        alt=""
                                    />
                                )}

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', color: '#aaf', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
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

            {/* Price ... */}
            <div className="price-tag">
                {/* ... */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    {item.price.toLocaleString()}
                    {/* ... */}
                    <img
                        src="icons/doober_coin.png"
                        style={{ width: '28px', height: '28px', verticalAlign: 'middle' }}
                        alt="Coins"
                    />
                </div>
            </div>

            {/* Like Button */}
            <div style={{ position: 'absolute', top: '40px', right: '10px', zIndex: 10 }}>
                {/* We might need to pass translation to LikeButton too for 'RECOMMEND' text. 
                    I'll check LikeButton implementation. It has "RECOMMEND" hardcoded.
                    I will update LikeButton to accept a label or children, OR just update the hovered text via css content?
                    CSS content can't take dynamic props unless via var().
                    Wait, "RECOMMEND" is in a div in LikeButton.jsx.
                */}
                <LikeButton offerId={offer.Id} label={t.recommend} />
            </div>

            {/* Copy Button */}
            <button
                className="copy-btn"
                onClick={handleCopy}
                disabled={isCopying}
                title={t.copyTooltip}
                {/* ... */}
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
                {/* ... icons ... */}
                {isCopying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                )}
                <div className="hover-label-copy">{t.copy}</div>
            </button>

            <div className="dates">
                <span style={{ fontWeight: 'bold', marginRight: '4px' }}>{t.releaseDate}</span>
                {new Date(offer.startDate).toLocaleDateString()}
            </div>
        </div>
    );
}
