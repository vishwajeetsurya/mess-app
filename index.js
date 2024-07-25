const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const mongoose = require("mongoose")
require("dotenv").config({ path: "./.env" })

mongoose.connect(process.env.MONGO_URL)

const app = express()
app.use(express.json())


app.use(cors());


app.use(cookieParser())

app.use("/api/user", require("./routes/userRoutes"))
app.use("/api/payment", require("./routes/paymentRoutes"))
app.use("/api/attendance", require("./routes/attendanceRoutes"))

app.use("*", (req, res) => {
    res.status(404).json("resource not found")
})

app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message || "something went wrong" })
})


mongoose.connection.once("open", () => {
    console.log("MONGO CONNECTED");
    console.log("mongo connected")
    app.listen(process.env.PORT, console.log("Server running"))
})

