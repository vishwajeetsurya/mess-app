const { registerUser, loginUser, updateUserProfile, logoutUser, forgotPassword, resetPassword } = require("../controller/userController")

const router = require("express").Router()

router
    .post("/register", registerUser)
    .post("/login", loginUser)
    .put("/update/:id", updateUserProfile)
    .put("/reset", resetPassword)
    .post("/forgot", forgotPassword)
    .post("/logout", logoutUser)

module.exports = router



