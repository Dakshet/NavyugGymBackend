const express = require("express");

// Import
const userRoute = require("./routes/user");
const cors = require("cors");


//Variables
const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://navyug-gym-frontend.vercel.app";



// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }))


// Engine


// Cors
app.use(cors({
    origin: [FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "auth_token"],
    credentials: true,
}))


// Routes
app.get('/', (req, res) => {
    return res.json("The Dakshet Ghole");
});

app.use("/user", userRoute);


// Listen
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});