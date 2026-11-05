import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import OfferCard from '../components/OfferCard';
import ShopTimer from '../components/ShopTimer';
import ModifierFilter from '../components/ModifierFilter';
import VisitorStats from '../components/VisitorStats';
import LanguageSelector from '../components/LanguageSelector';
import { parseGameMaster, parseHeroes } from '../utils/parser';
import { subscribeToAllLikes } from '../utils/likeService';
import { subscribeToAllRatings } from '../utils/ratingService';
import { modifierName } from '../utils/modifiers';
import { relativeDay } from '../utils/dates';
import { useLanguage } from '../contexts/useLanguage';

const DISCORD_URL = 'https://discord.gg/Ww9HX27JmU';
const INITIAL_DAYS = 3;      // "Coming soon" days shown before "Show next 7 days"
const DAYS_STEP = 7;
const FILTERED_PAGE = 24;    // filtered "Coming soon" results per "Show more"
const COMPACT_KEY = 'rampage_compact_cards';

const HERO_ORDER = { 'Berserker': 1, 'Ranger': 2, 'Sorcerer': 3, 'Chef': 4, 'Battle Chef': 5, 'Vampire Hunter': 6, 'Ghost Samurai': 7, 'Pyromancer': 8, 'Dragon Knight': 9 };
const SORT_MODES = ['popular', 'rating', 'price-low', 'power'];

const offerPrice = (offer) => offer.items[0]?.price ?? 0;
const offerPower = (offer) => { const item = offer.items[0]; return item?.detail?.WeaponPower || item?.weapon?.Power || 0; };
// Average pulled toward 3 stars until an item has a few votes, so one 5-star vote doesn't top the list.
const ratingScore = (r) => (r ? (r.sum + 9) / (r.count + 3) : 3);

const SORTERS = {
    popular: ({ likes }) => (a, b) => (likes[b.Id] || 0) - (likes[a.Id] || 0),
    rating: ({ ratings }) => (a, b) => (ratingScore(ratings[b.Id]) - ratingScore(ratings[a.Id])) || ((ratings[b.Id]?.count || 0) - (ratings[a.Id]?.count || 0)),
    'price-low': () => (a, b) => offerPrice(a) - offerPrice(b),
    power: () => (a, b) => offerPower(b) - offerPower(a),
};

