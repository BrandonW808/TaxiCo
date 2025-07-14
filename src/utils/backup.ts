import { promises as fs } from 'fs';
import mongoose from 'mongoose';
import * as gcs from './gcs.js';
import { format } from 'date-fns';
import 'dotenv/config'

const collections = [
    'Cab',
    'Customer',
    'Driver',
    'Ride'
];

const backupDir = './backups';

export const backupCollections = async () => {
    await fs.mkdir(backupDir, { recursive: true });

    const date = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const backupDirPath = `${backupDir}/${date}`;

    await Promise.all(
        collections.map(async (collectionName) => {
            const collection = mongoose.connection.collection(collectionName);
            const data = await collection.find({}).toArray();

            const filePath = `${backupDirPath}/${collectionName}.json`;
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));

            const destination = `${collectionName}-${date}.json`;
            await gcs.uploadFileToGCS(filePath, destination);
        })
    );
};

export const restoreCollections = async (date: Date) => {
    const backupDirPath = `${backupDir}/${date.toISOString()}`;

    try {
        await Promise.all(
            collections.map(async (collectionName) => {
                try {
                    const source = `${collectionName}-${date}.json`;
                    const filePath = `${backupDirPath}/${collectionName}.json`;

                    console.log(`Downloading from GCS: ${source}`);
                    await gcs.downloadFileFromGCS(source, filePath);

                    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    const collection = mongoose.connection.collection(collectionName);

                    await collection.deleteMany({});
                    await collection.insertMany(data);
                } catch (err) {
                    console.error(`Error restoring collection ${collectionName}:`, err);
                }
            })
        );
    } catch (err) {
        console.error("Error during restoration process:", err);
    }
};


const now = new Date();
console.log(`Restoring: ${now}`);
restoreCollections(now);