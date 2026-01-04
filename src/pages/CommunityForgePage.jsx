import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import OfferCard from '../components/OfferCard';
import VisitorStats from '../components/VisitorStats';
import { useLanguage } from '../contexts/LanguageContext';

const DEFAULT_ICON = '384'; // Default icon if none provided

function CommunityForgePage() {
    const { t } = useLanguage();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        weaponName: '',
        heroClass: 'Berserker',
        rarity: 'COMMON',
        power: 100,
        speed: 1.0,
        price: 500,
        iconName: '',
        description: '',
        modifierName: '',
        modifierDesc: ''
    });

    useEffect(() => {
        const itemsRef = ref(db, 'community_items');
        const unsubscribe = onValue(itemsRef, (snapshot) => {
            const data = snapshot.val();
            const loadedItems = [];
            if (data) {
                Object.entries(data).forEach(([key, value]) => {
                    loadedItems.push({
                        ...value,
                        Id: key // Use Firebase key as ID
                    });
                });
            }
            // Sort by newest first
            loadedItems.sort((a, b) => b.createdAt - a.createdAt);
            setItems(loadedItems);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Construct the offer object structure expected by OfferCard
        const newOffer = {
            Id: null, // Will be set by Firebase or on push
            name: formData.name || "Community Item",
            isAvailable: true,
            startDate: new Date().toISOString(),
            items: [
                {
                    price: parseInt(formData.price) || 0,
                    weapon: {
                        Name: formData.weaponName || "Unknown Weapon",
                        Mastertype: formData.heroClass.toUpperCase(),
                        Power: parseInt(formData.power) || 0,
                        Speed: parseFloat(formData.speed) || 1.0,
                        IconName: formData.iconName || DEFAULT_ICON,
                    },
                    aesthetic: {
                        Name: formData.weaponName || "Unknown Weapon", // Usually implies skin name
                        IconName: formData.iconName || DEFAULT_ICON,
                        IsLegendary: formData.rarity === 'LEGENDARY'
                    },
                    detail: {
                        Rarity: formData.rarity,
                        Level: 1,
                        WeaponPower: parseInt(formData.power) || 0
                    },
                    modifiers: formData.modifierName ? [
                        {
                            Name: formData.modifierName,
                            Description: formData.modifierDesc || "Custom community modifier",
                            IconName: "modifier_icon_generic", // Placeholder
                            isLegendary: formData.rarity === 'LEGENDARY',
                            MODIFIER_LEVEL: 1,
                            MODIFIER_TYPE: 'CUSTOM'
                        }
                    ] : []
                }
            ]
        };

        // Add timestamp for sorting
        newOffer.createdAt = serverTimestamp();

        // Push to Firebase
        push(ref(db, 'community_items'), newOffer)
            .then(() => {
                alert(t("Item forged successfully!"));
                setShowForm(false);
                setFormData({
                    name: '',
                    weaponName: '',
                    heroClass: 'Berserker',
                    rarity: 'COMMON',
                    power: 100,
                    speed: 1.0,
                    price: 500,
                    iconName: '',
                    description: '',
                    modifierName: '',
                    modifierDesc: ''
                });
            })
            .catch((error) => {
                console.error("Error creating item:", error);
                alert(t("Error creating item: ") + error.message);
            });
    };

    return (
        <div className="main-wrapper">
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '25px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '10px',
                zIndex: 1000
            }}>
                <Link
                    to="/"
                    className="discord-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#444',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        fontFamily: 'var(--font-main, sans-serif)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s',
                        border: '1px solid #333'
                    }}
                >
                    {t('Back to Armory')}
                </Link>
            </div>

            <header className="animate-fade-in" style={{ marginBottom: '30px' }}>
                <h1 className="header-title" style={{ color: '#ff5722' }}>{t('COMMUNITY FORGE')}</h1>
                <VisitorStats />
                <div style={{ marginTop: '15px', color: '#666', fontSize: '0.75rem', lineHeight: '1.4', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#888' }}>{t('USER GENERATED CONTENT')}</p>
                </div>
            </header>

            <div className="container" style={{ textAlign: 'center' }}>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="hero-btn active"
                    style={{ marginBottom: '20px', fontSize: '1.2rem', padding: '15px 30px' }}
                >
                    {showForm ? t('Close Forge') : t('Forge New Item')}
                </button>

                {showForm && (
                    <div className="animate-fade-in" style={{
                        background: '#1a1a1a',
                        padding: '20px',
                        borderRadius: '8px',
                        maxWidth: '600px',
                        margin: '0 auto 40px auto',
                        border: '1px solid #333',
                        textAlign: 'left'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#ff5722' }}>{t('Forge Parameters')}</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>{t('Offer Title')}</label>
                                <input name="name" value={formData.name} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }} placeholder="Ex: Godly Hammer of Doom" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>{t('Weapon Name')}</label>
                                    <input name="weaponName" value={formData.weaponName} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }} placeholder="Ex: War Hammer" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>{t('Hero Class')}</label>
                                    <select name="heroClass" value={formData.heroClass} onChange={handleInputChange} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }}>
                                        <option value="Berserker">Berserker</option>
                                        <option value="Ranger">Ranger</option>
                                        <option value="Sorcerer">Sorcerer</option>
                                        <option value="Chef">Chef</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>{t('Power')}</label>
                                    <input type="number" name="power" value={formData.power} onChange={handleInputChange} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>{t('Speed')}</label>
                                    <input type="number" step="0.1" name="speed" value={formData.speed} onChange={handleInputChange} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>{t('Price')}</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleInputChange} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>{t('Rarity')}</label>
                                <select name="rarity" value={formData.rarity} onChange={handleInputChange} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }}>
                                    <option value="COMMON">Common</option>
                                    <option value="UNCOMMON">Uncommon</option>
                                    <option value="RARE">Rare</option>
                                    <option value="EPIC">Epic</option>
                                    <option value="LEGENDARY">Legendary</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>{t('Icon Name (Optional)')}</label>
                                <input name="iconName" value={formData.iconName} onChange={handleInputChange} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }} placeholder="Ex: 384 (Default)" />
                            </div>

                            <div style={{ borderTop: '1px solid #333', paddingTop: '15px' }}>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '10px' }}>{t('Custom Modifier')}</label>
                                <input name="modifierName" value={formData.modifierName} onChange={handleInputChange} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white', marginBottom: '10px' }} placeholder="Modifier Name" />
                                <input name="modifierDesc" value={formData.modifierDesc} onChange={handleInputChange} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: 'white' }} placeholder="Modifier Description" />
                            </div>

                            <button type="submit" style={{ marginTop: '10px', padding: '10px', background: '#ff5722', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                {t('FORGE ITEM')}
                            </button>

                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="section-title">{t('Loading Community Items...')}</div>
                ) : (
                    <div className="grid-layout">
                        {items.length === 0 ? (
                            <p style={{ width: '100%', gridColumn: '1 / -1', color: '#666' }}>{t('The forge is cold. Be the first to strike!')}</p>
                        ) : (
                            items.map(offer => (
                                <OfferCard key={offer.Id} offer={offer} />
                            ))
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}

export default CommunityForgePage;
