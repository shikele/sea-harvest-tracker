import React, { useState, useEffect } from 'react';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const speciesData = [
  {
    id: 1,
    name: 'Manila Clams',
    chineseName: '菲律宾蛤仔 / 蛤蜊',
    scientificName: 'Ruditapes philippinarum',
    images: [
      { url: '/images/species/manila-clam-1.jpg', caption: 'Manila clam specimen' },
      { url: '/images/species/manila-clam-2.jpg', caption: 'Fresh Manila clams harvest (WDFW)' },
      { url: '/images/species/manila-clam-3.jpg', caption: 'Manila clam close-up (WDFW)' },
      { url: '/images/species/manila-clam-4.jpg', caption: 'Manila clam shell pattern' }
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
      { url: '/images/species/littleneck-2.jpg', caption: 'Native littleneck clam specimen (WDFW)' }
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
      { url: '/images/species/butter-clam-2.jpg', caption: 'Butter clam specimen (WDFW)' },
      { url: '/images/species/butter-clam-3.jpg', caption: 'Butter clam shell detail' },
      { url: '/images/species/butter-clam-4.jpg', caption: 'Butter clam exterior' }
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
      { url: '/images/species/oyster-3.jpg', caption: 'Pacific oyster shell' },
      { url: '/images/species/oyster-4.jpg', caption: 'Pacific oyster on cutting board' },
      { url: '/images/species/oyster-5.jpg', caption: 'Pacific oyster upper valve' }
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
      { url: '/images/species/cockle-3.jpg', caption: 'Heart-shaped cockle shell' },
      { url: '/images/species/cockle-4.jpg', caption: 'Nuttall\'s cockle left valve' },
      { url: '/images/species/cockle-5.jpg', caption: 'Nuttall\'s cockle right valve' }
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
      { url: '/images/species/softshell-2.jpg', caption: 'Softshell clam shell' },
      { url: '/images/species/softshell-4.jpg', caption: 'Softshell clam valve' }
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
      { url: '/images/species/olympia-oyster-3.jpg', caption: 'Native oyster bed (WDFW)' },
      { url: '/images/species/olympia-oyster-4.jpg', caption: 'Olympia oyster with shucking knife' },
      { url: '/images/species/olympia-oyster-5.jpg', caption: 'Ostrea lurida specimen' }
    ],
    description: 'Washington\'s only native oyster, once nearly extinct. Small but intensely flavored - coppery, metallic finish. Protected in many areas - check regulations.',
    habitat: 'Attached to rocks and shells in lower intertidal zone.',
    size: '1-2 inches',
    minTide: '0.0 ft or lower',
    season: 'Limited - check regulations'
  },
  {
    id: 12,
    name: 'Razor Clams',
    chineseName: '蛏子 / 竹蛏',
    scientificName: 'Siliqua patula',
    images: [
      { url: '/images/species/razor-clam-1.jpg', caption: 'Fresh razor clams in container (WDFW)' },
      { url: '/images/species/razor-clam-2.jpg', caption: 'Razor clam limit with shovel (WDFW)' },
      { url: '/images/species/razor-clam-3.jpg', caption: 'Pacific Beach harvest location' }
    ],
    description: 'One of the most sought-after shellfish in Washington. Found on ocean beaches from California to Alaska. Look for keyhole-shaped depressions in sand. Daily limit is 15 clams - keep the first 15 you dig regardless of size.',
    habitat: 'Sandy ocean beaches in the intertidal zone, from +3 ft to -2 ft tide level. Found at Long Beach, Twin Harbors, Copalis, and Mocrocks.',
    size: '3-6 inches (up to 7 inches rare)',
    minTide: '2.0 ft or lower',
    season: 'Oct-Apr, specific dig dates announced by WDFW'
  },
  {
    id: 13,
    name: 'Dungeness Crab',
    chineseName: '珍宝蟹 / 黄金蟹',
    scientificName: 'Metacarcinus magister',
    images: [
      { url: '/images/species/dungeness-crab-1.jpg', caption: 'Dungeness crab (WDFW)' },
      { url: '/images/species/dungeness-crab-2.jpg', caption: 'Measuring crab carapace (WDFW)' },
      { url: '/images/species/dungeness-crab-3.jpg', caption: 'Crabs in crab pot, Puget Sound (WDFW)' },
      { url: '/images/species/dungeness-crab-4.jpg', caption: 'Live Dungeness crab close-up' }
    ],
    description: 'Washington\'s most valuable commercial fishery. Sweet, delicate meat prized worldwide. Males only, must be in hardshell condition. Look for white-tipped claws to identify. Over 1.5 million pounds caught recreationally each year.',
    habitat: 'Eelgrass beds and sandy/muddy bottoms. Found in Puget Sound and coastal waters.',
    size: '6-7 inches carapace width',
    minTide: 'N/A - use pots, ring nets, or dive',
    season: 'Varies by area - check WDFW regulations'
  },
  {
    id: 14,
    name: 'Seaweed',
    chineseName: '海藻 / 海带',
    scientificName: 'Nereocystis luetkeana (Bull Kelp), Ulva sp. (Sea Lettuce)',
    images: [
      { url: '/images/species/seaweed-1.jpg', caption: 'Bull kelp at Columbia River estuary' }
    ],
    description: 'Edible seaweeds include bull kelp (blades can be pickled or used in salsa) and sea lettuce (great in soups, salads, dried as crisps). No poisonous seaweeds in Pacific Northwest! Must cut seaweed, never pull from rocks.',
    habitat: 'Bull kelp in subtidal to 30+ ft depth. Sea lettuce in upper intertidal on rocks. Harvest only in clean water areas.',
    size: 'Bull kelp up to 100 ft, Sea lettuce up to 18 inches',
    minTide: '3.0 ft or lower for sea lettuce',
    season: 'Fort Flagler, Fort Ebey, Fort Worden: Apr 16-May 15 only. Limit 10 lbs/day.'
  }
];


