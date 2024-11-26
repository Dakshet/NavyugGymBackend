const express = require("express");
const { createUser, loginAdmin, fetchFeesPendingData, searchUser, feesDeadlineData, acceptFeesPayment, deletePendingUserData, fetchImage, fetchHomeData, feesSubscriptionEndData, fetchDataMonthWise } = require("../controllers/user");
const { fetchUser } = require("../middleware/fetchUser");
const multer = require('multer')

const router = express.Router();


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
router.get("/admin/fetchimage/:id", fetchImage)
router.get("/admin/homedata", fetchUser, fetchHomeData);
router.get("/admin/feesend", fetchUser, feesSubscriptionEndData);
router.get("/admin/fetchmonthwise/:month", fetchDataMonthWise)


module.exports = router;