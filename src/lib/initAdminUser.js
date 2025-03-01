import User from '../models/User';
import connectDB from './db';

export async function initAdminUser() {
  try {
    await connectDB();
    
    // Check if any admin user already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('No admin user found, creating default admin...');
      
      // Create default admin user
      await User.create({
        username: 'admin',
        password: 'admin123', // This will be hashed by the pre-save hook
        role: 'admin',
        status: 'active'
      });
      
      console.log('Default admin user created!');
    } else {
      console.log('Admin user already exists, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}