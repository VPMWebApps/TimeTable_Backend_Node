# TimeTable_Backend_Node
Backend server for timetable app 

Node.js installation steps for Windows:




VSCode installation Steps + Plugins:

Plugins:- 
latest version of 'nodeJs'

Setup:-
step1: clone the project using command {git clone https://github.com/VPMWebApps/TimeTable_Backend_Node.git}

step2: delete the file named 'package-lock.json'

step3: open project terminal (vs code terminal (ctrl + j)). Navigate to the root directory of the project "../TIMETABLE_BACKEND_NODE/" and write command 'npm i' in order to download all the required dependencies for node backend.

step4: add '.env' file and add mongoDB connection URI & secret key.
        JWT_SECRET =        // Add anything as a secret key eg. sjvfiivjfbnaklafbljbfoub5
        468@
        PORT = 8000
        MONGO_URI = mongodb+srv://<username>:<password>@cluster0.u2jyn7y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0 //add your <username> and <password>
        NODE_ENV = DEVELOPMENT
        CLIENT_URL = "Your frontend server URL"


step5: setup is ready to launch just command 'npm start' to run the backend server



