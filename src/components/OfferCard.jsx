import React, { useRef, useState } from 'react';
import LikeButton from './LikeButton';
import StarRating from './StarRating';
import { useLanguage } from '../contexts/useLanguage';
import { toPng } from 'html-to-image';
import { modifierName, resolveLevelFormula, titleCase } from '../utils/modifiers';

function Stars({ level, t }) {
    if (!level || level < 1) return null;
    return (
        <span className="mod-stars" title={`${level}/5`}>
            {[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= level ? 'on' : ''}>★</span>)}
            {level >= 5 && <span className="mod-max">{t('MAX')}</span>}
        </span>
    );
}

const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function OfferCard({ offer, likeCount = 0, rating, heroes = [], arrival }) {
    const cardRef = useRef(null);
    const { t, locale } = useLanguage();
    const [copyState, setCopyState] = useState('idle');
    const item = offer.items[0];
    const { weapon, aesthetic, modifiers = [], detail } = item;

    if (!weapon || !aesthetic) return null;

    const level = detail.Level || 1;
    const subtitle = aesthetic.Name && aesthetic.Name !== offer.name ? aesthetic.Name : null;
    const speedLabel = weapon.SpeedDisplay ? titleCase(weapon.SpeedDisplay) : null;
    const speedKey = `speed:${speedLabel}`;
    const speed = speedLabel ? (t(speedKey) === speedKey ? speedLabel : t(speedKey)) : '—';
    const fmtDate = (iso) => new Date(iso).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    const fmtTime = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    // Stamped onto copied images so a shared card says when it's in the shop.
    const caption = offer.isAvailable
        ? `${t('In shop until')} ${fmtDate(offer.endDate)}, ${fmtTime(offer.endDate)}`
        : `${t('Arrives')} ${fmtDate(offer.startDate)}, ${fmtTime(offer.startDate)}`;

    const handleCopy = async () => {
        const card = cardRef.current;
        if (!card || copyState === 'busy') return;
        setCopyState('busy');
        card.classList.add('capturing');
        const render = () => toPng(card, {
            pixelRatio: 2,
            backgroundColor: '#141210',
            filter: (node) => !node.classList?.contains('no-capture'),
        }).then(url => fetch(url)).then(res => res.blob());

        let result = 'error';
        try {
            // Passing the promise (not the finished blob) keeps Safari's user-gesture check happy.
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': render() })]);
            result = 'done';
        } catch {
            try {
                downloadBlob(await render(), `${offer.name.replace(/[^\w\s-]/g, '').trim() || 'weapon'}.png`);
                result = 'saved';
            } catch { /* result stays 'error' */ }
        }
        card.classList.remove('capturing');
        setCopyState(result);
        setTimeout(() => setCopyState('idle'), 1800);
    };

    const copyTitle = {
        idle: t('Copy card as image'),
        busy: t('Copy card as image'),
        done: t('Copied'),
        saved: t('Saved as image'),
        error: t('Could not copy'),
    }[copyState];

    return (
        <article ref={cardRef} className="card" id={`offer-${offer.Id}`}>
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
                    <p className="price-row">
                        <span className="price">
                            <img src="icons/doober_coin.png" alt={t('coins')} />
                            {Number(item.price).toLocaleString(locale)}
                        </span>
                        {arrival && <span className="arrival">{fmtDate(arrival)}</span>}
                    </p>
                </div>
            </header>

            <dl className="card-stats">
                <div><dt>{t('Level')}</dt><dd>{level}</dd></div>
                <div><dt>{t('Power')}</dt><dd>{(detail.WeaponPower || weapon.Power).toLocaleString(locale)}</dd></div>
                <div><dt>{t('Speed')}</dt><dd>{speed}</dd></div>
            </dl>

            {modifiers.length > 0 && (
                <ul className="card-mods">
                    {modifiers.map((modifier, index) => {
                        const desc = modifier.Description ? t(modifier.Description) : null;
                        const shownDesc = desc && resolveLevelFormula(desc, level);
                        return (
                            <li key={`${modifier.Constant || modifier.Name}-${index}`} className={modifier.isLegendary ? 'legendary' : ''}>
                                {modifier.IconName
                                    ? <img src={`icons/${modifier.IconName}.png`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                    : <span className="mod-icon-placeholder" />}
                                <div>
                                    <div className="mod-line">
                                        <span className="mod-name">{modifierName(modifier, t)}</span>
                                        <Stars level={modifier.MODIFIER_LEVEL} t={t} />
                                    </div>
                                    {shownDesc && <p className="mod-desc" title={shownDesc !== desc ? desc : undefined}>{shownDesc}</p>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <footer className="card-foot">
                <StarRating offerId={offer.Id} name={offer.name} average={rating?.average} count={rating?.count} />
                <span className="card-actions no-capture">
                    <LikeButton offerId={offer.Id} count={likeCount} />
                    <button
                        type="button"
                        className={`icon-btn copy-${copyState}`}
                        onClick={handleCopy}
                        title={copyTitle}
                        aria-label={copyTitle}
                    >
                        {copyState === 'done' || copyState === 'saved' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : copyState === 'error' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        )}
                    </button>
                </span>
            </footer>
            <p className="capture-caption">Rampage Armory · {caption}</p>
        </article>
    );
}

export default React.memo(OfferCard);
