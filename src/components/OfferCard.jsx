import React, { useRef, useState } from 'react';
import LikeButton from './LikeButton';
import StarRating from './StarRating';
import { useLanguage } from '../contexts/useLanguage';
import { toPng } from 'html-to-image';
import { modifierName, titleCase } from '../utils/modifiers';

function Stars({ level, t }) {
    if (!level || level < 1) return null;
    return (
        <span className="mod-stars" title={`${level}/5`}>
            {[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= level ? 'on' : ''}>★</span>)}
            {level >= 5 && <span className="mod-max">{t('MAX')}</span>}
        </span>
    );
}

function OfferCard({ offer, likeCount = 0, rating, heroes = [], arrival }) {
    const cardRef = useRef(null);
    const { t, locale } = useLanguage();
    const [copyState, setCopyState] = useState('idle');
    const item = offer.items[0];
    const { weapon, aesthetic, modifiers = [], detail } = item;

    if (!weapon || !aesthetic) return null;

    const subtitle = aesthetic.Name && aesthetic.Name !== offer.name ? aesthetic.Name : null;
    const speedLabel = weapon.SpeedDisplay ? titleCase(weapon.SpeedDisplay) : null;
    const speedKey = `speed:${speedLabel}`;
    const speed = speedLabel ? (t(speedKey) === speedKey ? speedLabel : t(speedKey)) : weapon.Speed;

    const handleCopy = async () => {
        if (!cardRef.current || copyState === 'busy') return;
        setCopyState('busy');
        try {
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 2,
                backgroundColor: '#14120f',
                filter: (node) => !node.classList?.contains('no-capture'),
            });
            const blob = await (await fetch(dataUrl)).blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setCopyState('done');
            setTimeout(() => setCopyState('idle'), 1600);
        } catch {
            setCopyState('idle');
        }
    };

    return (
        <article ref={cardRef} className="card">
            <header className="card-head">
                <div className="slot">
                    <img
                        src={`icons/${aesthetic.IconName}.png`}
                        alt=""
                        crossOrigin="anonymous"
                        loading="lazy"
                        decoding="async"
                        onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                    />
                </div>
                <div className="card-title">
                    <h3>{offer.name}</h3>
                    {subtitle && <p className="card-subtitle">{subtitle}</p>}
                    <p className="card-type">
                        {heroes.map(h => (
                            <img key={h.id} src={`icons/${h.iconName}.png`} alt="" title={h.name} className="card-hero" />
                        ))}
                        {/* One hero: show the name. Shared weapons: the avatars say who, the text names the weapon. */}
                        <span>{heroes.length === 1 && `${heroes[0].name} · `}{weapon.Name}</span>
                    </p>
                </div>
            </header>

            <StarRating offerId={offer.Id} average={rating?.average} count={rating?.count} />

            <dl className="card-stats">
                <div><dt>{t('Level')}</dt><dd>{detail.Level || 1}</dd></div>
                <div><dt>{t('Power')}</dt><dd>{(detail.WeaponPower || weapon.Power).toLocaleString(locale)}</dd></div>
                <div><dt>{t('Speed')}</dt><dd>{speed}</dd></div>
            </dl>

            {modifiers.length > 0 && (
                <ul className="card-mods">
                    {modifiers.map((modifier, index) => (
                        <li key={`${modifier.Constant || modifier.Name}-${index}`} className={modifier.isLegendary ? 'legendary' : ''}>
                            {modifier.IconName
                                ? <img src={`icons/${modifier.IconName}.png`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                : <span className="mod-icon-placeholder" />}
                            <div>
                                <div className="mod-line">
                                    <span className="mod-name">{modifierName(modifier, t)}</span>
                                    <Stars level={modifier.MODIFIER_LEVEL} t={t} />
                                </div>
                                {modifier.Description && <p className="mod-desc">{t(modifier.Description)}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <footer className="card-foot">
                <span className="price">
                    <img src="icons/doober_coin.png" alt={t('coins')} />
                    {Number(item.price).toLocaleString(locale)}
                </span>
                {arrival && (
                    <span className="arrival">
                        {new Date(arrival).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                )}
                <span className="card-actions no-capture">
                    <LikeButton offerId={offer.Id} count={likeCount} />
                    <button
                        type="button"
                        className={`icon-btn ${copyState === 'done' ? 'done' : ''}`}
                        onClick={handleCopy}
                        title={t('Copy card as image')}
                        aria-label={t('Copy card as image')}
                    >
                        {copyState === 'done' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        )}
                    </button>
                </span>
            </footer>
        </article>
    );
}

export default React.memo(OfferCard);
