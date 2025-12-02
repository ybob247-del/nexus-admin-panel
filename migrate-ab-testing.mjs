// Migration script to create A/B testing tables in TiDB Cloud
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Parse DATABASE_URL from environment
function parseDatabaseUrl(url) {
  const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  return {
    host: match[3],
    port: parseInt(match[4]),
    user: match[1],
    password: match[2],
    database: match[5],
    ssl: { rejectUnauthorized: true }
  };
}

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connecting to TiDB Cloud database...');
    const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully\n');
    
    // Read SQL migration file
    console.log('📄 Reading migration SQL file...');
    const sql = readFileSync('./create-ab-testing-tables.sql', 'utf8');
    
    // Remove comments and split by semicolons
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      
      if (tableName) {
        console.log(`⏳ Creating table: ${tableName}...`);
        await connection.execute(statement);
        console.log(`✅ Table ${tableName} created successfully\n`);
      } else {
        console.log(`⏳ Executing statement ${i + 1}...`);
        await connection.execute(statement);
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      }
    }
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'ab_%'
    `);
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`📋 Created tables: ${tables.map(t => Object.values(t)[0]).join(', ')}\n`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();
