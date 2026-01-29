import React, { useState, useEffect } from 'react';

const speciesData = [
  {
    id: 1,
    name: 'Manila Clams',
    chineseName: '菲律宾蛤仔 / 蛤蜊',
    scientificName: 'Ruditapes philippinarum',
    images: [
      { url: '/images/species/manila-clam-1.jpg', caption: 'Manila clam specimen' },
      { url: '/images/species/manila-clam-2.jpg', caption: 'Fresh Manila clams harvest (WDFW)' },
      { url: '/images/species/manila-clam-3.jpg', caption: 'Manila clam close-up (WDFW)' }
    ],
    description: 'One of the most popular clams for harvesting. Originally from Asia, now abundant in Puget Sound. Sweet, briny flavor perfect for steaming, chowders, and pasta dishes.',
    habitat: 'Sandy and muddy beaches in the middle to upper intertidal zone.',
    size: '1.5-3 inches',
    minTide: '2.0 ft or lower',
    season: 'Year-round, best Oct-Apr'
  },
  {
    id: 2,
    name: 'Native Littleneck Clams',
    chineseName: '本地小颈蛤',
    scientificName: 'Leukoma staminea',
    images: [
      { url: '/images/species/littleneck-1.jpg', caption: 'Native littleneck on rocky beach (WDFW)' },
      { url: '/images/species/littleneck-2.jpg', caption: 'Native littleneck clam specimen (WDFW)' },
      { url: '/images/species/littleneck-3.jpg', caption: 'Historical illustration' }
    ],
    description: 'Native to the Pacific Northwest. Has distinctive lattice pattern on shell. Sweeter and more tender than Manila clams. Excellent steamed or in chowder.',
    habitat: 'Gravel and rocky beaches, often mixed with Manila clams.',
    size: '1.5-3 inches',
    minTide: '1.5 ft or lower',
    season: 'Year-round'
  },
  {
    id: 3,
    name: 'Butter Clams',
    chineseName: '黄油蛤蜊 / 奶油蛤',
    scientificName: 'Saxidomus gigantea',
    images: [
      { url: '/images/species/butter-clam-1.jpg', caption: 'Butter clam close-up' },
      { url: '/images/species/butter-clam-2.jpg', caption: 'Butter clam specimen (WDFW)' }
    ],
    description: 'Large, meaty clam native to the Pacific coast. Named for buttery color when young. Can accumulate PSP toxins - always check advisories. Great for chowder.',
    habitat: 'Sandy beaches in lower intertidal zone, buried 6-12 inches deep.',
    size: '3-5 inches',
    minTide: '0.0 ft or lower',
    season: 'Year-round, check PSP levels'
  },
  {
    id: 4,
    name: 'Oysters',
    chineseName: '太平洋牡蛎 / 生蚝',
    scientificName: 'Magallana gigas',
    images: [
      { url: '/images/species/oyster-1.jpg', caption: 'Pacific oyster' },
      { url: '/images/species/oyster-2.jpg', caption: 'Pacific oysters' },
      { url: '/images/species/oyster-3.jpg', caption: 'Pacific oyster shell' }
    ],
    description: 'Pacific oysters are the most common oyster in Washington. Introduced from Japan in the 1920s. Best eaten raw, grilled, or baked. Check for minimum size (2.5 inches).',
    habitat: 'Attached to rocks, shells, and hard surfaces in intertidal zone.',
    size: '3-8 inches',
    minTide: '1.0 ft or lower',
    season: 'Year-round, best Sep-Apr'
  },
  {
    id: 5,
    name: 'Horse Clams',
    chineseName: '马蛤 / 盖蛤',
    scientificName: 'Tresus capax / T. nuttallii',
    images: [
      { url: '/images/species/horse-clam-1.jpg', caption: 'Horse clam on beach (WDFW)' },
      { url: '/images/species/horse-clam-2.jpg', caption: 'Horse clam specimen (WDFW)' },
      { url: '/images/species/horse-clam-3.jpg', caption: 'Horse clam siphons exposed' }
    ],
    description: 'Large gaper clams similar to geoduck but easier to dig. Shell cannot fully close. Siphon is edible after removing tough skin. Good for chowder and fritters.',
    habitat: 'Sandy-mud beaches in lower intertidal, buried 12-16 inches.',
    size: '4-8 inches shell, siphon extends further',
    minTide: '0.0 ft or lower',
    season: 'Year-round'
  },
  {
    id: 6,
    name: 'Geoduck',
    chineseName: '象拔蚌 / 女神蛤',
    scientificName: 'Panopea generosa',
    images: [
      { url: '/images/species/geoduck-1.jpg', caption: 'Freshly harvested geoduck' },
      { url: '/images/species/geoduck-2.jpg', caption: 'Geoduck siphons in sand (WDFW)' },
      { url: '/images/species/geoduck-3.jpg', caption: '6.53-pound geoduck specimen (WDFW)' }
    ],
    description: 'World\'s largest burrowing clam, can live 140+ years! Prized in Asian cuisine for its crunchy texture. Requires very low tides and significant digging effort.',
    habitat: 'Sandy beaches, buried 2-3 feet deep. Look for siphon "show".',
    size: '6-8 inch shell, siphon up to 3 feet',
    minTide: '-2.0 ft or lower',
    season: 'Year-round, needs extreme low tides'
  },
  {
    id: 7,
    name: 'Cockles',
    chineseName: '鸟蛤 / 心形蛤',
    scientificName: 'Clinocardium nuttallii',
    images: [
      { url: '/images/species/cockle-1.jpg', caption: 'Cockles in sand (WDFW)' },
      { url: '/images/species/cockle-2.jpg', caption: 'Nuttall\'s cockle specimen (WDFW)' },
      { url: '/images/species/cockle-3.jpg', caption: 'Heart-shaped cockle shell' }
    ],
    description: 'Heart-shaped clams with distinctive ribbed shells. Sweet, tender meat. Can "jump" using their foot. Great steamed or in pasta. Easy to harvest.',
    habitat: 'Sandy beaches, buried just 1-2 inches deep.',
    size: '2-4 inches',
    minTide: '1.5 ft or lower',
    season: 'Year-round'
  },
  {
    id: 8,
    name: 'Varnish Clams',
    chineseName: '紫彩血蛤',
    scientificName: 'Nuttallia obscurata',
    images: [
      { url: '/images/species/varnish-clam-1.jpg', caption: 'Varnish clam exterior' },
      { url: '/images/species/varnish-clam-2.jpg', caption: 'Varnish clam interior (purple)' }
    ],
    description: 'Invasive species from Asia, now abundant in Puget Sound. Shiny, varnished appearance. Quick to cook - just 2-3 minutes. Good in stir-fry and soups.',
    habitat: 'Upper intertidal zone in sand and gravel, easy to access.',
    size: '1.5-2.5 inches',
    minTide: '3.0 ft or lower',
    season: 'Year-round'
  },
  {
    id: 9,
    name: 'Eastern Softshell Clams',
    chineseName: '软壳蛤',
    scientificName: 'Mya arenaria',
    images: [
      { url: '/images/species/softshell-1.jpg', caption: 'Softshell clam specimen' },
      { url: '/images/species/softshell-2.jpg', caption: 'Softshell clam shell' }
    ],
    description: 'Also called "steamers". Thin, fragile shells. Very tender meat. Classic New England steamer clam, now found in some Puget Sound beaches.',
    habitat: 'Muddy and sandy flats, buried 4-8 inches deep.',
    size: '2-4 inches',
    minTide: '2.0 ft or lower',
    season: 'Year-round'
  },
  {
    id: 10,
    name: 'Mussels',
    chineseName: '贻贝 / 青口',
    scientificName: 'Mytilus trossulus',
    images: [
      { url: '/images/species/mussel-1.jpg', caption: 'Blue mussels' },
      { url: '/images/species/mussel-2.jpg', caption: 'Mussels on beach' },
      { url: '/images/species/mussel-3.jpg', caption: 'Live blue mussel' }
    ],
    description: 'Blue mussels attach to rocks and pilings. Easy to harvest - just pull off surfaces. Steam with wine, garlic, and herbs. Check for red tide closures.',
    habitat: 'Attached to rocks, docks, and hard surfaces in upper intertidal.',
    size: '2-4 inches',
    minTide: '3.0 ft or lower',
    season: 'Year-round, best Oct-Mar'
  },
  {
    id: 11,
    name: 'Olympia Oysters',
    chineseName: '奥林匹亚牡蛎',
    scientificName: 'Ostrea lurida',
    images: [
      { url: '/images/species/olympia-oyster-1.jpg', caption: 'Olympia oyster' },
      { url: '/images/species/olympia-oyster-2.jpg', caption: 'Olympia oysters in habitat (WDFW)' },
      { url: '/images/species/olympia-oyster-3.jpg', caption: 'Native oyster bed (WDFW)' }
    ],
    description: 'Washington\'s only native oyster, once nearly extinct. Small but intensely flavored - coppery, metallic finish. Protected in many areas - check regulations.',
    habitat: 'Attached to rocks and shells in lower intertidal zone.',
    size: '1-2 inches',
    minTide: '0.0 ft or lower',
    season: 'Limited - check regulations'
  }
];

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '220px',
    overflow: 'hidden',
    backgroundColor: '#e2e8f0'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  cardBody: {
    padding: '16px'
  },
  speciesName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '4px'
  },
  chineseName: {
    fontSize: '16px',
    color: '#805ad5',
    marginBottom: '4px'
  },
  scientificName: {
    fontSize: '13px',
    color: '#718096',
    fontStyle: 'italic',
    marginBottom: '12px'
  },
  description: {
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.5',
    marginBottom: '12px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  infoItem: {
    fontSize: '12px'
  },
  infoLabel: {
    color: '#718096',
    display: 'block'
  },
  infoValue: {
    color: '#2d3748',
    fontWeight: '500'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalImage: {
    width: '100%',
    height: '300px',
    objectFit: 'contain',
    backgroundColor: '#1a202c'
  },
  modalBody: {
    padding: '24px'
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailSection: {
    marginBottom: '16px'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px'
  },
  detailValue: {
    fontSize: '14px',
    color: '#2d3748'
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  thumbnailStrip: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  thumbnail: {
    width: '60px',
    height: '45px',
    objectFit: 'cover',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '2px solid transparent',
    opacity: 0.6,
    transition: 'all 0.2s'
  },
  thumbnailActive: {
    border: '2px solid #4299e1',
    opacity: 1
  },
  imageCaption: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#718096',
    padding: '8px',
    backgroundColor: '#f7fafc'
  },
  imageCounter: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px'
  }
};

