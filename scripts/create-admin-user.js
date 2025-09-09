const supertokens = require("supertokens-node");
const EmailPassword = require("supertokens-node/recipe/emailpassword");
const Session = require("supertokens-node/recipe/session");

// Initialize SuperTokens
supertokens.init({
  framework: "fastify",
  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567",
  },
  appInfo: {
    appName: "LoveConnect",
    apiDomain: process.env.API_DOMAIN || "http://localhost:8080",
    websiteDomain: process.env.WEB_DOMAIN || "http://localhost:3000",
    apiBasePath: "/auth",
    websiteBasePath: "/auth"
  },
  recipeList: [
    EmailPassword.init(),
    Session.init()
  ]
});

async function createAdminUser() {
  try {
    console.log('🔑 Creating admin user in SuperTokens...');
    
    const adminEmail = 'admin@loveconnect.com';
    const adminPassword = 'admin123';
    
    // Create the admin user
    const response = await EmailPassword.signUp("public", adminEmail, adminPassword);
    
    if (response.status === "OK") {
      console.log('✅ Admin user created successfully!');
      console.log(`   User ID: ${response.user.id}`);
      console.log(`   Email: ${response.user.emails[0]}`);
      console.log(`   Login: ${adminEmail} / ${adminPassword}`);
    } else if (response.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      console.log('⚠️  Admin user already exists');
      
      // Get the existing user
      const existingUser = await EmailPassword.getUserByEmail("public", adminEmail);
      if (existingUser) {
        console.log(`   User ID: ${existingUser.id}`);
        console.log(`   Email: ${existingUser.emails[0]}`);
        console.log(`   Login: ${adminEmail} / ${adminPassword}`);
      }
    } else {
      console.error('❌ Failed to create admin user:', response);
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('🎉 Admin user setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
