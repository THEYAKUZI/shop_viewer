import React, { useEffect, useMemo, useRef, useState } from 'react';
import OfferCard from '../components/OfferCard';
import ShopTimer from '../components/ShopTimer';
import '../index.css';
import ModifierFilter from '../components/ModifierFilter';
import { parseGameMaster, parseHeroes } from '../utils/parser';
import { subscribeToAllLikes } from '../utils/likeService';
import VisitorStats from '../components/VisitorStats';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';

const CARDS_PER_SECTION = 8;
const LOAD_INCREMENT = 8;

function ShopPage() {
    const { t } = useLanguage();
    const [data, setData] = useState({ available: [], upcoming: [], comingSoon: [] });
    const [heroes, setHeroes] = useState([]);
    const [selectedHero, setSelectedHero] = useState(null);
    const [modifierOptions, setModifierOptions] = useState([]);
    const [selectedModifiers, setSelectedModifiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rawJson, setRawJson] = useState(null);
    const [allLikes, setAllLikes] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState('popular');
    const [visiblePerSection, setVisiblePerSection] = useState(CARDS_PER_SECTION);
    const loadMoreRef = useRef(null);

    const processOffers = (json) => {
        try {
            const offers = parseGameMaster(json);
            const parsedHeroes = parseHeroes(json);
            const order = { 'Berserker': 1, 'Ranger': 2, 'Sorcerer': 3, 'Chef': 4, 'Battle Chef': 5, 'Vampire Hunter': 6, 'Ghost Samurai': 7 };
            parsedHeroes.sort((a, b) => (order[a.name] || 99) - (order[b.name] || 99));
            setHeroes(parsedHeroes);

            const modSet = new Map();
            const processItemModifiers = (item) => {
                if (!item.modifiers) return;
                item.modifiers.forEach(mod => {
                    if (mod.isLegendary) {
                        const key = `LEG|${mod.Name}`;
                        if (!modSet.has(key)) modSet.set(key, { label: mod.Name, value: key, isLegendary: true, iconName: mod.IconName, description: mod.Description });
                    } else if (mod.MODIFIER_TYPE) {
                        const key = `TYPE|${mod.MODIFIER_TYPE}`;
                        if (!modSet.has(key)) {
                            const label = mod.MODIFIER_TYPE.split('_').map(s => s.charAt(0) + s.slice(1).toLowerCase()).join(' ');
                            modSet.set(key, { label, value: key, isLegendary: false, iconName: mod.IconName, description: mod.Description });
                        }
                    }
                });
            };
            offers.forEach(o => { if (o.items) o.items.forEach(processItemModifiers); });
            setModifierOptions(Array.from(modSet.values()));

            const available = offers.filter(o => o.isAvailable);
            const allUpcoming = offers.filter(o => o.isUpcoming);
            let upcoming = [], comingSoon = [];
            if (allUpcoming.length > 0) {
                const nextBatchDate = allUpcoming[0].startDate;
                upcoming = allUpcoming.filter(o => o.startDate === nextBatchDate);
                comingSoon = allUpcoming.filter(o => o.startDate !== nextBatchDate);
            }
            setData({ available, upcoming, comingSoon });
        } catch (e) {
            console.error(e);
            throw new Error("Failed to parse DB_GameMaster.json: " + e.message);
        }
    };

    useEffect(() => {
        fetch(`DB_GameMaster.json?v=${Date.now()}`)
            .then(res => { if (!res.ok) throw new Error("Failed to load DB_GameMaster.json."); return res.json(); })
            .then(json => { setRawJson(json); processOffers(json); setLoading(false); })
            .catch(err => { console.error(err); setError(err.message); setLoading(false); });
        const unsubscribe = subscribeToAllLikes(setAllLikes);
        return () => unsubscribe();
    }, []);

    const handleShopReset = () => { if (rawJson) processOffers(rawJson); };

    useEffect(() => {
        setVisiblePerSection(CARDS_PER_SECTION);
    }, [searchQuery, selectedHero, selectedModifiers, sortMode]);

    const filteredData = useMemo(() => {
        const filterFn = (offer) => {
            if (!offer.items || offer.items.length === 0) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesSearch = offer.items.some(item => {
                    const name = (offer.name || '').toLowerCase();
                    const skinName = (item.aesthetic?.Name || '').toLowerCase();
                    return name.includes(q) || skinName.includes(q);
                });
                if (!matchesSearch) return false;
            }
            return offer.items.some(item => {
                if (!item.weapon) return false;
                if (selectedHero) {
                    const type = item.weapon.Mastertype;
                    if (!type || !selectedHero.allowedTypes || !selectedHero.allowedTypes.includes(type)) return false;
                }
                if (selectedModifiers.length > 0) {
                    const itemMods = item.modifiers || [];
                    const hasAllMods = selectedModifiers.every(fk => {
                        const [type, val] = fk.split('|');
                        return type === 'LEG' ? itemMods.some(m => m.isLegendary && m.Name === val) : itemMods.some(m => !m.isLegendary && m.MODIFIER_TYPE === val);
                    });
                    if (!hasAllMods) return false;
                }
                return true;
            });
        };
        const result = {
            available: data.available.filter(filterFn),
            upcoming: data.upcoming.filter(filterFn),
            comingSoon: data.comingSoon.filter(filterFn)
        };
        if (sortMode === 'popular') {
            const sortFn = (a, b) => (allLikes[b.Id] || 0) - (allLikes[a.Id] || 0);
            result.available.sort(sortFn);
            result.upcoming.sort(sortFn);
            result.comingSoon.sort(sortFn);
        }
        return result;
    }, [allLikes, data, searchQuery, selectedHero, selectedModifiers, sortMode]);
    const showAvailable = filteredData.available.slice(0, visiblePerSection);
    const showUpcoming = filteredData.upcoming.slice(0, visiblePerSection);
    const showComingSoon = filteredData.comingSoon.slice(0, visiblePerSection);
    const totalCards = filteredData.available.length + filteredData.upcoming.length + filteredData.comingSoon.length;
    const shownCards = showAvailable.length + showUpcoming.length + showComingSoon.length;
    const hasMore = shownCards < totalCards;

    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisiblePerSection(prev => prev + LOAD_INCREMENT);
            }
        }, { rootMargin: '200px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore]);

    if (loading) {
        return (
            <div className="loading-screen">
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
                <p className="error-msg">{error}</p>
            </div>
        );
    }

    let nextResetDate = null;
    if (data.available.length > 0) {
        const endDates = data.available.map(o => new Date(o.endDate));
        nextResetDate = new Date(Math.min(...endDates));
    }

    return (
        <div className="app">
            {/* ===== TOP NAV BAR ===== */}
            <header className="top-nav">
                <div className="top-nav-inner">
                    <div className="nav-brand">
                    </div>
                    <nav className="nav-links">
                        <a href="#" className="nav-link active">{t('SHOP')}</a>
                        <a href="#" className="nav-link disabled" title="Coming Soon">{t('HEROES')} <span className="nav-wip">WIP</span></a>
                        <a href="#" className="nav-link disabled" title="Coming Soon">{t('ITEMS')} <span className="nav-wip">WIP</span></a>
                        <a href="#" className="nav-link disabled" title="Coming Soon">{t('BUNDLES')} <span className="nav-wip">WIP</span></a>
                        <a href="#" className="nav-link disabled" title="Coming Soon">{t('GUIDES')} <span className="nav-wip">WIP</span></a>
                        <a href="#" className="nav-link disabled" title="Coming Soon">{t('LEADERBOARD')} <span className="nav-wip">WIP</span></a>
                    </nav>
                    <div className="nav-right">
                        <LanguageSelector />
                        <a href="https://discord.gg/Ww9HX27JmU" target="_blank" rel="noopener noreferrer" className="discord-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                            JOIN DISCORD
                        </a>
                    </div>
                </div>
            </header>

            {/* ===== HERO BANNER (spacing area) ===== */}
            <section className="hero-banner">
                <div className="hero-banner-inner">
                    <div className="hero-banner-content">
                        <img src="site assets/slogan.png" alt="Gear Up. Rampage On." className="hero-slogan-img" />
                        <p className="hero-desc">
                            {t('Rampage Armory tracks upcoming shop items')}<br/>
                            {t('in real time so you never miss a must buy.')}
                        </p>
                        <VisitorStats />
                    </div>
                </div>
            </section>

            {/* ===== BODY ===== */}
            <div className="body-layout">
                <div className="body-left">
                    {/* Hero class selector */}
                    <div className="hero-selector-row">
                        <button
                            className={`hero-select-btn ${selectedHero === null ? 'active' : ''}`}
                            onClick={() => setSelectedHero(null)}
                        >
                            <div className="hero-select-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            </div>
                            <span className="hero-select-name">{t('ALL HEROES')}</span>
                        </button>
                        {heroes.map(hero => (
                            <button
                                key={hero.id}
                                className={`hero-select-btn ${hero.name.toLowerCase().replace(' ', '-')} ${selectedHero?.id === hero.id ? 'active' : ''}`}
                                onClick={() => setSelectedHero(selectedHero?.id === hero.id ? null : hero)}
                            >
                                <div className="hero-select-icon-wrap">
                                    {hero.iconName && <img src={`icons/${hero.iconName}.png`} alt="" className="hero-select-icon" onError={(e) => { e.target.style.display = 'none' }} />}
                                </div>
                                <span className="hero-select-name">{hero.name.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>

                    {/* Modifier filter chips */}
                    <div className="modifier-section">
                        <ModifierFilter options={modifierOptions} selected={selectedModifiers} onChange={setSelectedModifiers} />
                    </div>

                    {/* Search + Sort */}
                    <div className="search-sort-bar">
                        <div className="search-input-wrap">
                            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input
                                type="text"
                                className="search-input"
                                placeholder={t('Search items...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="sort-dropdown-wrap">
                            <select className="sort-dropdown" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                                <option value="popular">SORT BY: {t('MOST LIKED')}</option>
                                <option value="newest">SORT BY: {t('NEWEST')}</option>
                                <option value="price-low">SORT BY: {t('PRICE LOW')}</option>
                                <option value="price-high">SORT BY: {t('PRICE HIGH')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="cards-panel">
                        {/* Section: Weapons Live Now */}
                        {filteredData.available.length > 0 && (
                            <>
                                <div className="featured-header">
                                    <div className="featured-line" />
                                    <div className="featured-text">
                                        <h2 className="featured-title">
                                            <span className="live-dot" />
                                            {t('WEAPONS LIVE NOW')}
                                        </h2>
                                        <p className="featured-sub">{t('Available right now in the shop')}</p>
                                    </div>
                                    <div className="featured-line" />
                                    {nextResetDate && (
                                        <div className="header-timer">
                                            <span className="header-timer-label">{t('REFRESHES IN')}</span>
                                            <ShopTimer targetDate={nextResetDate} onExpire={handleShopReset} />
                                        </div>
                                    )}
                                </div>
                                <div className="item-grid">
                                    {showAvailable.map(offer => (
                                        <OfferCard key={offer.Id} offer={offer} likeCount={allLikes[offer.Id] || 0} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Section: Upcoming */}
                        {filteredData.upcoming.length > 0 && (
                            <>
                                <div className="featured-header">
                                    <div className="featured-line" />
                                    <div className="featured-text">
                                        <h2 className="featured-title">{t('UPCOMING')}</h2>
                                        <p className="featured-sub">{t('Arriving in the next shop rotation')}</p>
                                    </div>
                                    <div className="featured-line" />
                                </div>
                                <div className="item-grid">
                                    {showUpcoming.map(offer => (
                                        <OfferCard key={offer.Id} offer={offer} likeCount={allLikes[offer.Id] || 0} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Section: Coming Soon */}
                        {filteredData.comingSoon.length > 0 && (
                            <>
                                <div className="featured-header">
                                    <div className="featured-line" />
                                    <div className="featured-text">
                                        <h2 className="featured-title">{t('COMING SOON')}</h2>
                                        <p className="featured-sub">{t('Future shop rotations')}</p>
                                    </div>
                                    <div className="featured-line" />
                                </div>
                                <div className="item-grid">
                                    {showComingSoon.map(offer => (
                                        <OfferCard key={offer.Id} offer={offer} likeCount={allLikes[offer.Id] || 0} />
                                    ))}
                                </div>
                            </>
                        )}

                        {filteredData.available.length === 0 && filteredData.upcoming.length === 0 && filteredData.comingSoon.length === 0 ? (
                            <div className="empty">{t('No weapons currently available.')}</div>
                        ) : null}
                        {hasMore && <div ref={loadMoreRef} style={{ height: 1 }} />}
                    </div>
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
