const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAdminRole() {
  try {
    console.log('🔧 Updating admin user role...');
    
    const adminEmail = 'admin@loveconnect.com';
    
    // Update the user to have admin role
    const updatedUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { 
        roles: ['admin', 'user'] // Add both admin and user roles
      }
    });
    
    console.log('✅ Admin role updated successfully!');
    console.log(`   User ID: ${updatedUser.id}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Roles: ${updatedUser.roles.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error updating admin role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateAdminRole()
  .then(() => {
    console.log('🎉 Admin role update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
