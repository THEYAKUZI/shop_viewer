import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OfferCard from '../components/OfferCard';
import ShopTimer from '../components/ShopTimer';
import { ModifierPicker, SelectedModifiers } from '../components/ModifierFilter';
import { parseGameMaster, parseHeroes } from '../utils/parser';
import { subscribeToAllLikes } from '../utils/likeService';
import { subscribeToAllRatings } from '../utils/ratingService';
import { modifierName } from '../utils/modifiers';
import VisitorStats from '../components/VisitorStats';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../contexts/useLanguage';

// One rotation is 16 items, so pages line up with whole days in "Coming soon".
const PAGE_SIZE = 16;
const DISCORD_URL = 'https://discord.gg/Ww9HX27JmU';

const HERO_ORDER = { 'Berserker': 1, 'Ranger': 2, 'Sorcerer': 3, 'Chef': 4, 'Battle Chef': 5, 'Vampire Hunter': 6, 'Ghost Samurai': 7, 'Pyromancer': 8, 'Dragon Knight': 9 };

const offerPrice = (offer) => offer.items[0]?.price ?? 0;

// Comparators for the sort menu. Each receives the like and rating maps.
const SORTERS = {
    popular: ({ likes }) => (a, b) => (likes[b.Id] || 0) - (likes[a.Id] || 0),
    rating: ({ ratings }) => (a, b) => {
        const ra = ratings[a.Id] || { average: 0, count: 0 };
        const rb = ratings[b.Id] || { average: 0, count: 0 };
        return (rb.average - ra.average) || (rb.count - ra.count);
    },
    'price-low': () => (a, b) => offerPrice(a) - offerPrice(b),
    'price-high': () => (a, b) => offerPrice(b) - offerPrice(a),
};

// Turns the game data into the shop sections plus the hero and modifier filter options.
function buildShopState(json) {
    const offers = parseGameMaster(json);
    const heroes = parseHeroes(json);
    heroes.sort((a, b) => (HERO_ORDER[a.name] || 99) - (HERO_ORDER[b.name] || 99));

    const modSet = new Map();
    const identity = (s) => s;
    offers.forEach(o => (o.items || []).forEach(item => {
        (item.modifiers || []).forEach(mod => {
            const key = mod.isLegendary ? `LEG|${mod.Name}` : mod.MODIFIER_TYPE && `TYPE|${mod.MODIFIER_TYPE}`;
            if (key && !modSet.has(key)) {
                modSet.set(key, { label: modifierName(mod, identity), value: key, isLegendary: !!mod.isLegendary, iconName: mod.IconName, description: mod.Description });
            }
        });
    }));

    const available = offers.filter(o => o.isAvailable);
    const allUpcoming = offers.filter(o => o.isUpcoming);
    let upcoming = [], comingSoon = [];
    if (allUpcoming.length > 0) {
        const nextBatchDate = allUpcoming[0].startDate;
        upcoming = allUpcoming.filter(o => o.startDate === nextBatchDate);
        comingSoon = allUpcoming.filter(o => o.startDate !== nextBatchDate);
    }
    return { heroes, modifierOptions: Array.from(modSet.values()), data: { available, upcoming, comingSoon } };
}

// Splits date-ordered offers into [startDate, offers[]] groups, keeping order.
function groupByDate(offers) {
    const groups = new Map();
    offers.forEach(o => {
        if (!groups.has(o.startDate)) groups.set(o.startDate, []);
        groups.get(o.startDate).push(o);
    });
    return [...groups.entries()];
}

function Section({ title, count, meta, note, children, live, locale }) {
    return (
        <section className="shop-section">
            <div className="section-head">
                <h2>{live && <span className="live-dot" aria-hidden="true" />}{title}</h2>
                {count !== undefined && <span className="section-count">{count.toLocaleString(locale)}</span>}
                {meta && <span className="section-meta">{meta}</span>}
            </div>
            {note && <p className="section-note">{note}</p>}
            {children}
        </section>
    );
}

