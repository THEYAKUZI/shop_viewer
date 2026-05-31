import React, { useRef, useState } from 'react';
import LikeButton from './LikeButton';
import StarRating from './StarRating';
import { useLanguage } from '../contexts/LanguageContext';

const imgCache = new Map();

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

function OfferCard({ offer, likeCount = 0 }) {
    const cardRef = useRef(null);
    const { t } = useLanguage();
    const [isCopying, setIsCopying] = useState(false);
    const item = offer.items[0];
    const { weapon, aesthetic, modifiers = [], detail } = item;

    if (!weapon || !aesthetic) return null;

    const iconUrl = `icons/${aesthetic.IconName}.png`;
    const isLegendary = aesthetic.IsLegendary || detail.Rarity === 'LEGENDARY';
    const cardId = `offer-card-${offer.Id}`;

    const handleCopy = async () => {
        if (!cardRef.current || isCopying) return;
        setIsCopying(true);

        const toDataURL = async (src) => {
            if (imgCache.has(src)) return imgCache.get(src);

            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || 500;
                    canvas.height = img.naturalHeight || 500;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    imgCache.set(src, dataUrl);
                    resolve(dataUrl);
                };
                img.onerror = () => resolve(null);
                img.src = src;
            });
        };

        const weaponImg = cardRef.current.querySelector('.weapon-img');

        try {
            const [{ default: html2canvas }, base64Weapon] = await Promise.all([
                import('html2canvas'),
                weaponImg ? toDataURL(weaponImg.src) : Promise.resolve(null)
            ]);

            const captureCanvas = await html2canvas(cardRef.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0d0f14',
                scale: 2,
                onclone: (clonedDoc) => {
                    const clonedCard = clonedDoc.getElementById(cardId);
                    if (!clonedCard || !base64Weapon) return;
                    const clonedWeapon = clonedCard.querySelector('.weapon-img');
                    if (clonedWeapon) clonedWeapon.src = base64Weapon;
                }
            });

            captureCanvas.toBlob(async (blob) => {
                try {
                    if (navigator.clipboard?.write) {
                        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                        setTimeout(() => setIsCopying(false), 2000);
                    } else {
                        setIsCopying(false);
                    }
                } catch {
                    setIsCopying(false);
                }
            });
        } catch {
            setIsCopying(false);
        }
    };

    const renderStars = (level) => {
        if (!level || level < 1) return null;

        return (
            <span className="item-card-mod-stars">
                {[...Array(5)].map((_, index) => (
                    <span key={index} className={index < level ? 'filled' : ''}>★</span>
                ))}
                {level >= 5 && <span className="item-card-mod-max">{t('MAX STARS')}</span>}
            </span>
        );
    };

    const getModifierName = (modifier) => {
        if (modifier.isLegendary) return modifier.Name;
        if (TYPE_MAP[modifier.MODIFIER_TYPE]) return t(TYPE_MAP[modifier.MODIFIER_TYPE]);
        if (modifier.MODIFIER_TYPE) {
            return modifier.MODIFIER_TYPE
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }
        return modifier.Name || modifier.Constant;
    };

    return (
        <div id={cardId} ref={cardRef} className={`item-card ${isLegendary ? 'legendary' : ''}`}>
            {isLegendary && <span className="item-card-badge legendary">{t('LEGENDARY')}</span>}

            <div className="item-card-like">
                <LikeButton offerId={offer.Id} count={likeCount} />
            </div>

            <div className="item-card-icon-area">
                <img
                    src={iconUrl}
                    className="weapon-img"
                    alt={aesthetic.Name}
                    crossOrigin="anonymous"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => { event.currentTarget.src = 'https://via.placeholder.com/64?text=?'; }}
                />
            </div>

            <div className="item-card-body">
                <div className={`item-card-name ${isLegendary ? 'legendary' : ''}`}>{offer.name}</div>
                <div className="item-card-subtitle">{aesthetic.Name}</div>

                <div className="item-card-rating">
                    <StarRating offerId={offer.Id} />
                </div>

                <div className="item-card-stats">
                    <div className="item-card-stat-row">
                        <span>{t('Level')}</span>
                        <strong>{detail.Level || 1}</strong>
                    </div>
                    <div className="item-card-stat-row">
                        <span className="item-card-stat-label">
                            <img src="icons/power_icon.svg" alt="" loading="lazy" decoding="async" />
                            {t('Power')}
                        </span>
                        <strong>{detail.WeaponPower || weapon.Power}</strong>
                    </div>
                    <div className="item-card-stat-row">
                        <span>{t('Speed')}</span>
                        <strong>{weapon.Speed}</strong>
                    </div>
                </div>

                {modifiers.length > 0 && (
                    <div className="item-card-modifiers">
                        <div className="item-card-mod-title">{t('Modifiers')}</div>
                        {modifiers.map((modifier, index) => (
                            <div key={`${modifier.Constant || modifier.Name}-${index}`} className="item-card-mod" title={t(modifier.Description || '')}>
                                {modifier.IconName && (
                                    <img
                                        src={`icons/${modifier.IconName}.png`}
                                        className="item-card-mod-icon"
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                    />
                                )}
                                <div className="item-card-mod-copy">
                                    <div className="item-card-mod-name-row">
                                        <span className="item-card-mod-name">{getModifierName(modifier)}</span>
                                        {renderStars(modifier.MODIFIER_LEVEL)}
                                    </div>
                                    {modifier.Description && (
                                        <div className="item-card-mod-desc">{t(modifier.Description)}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="item-card-footer">
                    <div className="item-card-price">
                        {(item.price / 1).toLocaleString()}
                        <img src="icons/doober_coin.png" alt="coins" loading="lazy" decoding="async" />
                    </div>
                    <button className="copy-btn-mini" onClick={handleCopy} disabled={isCopying} title={t('COPY')}>
                        {isCopying ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        )}
                    </button>
                </div>

                <div className="item-card-date">
                    <strong>{t('RELEASE DATE')}:</strong> {new Date(offer.startDate).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
}

export default React.memo(OfferCard);
