require('dotenv').config()
const stream = require('stream');

const jwt = require("jsonwebtoken")
const JWT_SECURE = process.env.JWT_SECURE;
const { google } = require("googleapis");
const fs = require("fs")
const path = require("path")
const nodemailer = require("nodemailer")
const puppeteer = require("puppeteer")
// const puppeteer = require('puppeteer-core');

let success = false;


// Keys 
const private_key = process.env.PRIVATE_KEY
const client_email = process.env.CLIENT_EMAIL
const spreadsheetId = process.env.SPREADSHEETID


// Get Auth Here
async function getAuth() {
    try {

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: client_email,
                private_key: private_key
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"
            ]
        })

        return auth;

    } catch (error) {
        console.log("Get Auth", error.message)
    }

}


// Access google sheet
async function accessGoogleSheet() {
    try {
        const auth = await getAuth(); // Implement your authentication logic here
        const client = await auth.getClient();

        const sheets = google.sheets({ version: "v4", auth: client });

        return sheets;

    } catch (error) {
        console.error("Error accessing Google Sheet:", error.message);
        // Handle errors appropriately (e.g., throw an exception)
    }
}


// Access Google Drive Using Local Storage
async function accessGoogleDrive(image, email) {

    const auth = await getAuth();

    // Obtain an authenticated client
    const drive = google.drive({ version: "v3", auth })


    // // File details
    const imageFilePath = `./files/${image.filename}`;
    const imageFileName = `${email}.jpg`;
    const mimeType = `${image.mimetype}`;   // Adjust the mime type according to your file


    // File metadata
    const fileMetadata = {
        name: imageFileName
    }


    // File content
    const media = {
        mimeType,
        body: fs.createReadStream(imageFilePath)
    }

    const uploaderEmail = "dakshghole@gmail.com";

    let imageLinkShree;

    let uploadImage = await drive.files.create(
        {
            resource: fileMetadata,
            media,
            fields: "id"
        });

    try {
        console.log("File uploaded! File ID: ", uploadImage.data.id);


        // Set permissions to make the file publicly accessible
        let setPermission = await drive.permissions.create(
            {
                fileId: uploadImage.data.id,
                requestBody: {
                    role: "reader",           // or "writer" if the user should have edit permissions
                    // type: "anyone",
                    type: "user",             // Grant access to a specific user
                    emailAddress: uploaderEmail,       // Uploader's email address
                },
            });

        if (setPermission.statusText === "OK") {

            // Retrieve the file's web view link
            const imageLink = await drive.files.get(
                {
                    fileId: uploadImage.data.id,
                    fields: "webViewLink",
                });

            if (imageLink.statusText === "OK") {

                console.log("File link:", imageLink.data.webViewLink);

                imageLinkShree = imageLink.data.webViewLink;
            }
            else {
                console.error("Error retrieving link:", err);
            }
        }
        else {
            console.error("Error setting permissions:", error);
        }

        // Destination folder ID where you want to copy the image
        const destinationFolderId = "1CeahbvW4dl-X85RYl9BH3ocLAvg3C-DR"

        // Replace with the actual folder ID

        // Create the metadata for the copy
        const copyMetadata = {
            parents: [destinationFolderId]
        }

        let copyImage = await drive.files.copy({
            fileId: uploadImage.data.id,
            resource: copyMetadata
        });

        if (copyImage.statusText === "OK") {
            console.log("File copied! New File ID:", copyImage.data.id);

            let copyImageId = copyImage.data.id;
            return { imageLinkShree, copyImageId };
        }
        else {
            console.error("Error copying file: ", error);
        }


    } catch (error) {
        console.error("Error uploading file:", error);
    }

}



// Access Google Drive Using Buffer Storage
async function uploadToGoogleDrive(fileBuffer, mimeType, fileName) {
    const auth = await getAuth();

    // Obtain an authenticated client
    const drive = google.drive({ version: "v3", auth })

    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const response = await drive.files.create({
        resource: {
            name: fileName,
            parents: ['1CeahbvW4dl-X85RYl9BH3ocLAvg3C-DR']  // Optional: specify a destination folder
        },
        media: {
            mimeType: mimeType,
            body: bufferStream
        },
        fields: 'id, webViewLink'
    });

    return response.data;
}