function ShopPage() {
    const { t, locale } = useLanguage();
    const [data, setData] = useState({ available: [], upcoming: [], comingSoon: [] });
    const [heroes, setHeroes] = useState([]);
    const [selectedHero, setSelectedHero] = useState(null);
    const [modifierOptions, setModifierOptions] = useState([]);
    const [selectedModifiers, setSelectedModifiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rawJson, setRawJson] = useState(null);
    const [allLikes, setAllLikes] = useState({});
    const [allRatings, setAllRatings] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState('popular');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const loadMoreRef = useRef(null);

    const applyShopData = useCallback((json) => {
        const state = buildShopState(json);
        setHeroes(state.heroes);
        setModifierOptions(state.modifierOptions);
        setData(state.data);
    }, []);

    useEffect(() => {
        // The version changes whenever the data file changes, so browsers can cache it in between.
        fetch(`DB_GameMaster.json?v=${__DATA_VERSION__}`)
            .then(res => { if (!res.ok) throw new Error("Failed to load DB_GameMaster.json."); return res.json(); })
            .then(json => { setRawJson(json); applyShopData(json); setLoading(false); })
            .catch(err => { console.error(err); setError(err.message); setLoading(false); });
        const stopLikes = subscribeToAllLikes(setAllLikes);
        const stopRatings = subscribeToAllRatings(setAllRatings);
        return () => { stopLikes(); stopRatings(); };
    }, [applyShopData]);

    // Re-split the sections when the current rotation ends.
    const handleShopReset = useCallback(() => { if (rawJson) applyShopData(rawJson); }, [rawJson, applyShopData]);

    // Filter and sort changes start the list from the top again.
    const resetPaging = () => setVisibleCount(PAGE_SIZE);
    const selectHero = (hero) => { setSelectedHero(hero); resetPaging(); };
    const setModifiers = (mods) => { setSelectedModifiers(mods); resetPaging(); };
    const clearFilters = () => { setSelectedHero(null); setSelectedModifiers([]); setSearchQuery(''); resetPaging(); };

    // Weapon type -> heroes that can equip it, for the hero line on each card.
    const heroesByType = useMemo(() => {
        const map = {};
        heroes.forEach(h => h.allowedTypes.forEach(type => { (map[type] = map[type] || []).push(h); }));
        return map;
    }, [heroes]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const matches = (offer) => {
            if (!offer.items || offer.items.length === 0) return false;
            if (q && !offer.items.some(item => (offer.name || '').toLowerCase().includes(q) || (item.aesthetic?.Name || '').toLowerCase().includes(q) || (item.weapon?.Name || '').toLowerCase().includes(q))) return false;
            return offer.items.some(item => {
                if (!item.weapon) return false;
                if (selectedHero && !selectedHero.allowedTypes.includes(item.weapon.Mastertype)) return false;
                if (selectedModifiers.length > 0) {
                    const mods = item.modifiers || [];
                    const hasAll = selectedModifiers.every(key => {
                        const [type, val] = key.split('|');
                        return type === 'LEG' ? mods.some(m => m.isLegendary && m.Name === val) : mods.some(m => !m.isLegendary && m.MODIFIER_TYPE === val);
                    });
                    if (!hasAll) return false;
                }
                return true;
            });
        };
        const sortFn = (SORTERS[sortMode] || SORTERS.popular)({ likes: allLikes, ratings: allRatings });
        // Coming soon stays in date order; sorting applies within each day.
        const comingSoon = groupByDate(data.comingSoon.filter(matches)).flatMap(([, offers]) => offers.sort(sortFn));
        return {
            available: data.available.filter(matches).sort(sortFn),
            upcoming: data.upcoming.filter(matches).sort(sortFn),
            comingSoon,
        };
    }, [allLikes, allRatings, data, searchQuery, selectedHero, selectedModifiers, sortMode]);

    // Pages fill the sections in order: live, next rotation, then coming soon.
    const showAvailable = filtered.available.slice(0, visibleCount);
    const showUpcoming = filtered.upcoming.slice(0, Math.max(0, visibleCount - showAvailable.length));
    const showComingSoon = filtered.comingSoon.slice(0, Math.max(0, visibleCount - showAvailable.length - showUpcoming.length));
    const total = filtered.available.length + filtered.upcoming.length + filtered.comingSoon.length;
    const hasMore = visibleCount < total;

    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setVisibleCount(prev => prev + PAGE_SIZE);
        }, { rootMargin: '400px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, visibleCount]); // re-observing after each load keeps loading while the marker stays on screen

    const fmtDay = (iso) => new Date(iso).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    const fmtTime = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    if (loading) {
        return (
            <div className="status-screen">
                <img src="brand/logo.webp" alt="Rampage Armory" className="status-logo" />
                <div className="status-bar" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="status-screen">
                <img src="brand/logo.webp" alt="Rampage Armory" className="status-logo" />
                <p className="status-error">{t('Could not load the shop data.')} {error}</p>
            </div>
        );
    }

    const nextResetTime = data.available.length > 0
        ? Math.min(...data.available.map(o => new Date(o.endDate).getTime()))
        : null;
    const nextRotation = data.upcoming[0]?.startDate;
    const filtersActive = !!selectedHero || selectedModifiers.length > 0 || searchQuery.trim() !== '';

    return (
        <div className="app">
            <header className="banner">
                <div className="banner-art" aria-hidden="true" />
                <div className="container banner-inner">
                    <div className="banner-intro">
                        <h1><img src="brand/logo.webp" alt="Rampage Armory" width="420" height="203" /></h1>
                        <p>{t('Every legendary in the Dungeon Rampage weapon shop: what is live today and what arrives next.')}</p>
                    </div>
                    <div className="banner-side">
                        <div className="banner-actions">
                            <LanguageSelector />
                            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="discord-btn">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                                {t('Discord')}
                            </a>
                        </div>
                        <div className="refresh-panel">
                            {nextResetTime ? (
                                <>
                                    <span className="panel-label">{t('Shop refreshes in')}</span>
                                    <ShopTimer targetTime={nextResetTime} onExpire={handleShopReset} />
                                    <span className="panel-sub">{fmtDay(nextResetTime)} · {fmtTime(nextResetTime)}</span>
                                </>
                            ) : (
                                <span className="panel-label">{t('No rotation is live right now.')}</span>
                            )}
                            <dl className="panel-stats">
                                <div><dt>{t('Live now')}</dt><dd>{data.available.length}</dd></div>
                                <div><dt>{t('Upcoming')}</dt><dd>{(data.upcoming.length + data.comingSoon.length).toLocaleString(locale)}</dd></div>
                                <div><dt>{t('Visits')}</dt><dd><VisitorStats /></dd></div>
                            </dl>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container">
                <div className="filters">
                    <div className="hero-tabs" role="group" aria-label={t('Filter by hero')}>
                        <button type="button" className={`hero-tab ${selectedHero === null ? 'active' : ''}`} onClick={() => selectHero(null)} aria-pressed={selectedHero === null}>
                            <span className="hero-tab-all" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg>
                            </span>
                            {t('All heroes')}
                        </button>
                        {heroes.map(hero => (
                            <button
                                key={hero.id}
                                type="button"
                                className={`hero-tab ${selectedHero?.id === hero.id ? 'active' : ''}`}
                                onClick={() => selectHero(selectedHero?.id === hero.id ? null : hero)}
                                aria-pressed={selectedHero?.id === hero.id}
                            >
                                <img src={`icons/${hero.iconName}.png`} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                {hero.name}
                            </button>
                        ))}
                    </div>

                    <div className="toolbar">
                        <label className="control search">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                            <input
                                type="search"
                                placeholder={t('Search weapons...')}
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); resetPaging(); }}
                                aria-label={t('Search weapons...')}
                            />
                        </label>
                        <ModifierPicker options={modifierOptions} selected={selectedModifiers} onChange={setModifiers} />
                        <label className="control select">
                            <span className="select-label">{t('Sort')}</span>
                            <select value={sortMode} onChange={(e) => { setSortMode(e.target.value); resetPaging(); }}>
                                <option value="popular">{t('Most liked')}</option>
                                <option value="rating">{t('Top rated')}</option>
                                <option value="price-low">{t('Price: low to high')}</option>
                                <option value="price-high">{t('Price: high to low')}</option>
                            </select>
                        </label>
                    </div>
                    <SelectedModifiers options={modifierOptions} selected={selectedModifiers} onChange={setModifiers} />
                </div>

                {showAvailable.length > 0 && (
                    <Section
                        live
                        locale={locale}
                        title={t('Live now')}
                        count={filtered.available.length}
                        meta={nextResetTime && `${t('Ends')} ${fmtDay(nextResetTime)}, ${fmtTime(nextResetTime)}`}
                    >
                        <div className="grid">
                            {showAvailable.map(offer => (
                                <OfferCard key={offer.Id} offer={offer} likeCount={allLikes[offer.Id] || 0} rating={allRatings[offer.Id]} heroes={heroesByType[offer.items[0]?.weapon?.Mastertype]} />
                            ))}
                        </div>
                    </Section>
                )}

                {showUpcoming.length > 0 && (
                    <Section
                        locale={locale}
                        title={t('Next rotation')}
                        count={filtered.upcoming.length}
                        meta={nextRotation && `${fmtDay(nextRotation)}, ${fmtTime(nextRotation)}`}
                    >
                        <div className="grid">
                            {showUpcoming.map(offer => (
                                <OfferCard key={offer.Id} offer={offer} likeCount={allLikes[offer.Id] || 0} rating={allRatings[offer.Id]} heroes={heroesByType[offer.items[0]?.weapon?.Mastertype]} arrival={offer.startDate} />
                            ))}
                        </div>
                    </Section>
                )}

                {showComingSoon.length > 0 && (
                    <Section
                        locale={locale}
                        title={t('Coming soon')}
                        count={filtered.comingSoon.length}
                        note={t('Read from the game files. The developers can change future rotations before they go live.')}
                    >
                        {filtersActive ? (
                            // Filtered results are sparse, so a single grid reads better than one row per day.
                            <div className="grid">
                                {showComingSoon.map(offer => (
                                    <OfferCard key={offer.Id} offer={offer} likeCount={allLikes[offer.Id] || 0} rating={allRatings[offer.Id]} heroes={heroesByType[offer.items[0]?.weapon?.Mastertype]} arrival={offer.startDate} />
                                ))}
                            </div>
                        ) : groupByDate(showComingSoon).map(([date, offers]) => (
                            <div key={date} className="day-group">
                                <h3 className="day-head">{fmtDay(date)}</h3>
                                <div className="grid">
                                    {offers.map(offer => (
                                        <OfferCard key={offer.Id} offer={offer} likeCount={allLikes[offer.Id] || 0} rating={allRatings[offer.Id]} heroes={heroesByType[offer.items[0]?.weapon?.Mastertype]} arrival={offer.startDate} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </Section>
                )}

                {total === 0 && (
                    <div className="empty">
                        <p>{filtersActive ? t('No weapons match these filters.') : t('No weapons currently available.')}</p>
                        {filtersActive && <button type="button" className="control-btn control" onClick={clearFilters}>{t('Clear filters')}</button>}
                    </div>
                )}
                {hasMore && <div ref={loadMoreRef} className="load-more" aria-hidden="true" />}
            </main>

            <footer className="site-footer">
                <div className="container footer-inner">
                    <span>Rampage Armory</span>
                    <span>Assets © Dungeon Rampage, ported by Gamebreaking Studios Inc. Certain rights reserved.</span>
                    <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">{t('Discord')}</a>
                </div>
            </footer>
        </div>
    );
}

export default ShopPage;
