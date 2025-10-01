const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            console.warn('⚠️  MongoDB URI not configured. Running without database.');
            return null;
        }

        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        return null;
    }
};

module.exports = connectDB;
