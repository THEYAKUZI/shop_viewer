import React, { useRef, useState } from 'react';
import LikeButton from './LikeButton';
import StarRating from './StarRating';
import { useLanguage } from '../contexts/useLanguage';
import { modifierName, resolveLevelFormula, titleCase } from '../utils/modifiers';
import { relativeDay } from '../utils/dates';
import { copyElementAsImage } from '../utils/copyImage';

function OfferCard({ offer, likeCount = 0, rating, heroes = [], compact = false }) {
    const cardRef = useRef(null);
    const { t, locale } = useLanguage();
    const [copyState, setCopyState] = useState('idle');
    const item = offer.items[0];
    const { weapon, aesthetic, modifiers = [], detail } = item;

    if (!weapon || !aesthetic) return null;

    const level = detail.Level || 1;
    const isLegendary = aesthetic.IsLegendary || detail.Rarity === 'LEGENDARY';
    const subtitle = aesthetic.Name && aesthetic.Name !== offer.name ? aesthetic.Name : null;
    const speedLabel = weapon.SpeedDisplay ? titleCase(weapon.SpeedDisplay) : null;
    const speedKey = `speed:${speedLabel}`;
    const speed = speedLabel ? (t(speedKey) === speedKey ? speedLabel : t(speedKey)) : '—';
    const fmtDate = (iso) => new Date(iso).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    const fmtTime = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const utc = (iso) => `${new Date(iso).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
    const caption = offer.isAvailable ? `${t('In shop until')} ${utc(offer.endDate)}` : `${t('Arrives')} ${utc(offer.startDate)}`;

    const handleCopy = async () => {
        if (!cardRef.current || copyState === 'busy') return;
        setCopyState('busy');
        const result = await copyElementAsImage(cardRef.current, offer.name, '#0a0a0a');
        setCopyState(result);
        setTimeout(() => setCopyState('idle'), 1800);
    };
    const copyTitle = { idle: t('COPY'), busy: t('COPY'), done: t('Copied'), saved: t('Saved as image'), error: t('Could not copy') }[copyState];

    return (
        <div id={`offer-${offer.Id}`} ref={cardRef} className={`item-card ${isLegendary ? 'legendary' : ''} ${compact ? 'compact' : ''}`}>
            {isLegendary && <span className="item-card-badge legendary">{t('LEGENDARY')}</span>}

            <div className="item-card-like no-capture">
                <LikeButton offerId={offer.Id} count={likeCount} />
            </div>

            <div className="item-card-icon-area">
                <img
                    src={`icons/${aesthetic.IconName}.png`}
                    className="weapon-img"
                    alt={aesthetic.Name}
                    crossOrigin="anonymous"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                />
            </div>

            <div className="item-card-body">
                <div className={`item-card-name ${isLegendary ? 'legendary' : ''}`}>{offer.name}</div>
                {subtitle && <div className="item-card-subtitle">{subtitle}</div>}
                <div className="item-card-subtitle item-card-hero">
                    {heroes.map(h => <img key={h.id} src={`icons/${h.iconName}.png`} alt={heroes.length > 1 ? h.name : ''} title={h.name} />)}
                    <span>{heroes.length === 1 && `${heroes[0].name} · `}{weapon.Name}</span>
                </div>

                <div className="item-card-rating">
                    <StarRating offerId={offer.Id} name={offer.name} average={rating?.average} count={rating?.count} />
                </div>

                {!compact && (
                    <div className="item-card-stats">
                        <div className="item-card-stat-row"><span>{t('Level')}</span><strong>{level}</strong></div>
                        <div className="item-card-stat-row">
                            <span className="item-card-stat-label"><img src="icons/power_icon.svg" alt="" loading="lazy" decoding="async" />{t('Power')}</span>
                            <strong>{(detail.WeaponPower || weapon.Power).toLocaleString(locale)}</strong>
                        </div>
                        <div className="item-card-stat-row"><span>{t('Speed')}</span><strong>{speed}</strong></div>
                    </div>
                )}

                {modifiers.length > 0 && (
                    <div className="item-card-modifiers">
                        <div className="item-card-mod-title">{t('Modifiers')}</div>
                        {modifiers.map((modifier, index) => {
                            const desc = modifier.Description ? t(modifier.Description) : null;
                            const shown = desc && resolveLevelFormula(desc, level);
                            return (
                                <div key={`${modifier.Constant || modifier.Name}-${index}`} className="item-card-mod" title={compact ? shown || undefined : undefined}>
                                    {modifier.IconName && (
                                        <img src={`icons/${modifier.IconName}.png`} className="item-card-mod-icon" alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    )}
                                    <div className="item-card-mod-copy">
                                        <div className="item-card-mod-name-row">
                                            <span className={`item-card-mod-name ${modifier.isLegendary ? 'legendary' : ''}`}>{modifierName(modifier, t)}</span>
                                            {modifier.MODIFIER_LEVEL > 0 && (
                                                <span className="item-card-mod-stars">
                                                    {[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= modifier.MODIFIER_LEVEL ? 'filled' : ''}>★</span>)}
                                                    {modifier.MODIFIER_LEVEL >= 5 && <span className="item-card-mod-max">{t('MAX STARS')}</span>}
                                                </span>
                                            )}
                                        </div>
                                        {shown && !compact && <div className="item-card-mod-desc" title={shown !== desc ? desc : undefined}>{shown}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="item-card-footer">
                    <div className="item-card-price">
                        {Number(item.price).toLocaleString(locale)}
                        <img src="icons/doober_coin.png" alt={t('coins')} loading="lazy" decoding="async" />
                    </div>
                    <button type="button" className={`copy-btn-mini no-capture copy-${copyState}`} onClick={handleCopy} disabled={copyState === 'busy'} title={copyTitle} aria-label={copyTitle}>
                        {copyState === 'done' || copyState === 'saved'
                            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
                    </button>
                </div>

                <div className="item-card-date">
                    {offer.isAvailable
                        ? <><strong>{t('IN SHOP UNTIL')}:</strong> {fmtDate(offer.endDate)}, {fmtTime(offer.endDate)}</>
                        : <><strong>{t('RELEASE DATE')}:</strong> {fmtDate(offer.startDate)} · {relativeDay(offer.startDate, t)}</>}
                </div>
                <div className="capture-caption"><span>Rampage Armory</span><span>{caption}</span></div>
            </div>
        </div>
    );
}

export default React.memo(OfferCard);