function SpeciesCard({ species, onClick }) {
  const mainImage = species.images?.[0]?.url || species.image;

  return (
    <Card
      className="species-card"
      onClick={() => onClick(species)}
      sx={{
        cursor: 'pointer',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden', bgcolor: '#e2e8f0' }}>
        <CardMedia
          component="img"
          height="220"
          image={mainImage}
          alt={species.name}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/320x220?text=' + encodeURIComponent(species.name);
          }}
        />
        {species.images?.length > 1 && (
          <Box sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', px: 1, borderRadius: '10px', fontSize: 11 }}>
            +{species.images.length - 1} photos
          </Box>
        )}
      </Box>
      <CardContent className="species-card-body">
        <Typography sx={{ fontSize: 18, fontWeight: 600, color: '#1a202c', mb: 0.5 }} className="species-name">{species.name}</Typography>
        <Typography sx={{ fontSize: 16, color: '#805ad5', mb: 0.5 }} className="chinese-name">{species.chineseName}</Typography>
        <Typography sx={{ fontSize: 13, color: '#718096', fontStyle: 'italic', mb: 1.5 }} className="scientific-name">{species.scientificName}</Typography>
        <Typography sx={{ fontSize: 14, color: '#4a5568', lineHeight: 1.5, mb: 1.5 }} className="species-description">{species.description}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Box sx={{ fontSize: 12 }}>
            <Typography component="span" sx={{ color: '#718096', display: 'block' }}>Size</Typography>
            <Typography component="span" sx={{ color: '#2d3748', fontWeight: 500 }}>{species.size}</Typography>
          </Box>
          <Box sx={{ fontSize: 12 }}>
            <Typography component="span" sx={{ color: '#718096', display: 'block' }}>Min Tide</Typography>
            <Typography component="span" sx={{ color: '#2d3748', fontWeight: 500 }}>{species.minTide}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
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
    <Dialog open={!!species} onClose={onClose} maxWidth="sm" fullWidth className="species-modal-content">
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={currentImage.url}
            alt={species.name}
            sx={{ width: '100%', height: 280, objectFit: 'contain', bgcolor: '#1a202c' }}
            className="modal-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x300?text=' + encodeURIComponent(species.name);
            }}
          />
          <IconButton className="close-button" onClick={onClose} sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
            <CloseIcon />
          </IconButton>

          {images.length > 1 && (
            <>
              <IconButton
                className="image-nav-button"
                onClick={goToPrev}
                sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 10 }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                className="image-nav-button"
                onClick={goToNext}
                sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 10 }}
              >
                <ChevronRightIcon />
              </IconButton>
              <Box sx={{ position: 'absolute', bottom: 1.5, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,0.6)', color: 'white', px: 1.5, py: 0.5, borderRadius: '12px', fontSize: 12 }}>
                {currentImageIndex + 1} / {images.length}
              </Box>
            </>
          )}
        </Box>

        {currentImage.caption && (
          <Typography sx={{ textAlign: 'center', fontSize: 12, color: '#718096', p: 1, bgcolor: '#f7fafc' }}>{currentImage.caption}</Typography>
        )}

        {images.length > 1 && (
          <Box sx={{ display: 'flex', gap: 1, p: 1.5, bgcolor: '#f7fafc', justifyContent: 'center', flexWrap: 'wrap' }} className="thumbnail-strip">
            {images.map((img, idx) => (
              <Box
                component="img"
                key={idx}
                src={img.url}
                alt={`${species.name} ${idx + 1}`}
                sx={{
                  width: 60,
                  height: 45,
                  objectFit: 'cover',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: idx === currentImageIndex ? '2px solid #4299e1' : '2px solid transparent',
                  opacity: idx === currentImageIndex ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}
                className="thumbnail"
                onClick={() => setCurrentImageIndex(idx)}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/60x45?text=' + (idx + 1);
                }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ p: 3 }} className="modal-body">
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: '#1a202c', mb: 0.5 }} className="species-name">{species.name}</Typography>
          <Typography sx={{ fontSize: 16, color: '#805ad5', mb: 0.5 }} className="chinese-name">{species.chineseName}</Typography>
          <Typography sx={{ fontSize: 13, color: '#718096', fontStyle: 'italic', mb: 1.5 }} className="scientific-name">{species.scientificName}</Typography>

          <Box sx={{ mt: 2.5 }}>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>Description</Typography>
              <Typography sx={{ fontSize: 14, color: '#2d3748' }}>{species.description}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>Habitat</Typography>
              <Typography sx={{ fontSize: 14, color: '#2d3748' }}>{species.habitat}</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }} className="detail-grid">
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>Size</Typography>
                <Typography sx={{ fontSize: 14, color: '#2d3748' }}>{species.size}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>Min Tide</Typography>
                <Typography sx={{ fontSize: 14, color: '#2d3748' }}>{species.minTide}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>Season</Typography>
                <Typography sx={{ fontSize: 14, color: '#2d3748' }}>{species.season}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default function SpeciesGuide() {
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  return (
    <Box sx={{ maxWidth: '1200px', margin: '0 auto', p: 2.5 }} className="species-guide-container">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h1" sx={{ fontSize: 28, fontWeight: 700, color: '#1a202c', mb: 1 }} className="species-guide-title">Species Guide</Typography>
        <Typography sx={{ fontSize: 14, color: '#718096' }}>
          Learn about the shellfish species you can harvest in Washington State
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 2.5 }} className="species-grid">
        {speciesData.map((species) => (
          <SpeciesCard
            key={species.id}
            species={species}
            onClick={setSelectedSpecies}
          />
        ))}
      </Box>

      <SpeciesModal
        species={selectedSpecies}
        onClose={() => setSelectedSpecies(null)}
      />
    </Box>
  );
}
