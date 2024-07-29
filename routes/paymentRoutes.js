const { getPaymentHistory, makePayment, calculateMonthlyFees } = require("../controller/paymentController")
const { requireAuth } = require("../middleware/protected")

const router = require("express").Router()

router
    .get('/fess', requireAuth, calculateMonthlyFees)
    .post('/record', requireAuth, makePayment)
    .post('/history', requireAuth, getPaymentHistory)


module.exports = router

