const { Firestore } = require('@google-cloud/firestore');

// Real players data from production
const testPlayers = [
  {
    profile_id: 2035391,
    name: 'Tornasol',
    name_no_special: 'tornasol',
    total_matches: 2,
    country: 'es',
    last_match_date: 1587325991,
    clan: 'BNRE'
  },
  {
    profile_id: 4764337,
    name: '<NT>.tornasol',
    name_no_special: 'nttornasol',
    total_matches: 2621,
    country: 'se',
    last_match_date: 1749939546,
    clan: 'zNTz'
  },
  {
    profile_id: 5709233,
    name: '<NT>.peyales',
    name_no_special: 'ntpeyales',
    total_matches: 1861,
    country: 'co',
    last_match_date: 1749939546,
    clan: 'zNTz'
  },
  {
    profile_id: 742535,
    name: '<NT>.Uncle Baby',
    name_no_special: 'ntunclebaby',
    total_matches: 2448,
    country: 'mx',
    last_match_date: 1751158642,
    clan: 'zNTz'
  },
  // Additional test players for various searches
  {
    profile_id: 234567,
    name: 'DauT',
    name_no_special: 'daut',
    total_matches: 2500,
    country: 'rs',
    last_match_date: 1640995200
  },
  {
    profile_id: 345678,
    name: 'TheViper',
    name_no_special: 'theviper',
    total_matches: 3000,
    country: 'no',
    last_match_date: 1640995200
  },
  {
    profile_id: 678901,
    name: 'ds_biry',
    name_no_special: 'ds_biry',
    total_matches: 900,
    country: 'fr',
    last_match_date: 1640995200
  },
  {
    profile_id: 789012,
    name: 'sh',
    name_no_special: 'sh',
    total_matches: 50,
    country: 'kr',
    last_match_date: 1640995200
  }
];

async function seedFirestore() {
  console.log('🌱 Seeding local Firestore emulator...');
  
  // Initialize Firestore client (will use emulator if FIRESTORE_EMULATOR_HOST is set)
  const db = new Firestore();
  
  try {
    // Add each test player
    const batch = db.batch();
    
    testPlayers.forEach(player => {
      const docRef = db.collection('players').doc(player.profile_id.toString());
      batch.set(docRef, player);
    });
    
    await batch.commit();
    
    console.log(`✅ Successfully seeded ${testPlayers.length} test players to Firestore emulator`);
    console.log('Test players available:');
    testPlayers.forEach(player => {
      console.log(`  - ${player.name} (${player.profile_id}) - ${player.total_matches} matches - ${player.country}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedFirestore();
}

module.exports = { seedFirestore }; 