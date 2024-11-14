const express = require("express");
const { createUser, loginAdmin, fetchFeesPendingData, searchUser, feesDeadlineData, acceptFeesPayment, deletePendingUserData, fetchImage, fetchHomeData, feesSubscriptionEndData } = require("../controllers/user");
const { fetchUser } = require("../middleware/fetchUser");
const multer = require('multer')

const router = express.Router();


// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './files')
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + file.originalname;
//         cb(null, uniqueSuffix)
//     }
// })

// const upload = multer({ storage: storage })


// Custom Storage engine for multer
const googleDriveStorage = multer.memoryStorage();

const upload = multer({ storage: googleDriveStorage });



router.post("/signup", upload.single("uPhoto"), createUser);
router.post("/login/admin", loginAdmin);
router.get("/admin/feespending", fetchUser, fetchFeesPendingData);
router.get("/admin/search/", fetchUser, searchUser);
router.get("/admin/feesdeadline", fetchUser, feesDeadlineData);
router.put("/admin/feesaccept/:id", fetchUser, acceptFeesPayment);
router.delete("/admin/deletedata/:id", fetchUser, deletePendingUserData);
router.get("/admin/fetchimage", fetchImage)
// router.post("/admin/sanitize", fetchImageDrive)
router.get("/admin/homedata", fetchUser, fetchHomeData);
router.get("/admin/feesend", fetchUser, feesSubscriptionEndData);


module.exports = router;