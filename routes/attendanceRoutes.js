const { markAttendance, getAttendance } = require("../controller/attendanceController");
const { requireAuth } = require("../middleware/protected");

const router = require("express").Router()

router
    .get('/geta', getAttendance)
    .post('/mark', markAttendance)

module.exports = router

