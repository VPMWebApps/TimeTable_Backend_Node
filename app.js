const exp = require('express');
const app = exp();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const test = require('./Routes/test.route');
const { connectDB, corsOptions } = require('./Config/config');
const { TryCatch } = require('./Utils/utility');
const bodyParser = require('body-parser');

const { errorMiddleware } = require('./MiddleWares/error.js');

//import router of slot
const userRoute = require("./Routes/user");
const lectureRoute = require("./Routes/lecture");
const classroomRoute = require("./Routes/classroom.js");
const yearRoute = require("./Routes/year.route");
const streamRoute = require("./Routes/stream.route.js");
const professorRoute = require("./Routes/professor.route");
const subjectRoute = require("./Routes/subject.route.js");
const divisionRoute = require("./Routes/division.route");
const calendarRoute = require("./Routes/calendar.route.js");
const shiftRoute = require("./Routes/shift.route.js");
//import router of slot
const timeSlotRoute = require('./Routes/timeSlot.route');


require('dotenv').config({
    path: './.env',
});


// const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 8000;
const envMode = process.env.NODE_ENV ? process.env.NODE_ENV.trim() : "PRODUCTION";
// connectDB(mongoURI);

app.use(exp.json());
app.use(cookieParser());
app.use(cors(corsOptions));

//routes
app.get('/', (req, res)=>{
    res.send('Node Server is working...');
})

app.use('/api/v1/test', test);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/college", lectureRoute);
app.use('/api/v1/college', timeSlotRoute); //middleware to use slot router using REST APi
app.use('/api/v1/college', yearRoute); //middleware to use year router using REST APi
app.use('/api/v1/college', streamRoute); //middleware to use stream router using REST APi
app.use('/api/v1/college', professorRoute); //middleware to use professor router using REST APi
app.use('/api/v1/college', subjectRoute); //middleware to use subject router using REST APi
app.use('/api/v1/college', classroomRoute); //middleware to use classroom router using REST APi
app.use('/api/v1/college', divisionRoute); //middleware to use division router using REST APi
app.use('/api/v1/college', calendarRoute);  //middleware to use calendar router using REST APi
app.use('/api/v1/college', shiftRoute);    //middleware to use shift router using REST APi

const start = TryCatch(async () => {
    await connectDB(process.env.MONGO_URI)
    app.listen(port,()=>{
        console.log(`Server is running on port- http://localhost:${port}/api/v1/test... in ${envMode} mode`);
    })
})

app.use(errorMiddleware);

start();

module.exports = { envMode };