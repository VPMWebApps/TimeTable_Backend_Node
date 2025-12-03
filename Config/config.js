const mongoose = require('mongoose')
require('dotenv').config();

const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://time-table-app.netlify.app",
        process.env.CLIENT_URL,
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
};

const connectDB = (uri) => {
    mongoose
    .connect(uri)
    .then(() => console.log(`Connected to DB`))
    .catch((err) => {
      throw err;
    });
}

const APP_TOKEN = "time-table-app-token";


module.exports = { corsOptions, connectDB, APP_TOKEN };
