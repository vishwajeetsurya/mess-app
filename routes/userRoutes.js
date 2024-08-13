const { registerUser, loginUser, updateUserProfile, logoutUser, forgotPassword, resetPassword, resetMessData } = require("../controller/userController")
const { requireAuth } = require("../middleware/protected")

const router = require("express").Router()

router
    .post("/register", registerUser)
    .post("/login", loginUser)
    .post("/resetmess", requireAuth, resetMessData)
    .put("/update/:id", updateUserProfile)
    .put("/reset", resetPassword)
    .post("/forgot", forgotPassword)
    .post("/logout", logoutUser)

module.exports = router



