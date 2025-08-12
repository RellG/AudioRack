require('dotenv').config();
const { addEnterpriseColumns } = require('./server/migrations/addEnterpriseColumns');
const { connectDB } = require('./server/database');

async function runMigrations() {
  try {
    console.log('🚀 Connecting to database...');
    await connectDB();
    
    console.log('🔄 Running migrations...');
    await addEnterpriseColumns();
    
    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();