// src/index.ts
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import customerRoutes from './routes/customerRoutes';
import backupRoutes from './routes/backupRoutes';
import { backupScheduler } from './utils/backupScheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/backup', backupRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        scheduler: backupScheduler.isRunning() ? 'Running' : 'Stopped'
    });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI!)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        
        // Start backup scheduler if enabled
        if (process.env.BACKUP_SCHEDULER_ENABLED === 'true') {
            backupScheduler.start();
        }
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📦 Backup scheduler: ${backupScheduler.isRunning() ? 'Running' : 'Stopped'}`);
        });
    })
    .catch(error => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    
    // Stop backup scheduler
    backupScheduler.stop();
    
    // Close database connection
    await mongoose.connection.close();
    
    console.log('👋 Server shut down');
    process.exit(0);
});
