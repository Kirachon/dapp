const { Client } = require('pg');

async function testDatabaseConnection() {
  console.log('🔍 Testing PostgreSQL Database Connection...\n');

  // Test configurations to try
  const configs = [
    {
      name: 'Current Backend Config (localhost)',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'dating',
        user: 'app',
        password: 'app'
      }
    },
    {
      name: 'Docker Internal Config (postgres)',
      config: {
        host: 'postgres',
        port: 5432,
        database: 'dating',
        user: 'app',
        password: 'app'
      }
    },
    {
      name: 'Docker Container Name Config',
      config: {
        host: 'loveconnect-postgres',
        port: 5432,
        database: 'dating',
        user: 'app',
        password: 'app'
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`🔄 Testing: ${name}`);
    console.log(`   Connection: postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`);
    
    const client = new Client(config);
    
    try {
      await client.connect();
      console.log('✅ Connection successful!');
      
      // Test basic query
      const result = await client.query('SELECT version()');
      console.log('✅ Query successful:', result.rows[0].version.substring(0, 50) + '...');
      
      // Test user permissions
      const userResult = await client.query('SELECT current_user, current_database()');
      console.log('✅ Current user:', userResult.rows[0].current_user);
      console.log('✅ Current database:', userResult.rows[0].current_database);
      
      // Test table access
      try {
        const tableResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          LIMIT 5
        `);
        console.log('✅ Tables accessible:', tableResult.rows.map(r => r.table_name).join(', '));
      } catch (tableError) {
        console.log('⚠️ Table access error:', tableError.message);
      }
      
      await client.end();
      console.log('✅ Connection closed successfully\n');
      
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.detail || 'No additional details');
      console.log('');
      
      try {
        await client.end();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }
}

testDatabaseConnection().catch(console.error);
