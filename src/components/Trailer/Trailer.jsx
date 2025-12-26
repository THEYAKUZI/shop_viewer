import React, { useState, useEffect } from 'react';
import './Trailer.css';

const SCENES = [
    {
        id: 1,
        text: "WELCOME TO RAMPAGE ARMORY",
        subtext: "THE ULTIMATE SHOP TRACKER",
        duration: 3000,
        color: "#ffcc00"
    },
    {
        id: 2,
        text: "LIVE MARKET UPDATES",
        subtext: "NEVER MISS A ROTATION",
        duration: 3000,
        color: "#00ffaa"
    },
    {
        id: 3,
        text: "FILTER BY HERO",
        subtext: "FIND THE PERFECT GEAR",
        duration: 3000,
        color: "#00aaff"
    },
    {
        id: 4,
        text: "HUNT FOR LEGENDARIES",
        subtext: "TRACK GOD ROLLS",
        duration: 3000,
        color: "#bf00ff"
    },
    {
        id: 5,
        text: "ENTER THE ARMORY",
        subtext: "CLICK TO BEGIN",
        duration: 0, // Stays until click
        color: "#ffffff"
    }
];

export default function Trailer({ onComplete }) {
    const [sceneIndex, setSceneIndex] = useState(0);
    const [fade, setFade] = useState('fade-in');

    useEffect(() => {
        const currentScene = SCENES[sceneIndex];
        if (currentScene.duration === 0) return;

        const timer = setTimeout(() => {
            setFade('fade-out');
            setTimeout(() => {
                setSceneIndex(prev => prev + 1);
                setFade('fade-in');
            }, 500); // Wait for fade out
        }, currentScene.duration);

        return () => clearTimeout(timer);
    }, [sceneIndex]);

    const currentScene = SCENES[sceneIndex];

    return (
        <div className="trailer-container" onClick={sceneIndex === SCENES.length - 1 ? onComplete : null}>
            <div className="trailer-background"></div>
            <div className={`trailer-content ${fade}`}>
                <h1 className="trailer-title" style={{ color: currentScene.color }}>
                    {currentScene.text}
                </h1>
                <p className="trailer-subtext">{currentScene.subtext}</p>

                {sceneIndex === SCENES.length - 1 && (
                    <button className="enter-btn" onClick={onComplete}>ENTER SITE</button>
                )}
            </div>

            <div className="trailer-progress">
                {SCENES.map((_, idx) => (
                    <div
                        key={idx}
                        className={`progress-dot ${idx === sceneIndex ? 'active' : ''}`}
                    />
                ))}
            </div>
        </div>
    );
}
