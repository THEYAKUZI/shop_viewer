import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import OfferCard from '../components/OfferCard';
import ShopTimer from '../components/ShopTimer';
import { ModifierPicker, SelectedModifiers } from '../components/ModifierFilter';
import { parseGameMaster, parseHeroes } from '../utils/parser';
import { subscribeToAllLikes } from '../utils/likeService';
import { subscribeToAllRatings } from '../utils/ratingService';
import { modifierName } from '../utils/modifiers';
import { relativeDay } from '../utils/dates';
import VisitorStats from '../components/VisitorStats';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../contexts/useLanguage';

const DISCORD_URL = 'https://discord.gg/Ww9HX27JmU';
const INITIAL_DAYS = 3;      // "Coming soon" days shown before "Show next 7 days"
const DAYS_STEP = 7;
const FILTERED_PAGE = 24;    // filtered "Coming soon" results per "Show more"

const HERO_ORDER = { 'Berserker': 1, 'Ranger': 2, 'Sorcerer': 3, 'Chef': 4, 'Battle Chef': 5, 'Vampire Hunter': 6, 'Ghost Samurai': 7, 'Pyromancer': 8, 'Dragon Knight': 9 };
const SORT_MODES = ['popular', 'rating', 'price-low', 'power'];
const COMPACT_KEY = 'rampage_compact_cards';

const offerPrice = (offer) => offer.items[0]?.price ?? 0;
const offerPower = (offer) => { const item = offer.items[0]; return item?.detail?.WeaponPower || item?.weapon?.Power || 0; };
// Average pulled toward 3 stars until an item has a few votes, so one 5-star vote doesn't top the list.
const ratingScore = (r) => (r ? (r.sum + 9) / (r.count + 3) : 3);

