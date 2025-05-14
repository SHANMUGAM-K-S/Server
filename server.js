/* eslint-env node */


// import express from "express";
// import cors from "cors";
// import nodemailer from "nodemailer"
// import multer from "multer";
// import dotenv from "dotenv"
// import process from "process"

// dotenv.config({ path: './.env' });

// const app = express();
// app.use(cors());
// app.use(express.json()); app.use(express.urlencoded({ extended: true }));


// // Multer setup for file uploads
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// app.post("/send-email", upload.single("file"), async (req, res) => {
//     const { name, email, phone, message, recipientEmail } = req.body;
//     const file = req.file;


//     // Email transporter setup
//     const transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//             user: process.env.BUSINESS_EMAIL,
//             pass: process.env.BUSINESS_PASSWORD
//         },
//         port: 587,
//         secure: false
//     });

//     // Email content
//     const mailOptions = {
//         from: email,
//         to: recipientEmail,
//         // [process.env.PERSONAL_EMAIL, process.env.BUSINESS_EMAIL],
//         subject: "New Application",
//         text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}\nPhone Number: ${phone}`,
//         attachments: file ? [{ filename: file.originalname, content: file.buffer }] : []
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         res.status(200).send("Email sent successfully!");
//     } catch (error) {
//         console.error("⚠️ Error sending email:", error);
//         res.status(500).send("Error sending email" + error.message);
//     }
// });

// app.listen(5000, () => console.log("Server running on port 5000"));
// console.log("BUSINESS_EMAIL:", process.env.BUSINESS_EMAIL);
// console.log("PERSONAL_EMAIL:", process.env.PERSONAL_EMAIL);import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import multer from "multer";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import process from "process";
import path from "path";
import express from 'express'

dotenv.config({ path: "./.env" });

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define directories
const JOBS_FILE = path.join(__dirname, "../src/JsonFiles/Jobs.json");
const IMAGE_UPLOAD_DIR = path.join(__dirname, "Uploads");

// Ensure upload directory exists
if (!fs.existsSync(IMAGE_UPLOAD_DIR)) {
    fs.mkdirSync(IMAGE_UPLOAD_DIR, { recursive: true });
    console.log("✅ Uploads directory created!");
}
// Serve static files from the uploads directory
app.use("/uploads", express.static(IMAGE_UPLOAD_DIR));


// Function to read jobs from JSON file
const readJobs = () => {
    try {
        if (!fs.existsSync(JOBS_FILE)) {
            console.log("⚠️ Jobs.json not found, creating a new one.");
            fs.writeFileSync(JOBS_FILE, "[]", "utf8"); // ✅ Ensure file starts with valid JSON
        }

        const data = fs.readFileSync(JOBS_FILE, "utf8");
        return data.trim() ? JSON.parse(data) : []; // ✅ Prevent SyntaxError on empty file
    } catch (err) {
        console.error("⚠️ Error reading job file:", err);
        return [];
    }
};


// Function to write jobs to JSON file
const writeJobs = (jobs) => {
    try {
        fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf8");
        console.log("✅ Jobs saved successfully!");
    } catch (err) {
        console.error("⚠️ Error writing job file:", err);
    }
};



// Multer file storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, IMAGE_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Get all jobs
app.get("/jobs", (req, res) => {
    res.json(readJobs());
});

// Add a new job with manual Job ID and description
app.post("/jobs", upload.single("image"), (req, res) => {
    const jobs = readJobs();
    if (!req.body.id || !req.body.name || !req.body.experience || !req.body.location || !req.body.description) {
        return res.status(400).json({ message: "⚠️ Missing required fields" });
    }

    const newJob = {
        id: req.body.id, // ✅ Now takes manually entered Job ID
        name: req.body.name,
        experience: req.body.experience,
        location: req.body.location,
        description: req.body.description, // ✅ Added Job Description field
        image: req.file ? `https://server-2-o6o3.onrender.com/uploads/${req.file.filename}` : null

    };

    jobs.push(newJob);
    writeJobs(jobs);

    res.json({ message: "✅ Job added successfully!", job: newJob });
});

// Update a job (Job ID remains unchanged)
app.put("/jobs/:id", upload.single("image"), (req, res) => {
    const jobId = req.params.id;
    let jobs = readJobs();

    const jobIndex = jobs.findIndex((job) => job.id === jobId);
    if (jobIndex === -1) return res.status(404).json({ message: "⚠️ Job not found!" });

    jobs[jobIndex] = {
        ...jobs[jobIndex],
        name: req.body.name || jobs[jobIndex].name,
        experience: req.body.experience || jobs[jobIndex].experience,
        location: req.body.location || jobs[jobIndex].location,
        description: req.body.description || jobs[jobIndex].description, // ✅ Ensure job description updates correctly
        image: req.file ? `http://localhost:5000/uploads/${req.file.filename}` : jobs[jobIndex].image,
    };

    writeJobs(jobs);

    res.json({ message: "✅ Job updated successfully!", job: jobs[jobIndex] });
});

// Delete a job
app.delete("/jobs/:id", (req, res) => {
    const jobId = req.params.id;
    let jobs = readJobs();

    const updatedJobs = jobs.filter((job) => job.id !== jobId);
    if (jobs.length === updatedJobs.length) return res.status(404).json({ message: "⚠️ Job not found!" });

    writeJobs(updatedJobs);

    res.json({ message: "✅ Job removed successfully!" });
});

// Contact form email setup
app.post("/send-email", upload.single("file"), async (req, res) => {
    try {
        const { name, email, phone, message, recipientEmail } = req.body;
        const file = req.file;

        if (!recipientEmail) {
            return res.status(400).json({ message: "⚠️ Recipient email missing." });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.BUSINESS_EMAIL,
                pass: process.env.BUSINESS_PASSWORD,
            },
            port: 587,
            secure: false,
        });

        const mailOptions = {
            from: email,
            to: recipientEmail,
            subject: "New Application",
            text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}\nPhone Number: ${phone}`,
            attachments: file ? [{ filename: file.originalname, content: file.buffer }] : [],
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "✅ Email sent successfully!" });

    } catch (error) {
        console.error("⚠️ Error sending email:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
