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
            console.log(error.message);
            return res.json(500).json({ Error: "Internal Serval Error Occured!" })
        }

    } catch (error) {
        console.log(error.message);
        return res.json(500).json({ Error: "Internal Serval Error Occured!" })
    }
}

module.exports = {
    fetchUser,
}