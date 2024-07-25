const { getPaymentHistory, calculateMonthlyFees, makePayment, getOutstandingAmount } = require("../controller/paymentController")
const { requireAuth } = require("../middleware/protected")

const router = require("express").Router()

router
    .get('/fess', requireAuth, calculateMonthlyFees)
    .get('/outstanding', requireAuth, getOutstandingAmount)
    .post('/record', requireAuth, makePayment)
    .post('/history', requireAuth, getPaymentHistory)


module.exports = router

