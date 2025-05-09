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


///////////////////////////////////
///////////////////////////////////
///////////////////////////////////import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import multer from "multer";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import process from "process"; import cors from "cors";
import path from "path";
import express from "express";

dotenv.config({ path: "./.env" });

const app = express();
app.use(cors()); // Allow all origins for now (change later if needed)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define directories
const JOBS_FILE = path.join(__dirname, "JsonFiles/Jobs.json"); // Ensure path works in Render
const IMAGE_UPLOAD_DIR = path.join(__dirname, "Uploads"); // Ensure uploads work in Render

// Ensure upload directory exists
if (!fs.existsSync(IMAGE_UPLOAD_DIR)) {
    fs.mkdirSync(IMAGE_UPLOAD_DIR, { recursive: true });
}

// Serve static files from the uploads directory
app.use("/uploads", express.static(IMAGE_UPLOAD_DIR));

// Function to read jobs from JSON file
const readJobs = () => {
    try {
        const data = fs.readFileSync(JOBS_FILE, "utf8");
        return JSON.parse(data);
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

// ✅ Get all jobs
app.get("/jobs", (req, res) => {
    const jobs = readJobs();
    console.log("✅ Fetched jobs:", jobs); // Debug log
    res.json(jobs.length ? jobs : { message: "⚠️ No jobs available!" });
});

// ✅ Get job by ID
app.get("/jobs/:id", (req, res) => {
    const jobs = readJobs();
    const job = jobs.find((j) => j.id === parseInt(req.params.id));
    job ? res.json(job) : res.status(404).json({ message: "⚠️ Job not found!" });
});

// ✅ Add a new job with image upload
app.post("/jobs", upload.single("image"), (req, res) => {
    const jobs = readJobs();
    if (!req.body.name || !req.body.experience || !req.body.location || !req.body.description) {
        return res.status(400).json({ message: "⚠️ Missing required fields" });
    }

    const newJob = {
        id: jobs.length ? jobs[jobs.length - 1].id + 1 : 1,
        name: req.body.name,
        experience: req.body.experience,
        location: req.body.location,
        description: req.body.description,
        image: req.file ? `https://serverbackend-3kyd.onrender.com/uploads/${req.file.filename}` : null,
    };

    jobs.push(newJob);
    writeJobs(jobs);

    console.log("✅ Job added:", newJob); // Debug log

    res.json({ message: "✅ Job added successfully!", job: newJob });
});

// ✅ Update a job
app.put("/jobs/:id", upload.single("image"), (req, res) => {
    const jobId = parseInt(req.params.id);
    let jobs = readJobs();

    const jobIndex = jobs.findIndex((job) => job.id === jobId);
    if (jobIndex === -1) return res.status(404).json({ message: "⚠️ Job not found!" });

    jobs[jobIndex] = {
        ...jobs[jobIndex],
        ...req.body,
        image: req.file ? `https://serverbackend-3kyd.onrender.com/uploads/${req.file.filename}` : jobs[jobIndex].image,
    };

    writeJobs(jobs);
    console.log("✅ Job updated:", jobs[jobIndex]); // Debug log

    res.json({ message: "✅ Job updated successfully!", job: jobs[jobIndex] });
});

// ✅ Delete a job
app.delete("/jobs/:id", (req, res) => {
    const jobId = parseInt(req.params.id);
    let jobs = readJobs();

    const updatedJobs = jobs.filter((job) => job.id !== jobId);
    if (jobs.length === updatedJobs.length) return res.status(404).json({ message: "⚠️ Job not found!" });

    writeJobs(updatedJobs);
    console.log("✅ Job deleted:", jobId); // Debug log

    res.json({ message: "✅ Job removed successfully!" });
});

// ✅ Contact form email setup
app.post("/send-email", upload.single("file"), async (req, res) => {
    try {
        const { name, email, phone, message, recipientEmail } = req.body;
        const file = req.file;

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
            attachments: file ? [{ filename: file.originalname, content: file.buffer, contentType: file.mimetype }] : [],
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "✅ Email sent successfully!" });
    } catch (error) {
        console.error("⚠️ Error sending email:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// ✅ Root Endpoint to Test Server
app.get("/", (req, res) => {
    res.send({ message: "🚀 Backend is running on Render!" });
});

// ✅ Check Server Health
app.get("/health", (req, res) => {
    res.json({ status: "Running", uptime: process.uptime() });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
