const exp = require('express');
const app = exp();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const test = require('./Routes/test.routes.js');
const { connectDB, corsOptions } = require('./Config/config.js');
const { TryCatch } = require('./Utils/utility');

const { errorMiddleware } = require('./MiddleWares/error.js');

//import router of slot
const userRoute = require("./Routes/user.routes.js");
const lectureRoute = require("./Routes/lecture.routes.js");
const roomRoute = require("./Routes/room.routes.js");
const yearRoute = require("./Routes/year.routes.js");
const streamRoute = require("./Routes/stream.routes.js");
const professorRoute = require("./Routes/professor.routes.js");
const subjectRoute = require("./Routes/subject.routes.js");
const divisionRoute = require("./Routes/division.routes.js");
const timetableScheduleRoute = require("./Routes/timetableSchedule.routes.js");
const shiftRoute = require("./Routes/shift.routes.js");
const timeSlotRoute = require('./Routes/timeSlot.routes.js');
const streamSubjectMappingRoute = require('./Routes/streamSubject.routes.js');
const ProfessorStreamMapping = require('./Routes/professorStream.routes.js');

const committeRoute = require("./Routes/committee.routes.js");
const membersRoute = require("./Routes/members.routes.js");
const committeemembersRoute = require("./Routes/committee-member.routes.js");
const maxLecturesPerDayRoutes = require('./Routes/maxLecturePerDay.routes.js');

require('dotenv').config({
    path: './.env',
});

// const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 8000;
const envMode = process.env.NODE_ENV ? process.env.NODE_ENV.trim() : "PRODUCTION";

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
app.use('/api/v1/college', roomRoute); //middleware to use classroom router using REST APi
app.use('/api/v1/college', divisionRoute); //middleware to use division router using REST APi
app.use('/api/v1/college', timetableScheduleRoute);  //middleware to use timetableSchedule router using REST APi
app.use('/api/v1/college', shiftRoute);    //middleware to use shift router using REST APi
app.use('/api/v1/college', streamSubjectMappingRoute);    //middleware to use streamSubjectMapping router using REST APi
app.use('/api/v1/college', ProfessorStreamMapping);    //middleware to use professorStreamMapping router using REST APi

app.use('/api/v1/management', committeRoute)
app.use('/api/v1/management', membersRoute)
app.use('/api/v1/management', committeemembersRoute)
app.use('/api/v1/max-lec', maxLecturesPerDayRoutes);

app.all('*', (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

const start = TryCatch(async () => {
    await connectDB(process.env.MONGO_URI)
    app.listen(port,()=>{
        console.log(`Server is running on port- http://localhost:${port}/api/v1/test... in ${envMode} mode`);
    })
})

start();

app.use(errorMiddleware);