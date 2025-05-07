/* eslint-env node */


import express from "express";
import cors from "cors";
import nodemailer from "nodemailer"
import multer from "multer";
import dotenv from "dotenv"
import process from "process"

dotenv.config({ path: './.env' });

const app = express();
app.use(cors());
app.use(express.json()); app.use(express.urlencoded({ extended: true }));


// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/send-email", upload.single("file"), async (req, res) => {
    const { name, email, phone, message, recipientEmail } = req.body;
    const file = req.file;


    // Email transporter setup
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.BUSINESS_EMAIL,
            pass: process.env.BUSINESS_PASSWORD
        },
        port: 587,
        secure: false
    });

    // Email content
    const mailOptions = {
        from: email,
        to: recipientEmail,
        // [process.env.PERSONAL_EMAIL, process.env.BUSINESS_EMAIL],
        subject: "New Application",
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}\nPhone Number: ${phone}`,
        attachments: file ? [{ filename: file.originalname, content: file.buffer }] : []
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).send("Email sent successfully!");
    } catch (error) {
        console.error("⚠️ Error sending email:", error);
        res.status(500).send("Error sending email" + error.message);
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
console.log("BUSINESS_EMAIL:", process.env.BUSINESS_EMAIL);
console.log("PERSONAL_EMAIL:", process.env.PERSONAL_EMAIL);