// Turns the game data into the shop sections plus the hero and modifier filter options.
function buildShopState(json) {
    const offers = parseGameMaster(json);
    const heroes = parseHeroes(json).sort((a, b) => (HERO_ORDER[a.name] || 99) - (HERO_ORDER[b.name] || 99));
    const identity = (s) => s;
    const modSet = new Map();
    offers.forEach(o => (o.items || []).forEach(item => (item.modifiers || []).forEach(mod => {
        const key = mod.isLegendary ? `LEG|${mod.Name}` : mod.MODIFIER_TYPE && `TYPE|${mod.MODIFIER_TYPE}`;
        if (key && !modSet.has(key)) modSet.set(key, { label: modifierName(mod, identity), value: key, isLegendary: !!mod.isLegendary, iconName: mod.IconName, description: mod.Description });
    })));
    const available = offers.filter(o => o.isAvailable);
    const allUpcoming = offers.filter(o => o.isUpcoming);
    let upcoming = [], comingSoon = [];
    if (allUpcoming.length > 0) {
        const nextBatchDate = allUpcoming[0].startDate;
        upcoming = allUpcoming.filter(o => o.startDate === nextBatchDate);
        comingSoon = allUpcoming.filter(o => o.startDate !== nextBatchDate);
    }
    return { heroes, modifierOptions: [...modSet.values()], data: { available, upcoming, comingSoon } };
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

const liveParams = () => new URLSearchParams(window.location.hash.split('?')[1] || '');

function FeaturedHeader({ title, sub, live, right }) {
    return (
        <div className="featured-header">
            <div className="featured-line" />
            <div className="featured-text">
                <h2 className="featured-title">{live && <span className="live-dot" />}{title}</h2>
                {sub && <p className="featured-sub">{sub}</p>}
            </div>
            <div className="featured-line" />
            {right}
        </div>
    );
}

function ShopPage() {
    const { t, locale } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState({ available: [], upcoming: [], comingSoon: [] });
    const [heroes, setHeroes] = useState([]);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [modifierOptions, setModifierOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rawJson, setRawJson] = useState(null);
    const [allLikes, setAllLikes] = useState({});
    const [allRatings, setAllRatings] = useState({});
    const [visibleDays, setVisibleDays] = useState(INITIAL_DAYS);
    const [visibleFiltered, setVisibleFiltered] = useState(FILTERED_PAGE);
    const [compact, setCompact] = useState(() => { try { return localStorage.getItem(COMPACT_KEY) === '1'; } catch { return false; } });
    // The search box keeps its own text (so fast typing never loses letters) and is copied to the URL after a short pause.
    const [searchInput, setSearchInput] = useState(() => searchParams.get('q') || '');
    const searchQuery = useDeferredValue(searchInput);

    // Filters live in the URL so a shared link opens the same view.
    const heroParam = searchParams.get('hero') || '';
    const selectedModifiers = useMemo(() => (searchParams.get('mods') || '').split(',').filter(Boolean), [searchParams]);
    const sortMode = SORT_MODES.includes(searchParams.get('sort')) ? searchParams.get('sort') : 'popular';
    const selectedHero = heroes.find(h => h.constant.toLowerCase() === heroParam) || null;

    const updateParams = (changes) => {
        // Start from the live URL so quick successive clicks don't drop each other.
        const next = liveParams();
        Object.entries(changes).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
        setSearchParams(next, { replace: true });
        setVisibleDays(INITIAL_DAYS);
        setVisibleFiltered(FILTERED_PAGE);
    };
    const selectHero = (hero) => { setHasInteracted(true); updateParams({ hero: hero ? hero.constant.toLowerCase() : '' }); };
    const setModifiers = (mods) => updateParams({ mods: mods.join(',') });
    const clearFilters = () => { setSearchInput(''); updateParams({ hero: '', mods: '', q: '' }); };
    const toggleCompact = () => setCompact(c => { try { localStorage.setItem(COMPACT_KEY, c ? '0' : '1'); } catch { /* not remembered */ } return !c; });

    useEffect(() => {
        const id = setTimeout(() => {
            if ((liveParams().get('q') || '') !== searchInput.trim()) updateParams({ q: searchInput.trim() });
        }, 250);
        return () => clearTimeout(id);
    }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps -- updateParams only reads the live URL

    useEffect(() => {
        const onHashChange = () => setSearchInput(liveParams().get('q') || '');
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

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

    // Re-split the sections at the next rotation boundary.
    useEffect(() => {
        if (!rawJson) return;
        const times = [...data.available.map(o => Date.parse(o.endDate)), ...data.upcoming.map(o => Date.parse(o.startDate))].filter(Number.isFinite);
        if (times.length === 0) return;
        const id = setTimeout(() => applyShopData(rawJson), Math.max(0, Math.min(...times) - Date.now()) + 250);
        return () => clearTimeout(id);
    }, [rawJson, data, applyShopData]);

    const heroesByType = useMemo(() => {
        const map = {};
        heroes.forEach(h => h.allowedTypes.forEach(type => { (map[type] = map[type] || []).push(h); }));
        return map;
    }, [heroes]);

    // Searchable text per offer: names, weapon type, heroes, and modifier names (English + current language).
    const searchText = useMemo(() => {
        const identity = (x) => x;
        const map = new Map();
        [...data.available, ...data.upcoming, ...data.comingSoon].forEach(offer => {
            const parts = [offer.name];
            offer.items.forEach(item => {
                parts.push(item.aesthetic?.Name, item.weapon?.Name);
                (heroesByType[item.weapon?.Mastertype] || []).forEach(h => parts.push(h.name));
                (item.modifiers || []).forEach(m => parts.push(modifierName(m, identity), modifierName(m, t)));
            });
            map.set(offer.Id, parts.filter(Boolean).join(' ').toLowerCase());
        });
        return map;
    }, [data, heroesByType, t]);

    const filtered = useMemo(() => {
        const words = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const matches = (offer) => {
            if (!offer.items || offer.items.length === 0) return false;
            if (words.length > 0 && !words.every(w => (searchText.get(offer.Id) || '').includes(w))) return false;
            return offer.items.some(item => {
                if (!item.weapon) return false;
                if (selectedHero && !selectedHero.allowedTypes.includes(item.weapon.Mastertype)) return false;
                const mods = item.modifiers || [];
                return selectedModifiers.every(key => {
                    const [type, val] = key.split('|');
                    return type === 'LEG' ? mods.some(m => m.isLegendary && m.Name === val) : mods.some(m => !m.isLegendary && m.MODIFIER_TYPE === val);
                });
            });
        };
        const sortFn = (SORTERS[sortMode] || SORTERS.popular)({ likes: allLikes, ratings: allRatings });
        const comingSoonDays = groupByDate(data.comingSoon.filter(matches)).map(([date, offers]) => [date, offers.sort(sortFn)]);
        return {
            available: data.available.filter(matches).sort(sortFn),
            upcoming: data.upcoming.filter(matches).sort(sortFn),
            comingSoonDays,
            comingSoon: comingSoonDays.flatMap(([, offers]) => offers),
        };
    }, [allLikes, allRatings, data, searchQuery, searchText, selectedHero, selectedModifiers, sortMode]);

    // "Next" links reveal the card first if it is beyond what is shown, then scroll to it.
    const jumpTo = (offer) => {
        const index = filtered.comingSoon.indexOf(offer);
        if (index >= visibleFiltered) flushSync(() => setVisibleFiltered(index + 1));
        const el = document.getElementById(`offer-${offer.Id}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight');
        setTimeout(() => el.classList.remove('highlight'), 1600);
    };

    const fmtDay = (iso) => new Date(iso).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    const fmtTime = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    if (loading) {
        return (
            <div className="loading-screen" role="status">
                <div className="loading-title">RAMPAGE ARMORY</div>
                <div className="loading-bar" />
                <div className="loading-sub">{t('Loading Armory...')}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-screen">
                <div className="error-title">{t('Error')}</div>
                <p className="error-msg">{t("Couldn't load the shop data. Check your connection and try again.")}</p>
                <button type="button" className="load-more-btn" onClick={() => window.location.reload()}>{t('Try again')}</button>
            </div>
        );
    }

    const nextResetTime = data.available.length > 0 ? Math.min(...data.available.map(o => new Date(o.endDate).getTime())) : null;
    const filtersActive = !!selectedHero || selectedModifiers.length > 0 || searchQuery.trim() !== '';
    const noData = data.available.length + data.upcoming.length + data.comingSoon.length === 0;
    const futureMatches = [...filtered.upcoming, ...filtered.comingSoon];
    const nothingMatches = filtersActive && !noData && filtered.available.length + futureMatches.length === 0;
    const lastEnd = noData && rawJson?.Offers ? Math.max(0, ...rawJson.Offers.filter(o => o.Tab === 'WEAPON').map(o => Date.parse(o.EndDate)).filter(Number.isFinite)) : 0;
    const shownDays = filtered.comingSoonDays.slice(0, visibleDays);
    const shownFiltered = filtered.comingSoon.slice(0, visibleFiltered);

    const card = (offer) => (
        <OfferCard
            key={offer.Id}
            offer={offer}
            likeCount={allLikes[offer.Id] || 0}
            rating={allRatings[offer.Id]}
            heroes={heroesByType[offer.items[0]?.weapon?.Mastertype]}
            compact={compact}
        />
    );

    // With filters on, empty sections are hidden and one line says when the next match arrives.
    let notice = null;
    if (filtersActive && !nothingMatches && filtered.available.length === 0) {
        const next = filtered.upcoming[0] || filtered.comingSoon[0];
        notice = (
            <div className="filter-notice">
                {filtered.upcoming.length > 0 ? t('Not in the shop today.') : t('Not in the shop today or next rotation.')}
                {filtered.upcoming.length === 0 && next && (
                    <button type="button" className="notice-link" onClick={() => jumpTo(next)}>
                        {t('Next')}: {next.name} · {fmtDay(next.startDate)} ({relativeDay(next.startDate, t)})
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="app">
            {/* ===== TOP NAV BAR ===== */}
            <header className="top-nav">
                <div className="top-nav-inner">
                    <div className="nav-brand" />
                    <nav className="nav-links">
                        <a href="#/" className="nav-link active">{t('SHOP')}</a>
                        <span className="nav-link disabled" title={t('Coming soon')}>{t('HEROES')} <span className="nav-wip">WIP</span></span>
                        <span className="nav-link disabled" title={t('Coming soon')}>{t('ITEMS')} <span className="nav-wip">WIP</span></span>
                        <span className="nav-link disabled" title={t('Coming soon')}>{t('BUNDLES')} <span className="nav-wip">WIP</span></span>
                        <span className="nav-link disabled" title={t('Coming soon')}>{t('GUIDES')} <span className="nav-wip">WIP</span></span>
                        <span className="nav-link disabled" title={t('Coming soon')}>{t('LEADERBOARD')} <span className="nav-wip">WIP</span></span>
                    </nav>
                    <div className="nav-right">
                        <LanguageSelector />
                        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="discord-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                            {t('JOIN DISCORD')}
                        </a>
                    </div>
                </div>
            </header>

            {/* ===== HERO BANNER ===== */}
            <section className="hero-banner">
                <div className="hero-banner-inner">
                    <div className="hero-banner-content">
                        <img src="brand/logo.webp" alt="Rampage Armory" className="hero-slogan-img" />
                        <p className="hero-desc">
                            {t('Rampage Armory tracks upcoming shop items')}<br />
                            {t('in real time so you never miss a must buy.')}
                        </p>
                        <VisitorStats />
                    </div>
                </div>
            </section>

            {/* ===== BODY ===== */}
            <div className="body-layout">
                <div className="body-left">
                    {noData ? (
                        <div className="empty">
                            {lastEnd
                                ? t("The shop data on this site ends on {date}. New rotations will show up once it's updated from the game files.").replace('{date}', new Date(lastEnd).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }))
                                : t('No weapons currently available.')}
                        </div>
                    ) : (
                        <>
                            <div className="hero-selector-row">
                                <button type="button" className={`hero-select-btn ${selectedHero === null ? 'active' : ''}`} onClick={() => selectHero(null)} aria-pressed={selectedHero === null}>
                                    <div className="hero-select-icon-wrap">
                                        <svg className={`all-heroes-check ${selectedHero === null ? 'checked' : ''} ${hasInteracted ? 'animated' : ''}`} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10" className="check-circle" fill="none" stroke="currentColor" strokeWidth="2" />
                                            <path d="M8 12l3 3 5-6" className="check-mark" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <span className="hero-select-name">{t('ALL HEROES')}</span>
                                </button>
                                {heroes.map(hero => (
                                    <button
                                        key={hero.id}
                                        type="button"
                                        className={`hero-select-btn ${hero.name.toLowerCase().replace(' ', '-')} ${selectedHero?.id === hero.id ? 'active' : ''}`}
                                        onClick={() => selectHero(selectedHero?.id === hero.id ? null : hero)}
                                        aria-pressed={selectedHero?.id === hero.id}
                                    >
                                        <div className="hero-select-icon-wrap">
                                            {hero.iconName && <img src={`icons/${hero.iconName}.png`} alt="" className="hero-select-icon" onError={(e) => { e.target.style.display = 'none'; }} />}
                                        </div>
                                        <span className="hero-select-name">{hero.name.toUpperCase()}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="modifier-section">
                                <ModifierFilter options={modifierOptions} selected={selectedModifiers} onChange={setModifiers} />
                            </div>

                            <div className="search-sort-bar">
                                <div className="search-input-wrap">
                                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                    <input
                                        type="search"
                                        className="search-input"
                                        placeholder={t('Search weapons, heroes, modifiers...')}
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        aria-label={t('Search weapons, heroes, modifiers...')}
                                    />
                                    {searchInput && <button type="button" className="search-clear" onClick={() => setSearchInput('')} aria-label={t('Clear search')}>×</button>}
                                </div>
                                <div className="sort-dropdown-wrap">
                                    <select className="sort-dropdown" value={sortMode} onChange={(e) => updateParams({ sort: e.target.value === 'popular' ? '' : e.target.value })} aria-label={t('Sort')}>
                                        <option value="popular">{t('SORT BY')}: {t('MOST LIKED')}</option>
                                        <option value="rating">{t('SORT BY')}: {t('TOP RATED')}</option>
                                        <option value="power">{t('SORT BY')}: {t('HIGHEST POWER')}</option>
                                        <option value="price-low">{t('SORT BY')}: {t('CHEAPEST FIRST')}</option>
                                    </select>
                                </div>
                                <button type="button" className={`compact-toggle ${compact ? 'active' : ''}`} onClick={toggleCompact} aria-pressed={compact} title={t('Compact cards: hide stats and modifier descriptions')}>
                                    {t('COMPACT')}
                                </button>
                            </div>

                            <div className="cards-panel">
                                {notice}

                                {filtered.available.length > 0 && (
                                    <>
                                        <FeaturedHeader
                                            live
                                            title={t('WEAPONS LIVE NOW')}
                                            sub={t('Available right now in the shop')}
                                            right={nextResetTime && (
                                                <div className="header-timer">
                                                    <span className="header-timer-label">{t('REFRESHES IN')}</span>
                                                    <ShopTimer targetTime={nextResetTime} />
                                                </div>
                                            )}
                                        />
                                        <div className="item-grid">{filtered.available.map(card)}</div>
                                    </>
                                )}

                                {filtered.upcoming.length > 0 && (
                                    <>
                                        <FeaturedHeader title={t('UPCOMING')} sub={`${t('Arriving in the next shop rotation')} · ${fmtDay(filtered.upcoming[0].startDate)}, ${fmtTime(filtered.upcoming[0].startDate)}`} />
                                        <div className="item-grid">{filtered.upcoming.map(card)}</div>
                                    </>
                                )}

                                {filtered.comingSoon.length > 0 && (
                                    <>
                                        <FeaturedHeader title={t('COMING SOON')} sub={t('Read from the game files. The developers can change future rotations before they go live.')} />
                                        {filtersActive ? (
                                            <>
                                                <div className="item-grid">{shownFiltered.map(card)}</div>
                                                {filtered.comingSoon.length > shownFiltered.length && (
                                                    <button type="button" className="load-more-btn" onClick={() => setVisibleFiltered(v => v + FILTERED_PAGE)}>
                                                        {t('Show more')} ({(filtered.comingSoon.length - shownFiltered.length).toLocaleString(locale)} {t('left')})
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {shownDays.map(([date, offers]) => (
                                                    <div key={date} className="day-group">
                                                        <h3 className="day-head"><span>{fmtDay(date)}</span> · {relativeDay(date, t)}</h3>
                                                        <div className="item-grid">{offers.map(card)}</div>
                                                    </div>
                                                ))}
                                                {filtered.comingSoonDays.length > shownDays.length && (
                                                    <button type="button" className="load-more-btn" onClick={() => setVisibleDays(d => d + DAYS_STEP)}>
                                                        {t('Show next 7 days')} ({t('{a} of {b} days shown').replace('{a}', shownDays.length).replace('{b}', filtered.comingSoonDays.length)})
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                {nothingMatches && (
                                    <div className="empty">
                                        {t('No weapons match these filters.')}
                                        <button type="button" className="load-more-btn" onClick={clearFilters}>{t('Clear filters')}</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ===== FOOTER ===== */}
            <footer className="footer">
                <span className="footer-credit">Assets by &copy; 2025 Dungeon Rampage, Ported by Gamebreaking Studios Inc, Certain rights reserved.</span>
            </footer>
        </div>
    );
}

export default ShopPage;
