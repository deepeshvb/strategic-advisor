import React, { useState, useEffect } from 'react';

/**
 * Full-bleed background image per agent tab. Overlay opacity per tab so images stay visible.
 * Beer Mule uses local Pliny the Younger image with fallback if it fails to load.
 */
const BEER_MULE_PRIMARY = '/images/pliny-the-younger.jpg';
const BEER_MULE_FALLBACK = 'https://images.unsplash.com/photo-1579065436839-f2bb127c5606?w=1920';

const AGENT_BG: Record<string, { image: string; alt: string; overlay: string }> = {
  'beer-mule': {
    image: BEER_MULE_PRIMARY,
    alt: 'Pliny the Younger',
    overlay: 'bg-gray-950/35',
  },
  'travel-agent': {
    image: 'https://images.unsplash.com/photo-1700811476977-256055428221?w=1920',
    alt: 'Emirates A380 business lounge / bar area',
    overlay: 'bg-gray-950/50',
  },
  'strategic-advisor': {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920',
    alt: 'Monitoring and briefings',
    overlay: 'bg-gray-950/55',
  },
  kandidly: {
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1920',
    alt: 'Hiring and recruitment',
    overlay: 'bg-gray-950/70',
  },
  'stark-navigator': {
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920',
    alt: 'Investments and markets',
    overlay: 'bg-gray-950/70',
  },
};

interface AgentTabBackgroundProps {
  activeTab: string;
}

export function AgentTabBackground({ activeTab }: AgentTabBackgroundProps) {
  const bg = AGENT_BG[activeTab];
  const [beerMuleImage, setBeerMuleImage] = useState(BEER_MULE_PRIMARY);

  useEffect(() => {
    if (activeTab !== 'beer-mule') return;
    setBeerMuleImage(BEER_MULE_PRIMARY);
    const img = new Image();
    img.onerror = () => setBeerMuleImage(BEER_MULE_FALLBACK);
    img.src = BEER_MULE_PRIMARY;
  }, [activeTab]);

  if (!bg) return null;

  const imageUrl = activeTab === 'beer-mule' ? beerMuleImage : bg.image;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className={`absolute inset-0 ${bg.overlay}`} />
    </div>
  );
}

export default AgentTabBackground;
