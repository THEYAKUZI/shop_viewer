import React, { useEffect, useState } from 'react';

import OfferCard from './components/OfferCard';
import ShopTimer from './components/ShopTimer';

import './index.css';
import './HeroFilter.css';
import ModifierFilter from './components/ModifierFilter';
import ChestSimulator from './components/ChestSimulator';
import { parseGameMaster, parseHeroes } from './utils/parser';

function App() {
  const [data, setData] = useState({ available: [], upcoming: [], comingSoon: [] });
  const [heroes, setHeroes] = useState([]);
  const [selectedHero, setSelectedHero] = useState(null);
  const [modifierOptions, setModifierOptions] = useState([]);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawJson, setRawJson] = useState(null);

  const processOffers = (json) => {
    try {
      const offers = parseGameMaster(json);
      const parsedHeroes = parseHeroes(json);
      // Sort heroes: Berserker > Ranger > Sorcerer > Chef
      const order = { 'Berserker': 1, 'Ranger': 2, 'Sorcerer': 3, 'Chef': 4 };
      parsedHeroes.sort((a, b) => {
        const valA = order[a.name] || 99;
        const valB = order[b.name] || 99;
        return valA - valB;
      });

      setHeroes(parsedHeroes);

      // Extract unique modifier options from all offers
      const modSet = new Map(); // Value -> { label, value, isLegendary }

      const processItemModifiers = (item) => {
        if (!item.modifiers) return;
        item.modifiers.forEach(mod => {
          if (mod.isLegendary) {
            const key = `LEG|${mod.Name}`;
            if (!modSet.has(key)) {
              modSet.set(key, { label: mod.Name, value: key, isLegendary: true, iconName: mod.IconName });
            }
          } else if (mod.MODIFIER_TYPE) {
            const key = `TYPE|${mod.MODIFIER_TYPE}`;
            if (!modSet.has(key)) {
              // Formatting Type: POISON -> Poison
              const label = mod.MODIFIER_TYPE.split('_').map(s => s.charAt(0) + s.slice(1).toLowerCase()).join(' ');
              modSet.set(key, { label, value: key, isLegendary: false, iconName: mod.IconName });
            }
          }
        });
      };

      offers.forEach(o => {
        if (o.items) o.items.forEach(processItemModifiers);
      });

      setModifierOptions(Array.from(modSet.values()));

      const available = offers.filter(o => o.isAvailable);
      const allUpcoming = offers.filter(o => o.isUpcoming);

      let upcoming = [];
      let comingSoon = [];

      if (allUpcoming.length > 0) {
        // The first item has the earliest start date because parser sorts them
        const nextBatchDate = allUpcoming[0].startDate;

        // Filter into next batch (Upcoming) and future batches (Coming Soon)
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
    fetch('DB_GameMaster.json')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load DB_GameMaster.json. Please ensure it is in the public folder.");
        return res.json();
      })
      .then(json => {
        setRawJson(json);
        processOffers(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleShopReset = () => {
    console.log("Shop resetting...");
    // Force a re-process of the data. 
    // Since parseGameMaster uses 'new Date()', calling it again will shift items based on current time.
    if (rawJson) {
      processOffers(rawJson);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="section-title">Loading Armory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h1 className="header-title" style={{ fontSize: '2rem' }}>Error</h1>
        <p className="subtitle" style={{ color: 'red' }}>{error}</p>
        <p style={{ color: '#666', marginTop: '20px' }}>Please place DB_GameMaster.json in the 'shop_viewer/public' folder and restart.</p>
      </div>
    );
  }

  // Determine shop reset time (use the earliest end date of live items)
  let nextResetDate = null;
  if (data.available.length > 0) {
    // Find the soonest end date
    const endDates = data.available.map(o => new Date(o.endDate));
    nextResetDate = new Date(Math.min(...endDates));
  }

  // Filter logic
  const getFilteredData = () => {
    // Optimization: if no filters, return raw data
    if (!selectedHero && selectedModifiers.length === 0) return data;

    const filterFn = (offer) => {
      // If the offer has no items, it shouldn't show up in a weapon filter anyway
      if (!offer.items || offer.items.length === 0) return false;

      // Check if ANY item in the offer is usable by the selected hero AND has selected modifiers
      return offer.items.some(item => {
        if (!item.weapon) return false;

        // 1. Hero Check
        if (selectedHero) {
          const type = item.weapon.Mastertype;
          if (!type || !selectedHero.allowedTypes || !selectedHero.allowedTypes.includes(type)) {
            return false;
          }
        }

        // 2. Modifier Check (Must have ALL selected modifiers)
        if (selectedModifiers.length > 0) {
          const itemMods = item.modifiers || [];
          // For each selected filter, must find a matching mod in itemMods
          const hasAllMods = selectedModifiers.every(filterKey => {
            const [type, val] = filterKey.split('|');
            if (type === 'LEG') {
              // Check for exact legendary name
              return itemMods.some(m => m.isLegendary && m.Name === val);
            } else {
              // Check for modifier type
              return itemMods.some(m => !m.isLegendary && m.MODIFIER_TYPE === val);
            }
          });
          if (!hasAllMods) return false;
        }

        return true;
      });
    };

    return {
      available: data.available.filter(filterFn),
      upcoming: data.upcoming.filter(filterFn),
      comingSoon: data.comingSoon.filter(filterFn)
    };
  };


  const filteredData = getFilteredData();

  return (
    <div className="main-wrapper">
      <header className="animate-fade-in">
        <h1 className="header-title">RAMPAGE ARMORY</h1>
        <div style={{ marginTop: '15px', color: '#666', fontSize: '0.75rem', lineHeight: '1.4', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#888' }}>SHOP IS SUBJECT TO CHANGE</p>
          <p style={{ margin: '4px 0 0 0' }}>DEVELOPERS COULD UPDATE THEM AT ANY MOMENT SO DON'T TAKE THEM FOR GRANTED</p>
        </div>
      </header>

      {/* Hero Filter */}
      <div className="hero-filter-container animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <button
          className={`hero-btn ${selectedHero === null ? 'active' : ''}`}
          onClick={() => setSelectedHero(null)}
        >
          All Heroes
        </button>
        {heroes.map(hero => (
          <button
            key={hero.id}
            className={`hero-btn ${selectedHero && selectedHero.id === hero.id ? 'active' : ''}`}
            onClick={() => setSelectedHero(hero)}
          >
            {hero.iconName && (
              <img
                src={`icons/${hero.iconName}.png`}
                alt={hero.name}
                className="hero-icon"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            {hero.name}
          </button>
        ))}
      </div>

      <ModifierFilter
        options={modifierOptions}
        selected={selectedModifiers}
        onChange={setSelectedModifiers}
      />

      <div className="container">
        {rawJson && <ChestSimulator rawData={rawJson} />}

        {/* Live Section */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="section-header">
            <div className="section-line"></div>
            <h2 className="section-title" style={{ color: 'var(--color-accent-green)' }}>
              <span className="pulse-dot"></span>
              Live Now
              {nextResetDate && <ShopTimer targetDate={nextResetDate} onExpire={handleShopReset} />}
            </h2>
            <div className="section-line"></div>
          </div>

          {filteredData.available.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>No weapons currently available.</p>
          ) : (
            <div className="grid-layout">
              {filteredData.available.map(offer => (
                <OfferCard key={offer.Id} offer={offer} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Section (Next Batch) */}
        {filteredData.upcoming.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: '0.2s', marginTop: '60px' }}>
            <div className="section-header">
              <div className="section-line"></div>
              <h2 className="section-title" style={{ color: '#ffaa00' }}>
                <span className="pulse-dot" style={{ backgroundColor: '#ffaa00' }}></span>
                Upcoming
              </h2>
              <div className="section-line"></div>
            </div>

            <div className="grid-layout" style={{ opacity: 0.9 }}>
              {filteredData.upcoming.map(offer => (
                <OfferCard key={offer.Id} offer={offer} />
              ))}
            </div>
          </section>
        )}

        {/* Coming Soon Section (Future Batches) */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s', marginTop: '100px' }}>
          <div className="section-header">
            <div className="section-line"></div>
            <h2 className="section-title" style={{ color: 'var(--color-accent-blue)' }}>
              <span className="pulse-dot" style={{ backgroundColor: 'var(--color-accent-blue)' }}></span>
              Coming Soon
            </h2>
            <div className="section-line"></div>
          </div>

          {filteredData.comingSoon.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>No other upcoming shipments detected.</p>
          ) : (
            <div className="grid-layout" style={{ opacity: 0.85 }}>
              {filteredData.comingSoon.map(offer => (
                <OfferCard key={offer.Id} offer={offer} />
              ))}
            </div>
          )}
        </section>

        <div style={{
          textAlign: 'center',
          marginTop: '60px',
          padding: '20px 0',
          color: '#666',
          fontSize: '0.8rem',
          borderTop: '1px solid #333'
        }}>
          Assets by © 2025 Dungeon Rampage, Ported by Gamebreaking Studios Inc , Certain rights reserved.
        </div>
      </div>
      <img
        src="icons/berserker.svg"
        alt=""
        className="berserker-dec"
      />
    </div>
  );
}

export default App;
