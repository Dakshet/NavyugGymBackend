let success = false;
const jwt = require("jsonwebtoken")
const JWT_SECURE = process.env.JWT_SECURE;

const fetchUser = (req, res, next) => {
    try {
        const token = req.header("auth_token");

        if (!token) {
            success = false;
            return res.status(404).json({ success, Error: "Token is not found!" })
        }

        try {

            const payload = jwt.verify(token, JWT_SECURE);

            req.user = payload.user;

            next();

        } catch (error) {
            success = false;
            console.log(error.message);
            return res.status(400).json({ success, Error: "Invalid or expired token!" })
        }

    } catch (error) {
        success = false;
        console.log(error.message);
        return res.status(500).json({ success, Error: "Internal Serval Error Occured!" })
    }
}

module.exports = {
    fetchUser,
}