// Create receipt for the user.
async function createPdf(fullName, fullInfo, amount) {
    try {

        // Current Date
        // Add Date
        const currentDate = new Date();

        // Get individual components:
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // Months are 0-indexed
        const day = currentDate.getDate();

        // Format the date:
        const formattedDate
            = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;


        const htmlCode = `
      <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <link rel="shortcut icon" type="x-icon"
        href="https://static.vecteezy.com/system/resources/thumbnails/008/222/655/small_2x/bodybuilding-logo-free-vector.jpg">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Navyug Application Receipt</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Rubik+Wet+Paint&display=swap');
    </style>
</head>

<body style="margin: 0px; padding: 0px; box-sizing: border-box;">

    <div
        style="background-color: white; color: black; height: 100vh; width: 100%;  margin: 0px; display: flex;  justify-content: center;">
        <!-- Here we need to image url after fetching from google drive -->
        <div style="width: 100%; margin: 0px;   font-size: 25px;">
            <h1 style="padding: 5px ; 
                text-align: center; color: red; 
                font-size: 45px;">
                Navyug Gym Receipt</h1>
            <div style="padding: 0 3%;">
                <hr style="margin-bottom: 30px;">
                <h6 style="display: inline-block; float: right; margin-top: -10px;">Date: ${formattedDate}</h6>
                <h4>Name: ${fullName}</h4>
                <h6>Email Id: ${fullInfo[1]}</h6>
                <h6>Phone No: +91 ${fullInfo[2]}</h6>
                <h6>Address: ${fullInfo[3]}</h6>
                <table style="width: 100%; border-collapse: collapse; font-size: 16px;">
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">
                            Sr No.</th>
                        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">
                        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">
                            Work out Type</th>
                        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">
                            Plan Validity</th>
                        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">
                            Payment Method</th>
                        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">
                            Amount</th>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">1</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">Gym</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${fullInfo[6]} <span
                                style="margin-left: 10px;">To</span>
                            <span style="margin-left: 10px;">${fullInfo[8]}</span>
                        </td>
                        <td style="border: 1px solid #ddd; padding: 8px;">Cash</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${amount}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;"></td>
                        <td style="border: 1px solid #ddd; padding: 8px;"></td>
                        <td style="border: 1px solid #ddd; padding: 8px;"></td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: end; padding-right: 20px;">TOTAL
                        </td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${amount}</td>
                    </tr>
                </table>
                <h6>Received by: <span style="margin-left: 20px;">Navyug Gym</span></h6>
                <h6>Received Signature: <span style="margin-left: 20px;"> ____________</span></h6>
            </div>
            <hr style="margin-top: 100px;">
        </div>
    </div>

</body>

</html>
      `


        // const browser = await puppeteer.launch();
        // const browser = await puppeteer.launch({
        //     executablePath: '/opt/render/.cache/puppeteer/chrome',
        // });


        // const browser = await puppeteer.launch({
        //     headless: true,
        // });

        // const browser = await puppeteer.launch({
        //     headless: true,
        //     args: ['--no-sandbox', '--disable-setuid-sandbox']
        // });

        // const browser = await puppeteer.launch({
        //     executablePath: '/opt/render/.cache/puppeteer/chrome',
        //     args: ['--no-sandbox', '--disable-setuid-sandbox'],
        //     headless: true,
        // });

        // const browser = await puppeteer.launch({
        //     headless: true,
        //     args: ['--no-sandbox', '--disable-setuid-sandbox']
        // });

        // // // Rest of the PDF creation logic
        // const page = await browser.newPage();


        // // // Set content
        // // console.log("page content", await page.setContent(htmlCode))   // deelte it.\
        // await page.setContent(htmlCode);

        // // const defaultPath = puppeteer.executablePath();
        // // // console.log("Default executable path:", defaultPath);


        // const outputDir = path.join(__dirname, 'files');
        // if (!fs.existsSync(outputDir)) {
        //     fs.mkdirSync(outputDir, { recursive: true });
        // }


        // const outputFile = path.join(outputDir, 'Receipt.pdf');
        // await page.pdf({ path: outputFile, format: "A4" });

        // await browser.close();

        // console.log("PDF created at:", outputFile);
        // return outputFile;


        let outputFile = "./files/Receipt.pdf"

        // const browser = await puppeteer.launch();
        const browser = await puppeteer.launch({
            // executablePath: '.cache/puppeteer/chromewin64-131.0.6778.69/chrome-win64/chrome.exe',
            // executablePath: '"C:/Program Files/Google/Chrome/Application/chrome.exe"',
            executablePath: "C:/Users/dipti/.cache/puppeteer/chrome/win64-131.0.6778.69chrome-win64/chrome.exe",
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
        const page = await browser.newPage();

        // Set content
        await page.setContent(htmlCode);



        // Generate pdf 
        // Format means how data save in A4 size paper.
        await page.pdf({ path: outputFile, format: "A4" });

        await browser.close();

        console.log("pdf created")

        return "PDF created successfully!"



    } catch (error) {
        console.log("PDF creation", error)
    }
}




// Fetch All Data from sheet 1
async function sendMails(email, subject, text, attachments) {
    try {

        // Create reusable transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for port 465, false for other ports
            auth: {
                user: process.env.USER,       // Sender gmail address 
                pass: process.env.APP_PASSWORD,     // App password from gmail account this process are written on the bottom of the web page.
            },
        });


        // mail with defined transport object
        const info = await transporter.sendMail({
            from: {
                name: "Navyug Gym",
                address: "process.env.USER"
            }, // sender address
            // to: "bar@example.com, baz@example.com", // When we have list of receivers and here add gym mail account and our gym account.
            to: "dakshsgholedt2000@gmail.com",
            // to: `${email}`,
            subject: subject, // Subject line
            text: text,
            attachments: attachments
        });

        console.log("Message sent: %s", info.messageId);


    } catch (error) {
        console.log("Read data error", error.message);
        // return res.status(400).json({ Error: error.message });
    }
}



