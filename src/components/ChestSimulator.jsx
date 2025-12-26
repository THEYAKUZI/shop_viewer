import React, { useState, useEffect, useRef } from 'react';
import './ChestSimulator.css';
import OfferCard from './OfferCard';

const RARITY_CHANCE = {
    LEGENDARY: 0.05,
    RARE: 0.20,
    UNCOMMON: 0.40,
    COMMON: 1.00 // Fallback
};

const CHEST_TYPES = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    LEGENDARY: 'legendary'
};

export default function ChestSimulator({ rawData }) {
    const [lootPool, setLootPool] = useState({});
    const [gameState, setGameState] = useState('IDLE'); // IDLE, ANIMATING, REVEALED
    const [currentFrame, setCurrentFrame] = useState(1);
    const [generatedReward, setGeneratedReward] = useState(null);
    const [chestType, setChestType] = useState(CHEST_TYPES.COMMON);

    const animationRef = useRef(null);
    const frameInterval = useRef(null);

    // Build Loot Pool
    useEffect(() => {
        if (!rawData) return;

        const pool = {
            [CHEST_TYPES.LEGENDARY]: [],
            [CHEST_TYPES.RARE]: [],
            [CHEST_TYPES.UNCOMMON]: [],
            [CHEST_TYPES.COMMON]: []
        };

        // Extract Weapons
        const weapons = rawData.WeaponItem || [];
        const aesthetics = rawData.WeaponAesthetics || [];

        // Map aesthetics to weapons
        const aesMap = new Map();
        aesthetics.forEach(a => {
            const wid = a.WeaponItemConstant;
            if (!aesMap.has(wid)) aesMap.set(wid, []);
            aesMap.get(wid).push(a);
        });

        weapons.forEach(w => {
            const wAes = aesMap.get(w.Constant) || [];
            wAes.forEach(a => {
                const item = {
                    weapon: w,
                    aesthetic: a,
                    price: 0,
                    currency: 'FREE'
                };

                if (a.IsLegendary) {
                    pool[CHEST_TYPES.LEGENDARY].push(item);
                } else if (a.MinLevel >= 15) {
                    pool[CHEST_TYPES.RARE].push(item);
                } else if (a.MinLevel >= 5) {
                    pool[CHEST_TYPES.UNCOMMON].push(item);
                } else {
                    pool[CHEST_TYPES.COMMON].push(item);
                }
            });
        });

        setLootPool(pool);
    }, [rawData]);

    const openChest = () => {
        if (gameState === 'ANIMATING') return;

        // 1. Determine Rarity
        const roll = Math.random();
        let type = CHEST_TYPES.COMMON;
        if (roll < RARITY_CHANCE.LEGENDARY) type = CHEST_TYPES.LEGENDARY;
        else if (roll < RARITY_CHANCE.RARE) type = CHEST_TYPES.RARE;
        else if (roll < RARITY_CHANCE.UNCOMMON) type = CHEST_TYPES.UNCOMMON;

        // Ensure pool has items, else downgrade
        if (lootPool[type].length === 0) type = CHEST_TYPES.COMMON;

        setChestType(type);

        // 2. Pick Item
        const pool = lootPool[type];
        const item = pool[Math.floor(Math.random() * pool.length)];

        // Construct offer-like object for OfferCard
        const rewardOffer = {
            Id: 'simulated_' + Date.now(),
            name: item.aesthetic.Name || item.weapon.Name,
            startDate: new Date().toISOString(),
            isAvailable: true,
            items: [{
                weapon: item.weapon,
                aesthetic: item.aesthetic,
                modifiers: [], // TODO: Add random modifiers?
                detail: { Level: item.aesthetic.MinLevel || 1, Rarity: type.toUpperCase() },
                price: 0
            }]
        };

        setGeneratedReward(rewardOffer);
        setGameState('ANIMATING');
        setCurrentFrame(1);
    };

    // Animation Loop
    useEffect(() => {
        if (gameState !== 'ANIMATING') return;

        let frame = 1;
        const totalFrames = 60; // Based on observed files
        const fps = 30;

        frameInterval.current = setInterval(() => {
            frame++;
            if (frame > totalFrames) {
                clearInterval(frameInterval.current);
                setGameState('REVEALED');
                setCurrentFrame(totalFrames);
            } else {
                setCurrentFrame(frame);
            }
        }, 1000 / fps);

        return () => clearInterval(frameInterval.current);
    }, [gameState]);

    const reset = () => {
        setGameState('IDLE');
        setGeneratedReward(null);
        setCurrentFrame(1);
    };

    if (!lootPool[CHEST_TYPES.COMMON]?.length) return null;

    return (
        <div className="chest-sim-container animate-fade-in">
            <h2 className="section-title" style={{ justifyContent: 'center', marginBottom: '40px' }}>
                <span className="pulse-dot" style={{ background: '#bf00ff' }}></span>
                Chest Simulator
            </h2>

            <div className="sim-stage">
                {gameState === 'IDLE' && (
                    <div className="idle-state">
                        <div className="chest-preview">
                            <img src="chests/common/1.png" alt="Chest" className="chest-idle-img" />
                        </div>
                        <button className="open-btn" onClick={openChest}>
                            OPEN CHEST
                        </button>
                    </div>
                )}

                {gameState === 'ANIMATING' && (
                    <div className="animating-state">
                        <img
                            src={`chests/${chestType}/${currentFrame}.png`}
                            alt="Opening..."
                            className="chest-anim-img"
                        />
                    </div>
                )}

                {gameState === 'REVEALED' && generatedReward && (
                    <div className="revealed-state animate-fade-in">
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: chestType === 'legendary' ? '#bf00ff' : '#fff' }}>
                                {chestType.toUpperCase()} DROPPED!
                            </h3>
                        </div>
                        <div className="reward-card-wrapper">
                            <OfferCard offer={generatedReward} />
                        </div>
                        <button className="open-btn secondary" onClick={reset}>
                            OPEN ANOTHER
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
