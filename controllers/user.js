require('dotenv').config()
const stream = require('stream');

const jwt = require("jsonwebtoken")
const JWT_SECURE = process.env.JWT_SECURE;
const { google } = require("googleapis");
const fs = require("fs")
const os = require("os")
const path = require("path")
const nodemailer = require("nodemailer")
const { jsPDF } = require("jspdf");     // Import the jsPDF library
require("jspdf-autotable"); // Import jsPDF autoTable plugin
const TOKEN_EXPIRATION = "45m";     // Token will expire in 1 hour (use other formats like '2d', '10m', '365d' as needed
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
            parents: ['1HpJ-NI-rzT_HfDStxYcFeh-fTsePfTO5']  // Optional: specify a destination folder
        },
        media: {
            mimeType: mimeType,
            body: bufferStream
        },
        fields: 'id, webViewLink'
    });

    return response.data;
}



// Method
async function createPdf(fullName, fullInfo, amount, userName) {
    // Create a new instance of jsPDF
    const doc = new jsPDF();

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



    // Add since
    doc.setFontSize(8);
    doc.text(`(since 1954)`, 150, 20);

    // Add a title to the PDF
    doc.setFontSize(25);
    doc.setFont("helvetica", "bold");
    // doc.setTextColor(255, 0, 0); // Set text color to red (RGB format)
    doc.text("Navyug Gym Receipt", 60, 20);

    // Set font to bold

    // Reset font to normal for other text
    doc.setFont("helvetica", "normal");


    // Draw a horizontal line below the title (at Y = 25)
    doc.setLineWidth(0.5); // Optional: Set line width
    doc.line(20, 28, 190, 28); // Draw line from (20, 25) to (190, 25)


    // doc.setTextColor(0, 0, 0);   //Reset text color


    // Add Date
    doc.setFontSize(10);
    doc.text(`Date: ${formattedDate}`, 159, 37);
    // doc.text(`Thank you for registering, Dakshet!`, 20, 30);

    // Add some space
    doc.setFontSize(12);
    doc.text(`Name: ${fullName}`, 20, 43);

    doc.setFontSize(10);
    doc.text(`Email Id: ${fullInfo[1]}`, 20, 53);
    doc.text(`Phone no: +91 ${fullInfo[2]}`, 20, 63);
    doc.text(`Address: ${fullInfo[3]}`, 20, 73);

    // Add table headers
    // const headers = ['Name', 'Email', 'Amount'];
    // const rows = [
    //     [clientData.name, clientData.email, `$${clientData.amount}`]
    //     // ["Dakshet Ghole", "dakshghole@gmail.com", "2000"]
    // ];

    // Add table headers
    const headers = ['    Sr No.', '    Workout Type', '                 Plan Validity', '   Payment Method', ' Amount'];
    const rows = [
        ["       1", "           Gym", `    ${fullInfo[5]}    To    ${fullInfo[6]}`, "              Cash", `    ${amount}`],
        ["", "", "", "              Total", `    ${amount}`]
        // ["Dakshet Ghole", "dakshghole@gmail.com", "2000"]
    ];


    // Add a table to the PDF
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 83,  // Position where the table starts (adjust as needed)
        theme: 'grid', // You can customize the table style here (grid, stripped, etc.)
        headStyles: { fillColor: [192, 192, 192] }, // Custom color for header cells
        bodyStyles: { textColor: [0, 0, 0] }, // Black text color for body
        margin: { top: 20, left: 20 }, // Margin for the table
        tableWidth: 166,
        // columnStyles: {
        //     0: { cellWidth: 40 }, // Set width for the first column
        //     1: { cellWidth: 40 }, // Set width for the second column
        //     2: { cellWidth: 20 }, // Set width for the third column
        // },
        gridLineColor: [0, 0, 0], // Set the grid line color to dark black (RGB: [0, 0, 0])
    });


    doc.setFontSize(10);
    doc.text(`Received by:  Navyug Gym`, 20, 118);
    doc.text(`Received Signature:  ${userName}`, 20, 128);

    // Save or output the PDF
    // doc.save("gym-registration-receipt.pdf");
    const tempDir = os.tmpdir(); // Get temporary directory
    // Define the file path
    const outputPath = path.join(tempDir, "gym-registration-receipt.pdf");

    // Save or output the PDF
    const arrayBuffer = doc.output("arraybuffer");

    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(arrayBuffer);



    // Save the PDF
    fs.writeFileSync(outputPath, buffer);

    console.log(`PDF saved at: ${outputPath}`);
    return outputPath; // Return the file path

}