// Fetch All Data from sheet 1
async function fetchData() {
    try {

        const sheets = await accessGoogleSheet();


        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "Sheet1"
        })

        const data = await response.data.values.slice(1);

        return data;


    } catch (error) {
        console.log("Read data error", error.message);
        // return res.status(400).json({ Error: error.message });
    }
}

async function fetchAdminData() {
    try {

        const sheets = await accessGoogleSheet();


        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "Sheet2"
        })

        const data = await response.data.values.slice(1);

        return data;


    } catch (error) {
        console.log("Read data error", error.message);
        // return res.status(400).json({ Error: error.message });
    }
}


// Create New Gym Member
async function createUser(req, res) {
    try {
        //Destructure the request 
        const { fName, email, mobileNo, address, dOB, age, bloodGroup, workoutTime } = req.body;

        let fullName = fName.toLowerCase();

        // Fetch Data
        let data = await fetchData();

        if (data.length > 0) {
            if (data.some(row => row[1] === email)) {
                return res.status(400).json({ success: false, Error: "User with this email id is already registered!" });
            }
        }


        // Accessing Google Drive
        // let imageLinkShare = await accessGoogleDrive(req.file, email);
        //         let imageLinkShree = imageLinkShare.imageLinkShree;
        //         let copyImageId = imageLinkShare.copyImageId;


        // Upload to Google Drive directly using stream
        const file = req.file;
        const driveResponse = await uploadToGoogleDrive(file.buffer, file.mimetype, `${email}.jpg`);

        const imageLinkShree = driveResponse.webViewLink;
        const copyImageId = driveResponse.id;


        // Add Date
        const currentDate = new Date();

        // Get individual components:
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // Months are 0-indexed
        const day = currentDate.getDate();

        // Format the date:
        const formattedDate
            = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;


        // After 1 year
        const currentbDate = new Date();
        currentbDate.setFullYear(currentbDate.getFullYear() + 1);
        const afterYear = currentbDate.getFullYear();
        const afterMonth = currentbDate.getMonth() + 1; // Months are 0-indexed
        const afterDay = currentbDate.getDate();
        const afterOneYearDate = `${afterDay.toString().padStart(2, '0')}-${afterMonth.toString().padStart(2, '0')}-${afterYear}`;


        // Before 5 Days
        const oneYearLater = new Date(currentDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        oneYearLater.setDate(oneYearLater.getDate() - 5);
        const beforeFiveDaysInYear = oneYearLater.getFullYear();
        const beforeFiveDaysInMonth = oneYearLater.getMonth() + 1; // Months are 0-indexed
        const beforeFiveDaysInDay = oneYearLater.getDate();
        const beforeFiveDaysInDate = `${beforeFiveDaysInDay.toString().padStart(2, '0')}-${beforeFiveDaysInMonth.toString().padStart(2, '0')}-${beforeFiveDaysInYear}`;



        // After 5 Days
        const oneYearLaterFive = new Date(currentDate);
        oneYearLaterFive.setFullYear(oneYearLaterFive.getFullYear() + 1);
        oneYearLaterFive.setDate(oneYearLaterFive.getDate() + 5);
        const afterFiveDaysInYear = oneYearLaterFive.getFullYear();
        const afterFiveDaysInMonth = oneYearLaterFive.getMonth() + 1; // Months are 0-indexed
        const afterFiveDaysInDay = oneYearLaterFive.getDate();
        const afterFiveDaysInDate = `${afterFiveDaysInDay.toString().padStart(2, '0')}-${afterFiveDaysInMonth.toString().padStart(2, '0')}-${afterFiveDaysInYear}`;


        // Checking empty rows
        let emptyIndex = 0;

        for (let i = 0; i < data.length; i++) {
            if (data[i].length === 0) {
                emptyIndex = i;
                break;
            }
        }


        const sheets = await accessGoogleSheet();
        const auth = await getAuth();
        let response;


        //Store user data in the database
        if (emptyIndex !== 0) {
            response = await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Sheet1!A${emptyIndex + 2}`,
                valueInputOption: "USER_ENTERED",
                resource: { values: [[fullName, email, mobileNo, address, imageLinkShree, copyImageId, formattedDate, beforeFiveDaysInDate, afterOneYearDate, dOB, age, bloodGroup, workoutTime, "No", "", "", afterFiveDaysInDate]] }
            })
        }

        else {
            response = await sheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: "Sheet1",  //Specify the start cell
                valueInputOption: "USER_ENTERED",
                resource: { values: [[fullName, email, mobileNo, address, imageLinkShree, copyImageId, formattedDate, beforeFiveDaysInDate, afterOneYearDate, dOB, age, bloodGroup, workoutTime, "No", "", "", afterFiveDaysInDate]] }
            })
        }

        success = true;
        return res.status(200).json({ success, Result: response })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}



async function loginAdmin(req, res) {
    try {
        //Destructure the user
        const { mobileNo, password } = req.body;


        // Fetch Data
        let data = await fetchAdminData();
        let isMobileNoVerify = false;
        let isPasswordVerify = false;

        //Validate the User
        for (let i = 0; i < data.length; i++) {

            if (data[i][2] === mobileNo) {
                isMobileNoVerify = true;
                break;
            }
        }


        if (isMobileNoVerify) {

            for (let i = 0; i < data.length; i++) {

                if (data[i][3] === password) {

                    isPasswordVerify = true;
                    break;
                }
            }
        }
        else {
            isMobileNoVerify = false;
            success = false;
            return res.status(400).json({ success, Error: "User not found!" })
        }


        if (isPasswordVerify) {

            //Create payload
            const payload = {
                user: {
                    id: mobileNo
                }
            }

            //Create a token
            const token = jwt.sign(payload, JWT_SECURE);

            //Final
            success = true;
            return res.status(201).json({ success, token })
        }
        else {
            isPasswordVerify = false;
            success = false;
            return res.status(400).json({ success, Error: "Passwords doesn't match!" })
        }


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ Error: "Internal Serval Error Occured!" })
    }
}


// Fetch Fees pending data
async function fetchFeesPendingData(req, res) {
    try {

        const userId = req.user.id;

        let dataArray = [];
        let data = await fetchData();
        let adminData = await fetchAdminData();
        let isAdminVerify = false;


        //Validate the User
        for (let i = 0; i < adminData.length; i++) {

            // Admin Verification
            if (adminData[i][2] === userId) {

                isAdminVerify = true;
                break;
            }
        }


        if (isAdminVerify) {
            for (let j = 0; j < data.length; j++) {

                // console.log(`Data number is ${j} --> ${data[j]}`);

                if (data[j][13] === "No") {
                    // console.log(data[j])
                    dataArray.push(data[j]);
                }
            }

            // Sort in ascending order (oldest first)
            // data.sort((a, b) => {
            //     const dateA = new Date(a[9].split('-').reverse().join('-'));
            //     const dateB = new Date(b[9].split('-').reverse().join('-'));
            //     return dateA - dateB;
            //   });


            // Sort in descending order (youngest first)
            dataArray.sort((a, b) => {
                const dateA = new Date(a[7].split('-').reverse().join('-'));
                const dateB = new Date(b[7].split('-').reverse().join('-'));
                return dateB - dateA;
            });


            success = true;
            return res.status(200).json({ success, Data: dataArray })

        }
        else {
            isAdminVerify = false;
            success = false;
            return res.status(400).json({ success, Error: "Admin not found!" })
        }


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}



// Search User
async function searchUser(req, res) {
    try {

        const userId = req.user.id;

        const name = req.query.name;  //It is also accept name, surname and mobile number

        let fullName = name.toLowerCase();


        let dataArray = [];
        let data = await fetchData();
        let adminData = await fetchAdminData();
        let adminVerify = false;


        //Validate the User
        for (let i = 0; i < adminData.length; i++) {

            // Admin Verification
            if (adminData[i][2] === userId) {

                adminVerify = true;
                break;
            }
        }

        if (adminVerify) {
            for (let j = 0; j < data.length; j++) {

                if (data[j].length !== 0) {
                    let firstName = data[j][0].split(" ");
                    if (firstName[0] === fullName || firstName[1] === fullName || data[j][2] === fullName) {
                        dataArray.push(data[j]);
                    }
                }
            }

            if (dataArray.length !== 0) {
                success = true;
                return res.status(200).json({ success, Data: dataArray })
            }
            else {
                success = true;
                return res.status(200).json({ success, Data: "User is not found!" })

            }

        }
        else {
            adminVerify = false;
            success = false;
            return res.status(400).json({ success, Error: "Admin not found!" })
        }


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}
let prevCounter = 0;     // Counter for send email before 5 Days
let endCounter = 0;      // Counter for send email when subscription end.

// Fetch data those are between before 5 days and end date 
async function feesDeadlineData(req, res) {
    try {

        // Add Date
        const currentDate = new Date();

        // Get individual components:
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // Months are 0-indexed
        const day = currentDate.getDate();

        // Format the date:
        const formattedDate
            = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;


        // Fetch Data
        let data = await fetchData();
        let deadlineUserData = [];
        let firstName;


        for (let item = 0; item < data.length; item++) {

            let previousDeadlineDate = data[item][7];
            const [startDay, startMonth, startYear] = previousDeadlineDate.split("-");
            previousDeadlineDate = new Date(`${startYear}, ${startMonth}- ${startDay}`)

            let endDeadlineDate = data[item][8];
            const [endDay, endMonth, endYear] = endDeadlineDate.split("-");
            endDeadlineDate = new Date(`${endYear}, ${endMonth}- ${endDay}`)

            const [currentDay, currentMonth, currentYear] = formattedDate.split("-");
            let currentDate = new Date(`${currentYear}, ${currentMonth}- ${currentDay}`)

            // if (previousDeadlineDate < currentDate && currentDate <= endDeadlineDate) {
            //     deadlineUserData.push(data[item]);
            // }

            if (
                previousDeadlineDate.getTime() < currentDate.getTime() &&
                currentDate.getTime() <= endDeadlineDate.getTime()
            ) {
                deadlineUserData.push(data[item]);
            }

            if (previousDeadlineDate.getTime() === currentDate.getTime()) {
                prevCounter = prevCounter + 1;
                // console.log("prevCounter", prevCounter)

                if (prevCounter === 1) {
                    firstName = data[item][0].split(" ")[0].charAt(0).toUpperCase() + data[item][0].split(" ")[0].slice(1);

                    await sendMailData("beforeFiveDays", data[item][1], firstName, data[item][8])
                }

            }
            else if (currentDate.getTime() === endDeadlineDate.getTime()) {
                endCounter = endCounter + 1;

                // console.log("endCounter", endCounter);


                if (endCounter === 1) {
                    firstName = data[item][0].split(" ")[0].charAt(0).toUpperCase() + data[item][0].split(" ")[0].slice(1);

                    await sendMailData("endSubscription", data[item][1], firstName, data[item][8])
                }

            }
        }


        async function sendMailData(mailType, email, firstName, date) {

            let subject;
            let text;

            if (mailType === "beforeFiveDays") {
                subject = `Reminder: Your Subscription Will Expire in 5 Days`;
                text = `
                Dear ${firstName},
    
                    We hope this message finds you well! This is a friendly reminder that your subscription with Navyug Gym will expire in 5 days, on ${date}.
    
                    We encourage you to renew your membership to continue enjoying our facilities, and the support of our dedicated team to help you reach your fitness goals.
    
                    How to Renew Your Membership:
                        - Visit Us at the Front Desk - Our team will be happy to assist you with the renewal process.
                        - Contact Us: If you have any questions, please reach out to us via email at navyuggym@gmail.com or contact our team directly:
                                        - Mahesh Wagh: +91 3839383933
                                        - Suresh Tambe: +91 3938393939
                                        - Santosh M: +91 9393939394
                                        - Piyush L: +91 8393947322
                
                    We appreciate your commitment to fitness and look forward to supporting you on your journey at Navyug Gym. Don’t hesitate to reach out if you have any questions or need assistance.
    
                    Thank you for being a valued member of our gym family!
    
                    Warm regards,
                    The Navyug Gym Team
            `
            }

            else if (mailType === "endSubscription") {
                subject = `Important: Your Navyug Gym Subscription Ends Today`;
                text = `
                    Dear ${firstName},
        
                        We hope you're doing well! We wanted to remind you that your subscription with Navyug Gym is set to expire today, ${date}.
        
                        To continue enjoying uninterrupted access to our facilities, and support, we encourage you to renew your membership as soon as possible.
        
                        How to Renew Your Membership:
                            - Visit Us at the Front Desk - Our team will be happy to assist you with the renewal process.
                            - Contact Us: If you have any questions, please reach out to us via email at navyuggym@gmail.com or contact our team directly:
                                            - Mahesh Wagh: +91 3839383933
                                            - Suresh Tambe: +91 3938393939
                                            - Santosh M: +91 9393939394
                                            - Piyush L: +91 8393947322
                    
                        We appreciate your commitment to fitness and look forward to supporting you on your journey at Navyug Gym. Don’t hesitate to reach out if you have any questions or need assistance.
        
                        Thank you for being a valued member of our gym family!
        
                        Warm regards,
                        The Navyug Gym Team
                `
            }

            await sendMails(email, subject, text)

        }


        // Sort in Decending order (youngest first)
        deadlineUserData.sort((a, b) => {
            const dateA = new Date(a[7].split('-').reverse().join('-'));
            const dateB = new Date(b[7].split('-').reverse().join('-'));
            return dateB - dateA;
        });

        success = true;
        return res.status(200).json({ success, Data: deadlineUserData })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}



// Fetch data those are between before 5 days and end date and also delete when data date is exceed the current date.
async function feesSubscriptionEndData(req, res) {
    try {

        // Add Date
        const currentDate = new Date();

        // Get individual components:
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // Months are 0-indexed
        const day = currentDate.getDate();

        // Format the date:
        const formattedDate
            = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;


        // Fetch Data
        let data = await fetchData();
        let deadlineUserData = [];
        const sheets = await accessGoogleSheet();
        const auth = await getAuth();

        // Obtain an authenticated client
        const drive = google.drive({ version: "v3", auth })


        for (let item = 0; item < data.length; item++) {

            let previousEndDeadlineDate = data[item][8];
            const [startDay, startMonth, startYear] = previousEndDeadlineDate.split("-");
            previousEndDeadlineDate = new Date(`${startYear}, ${startMonth}- ${startDay}`)

            let endSubDeadlineDate = data[item][16];
            const [endDay, endMonth, endYear] = endSubDeadlineDate.split("-");
            endSubDeadlineDate = new Date(`${endYear}, ${endMonth}- ${endDay}`)

            const [currentDay, currentMonth, currentYear] = formattedDate.split("-");
            let currentDate = new Date(`${currentYear}, ${currentMonth}- ${currentDay}`)

            if (previousEndDeadlineDate < currentDate && currentDate <= endSubDeadlineDate) {
                deadlineUserData.push(data[item]);
            }
            else if (endSubDeadlineDate < currentDate) {

                try {
                    responseDrive = drive.files.delete(
                        {
                            fileId: data[item][5],
                        })
                    response = await sheets.spreadsheets.values.clear({
                        spreadsheetId,
                        range: `Sheet1!A${item + 2}:Q${item + 2}`,
                    })

                } catch (error) {
                    console.log("Error during Deleting: ", error)
                }
            }

        }

        // Sort in Decending order (youngest first)
        deadlineUserData.sort((a, b) => {
            const dateA = new Date(a[7].split('-').reverse().join('-'));
            const dateB = new Date(b[7].split('-').reverse().join('-'));
            return dateB - dateA;
        });

        success = true;
        return res.status(200).json({ success, Data: deadlineUserData })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}


// Add method to accept payment and then corresponding admin name will be added there.
async function acceptFeesPayment(req, res) {
    try {

        const { amount } = req.body;
        const userId = req.user.id;
        const fileId = req.params.id;

        let data = await fetchData();
        let adminData = await fetchAdminData();
        let userName;
        let firstName;
        let fullInfo;


        //Validate the User
        for (let i = 0; i < adminData.length; i++) {

            // Admin Verification
            if (adminData[i][2] === userId) {
                userName = adminData[i][0]
                break;
            }
        }

        const sheets = await accessGoogleSheet();
        let response;

        for (let j = 0; j < data.length; j++) {

            if (data[j][5] === fileId) {
                firstName = data[j][0]
                fullInfo = data[j]
                // console.log(data[j])
                response = await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `Sheet1!N${j + 2}`,
                    valueInputOption: "USER_ENTERED",
                    resource: { values: [["Yes", amount, userName]] }
                })
            }
        }

        // Here get Full Name
        firstName = firstName.split(" ")[0].charAt(0).toUpperCase() + firstName.split(" ")[0].slice(1);

        let lastName = fullInfo[0].split(" ")[1].charAt(0).toUpperCase() + fullInfo[0].split(" ")[1].slice(1);

        let fullName = firstName + " " + lastName;


        // Delete the first file from the storage
        // try {
        //     fs.unlinkSync(`./files/Receipt.pdf`);
        //     console.log("File deleted successfully!");
        // } catch (err) {
        //     console.error("Error deleting file:", err);
        // }

        // Full Name and meta data send to the pdf method.
        // await createPdf(fullName, fullInfo, amount); 

        const pdfPath = await createPdf(fullName, fullInfo, amount);
        console.log("PDF Path:", pdfPath);
        console.log("done creatapdg");



        // const receiptPath = path.join(__dirname, "files/Receipt.pdf");
        // console.log("Receipt file path:", receiptPath);


        // if (fs.existsSync(receiptPath)) {
        //     console.log("File exists!");
        // } else {
        //     console.log("File not found.");
        // }


        // function findFile(dir, filename) {
        //     const files = fs.readdirSync(dir);
        //     for (let i = 0; i < files.length; i++) {
        //         const currentPath = path.join(dir, files[i]);
        //         const stat = fs.statSync(currentPath);
        //         if (stat.isFile() && files[i] === filename) {
        //             console.log(`File found at: ${currentPath}`);
        //             return currentPath;
        //         } else if (stat.isDirectory()) {
        //             const found = findFile(currentPath, filename);
        //             if (found) return found;
        //         }
        //     }
        //     return null;
        // }

        // // Example usage
        // const receiptPath = findFile('/opt/render/project/src', 'Receipt.pdf');
        // if (receiptPath) {
        //     console.log(`Receipt.pdf found at ${receiptPath}`);
        // } else {
        //     console.log('Receipt.pdf not found.');
        // }


        // Ensure that the directory exists
        // const outputDir = path.join(__dirname, 'files');
        // if (!fs.existsSync(outputDir)) {
        //     fs.mkdirSync(outputDir, { recursive: true });
        // }


        // let outputFile = path.join(__dirname, 'files', 'Receipt.pdf');

        // console.log("outputFile", outputFile);


        // Gmail data
        let subject = "Welcome to Navyug Gym! Your Membership is Approved! 🎉"
        let text = `
            Dear ${firstName},
                We’re thrilled to welcome you to Navyug Gym! Your membership registration has been approved, and we look forward to being a part of your fitness journey.

                Here are the next steps and some important details:
                    1] Getting Started: Our team will provide a guided orientation of our facilities on your first visit. Feel free to ask any questions to make the most out of your experience with us!
                    2] Schedule and Timing: Navyug Gym is open from 6:00 AM to 10:00 AM and 4:00 Am to 10:00 Am,  Monday to Saturday: Open.
                    3] Contact Us: If you have any questions, please reach out to us via email at navyuggym@gmail.com or contact our team directly:
                                       - Mahesh Wagh: +91 3839383933
                                       - Suresh Tambe: +91 3938393939
                                       - Santosh M: +91 9393939394
                                       - Piyush L: +91 8393947322

                What to Bring on Your First Day:
                    - Gym attire and any personal equipment you might need.
                    - A positive attitude and enthusiasm for a great workout!

                Please Note: We have attached a document to this email with additional details about your membership. Kindly review it for a smooth start with us.

                Thank you for choosing Navyug Gym. We are excited to help you achieve your fitness goals!

                Best regards,
                Navyug Gym Team
        `

        let attachments = [
            {
                filename: "Receipt.pdf",
                path: path.join(__dirname, "../files/Receipt.pdf"),
                contentType: "application/pdf"
            },
        ]
        console.log("done attachments");


        if (response.status === 200) {
            await sendMails(fullInfo[1], subject, text, attachments);
        }

        success = true;
        return res.status(200).json({ success, Data: "Successfully Add Member" })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}



// Delete method use when we accept the payment if you want to delete because of some information mistake.
async function deletePendingUserData(req, res) {
    try {

        const fileId = req.params.id;

        let data = await fetchData();

        const sheets = await accessGoogleSheet();
        const auth = await getAuth();
        // Obtain an authenticated client
        const drive = google.drive({ version: "v3", auth })
        let response;
        let responseDrive;

        for (let j = 0; j < data.length; j++) {

            if (data[j][5] === fileId) {

                try {
                    responseDrive = drive.files.delete(
                        {
                            fileId: fileId,
                        })
                    response = await sheets.spreadsheets.values.clear({
                        spreadsheetId,
                        range: `Sheet1!A${j + 2}:Q${j + 2}`,
                    })


                } catch (error) {
                    console.log("Error during Deleting: ", error)
                }
            }
        }

        success = true;
        return res.status(200).json({ success, Data: response, DriveData: responseDrive })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}


// Using cloudinary
async function fetchImage(req, res) {
    try {
        let imageUrl = "https://res.cloudinary.com/dpkaxrntd/image/upload/v1729657532/iqgpcl1hnra06rdi1e93.jpg"

        // Download the image as a buffer using axios
        // const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const response = await fetch(imageUrl, {
            method: 'GET', // You can use 'GET' or leave it out as it's the default
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        // Convert the response to an ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();

        // Convert the buffer to base64
        // const imageBase64 = Buffer.from(response.data, 'binary').toString('base64');
        const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
        const imageMimeType = 'image/jpeg'; // Update this if using a different image type (e.g., image/png)

        // Send the base64 string back to the frontend
        return res.status(200).json({
            success: true,
            imageBase64: `data:${imageMimeType};base64,${imageBase64}`,
        });
        // return res.status(200).json({ success: true, imageUrl });



    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}



// Fetch Image from google drive
// async function fetchImageDrive(req, res) {
//     try {




//     } catch (error) {
//         console.log(error.message);
//         success = false;
//         return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
//     }
// }


// const { URL } = require('url'); // Use the URL constructor from the global namespace

// async function fetchImageDrive(req, res) {
//     try {
//         // Ensure the URL is a string and not an object
//         const unsanitizedUrl = String(req.body.url);

//         // Use URL to validate the structure
//         let parsedUrl;
//         try {
//             parsedUrl = new URL(unsanitizedUrl);
//         } catch {
//             return res.status(400).json({ success: false, error: 'Invalid URL format' });
//         }

//         // Additional validation: check domain
//         if (!isAllowedDomain(parsedUrl.hostname)) {
//             return res.status(400).json({ success: false, error: 'Invalid domain' });
//         }

//         // Proceed with your code to fetch the image from the sanitized URL
//         // (e.g., using axios or fetch)

//         res.json({ success: true, sanitizedUrl: unsanitizedUrl });
//     } catch (error) {
//         console.log(error.message);
//         return res.status(500).json({ success: false, error: 'Internal Server Error' });
//     }
// }

// function isAllowedDomain(hostname) {
//     const allowedDomains = ['google.com', 'drive.google.com'];
//     return allowedDomains.some(domain => hostname.endsWith(domain));
// }




// Fetch Home data
// async function fetchFeesPendingData(req, res) {
async function fetchHomeData(req, res) {
    try {

        const userId = req.user.id;

        let data = await fetchData();
        let adminData = await fetchAdminData();
        let isAdminVerify = false;
        let adminFirstName;
        let totalMembers = 0;
        let insiderMembers = 0;
        let outsiderMembers = 0;
        let morningMembers = 0;
        let eveningMembers = 0;
        let membersBelowFifteen = 0;
        let fifteenToTwenty = 0;
        let twentyToThirty = 0;
        let membersAboveThirty = 0;


        //Validate the User
        for (let i = 0; i < adminData.length; i++) {

            // Admin Verification
            if (adminData[i][2] === userId) {

                adminFirstName = adminData[i][0].split(" ")[0];

                isAdminVerify = true;
                break;
            }
        }


        if (isAdminVerify) {

            let actuallyMember = [];


            for (let j = 0; j < data.length; j++) {
                // Member type: Insider or Outsider
                if (data[j][14] === "2000") {
                    insiderMembers++;
                    actuallyMember.push(data[j]);

                } else if (data[j][14] === "4000") {
                    outsiderMembers++;
                    actuallyMember.push(data[j]);
                }

            }

            for (let j = 0; j < actuallyMember.length; j++) {

                // Time slot: Morning or Evening
                if (actuallyMember[j][12] === "Morning") {
                    morningMembers++;
                } else if (actuallyMember[j][12] === "Evening") {
                    eveningMembers++;
                }

                // Age categories - Only one of these will execute per iteration
                const age = actuallyMember[j][10];
                if (age <= 15) {
                    membersBelowFifteen++;
                } else if (age <= 20) {
                    fifteenToTwenty++;
                } else if (age <= 30) {
                    twentyToThirty++;
                } else {
                    membersAboveThirty++;
                }
            }

            // Total Members
            totalMembers = actuallyMember.length;

            success = true;
            return res.status(200).json({ success, Data: { adminFirstName, totalMembers, insiderMembers, outsiderMembers, morningMembers, eveningMembers, membersBelowFifteen, fifteenToTwenty, twentyToThirty, membersAboveThirty } })

        }
        else {
            isAdminVerify = false;
            success = false;
            return res.status(400).json({ success, Error: "Admin not found!" })
        }


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.json(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}





module.exports = {
    createUser,
    loginAdmin,
    searchUser,
    fetchFeesPendingData,
    feesDeadlineData,
    acceptFeesPayment,
    deletePendingUserData,
    fetchImage,
    // fetchImageDrive,
    fetchHomeData,
    feesSubscriptionEndData
}