// Comparators for the sort menu. Each receives the like and rating maps.
const SORTERS = {
    popular: ({ likes }) => (a, b) => (likes[b.Id] || 0) - (likes[a.Id] || 0),
    rating: ({ ratings }) => (a, b) => (ratingScore(ratings[b.Id]) - ratingScore(ratings[a.Id])) || ((ratings[b.Id]?.count || 0) - (ratings[a.Id]?.count || 0)),
    'price-low': () => (a, b) => offerPrice(a) - offerPrice(b),
    power: () => (a, b) => offerPower(b) - offerPower(a),
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

function Section({ id, title, count, meta, note, children, live, locale }) {
    return (
        <section className="shop-section" id={id}>
            <div className="section-head">
                <h2>{live && <span className="live-dot" aria-hidden="true" />}{title}</h2>
                {count !== undefined && <span className="section-count">{count.toLocaleString(locale)}</span>}
                {meta && <div className="section-meta">{meta}</div>}
            </div>
            {note && <p className="section-note">{note}</p>}
            {children}
        </section>
    );
}

function DiscordLink({ t }) {
    return (
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="discord-btn" aria-label={t('Join the Discord')}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
            <span className="discord-label">Discord</span>
        </a>
    );
}

function ShopPage() {
    const { t, locale } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState({ available: [], upcoming: [], comingSoon: [] });
    const [heroes, setHeroes] = useState([]);
    const [modifierOptions, setModifierOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rawJson, setRawJson] = useState(null);
    const [allLikes, setAllLikes] = useState({});
    const [allRatings, setAllRatings] = useState({});
    const [visibleDays, setVisibleDays] = useState(INITIAL_DAYS);
    const [visibleFiltered, setVisibleFiltered] = useState(FILTERED_PAGE);
    const heroTabsRef = useRef(null);
    const [compact, setCompact] = useState(() => {
        try { return localStorage.getItem(COMPACT_KEY) === '1'; } catch { return false; }
    });
    const toggleCompact = () => setCompact(c => {
        try { localStorage.setItem(COMPACT_KEY, c ? '0' : '1'); } catch { /* not remembered */ }
        return !c;
    });

    // Filters live in the URL so a shared link opens the same view.
    const heroParam = searchParams.get('hero') || '';
    const selectedModifiers = useMemo(() => (searchParams.get('mods') || '').split(',').filter(Boolean), [searchParams]);
    // The search box keeps its own text (so fast typing never loses letters) and is copied to the URL after a short pause.
    const [searchInput, setSearchInput] = useState(() => searchParams.get('q') || '');
    const searchQuery = useDeferredValue(searchInput);
    const sortMode = SORT_MODES.includes(searchParams.get('sort')) ? searchParams.get('sort') : 'popular';
    const selectedHero = heroes.find(h => h.constant.toLowerCase() === heroParam) || null;

    const updateParams = (changes) => {
        // Start from the live URL (HashRouter keeps the query after '#/?') so quick successive clicks don't drop each other.
        const next = new URLSearchParams(window.location.hash.split('?')[1] || '');
        Object.entries(changes).forEach(([key, value]) => {
            if (value) next.set(key, value); else next.delete(key);
        });
        setSearchParams(next, { replace: true });
        setVisibleDays(INITIAL_DAYS);
        setVisibleFiltered(FILTERED_PAGE);
    };
    const selectHero = (hero) => updateParams({ hero: hero ? hero.constant.toLowerCase() : '' });
    const setModifiers = (mods) => updateParams({ mods: mods.join(',') });
    const clearFilters = () => { setSearchInput(''); updateParams({ hero: '', mods: '', q: '' }); };

    useEffect(() => {
        const onHashChange = () => setSearchInput(new URLSearchParams(window.location.hash.split('?')[1] || '').get('q') || '');
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            const current = new URLSearchParams(window.location.hash.split('?')[1] || '').get('q') || '';
            if (current !== searchInput.trim()) updateParams({ q: searchInput.trim() });
        }, 250);
        return () => clearTimeout(id);
    }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps -- updateParams only reads the live URL

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

    // Re-split the sections at the next rotation boundary (current offers ending or the next ones starting).
    useEffect(() => {
        if (!rawJson) return;
        const times = [
            ...data.available.map(o => Date.parse(o.endDate)),
            ...data.upcoming.map(o => Date.parse(o.startDate)),
        ].filter(Number.isFinite);
        if (times.length === 0) return;
        const id = setTimeout(() => applyShopData(rawJson), Math.max(0, Math.min(...times) - Date.now()) + 250);
        return () => clearTimeout(id);
    }, [rawJson, data, applyShopData]);

    // Keep the selected hero visible in the scrollable hero row; fade the edge only when it overflows.
    useEffect(() => {
        const row = heroTabsRef.current;
        if (!row) return;
        const update = () => {
            row.classList.toggle('fade-end', row.scrollWidth - row.scrollLeft - row.clientWidth > 2);
        };
        // Scroll the row sideways only; scrollIntoView would also move the page vertically.
        const active = row.querySelector('.hero-tab.active');
        if (active) {
            const r = row.getBoundingClientRect(), a = active.getBoundingClientRect();
            if (a.right > r.right) row.scrollLeft += a.right - r.right + 24;
            else if (a.left < r.left) row.scrollLeft -= r.left - a.left + 24;
        }
        update();
        row.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(row);
        return () => { row.removeEventListener('scroll', update); ro.disconnect(); };
    }, [heroes, heroParam, locale]);

    // Weapon type -> heroes that can equip it, for the hero line on each card.
    const heroesByType = useMemo(() => {
        const map = {};
        heroes.forEach(h => h.allowedTypes.forEach(type => { (map[type] = map[type] || []).push(h); }));
        return map;
    }, [heroes]);

    // Searchable text per offer: names, weapon type, heroes who can use it, and modifier names (English + current language).
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
            if (words.length > 0) {
                const text = searchText.get(offer.Id) || '';
                if (!words.every(w => text.includes(w))) return false;
            }
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
        const comingSoonDays = groupByDate(data.comingSoon.filter(matches)).map(([date, offers]) => [date, offers.sort(sortFn)]);
        return {
            available: data.available.filter(matches).sort(sortFn),
            upcoming: data.upcoming.filter(matches).sort(sortFn),
            comingSoonDays,
            comingSoon: comingSoonDays.flatMap(([, offers]) => offers),
        };
    }, [allLikes, allRatings, data, searchQuery, searchText, selectedHero, selectedModifiers, sortMode]);

    // "Next match" links reveal the card first if it is beyond what is shown, then scroll to it.
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
    const relDay = (iso) => relativeDay(iso, t);

    if (loading) {
        return (
            <div className="status-screen" role="status" aria-label={t('Loading')}>
                <img src="brand/logo.webp" alt="Rampage Armory" className="status-logo" />
                <div className="status-bar" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="status-screen">
                <img src="brand/logo.webp" alt="Rampage Armory" className="status-logo" />
                <p className="status-error">{t("Couldn't load the shop data. Check your connection and try again.")}</p>
                <button type="button" className="done-btn" onClick={() => window.location.reload()}>{t('Try again')}</button>
            </div>
        );
    }

    const nextResetTime = data.available.length > 0
        ? Math.min(...data.available.map(o => new Date(o.endDate).getTime()))
        : null;
    const nextRotation = data.upcoming[0]?.startDate;
    const filtersActive = !!selectedHero || selectedModifiers.length > 0 || searchQuery.trim() !== '';
    const noData = data.available.length + data.upcoming.length + data.comingSoon.length === 0;
    const futureMatches = [...filtered.upcoming, ...filtered.comingSoon];
    const nothingMatches = filtersActive && !noData && filtered.available.length + futureMatches.length === 0;
    const exportedAt = rawJson?.Exported ? new Date(rawJson.Exported * 1000) : null;
    const lastEnd = noData && rawJson?.Offers
        ? Math.max(0, ...rawJson.Offers.filter(o => o.Tab === 'WEAPON').map(o => Date.parse(o.EndDate)).filter(Number.isFinite))
        : 0;

    // With filters on, empty sections are hidden and replaced by one line that says when the next match arrives.
    let notice = null;
    if (filtersActive && !nothingMatches && filtered.available.length === 0) {
        if (filtered.upcoming.length > 0) {
            notice = <p className="notice">{t('Not in the shop today.')}</p>;
        } else {
            const next = filtered.comingSoon[0];
            notice = (
                <p className="notice">
                    {t('Not in the shop today or next rotation.')}
                    <button type="button" className="link-btn" onClick={() => jumpTo(next)}>
                        {t('Next')}: {next.name} · {fmtDay(next.startDate)} ({relDay(next.startDate)})
                    </button>
                </p>
            );
        }
    }

    const filterSummary = [
        selectedHero?.name,
        ...selectedModifiers.map(key => t(modifierOptions.find(o => o.value === key)?.label || key.split('|')[1])),
        searchQuery.trim() && `"${searchQuery.trim()}"`,
    ].filter(Boolean).join(' · ');

    const card = (offer, arrival, headingLevel = 3) => (
        <OfferCard
            key={offer.Id}
            offer={offer}
            likeCount={allLikes[offer.Id] || 0}
            rating={allRatings[offer.Id]}
            heroes={heroesByType[offer.items[0]?.weapon?.Mastertype]}
            arrival={arrival}
            compact={compact}
            headingLevel={headingLevel}
        />
    );

    const shownDays = filtered.comingSoonDays.slice(0, visibleDays);
    const shownFiltered = filtered.comingSoon.slice(0, visibleFiltered);
    const showLive = data.available.length > 0 && filtered.available.length > 0;
    const showNext = data.upcoming.length > 0 && filtered.upcoming.length > 0;
    const showComing = data.comingSoon.length > 0 && filtered.comingSoon.length > 0;
    const daysShownText = t('{a} of {b} days shown').replace('{a}', shownDays.length).replace('{b}', filtered.comingSoonDays.length);

    return (
        <div className="app">
            {/* Title-screen header: the game's own battle art, logo centred, fading into the page. */}
            <header className="banner">
                <div className="banner-art" aria-hidden="true" />
                <div className="banner-embers" aria-hidden="true" />
                <div className="container banner-top">
                    <div className="banner-actions">
                        <LanguageSelector />
                        <DiscordLink t={t} />
                    </div>
                </div>
                <div className="container banner-inner">
                    <h1 className="brand"><img src="brand/logo.webp" alt="Rampage Armory" width="300" height="145" /></h1>
                    <p className="banner-tagline">{t('Every legendary in the Dungeon Rampage weapon shop: what is live today and what arrives next.')}</p>
                </div>
            </header>

            <main className="container">
                {!noData && <div className="filters">
                    <div className="hero-tabs" ref={heroTabsRef} role="group" aria-label={t('Filter by hero')}>
                        <button type="button" className={`hero-tab hero-tab-all ${selectedHero === null ? 'active' : ''}`} onClick={() => selectHero(null)} aria-pressed={selectedHero === null}>
                            {t('All')}
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
                                placeholder={t('Search weapons, heroes, modifiers...')}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                aria-label={t('Search weapons, heroes, modifiers...')}
                            />
                            {searchInput && (
                                <button type="button" className="search-clear" onClick={() => setSearchInput('')} aria-label={t('Clear search')}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                </button>
                            )}
                        </label>
                        <ModifierPicker options={modifierOptions} selected={selectedModifiers} onChange={setModifiers} />
                        <label className="control select">
                            <span className="select-label">{t('Sort')}</span>
                            <select value={sortMode} onChange={(e) => updateParams({ sort: e.target.value === 'popular' ? '' : e.target.value })} aria-label={t('Sort')}>
                                <option value="popular">{t('Most liked')}</option>
                                <option value="rating">{t('Top rated')}</option>
                                <option value="power">{t('Highest power')}</option>
                                <option value="price-low">{t('Cheapest first')}</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            className={`control control-btn view-toggle ${compact ? 'has-value' : ''}`}
                            onClick={toggleCompact}
                            aria-pressed={compact}
                            title={t('Compact cards: hide stats and modifier descriptions')}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="7" rx="1.5" /><rect x="3" y="13" width="18" height="7" rx="1.5" />
                            </svg>
                            <span className="view-label">{t('Compact')}</span>
                        </button>
                    </div>
                    <SelectedModifiers options={modifierOptions} selected={selectedModifiers} onChange={setModifiers} />
                </div>}

                {notice}

                {showLive && (
                    <Section
                        live
                        locale={locale}
                        title={t('Live now')}
                        count={filtered.available.length}
                        meta={nextResetTime && (
                            <>
                                <img src="brand/clock.png" alt="" className="clock-icon" />
                                <span className="meta-label">{t('Refreshes in')}</span>
                                <ShopTimer targetTime={nextResetTime} />
                                <span className="meta-sub">{fmtDay(nextResetTime)}, {fmtTime(nextResetTime)}</span>
                            </>
                        )}
                    >
                        <div className="grid">{filtered.available.map(offer => card(offer))}</div>
                    </Section>
                )}

                {showNext && (
                    <Section
                        locale={locale}
                        title={t('Next rotation')}
                        count={filtered.upcoming.length}
                        meta={nextRotation && <span className="meta-sub">{t('Starts')} {fmtDay(nextRotation)}, {fmtTime(nextRotation)} · {relDay(nextRotation)}</span>}
                    >
                        <div className="grid">{filtered.upcoming.map(offer => card(offer))}</div>
                    </Section>
                )}

                {showComing && (
                    <Section
                        id="coming-soon"
                        locale={locale}
                        title={t('Coming soon')}
                        count={filtered.comingSoon.length}
                        note={t('Read from the game files. The developers can change future rotations before they go live.')}
                    >
                        {filtersActive ? (
                            // Filtered results are sparse, so one grid with dates on the cards reads better than a row per day.
                            <>
                                <div className="grid">{shownFiltered.map(offer => card(offer, offer.startDate))}</div>
                                {filtered.comingSoon.length > shownFiltered.length && (
                                    <button type="button" className="more-btn" onClick={() => setVisibleFiltered(v => v + FILTERED_PAGE)}>
                                        {t('Show more')} <span>({(filtered.comingSoon.length - shownFiltered.length).toLocaleString(locale)} {t('left')})</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {shownDays.map(([date, offers]) => (
                                    <div key={date} className="day-group">
                                        <h3 className="day-head">{fmtDay(date)} <span>· {relDay(date)}</span></h3>
                                        <div className="grid">{offers.map(offer => card(offer, undefined, 4))}</div>
                                    </div>
                                ))}
                                {filtered.comingSoonDays.length > shownDays.length && (
                                    <button type="button" className="more-btn" onClick={() => setVisibleDays(d => d + DAYS_STEP)}>
                                        {t('Show next 7 days')} <span>({daysShownText})</span>
                                    </button>
                                )}
                            </>
                        )}
                    </Section>
                )}

                {noData && (
                    <div className="empty">
                        <p>{lastEnd
                            ? t("The shop data on this site ends on {date}. New rotations will show up once it's updated from the game files.").replace('{date}', new Date(lastEnd).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }))
                            : t('No weapons currently available.')}</p>
                    </div>
                )}
                {nothingMatches && (
                    <div className="empty">
                        <p>{t('No weapons match')}: <strong>{filterSummary}</strong></p>
                        <button type="button" className="control control-btn" onClick={clearFilters}>{t('Clear filters')}</button>
                    </div>
                )}
            </main>

            <footer className="site-footer">
                <div className="container footer-inner">
                    <span className="footer-brand">Rampage Armory</span>
                    <span>{t('Unofficial fan site')}</span>
                    {exportedAt && <span>{t('Shop data from the game files, exported')} {exportedAt.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    <span><VisitorStats /> {t('visits')}</span>
                    <span>Assets © Dungeon Rampage, ported by Gamebreaking Studios Inc. Certain rights reserved.</span>
                    <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a>
                </div>
            </footer>
        </div>
    );
}

export default ShopPage;
