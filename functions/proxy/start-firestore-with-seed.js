const { spawn } = require('child_process');
const { seedFirestore } = require('./seed-local-firestore');

async function waitForEmulator(port = 8081, maxAttempts = 30) {
  const { Firestore } = require('@google-cloud/firestore');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Set emulator host for this check
      process.env.FIRESTORE_EMULATOR_HOST = `localhost:${port}`;
      const db = new Firestore();
      
      // Try to perform a simple operation (skip if not using emulator)
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        await db.collection('test').limit(1).get();
      }
      console.log('✅ Firestore emulator is ready!');
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for Firestore emulator... (attempt ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
  }
  
  throw new Error('Firestore emulator failed to start within timeout period');
}

async function startFirestoreWithSeed() {
  console.log('🚀 Starting Firestore emulator with auto-seeding...');
  
  // Start the Firebase emulator using the npm script
  const emulatorProcess = spawn('npm', [
    'run', 'dev:firestore:only'
  ], {
    stdio: 'inherit',
    cwd: '../../ui' // Run from UI directory
  });
  
  // Handle emulator process events
  emulatorProcess.on('error', (error) => {
    console.error('❌ Failed to start emulator:', error);
    process.exit(1);
  });
  
  // Wait a bit for the emulator to start, then check if it's ready
  setTimeout(async () => {
    try {
      await waitForEmulator();
      
      console.log('🌱 Seeding emulator with test data...');
      await seedFirestore();
      console.log('🎉 Firestore emulator ready with test data!');
      
    } catch (error) {
      console.error('❌ Failed to seed emulator:', error);
      emulatorProcess.kill();
      process.exit(1);
    }
  }, 3000); // Wait 3 seconds before starting to check
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Firestore emulator...');
    emulatorProcess.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    emulatorProcess.kill();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  startFirestoreWithSeed();
}

module.exports = { startFirestoreWithSeed }; 