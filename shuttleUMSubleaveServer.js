const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

//Only configure this if running locally
if (process.env.NODE_ENV !== 'production') {
    require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') });
}

const user = process.env.MONGO_DB_USERNAME;
const pass = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const shiftsCollection = process.env.MONGO_COLLECTION_SHIFTS;
const driversCollection = process.env.MONGO_COLLECTION_DRIVERS;
const uri = `mongodb+srv://${user}:${pass}@cluster0.udh2fxs.mongodb.net/${db}?retryWrites=true&w=majority&appName=Cluster0`;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });

const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_PASSWORD
    }
});

if (process.argv.length != 3) {
    console.log("Usage supermarketServer.js port_number");
    process.exit(0)
}
const portNumber = process.argv[2];
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));

app.get("/", (req,res) => {
    res.render("index");
});

app.get("/subsheetShifts", async (req,res) => {
    try {
        await client.connect();
        let cursor = await client.db(db).collection(shiftsCollection).find();
        let result = await cursor.toArray();
        let toReturn = `<table border = "1"><tr><th colspan = "2">Date</th><th colspan = "2">Shift Name</th><th>Start and End Time</th><th>Start Location</th><th>End Location</th><th>Total Hours</th><th>Shift ID</th></tr>`
        
        for(ele of result){
            if(ele["Driver"] == null){
                const [m, d, y] = ele["Date"].trim().split("/");
                const date = new Date(y, m-1, d);
                const [startHours, startMinutes] = ele["Time_Start"].split(':').map((listEle)=>Number(listEle));
                const [endHours, endMinutes] = ele["Time_End"].split(':').map((listEle)=>Number(listEle));
                let durationInMinutes = (endHours * 60  + endMinutes) - (startHours * 60  + startMinutes);
                durationInMinutes += (durationInMinutes < 0) ? (24*60) : 0; //Deal with the case where end time is on the next day.
            
                toReturn += `<tr><td>${daysOfWeek[date.getDay()]}</td><td>${ele["Date"]}</td><td>${ele["Route"]}</td><td>${ele["Route_Name"]}</td><td>${ele["Time_Start"] + "-" + ele["Time_End"]}</td><td>${ele["Start_Location"]}</td><td>${ele["End_Location"]}</td><td>${String(Math.floor(durationInMinutes / 60)) + ":" + String(durationInMinutes % 60)}</td><td>${ele["Shift_ID"]}</td></tr>`
           }
        }

        res.render("shiftsTable", {myTable: toReturn + "</table>"});
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/subsheetForm", async (req,res) => {
    try {
        await client.connect();
        let toReturn = "";
        let toReturnDrivers = "";
        let driverEmail = "";

        let cursor = await client.db(db).collection(shiftsCollection).find();
        let result = await cursor.toArray();
        
        for(ele of result){
            if(ele["Driver"] == null){
                const [m, d, y] = ele["Date"].trim().split("/");
                const date = new Date(y, m-1, d);
                const [startHours, startMinutes] = ele["Time_Start"].split(':').map((listEle)=>Number(listEle));
                const [endHours, endMinutes] = ele["Time_End"].split(':').map((listEle)=>Number(listEle));
                let durationInMinutes = (endHours * 60  + endMinutes) - (startHours * 60  + startMinutes);
                durationInMinutes += (durationInMinutes < 0) ? (24*60) : 0; //Deal with the case where end time is on the next day.
            
                toReturn += `<label for="${ele["_id"]}"><input type="checkbox" id="holesSelected" name="holesSelected" value="${ele["_id"]}">${daysOfWeek[date.getDay()] + " " + ele["Date"]} || ${ele["Route"] + " " + ele["Route_Name"]} ||  ${ele["Time_Start"] + "-" + ele["Time_End"]} ||  ${String(Math.floor(durationInMinutes / 60)) + ":" + String(durationInMinutes % 60)} || (${ele["Shift_ID"]})</label><br>`;                                                                                                                                                             
            }
        }

        cursor = await client.db(db).collection(driversCollection).find();
        result = await cursor.toArray();

        for(ele of result){
            toReturnDrivers += `<option value="${ele["Driver_Number"]}">${ele["Driver_Number"] + " " + ele["Name"]}</option>`;
        }

        res.render("subsheetForm", {checkboxFields: toReturn, driverSelection: toReturnDrivers});
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }    
});

app.use(bodyParser.urlencoded({extended:false}));
app.post("/processSubsheetForm", async (req, res) => {
    let inputSelections = req.body["holesSelected"];
    if(!Array.isArray(inputSelections)){
        inputSelections = [inputSelections];
    }

    let shiftsAdded = [];

    let myDocument = {
        driver: req.body["driverSelected"].trim(),
        selections: inputSelections.map((ele)=>ele.trim()),
    }

    try {
        await client.connect();
        let validDriver = false;
        let driverDocument = await client.db(db).collection(driversCollection).findOne({Driver_Number: myDocument["driver"]});
        if(driverDocument){
            validDriver = true;
        }
        if(validDriver){
            for(selection of myDocument["selections"]){
                let target = await client.db(db).collection(shiftsCollection).findOne({_id: new ObjectId(selection)}); 
                if (target && target["Driver"] == null) {
                    let result = await client.db(db).collection(shiftsCollection).updateOne({_id: new ObjectId(selection)}, {$set: {Driver: myDocument["driver"]}});
                    if(result.modifiedCount > 0){
                        const [m, d, y] = target["Date"].trim().split("/");
                        const date = new Date(y, m-1, d);
                        const [startHours, startMinutes] = target["Time_Start"].split(':').map((listEle)=>Number(listEle));
                        const [endHours, endMinutes] = target["Time_End"].split(':').map((listEle)=>Number(listEle));
                        let durationInMinutes = (endHours * 60  + endMinutes) - (startHours * 60  + startMinutes);
                        durationInMinutes += (durationInMinutes < 0) ? (24*60) : 0; //Deal with the case where end time is on the next day.
                        
                        shiftsAdded.push(`>> ${daysOfWeek[date.getDay()] + " " + target["Date"]} || ${target["Route"] + " " + target["Route_Name"]} ||  ${target["Time_Start"] + "-" + target["Time_End"]} ||  ${String(Math.floor(durationInMinutes / 60)) + ":" + String(durationInMinutes % 60)} || (${target["Shift_ID"]})`);
                    }
                }
            }

            const mail = {
                from: process.env.MAILER_EMAIL,
                to: driverDocument["Email"],
                subject: "Subsheet Pickup Confirmation",
                html: `<p>Dear ${driverDocument["Driver_Number"]} ${driverDocument["Name"]}, <br><br>
                This email contains all of the shifts you have signed up for from the Subsheets Sign Up Form: <br><br>
                ${shiftsAdded.join("<br>")}<br><br>
                You are only assigned to the shifts listed above. If you tried signing up for additional shifts and do not see them here, please contact any MOD. <br><br>
                <em>THIS EMAIL ACCOUNT IS NOT BEING MONITORED</em>. If you think this is incorrect or have any questions or concerns, please contact any MOD. <br><br>
                Thank you,<br>
                <p style="padding:0;margin:0;color:#000000;font-size:11pt;font-family:&quot;Arial&quot;;line-height:1.15;text-align:left"><span style="color:#ff0000;font-weight:700;text-decoration:none;vertical-align:baseline;font-size:11pt;font-family:&quot;Arial&quot;;font-style:normal">The MOD Team</span></p>
                <p style="padding:0;margin:0;color:#000000;font-size:11pt;font-family:&quot;Arial&quot;;line-height:1.15;text-align:left"><span style="color:#666666;font-weight:400;text-decoration:none;vertical-align:baseline;font-size:11pt;font-family:&quot;Arial&quot;;font-style:normal">UMD Department of Transportation Services</span></p>
                <p style="padding:0;margin:0;color:#000000;font-size:11pt;font-family:&quot;Arial&quot;;line-height:1.15;text-align:left"><span style="color:#666666;font-weight:400;text-decoration:none;vertical-align:baseline;font-size:10pt;font-family:&quot;Arial&quot;;font-style:normal">8537 Paint Branch Drive, Bldg. 424 &nbsp;College Park, MD 20742</span></p>
                <p style="padding:0;margin:0;color:#000000;font-size:11pt;font-family:&quot;Arial&quot;;line-height:1.15;text-align:left"><span style="color:#666666">(301) 314-7262 |</span><span style="color:#666666"><a href="http://transportation.umd.edu/" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://transportation.umd.edu/&amp;source=gmail&amp;ust=1733369018663000&amp;usg=AOvVaw35uukjBv56e4ltrXDX_uqR">&nbsp;</a></span><span style="color:#1155cc;text-decoration:underline"><a href="http://transportation.umd.edu/" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://transportation.umd.edu/&amp;source=gmail&amp;ust=1733369018663000&amp;usg=AOvVaw35uukjBv56e4ltrXDX_uqR">transportation.umd.edu</a></span></p>
                <p style="padding:0;margin:0;color:#000000;font-size:11pt;font-family:&quot;Arial&quot;;line-height:1.15;text-align:left"><span style="font-size:10pt;color:#1155cc;text-decoration:underline"><a href="http://facebook.com/DOTSUMD" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://facebook.com/DOTSUMD&amp;source=gmail&amp;ust=1733369018663000&amp;usg=AOvVaw21uYGQrK2B_tLhL6nOCtC9">Facebook</a></span><span style="color:#500050;font-size:10pt">&nbsp;|</span><span style="color:#500050;font-size:10pt"><a href="http://twitter.com/DOTS_UMD" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://twitter.com/DOTS_UMD&amp;source=gmail&amp;ust=1733369018663000&amp;usg=AOvVaw26ceWpzR3sAxNFc1SiftQe">&nbsp;</a></span><span style="color:#1155cc;text-decoration:underline"><a href="http://twitter.com/DOTS_UMD" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://twitter.com/DOTS_UMD&amp;source=gmail&amp;ust=1733369018663000&amp;usg=AOvVaw26ceWpzR3sAxNFc1SiftQe">DOTS T</a></span><span style="font-size:10pt;color:#1155cc;text-decoration:underline"><a href="http://twitter.com/DOTS_UMD" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://twitter.com/DOTS_UMD&amp;source=gmail&amp;ust=1733369018663000&amp;usg=AOvVaw26ceWpzR3sAxNFc1SiftQe">witter</a></span><span style="color:#500050;font-size:10pt">&nbsp;|</span><span style="color:#500050"><a href="http://twitter.com/shuttle_um" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://twitter.com/shuttle_um&amp;source=gmail&amp;ust=1733369018663000&amp;usg=AOvVaw08MUvBc5UMwUiuA65cNYYu">&nbsp;</a></span><span style="color:#1155cc;text-decoration:underline"><a href="http://twitter.com/shuttle_um" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://twitter.com/shuttle_um&amp;source=gmail&amp;ust=1733369018663000&amp;usg=AOvVaw08MUvBc5UMwUiuA65cNYYu">Shuttle-UM Twitter</a></span><span style="color:#500050">&nbsp;|</span><span style="color:#500050"><a href="http://instagram.com/DOTS_UMD" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://instagram.com/DOTS_UMD&amp;source=gmail&amp;ust=1733369018664000&amp;usg=AOvVaw3ZVPlofdWNNZRFOr3KPLY4">&nbsp;</a></span><span style="font-size:10pt;color:#1155cc;text-decoration:underline"><a href="http://instagram.com/DOTS_UMD" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://instagram.com/DOTS_UMD&amp;source=gmail&amp;ust=1733369018664000&amp;usg=AOvVaw3ZVPlofdWNNZRFOr3KPLY4">Instagram </a></span></p>
                <p style="padding:0;margin:0;color:#000000;font-size:11pt;font-family:&quot;Arial&quot;;line-height:1.15;text-align:left"><span style="font-size:10pt;font-style:italic;color:#6aa84f;font-weight:700">Rethink Your Ride:</span><span style="font-size:10pt;font-style:italic;color:#500050;font-weight:700"><a href="http://www.dots.umd.edu/smartCommute.html" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://www.dots.umd.edu/smartCommute.html&amp;source=gmail&amp;ust=1733369018664000&amp;usg=AOvVaw1xiQqthja2rZw2pgVXA41J">&nbsp;</a></span><span style="color:#1155cc;font-weight:700;text-decoration:underline;font-size:10pt;font-style:italic"><a href="http://www.dots.umd.edu/smartCommute.html" style="color:inherit;text-decoration:inherit" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://www.dots.umd.edu/smartCommute.html&amp;source=gmail&amp;ust=1733369018664000&amp;usg=AOvVaw1xiQqthja2rZw2pgVXA41J">Sign up for Smart Commute</a></span></p>
                </p>`
            };

            mailTransporter.sendMail(mail, (error, info) => {
                if(error){
                    console.log("Error: Confirmation Did Not Send", error);
                }
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    res.render("requestSubmitted", myDocument);
});

app.get("/addDriver", (req,res) => {
    res.render("addDriver")
});

app.post("/processAddDriver", async (req,res) => {
    let dtInput = req.body["dispatch"].trim();
    let acknowledged = false;

    if(dtInput == "true"){
        dtInput = true;
    } else if (dtInput == "false") {
        dtInput = false;
    } else {
        dtInput = null;
    }
    
    let myDocument = {
        Name: req.body["name"].trim(),
        Driver_Number: req.body["number"].trim(),
        Email: req.body["email"].trim(),
        Dispatch_Trained: dtInput
    }

    try {
        await client.connect();
        let validDriver = false;
        let validDriverPattern = /^[A-Z][0-9]{2}$/;
        if(validDriverPattern.test(myDocument.Driver_Number)){
            validDriver = true;
        }
        if(validDriver && dtInput != null){
            acknowledged = (await client.db(db).collection(driversCollection).insertOne(myDocument)).acknowledged;
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    res.render("singleAddedConfirmation", {item: "Driver", result: (acknowledged?"SUCCESS":"FAILURE")});
});

app.get("/addShift", (req,res) => {
    res.render("addShift")
});

app.post("/processAddShift", async (req,res) => {
    let acknowledged = false;
    let [year,month,day] = req.body["date"].trim().split('-');

    try {
        await client.connect();
        let validInput = false;
        let validTwoDigit = /^[0-9]{2}$/;
        let validFourDigit = /^[0-9]{4}$/;
        let validDigits = /^[0-9]+$/;
        if(validTwoDigit.test(month) && validTwoDigit.test(day) &&
    validFourDigit.test(year) && validDigits.test(req.body["shiftID"].trim())){
            validInput = true;
        }
        if(validInput){
            let myDocument = {
                Date: `${month}/${day}/${year}`,
                Shift_ID: `${month}-${day}-${year.slice(-2)}-${req.body["shiftID"].trim()}`,
                Route: req.body["route"].trim(),
                Route_Name: req.body["route_name"].trim(),
                Package: req.body["package"].trim(),
                Time_Start: req.body["start_time"].trim(),
                Time_End: req.body["end_time"].trim(),
                Start_Location: req.body["start_location"].trim(),
                End_Location: req.body["end_location"].trim(),
                Driver: null,
            }
            acknowledged = (await client.db(db).collection(shiftsCollection).insertOne(myDocument)).acknowledged;
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    res.render("singleAddedConfirmation", {item: "Shift", result: (acknowledged?"SUCCESS":"FAILURE")});
});


app.listen(portNumber);

process.stdin.setEncoding("utf8");
process.stdin.on('data', (input)=>{
    if (input !== null){
        const command = input.trim();
        if (command === "stop"){
            console.log("Shutting down the server");
            process.exit(0);
        }
        process.stdout.write("Stop to shutdown the server: ");
    }
});

console.log(`Web server started and running at http://localhost:${portNumber}`);
process.stdout.write("Stop to shutdown the server: ");