function SpeciesCard({ species, onClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const mainImage = species.images?.[0]?.url || species.image;

  return (
    <div
      style={{ ...styles.card, ...(isHovered ? styles.cardHover : {}) }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(species)}
    >
      <div style={styles.imageContainer}>
        <img
          src={mainImage}
          alt={species.name}
          style={styles.image}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/320x220?text=' + encodeURIComponent(species.name);
          }}
        />
        {species.images?.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            +{species.images.length - 1} photos
          </div>
        )}
      </div>
      <div style={styles.cardBody}>
        <div style={styles.speciesName}>{species.name}</div>
        <div style={styles.chineseName}>{species.chineseName}</div>
        <div style={styles.scientificName}>{species.scientificName}</div>
        <div style={styles.description}>{species.description}</div>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Size</span>
            <span style={styles.infoValue}>{species.size}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Min Tide</span>
            <span style={styles.infoValue}>{species.minTide}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeciesModal({ species, onClose }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Reset to first image when species changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [species?.id]);

  if (!species) return null;

  const images = species.images || [{ url: species.image, caption: species.name }];
  const currentImage = images[currentImageIndex];

  const goToPrev = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: 'relative' }}>
          <img
            src={currentImage.url}
            alt={species.name}
            style={styles.modalImage}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x300?text=' + encodeURIComponent(species.name);
            }}
          />
          <button style={styles.closeButton} onClick={onClose}>x</button>

          {images.length > 1 && (
            <>
              <button
                style={{ ...styles.imageNavButton, left: '12px' }}
                onClick={goToPrev}
              >
                ‹
              </button>
              <button
                style={{ ...styles.imageNavButton, right: '12px' }}
                onClick={goToNext}
              >
                ›
              </button>
              <div style={styles.imageCounter}>
                {currentImageIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {currentImage.caption && (
          <div style={styles.imageCaption}>{currentImage.caption}</div>
        )}

        {images.length > 1 && (
          <div style={styles.thumbnailStrip}>
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img.url}
                alt={`${species.name} ${idx + 1}`}
                style={{
                  ...styles.thumbnail,
                  ...(idx === currentImageIndex ? styles.thumbnailActive : {})
                }}
                onClick={() => setCurrentImageIndex(idx)}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/60x45?text=' + (idx + 1);
                }}
              />
            ))}
          </div>
        )}

        <div style={styles.modalBody}>
          <div style={styles.speciesName}>{species.name}</div>
          <div style={styles.chineseName}>{species.chineseName}</div>
          <div style={styles.scientificName}>{species.scientificName}</div>

          <div style={{ marginTop: '20px' }}>
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>Description</div>
              <div style={styles.detailValue}>{species.description}</div>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>Habitat</div>
              <div style={styles.detailValue}>{species.habitat}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={styles.detailSection}>
                <div style={styles.detailLabel}>Size</div>
                <div style={styles.detailValue}>{species.size}</div>
              </div>
              <div style={styles.detailSection}>
                <div style={styles.detailLabel}>Min Tide</div>
                <div style={styles.detailValue}>{species.minTide}</div>
              </div>
              <div style={styles.detailSection}>
                <div style={styles.detailLabel}>Season</div>
                <div style={styles.detailValue}>{species.season}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SpeciesGuide() {
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Species Guide</h1>
        <p style={styles.subtitle}>
          Learn about the shellfish species you can harvest in Washington State
        </p>
      </div>

      <div style={styles.grid}>
        {speciesData.map((species) => (
          <SpeciesCard
            key={species.id}
            species={species}
            onClick={setSelectedSpecies}
          />
        ))}
      </div>

      <SpeciesModal
        species={selectedSpecies}
        onClose={() => setSelectedSpecies(null)}
      />
    </div>
  );
}
