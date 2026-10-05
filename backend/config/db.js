const { MongoClient, ServerApiVersion } = require("mongodb");
const { setupIndexes } = require("../utils/setupIndexes");
const { warmUpCache } = require("../utils/cache");


const dbUser = encodeURIComponent(process.env.DB_USER || "");
const dbPass = encodeURIComponent(process.env.DB_PASS || "");

const uri = process.env.MONGODB_URI || `mongodb://${dbUser}:${dbPass}@cluster0-shard-00-00.bb41v.mongodb.net:27017,cluster0-shard-00-01.bb41v.mongodb.net:27017,cluster0-shard-00-02.bb41v.mongodb.net:27017/?authSource=admin&replicaSet=atlas-imfz1t-shard-0&tls=true`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    },
});

let db;
let isInitialized = false;

async function connectDB() {
    if (db) return db;
    await client.connect();
    db = client.db(process.env.DB_NAME || "StylishTrendMultiShop");

    console.log("MongoDB Connected");

    if (!isInitialized) {
        isInitialized = true;
        setupIndexes(db).catch(err => console.error("Setup indexes error:", err));
        warmUpCache(db).catch(err => console.error("Startup warmup error:", err));
    }

    return db;
}

function getDB() {
    return db;
}

module.exports = { connectDB, getDB };
