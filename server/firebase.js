const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db = null;

const initializeFirebase = () => {
    try {
        let serviceAccount = null;

        // Method 1: Read from serviceAccountKey.json file (recommended for local dev)
        const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            serviceAccount = require(serviceAccountPath);
            console.log('📄 Using serviceAccountKey.json file');
        }
        // Method 2: From environment variable (JSON string)
        else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log('📝 Using FIREBASE_SERVICE_ACCOUNT env var');
        }
        // Method 3: For Vercel deployment with base64 encoded service account
        else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
            serviceAccount = JSON.parse(
                Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
            );
            console.log('🔐 Using FIREBASE_SERVICE_ACCOUNT_BASE64 env var');
        }
        // No Firebase config
        else {
            console.warn('⚠️  Firebase not configured. Add serviceAccountKey.json file or set env vars');
            return null;
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        db = admin.firestore();
        console.log('✅ Firebase Firestore connected successfully');
        return db;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
        return null;
    }
};

const getFirestore = () => {
    if (!db) {
        initializeFirebase();
    }
    return db;
};

module.exports = { initializeFirebase, getFirestore };
