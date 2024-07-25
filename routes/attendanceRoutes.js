const { markAttendance, getAttendance, updateAttendance, getAttendanceReport, countPresentEntries } = require("../controller/attendanceController")
const { requireAuth } = require("../middleware/protected");

const router = require("express").Router()

router
    .get('/get', requireAuth, getAttendance)
    .get('/count', requireAuth, countPresentEntries)
    .post('/report', requireAuth, getAttendanceReport)
    .post('/mark', requireAuth, markAttendance)
    .put('/update/:id', requireAuth, updateAttendance)

module.exports = router

