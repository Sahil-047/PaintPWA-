import mongoose from 'mongoose';
import config from '../../config';
import dns from 'dns';

const connectToMongoDB = async () => {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    await mongoose.connect(config.commonConfig.mongoUri!);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectToMongoDB;