// Method
async function createAdminPDF(formattedDate) {
    // Create a new instance of jsPDF
    const doc = new jsPDF();
    // Fetch the data
    let data = await fetchData();
    // Add metadata and title
    doc.setFontSize(8);
    doc.text(`(since 1954)`, 150, 20);
    doc.setFontSize(25);
    doc.setFont("helvetica", "bold");
    doc.text("Navyug Gym Receipt", 60, 20);
    doc.setFont("helvetica", "normal");
    doc.setLineWidth(0.5);
    doc.line(20, 28, 190, 28);
    doc.setFontSize(10);
    doc.text(`Date: ${formattedDate}`, 159, 37);
    doc.setFontSize(8);
    // Define starting Y position and page height
    let startY = 70;
    const pageHeight = doc.internal.pageSize.height;
    // Process each record
    const lineSpacing = 5; // Adjust spacing between lines
    for (let i = 0; i < data.length; i++) {
        // Check if adding the next block will overflow the page 
        if (startY + (10 * lineSpacing) > pageHeight - 3) { // Leave a bottom margin
            doc.addPage(); // Add a new page
            startY = 4;   // Reset the Y position for the new page
        }
        doc.text(`Name: ${data[i][0]}       Email: ${data[i][1]}      Mobile No: ${data[i][2]}`, 20, startY);
        startY += lineSpacing;
        doc.text(`Address: ${data[i][3]}`, 20, startY);
        startY += lineSpacing;
        doc.text(`File: ${data[i][4]}       Start Date: ${data[i][5]}       End Date: ${data[i][6]}        Date Of Birth: ${data[i][7]}`, 20, startY);
        startY += lineSpacing;
        doc.text(`Age: ${data[i][8]}        Blood Group: ${data[i][9]}        Workout Time: ${data[i][10]}        Fees Paid: ${data[i][11]}        Amount: ${data[i][12]}        Fees Receiver: ${data[i][13]}`, 20, startY);
        startY += lineSpacing;
        doc.text(`Before 5 Days Mail Send: ${data[i][14]}               Last Mail: ${data[i][15]}`, 20, startY);
        startY += lineSpacing + 8; // Add extra spacing after each record
    }
    // Save the PDF to a temporary location
    const tempDir = require('os').tmpdir();
    const outputPath = path.join(tempDir, "gym-admin-data.pdf");
    const arrayBuffer = doc.output("arraybuffer");
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);
    console.log(`PDF saved at: ${outputPath}`);
    return outputPath;
}




// Fetch All Data from sheet 1
async function sendMails(email, subject, text, secondEmail, attachments) {
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
                address: process.env.USER,
            }, // sender address
            // to: "bar@example.com, baz@example.com", // When we have list of receivers and here add gym mail account and our gym account.
            // to: "dakshsgholedt2000@gmail.com",
            to: `${email},${secondEmail}`,
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
async function sendAdminMails(email, subject, text, attachments) {
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
                address: process.env.USER,
            }, // sender address
            // to: "bar@example.com, baz@example.com", // When we have list of receivers and here add gym mail account and our gym account.
            // to: "dakshsgholedt2000@gmail.com",
            to: `${email}`,
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
            range: "UserData"
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
            range: "AdminData"
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

        // const imageLinkShree = driveResponse.webViewLink;
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


        // Checking empty rows
        let emptyIndex = 0;

        for (let i = 0; i < data.length; i++) {
            if (data[i].length === 0) {
                emptyIndex = i + 1;
                break;
            }
        }


        const sheets = await accessGoogleSheet();
        const auth = await getAuth();
        let response;


        //Store user data in the database
        if (emptyIndex !== 0) {
            emptyIndex -= 1;
            response = await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `UserData!A${emptyIndex + 2}`,
                valueInputOption: "USER_ENTERED",
                resource: { values: [[fullName, email, mobileNo, address, copyImageId, formattedDate, afterOneYearDate, dOB, age, bloodGroup, workoutTime, "No", "", "", "No", "No"]] }
            })
        }

        else {
            response = await sheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: "UserData",  //Specify the start cell
                valueInputOption: "USER_ENTERED",
                resource: { values: [[fullName, email, mobileNo, address, copyImageId, formattedDate, afterOneYearDate, dOB, age, bloodGroup, workoutTime, "No", "", "", "No", "No"]] }
            })
        }

        success = true;
        return res.status(200).json({ success, Result: response })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
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
        let index;

        //Validate the User
        for (let i = 0; i < data.length; i++) {

            if (data[i][2] === mobileNo) {
                isMobileNoVerify = true;
                index = i;
                break;
            }
        }


        if (isMobileNoVerify) {

            if (data[index][3] === password) {
                isPasswordVerify = true;
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
            const token = jwt.sign(payload, JWT_SECURE, { expiresIn: TOKEN_EXPIRATION });

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
        return res.status(500).json({ Error: "Internal Serval Error Occured!" })
    }
}


