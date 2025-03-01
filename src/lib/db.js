import mongoose from 'mongoose';

let connection = {};

async function connectDB() {
  if (connection.isConnected) {
    console.log('Using existing connection');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI);
    connection.isConnected = db.connections[0].readyState;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  }
}

export default connectDB;