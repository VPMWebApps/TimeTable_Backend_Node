const mongoose = require('mongoose')

const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        process.env.CLIENT_URL,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
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