// Fetch Fees pending data
async function fetchFeesPendingData(req, res) {
    try {

        let dataArray = [];
        let data = await fetchData();


        for (let j = 0; j < data.length; j++) {

            if (data[j][11] === "No") {
                // console.log(data[j])
                dataArray.push(data[j]);
            }
        }

        // Sort in descending order (youngest first)
        dataArray.sort((a, b) => {
            const dateA = new Date(a[5].split('-').reverse().join('-'));
            const dateB = new Date(b[5].split('-').reverse().join('-'));
            return dateB - dateA;
        });


        success = true;
        return res.status(200).json({ success, Data: dataArray })



    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}



// Search User
async function searchUser(req, res) {
    try {

        const name = req.query.name;  //It is also accept name, surname and mobile number

        let fullName = name.toLowerCase();
        let dataArray = [];
        let data = await fetchData();


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

    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}


// Fetch data those are between before 5 days and end date 
async function feesDeadlineData(req, res) {
    try {

        // Add Date
        const currentDate = new Date();

        // Get individual components:
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // Months are 0-indexed
        const day = currentDate.getDate();


        // Fetch Data
        let data = await fetchData();
        let deadlineUserData = [];
        let firstName;
        const sheets = await accessGoogleSheet();
        let response;


        for (let item = 0; item < data.length; item++) {

            if (data[item].length !== 0) {

                let endDeadlineDate = data[item][6];
                const [endDay, endMonth, endYear] = endDeadlineDate.split("-").map(Number);

                endDeadlineDate = new Date(endYear, endMonth - 1, endDay)

                let previousDeadlineDate = new Date(endDeadlineDate);
                previousDeadlineDate.setDate(endDeadlineDate.getDate() - 5);


                let currentDate = new Date(year, month - 1, day)


                if (
                    previousDeadlineDate.getTime() <= currentDate.getTime() &&
                    currentDate.getTime() <= endDeadlineDate.getTime()
                ) {
                    deadlineUserData.push(data[item]);
                }

                if (previousDeadlineDate.getTime() === currentDate.getTime()) {

                    // Add Our Logic Here To store in the database i.e. YES
                    if (data[item][14] === "No") {
                        response = await sheets.spreadsheets.values.update({
                            spreadsheetId,
                            range: `UserData!O${item + 2}`,
                            valueInputOption: "USER_ENTERED",
                            resource: { values: [["Yes"]] }
                        })

                        firstName = data[item][0].split(" ")[0].charAt(0).toUpperCase() + data[item][0].split(" ")[0].slice(1);

                        await sendMailData("beforeFiveDays", data[item][1], firstName, data[item][6])

                    }
                }

                else if (currentDate.getTime() === endDeadlineDate.getTime()) {

                    // Add Our Logic Here To store in the database i.e. YES
                    if (data[item][15] === "No") {
                        response = await sheets.spreadsheets.values.update({
                            spreadsheetId,
                            range: `UserData!P${item + 2}`,
                            valueInputOption: "USER_ENTERED",
                            resource: { values: [["Yes"]] }
                        })

                        firstName = data[item][0].split(" ")[0].charAt(0).toUpperCase() + data[item][0].split(" ")[0].slice(1);

                        await sendMailData("endSubscription", data[item][1], firstName, data[item][6])

                    }

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
                        - Mahesh Wagh: +91 8291616435
                        - Suresh Tambe: +91 9870216612
                        - Santosh Mahaprolkar: +91 9969087553
                        - Piyush Londhe: +91 8355801745
                
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
                        - Mahesh Wagh: +91 8291616435
                        - Suresh Tambe: +91 9870216612
                        - Santosh Mahaprolkar: +91 9969087553
                        - Piyush Londhe: +91 8355801745
                    
We appreciate your commitment to fitness and look forward to supporting you on your journey at Navyug Gym. Don’t hesitate to reach out if you have any questions or need assistance.
        
Thank you for being a valued member of our gym family!
        
Warm regards,
The Navyug Gym Team
                `
            }

            await sendMails(email, subject, text, "navyuggym2025@gmail.com")

        }


        // Sort in Decending order (youngest first)
        deadlineUserData.sort((a, b) => {
            const dateA = new Date(a[5].split('-').reverse().join('-'));
            const dateB = new Date(b[5].split('-').reverse().join('-'));
            return dateB - dateA;
        });

        success = true;
        return res.status(200).json({ success, Data: deadlineUserData })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
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


        // Fetch Data
        let data = await fetchData();
        let deadlineUserData = [];
        const sheets = await accessGoogleSheet();
        const auth = await getAuth();

        // Obtain an authenticated client
        const drive = google.drive({ version: "v3", auth })


        for (let item = 0; item < data.length; item++) {

            if (data[item].length !== 0) {

                let previousEndDeadlineDate = data[item][6];
                const [endDay, endMonth, endYear] = previousEndDeadlineDate.split("-").map(Number);

                previousEndDeadlineDate = new Date(endYear, endMonth - 1, endDay)

                let endSubDeadlineDate = new Date(previousEndDeadlineDate);
                endSubDeadlineDate.setDate(endSubDeadlineDate.getDate() + 15);


                let currentDate = new Date(year, month - 1, day)

                if (previousEndDeadlineDate.getTime() < currentDate.getTime() && currentDate.getTime() <= endSubDeadlineDate.getTime()) {
                    deadlineUserData.push(data[item]);
                }
                else if (endSubDeadlineDate.getTime() < currentDate.getTime()) {

                    try {
                        responseDrive = drive.files.delete(
                            {
                                fileId: data[item][4],
                            })
                        response = await sheets.spreadsheets.values.clear({
                            spreadsheetId,
                            range: `UserData!A${item + 2}:P${item + 2} `,
                        })

                    } catch (error) {
                        console.log("Error during Deleting: ", error)
                    }
                }
            }

        }

        // Sort in Decending order (youngest first)
        deadlineUserData.sort((a, b) => {
            const dateA = new Date(a[5].split('-').reverse().join('-'));
            const dateB = new Date(b[5].split('-').reverse().join('-'));
            return dateB - dateA;
        });

        success = true;
        return res.status(200).json({ success, Data: deadlineUserData })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
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

            if (data[j][4] === fileId) {
                firstName = data[j][0]
                fullInfo = data[j]

                response = await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `UserData!L${j + 2}`,
                    valueInputOption: "USER_ENTERED",
                    resource: { values: [["Yes", amount, userName]] }
                })
            }
        }

        // Here get Full Name
        firstName = firstName.split(" ")[0].charAt(0).toUpperCase() + firstName.split(" ")[0].slice(1);

        let lastName = fullInfo[0].split(" ")[1].charAt(0).toUpperCase() + fullInfo[0].split(" ")[1].slice(1);

        let fullName = firstName + " " + lastName;


        // Full Name and meta data send to the pdf method.

        const pdfPath = await createPdf(fullName, fullInfo, amount, userName);

        // Create attachments
        let attachments = [
            {
                filename: "gym-registration-receipt.pdf",
                path: pdfPath,
                contentType: "application/pdf"
            },
        ]



        // Gmail data
        let subject = "Welcome to Navyug Gym! Your Membership is Approved! 🎉"
        let text = `
Dear ${firstName},
We’re thrilled to welcome you to Navyug Gym! Your membership registration has been approved, and we look forward to being a part of your fitness journey.

Here are the next steps and some important details:
    1] Getting Started: Our team will provide a guided orientation of our facilities on your first visit.Feel free to ask any questions to make the most out of your experience with us!
    2] Schedule and Timing: Navyug Gym is open from:- Monday to Saturday: 6:00 AM to 10:00 AM and 4:00 PM to 10:00 PM.
    3] Stay Connected: 
            - Join our official WhatsApp group for updates and announcements: https://chat.whatsapp.com/Csig12I7EnyH3l2G4Aaafl.
            - If you have any questions, please reach out to us via email at navyuggym@gmail.com or contact our team directly:
                    - Mahesh Wagh: +91 8291616435
                    - Suresh Tambe: +91 9870216612
                    - Santosh Mahaprolkar: +91 9969087553
                    - Piyush Londhe: +91 8355801745

What to Bring on Your First Day:
- Gym attire and any personal equipment you might need.
- A positive attitude and enthusiasm for a great workout!

Please Note: We have attached a document to this email with additional details about your membership.Kindly review it for a smooth start with us.

Thank you for choosing Navyug Gym.We are excited to help you achieve your fitness goals!

Best regards,
Navyug Gym Team
        `

        // let attachments = [
        //     {
        //         filename: "Receipt.pdf",
        //         path: path.join(__dirname, "../files/Receipt.pdf"),
        //         contentType: "application/pdf"
        //     },
        // ]


        if (response.status === 200) {
            await sendMails(fullInfo[1], subject, text, "navyuggym2025@gmail.com", attachments);
        }

        success = true;
        return res.status(200).json({ success, Data: "Successfully Add Member" })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
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

            if (data[j][4] === fileId) {

                try {
                    responseDrive = drive.files.delete(
                        {
                            fileId: fileId,
                        })
                    response = await sheets.spreadsheets.values.clear({
                        spreadsheetId,
                        range: `UserData!A${j + 2}:Q${j + 2}`,
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
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}


// Using Google drive image.
async function fetchImage(req, res) {
    try {
        // let imageUrl = "https://res.cloudinary.com/dpkaxrntd/image/upload/v1729657532/iqgpcl1hnra06rdi1e93.jpg"

        let fileId = req.params.id;

        let imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`

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
            imageLink: `data:${imageMimeType};base64,${imageBase64}`,
        });
        // return res.status(200).json({ success: true, imageUrl });



    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}




// Fetch Home data


// Fetch Home data
async function fetchHomeData(req, res) {
    try {

        const userId = req.user.id;
        let data = await fetchData();
        let adminData = await fetchAdminData();
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

        let actuallyMember = [];

        let currentDate = new Date();

        // Get individual components:
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // Months are 0-indexed
        const day = currentDate.getDate();

        // Format the date:
        const formattedDate
            = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;


        //Validate the User
        for (let i = 0; i < adminData.length; i++) {

            // Admin Verification
            if (adminData[i][2] === userId) {
                adminFirstName = adminData[i][0].split(" ")[0]
                break;
            }
        }


        let subject = "Welcome to Navyug Gym! Your Membership Data! 🎉"
        let text = `
Dear Daksh,

Best regards,
Navyug Gym Team
        `


        // Update data for sending email to Main Admin
        const sheets = await accessGoogleSheet();
        let response;

        let previousDate = adminData[0][4];
        const [endDay, endMonth, endYear] = previousDate.split("-").map(Number);
        previousDate = new Date(endYear, endMonth - 1, endDay);

        currentDate = new Date(year, month - 1, day)

        if (previousDate.getTime() !== currentDate.getTime()) {

            response = await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `AdminData!E2`,
                valueInputOption: "USER_ENTERED",
                resource: { values: [[formattedDate]] }
            })

            // console.log(response);
            const pdfPath = await createAdminPDF(formattedDate);

            let attachments = [
                {
                    filename: "gym-admin-data.pdf",
                    path: pdfPath,
                    contentType: "application/pdf"
                },
            ]

            if (response.status === 200) {
                await sendAdminMails("dakshghole@gmail.com", subject, text, attachments);
            }
        }


        for (let j = 0; j < data.length; j++) {
            // Member type: Insider or Outsider
            if (data[j][12] === "2000") {
                insiderMembers++;
                actuallyMember.push(data[j]);

            } else if (data[j][12] === "4000") {
                outsiderMembers++;
                actuallyMember.push(data[j]);
            }

        }

        for (let j = 0; j < actuallyMember.length; j++) {

            // Time slot: Morning or Evening
            if (actuallyMember[j][10] === "Morning") {
                morningMembers++;
            } else if (actuallyMember[j][10] === "Evening") {
                eveningMembers++;
            }

            // Age categories - Only one of these will execute per iteration
            const age = actuallyMember[j][8];
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


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}





// Fetch data those according the month name
async function fetchDataMonthWise(req, res) {
    try {

        // Fetch Month Number
        const monthNum = req.params.month;


        // Fetch Data
        let data = await fetchData();
        let monthWiseData = [];


        for (let item = 0; item < data.length; item++) {

            if (data[item][15] === "No" && data[item][11] === "Yes" && (data[item][5].split('-')[1]) === monthNum) {

                monthWiseData.push(data[item])
            }

        }


        // Sort in Decending order (youngest first)
        monthWiseData.sort((a, b) => {
            const dateA = new Date(a[5].split('-').reverse().join('-'));
            const dateB = new Date(b[5].split('-').reverse().join('-'));
            return dateB - dateA;
        });

        success = true;
        return res.status(200).json({ success, Data: monthWiseData })


    } catch (error) {
        console.log(error.message);
        success = false;
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
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
    fetchHomeData,
    feesSubscriptionEndData,
    fetchDataMonthWise
}

