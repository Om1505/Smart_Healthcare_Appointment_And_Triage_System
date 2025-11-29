<div align="center">
  <img src="https://www.daiict.ac.in/sites/default/files/inline-images/20250107DAUfinalIDcol_SK-01_0.png" alt="University Logo" width="300">
</div>

<div align="center">

# Project: Smart Healthcare Appointment and AI Triage System
### Course: IT314 SOFTWARE ENGINEERING
### University: Dhirubhai Ambani University
### Professor: Prof. Saurabh Tiwari

</div>

---

<div align="center">


## Group-1 Members

| Student ID         | Name             | GitHub |
| :----------------- | :--------------- | :----- |
| 202301027 (Leader) | Om Patel         | <a href="https://github.com/Om1505"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301001          | VED KOTADIYA     | <a href="https://github.com/404-brainnotfound-human"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301005          | ARYAN PATEL      | <a href="https://github.com/workloadoverdose2312"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301010          | VARSHIL PATEL    | <a href="https://github.com/varshil1234"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301013          | SMIT PARMAR      | <a href="https://github.com/smit549"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301037          | BHAVYA BODA      | <a href="https://github.com/Bhavya-2805"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301044          | KAVY SANGHANI    | <a href="https://github.com/KavySanghani"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301046          | DHRUV MALANI     | <a href="https://github.com/dhrxvm"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301054          | MANAV KALAVADIYA | <a href="https://github.com/ManavPatel54"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301059          | SHRADDHA RATHOD  | <a href="https://github.com/Shraddha260206a"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |
| 202301060          | NEERAJ VANIA     | <a href="https://github.com/NeerajVania"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="22"/></a> |


</div>

---

# IntelliConsult: Smart Healthcare Appointment and AI Triage System

---

## 📋 Table of Contents

- [Introduction](#introduction)
- [Deployed Website Link](#deployment)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Design](#design)

---

## Introduction

IntelliConsult is a healthcare management platform that helps patients book appointments, consult with doctors, and manage their medical records. The system includes features for appointment scheduling, AI-powered symptom triage, video consultations, prescription management, and review systems for both patients and doctors.

---

---

## Deployed Website Link

Here is the website link where you can use Intelliconsult: [https://smart-healthcare-appointment-and-triage.onrender.com/](url)

---

## Features

### 🎯 Core Features

- **🤖 AI Powered System**
  - Symptom analysis using AI
  - Recommendations based on symptoms

- **📅 Intelligent Appointment Scheduling**
  - Real-time doctor availability tracking
  - Multi-criteria search (specialty, availability)
  - Flexible scheduling with cancellation options

- **💊 Digital Prescription Management**
  - Electronic prescription generation and storage
  - Prescription history and tracking

- **📹 Video Consultations**
  - Video calls between patients and doctors
  - Screen sharing during consultations

- **📊 Dashboard**
  - View appointment history and upcoming appointments
  - Access prescriptions and medical records

- **👥 Multi-Role Support**
  - Patient portal with personalized features
  - Doctor dashboard with appointment and patient management
  - Admin panel for system administration
  - Role-based access control

- **⭐ Review and Rating System**
  - Patients can rate and review doctors
  - View doctor ratings and reviews

- **🔐 Secure Authentication**
  - JWT-based authentication
  - Google OAuth integration
  - Password reset functionality
  - Session management

---

## Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Vite** - Fast build tool and dev server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Axios** - HTTP client for API requests
- **ZegoCloud** - Video conferencing SDK
- **Vitest** - Unit testing framework
- **Testing Library** - React component testing

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Passport.js** - Authentication middleware
- **Bcrypt** - Password hashing
- **SendGrid/Nodemailer** - Email services
- **Razorpay** - Payment gateway integration
- **Groq SDK** - AI/LLM integration
- **PDFKit** - PDF generation

### DevOps & Tools
- **Git** - Version control


---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher) or **yarn**
- **MongoDB** (v6 or higher) - Local installation or MongoDB Atlas account
- **Git** for version control

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Om1505/Smart_Healthcare_Appointment_And_Triage_System.git
cd Smart_Healthcare_Appointment_And_Triage_System
```

### 2. Install Dependencies

Install root and client dependencies:

```bash
# Install root dependencies (includes server dependencies)
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/intelliconsult
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/intelliconsult

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@intelliconsult.com

# Razorpay (Payment Gateway)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# ZegoCloud (Video Conferencing)
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret

# Groq AI (AI Triage)
GROQ_API_KEY=your_groq_api_key

# Frontend URL
CLIENT_URL=http://localhost:5173
```

---

## Configuration

### MongoDB Setup

**Option 1: Local MongoDB**
1. Install MongoDB locally
2. Start MongoDB service
3. Use `mongodb://localhost:27017/intelliconsult` in your `.env`

**Option 2: MongoDB Atlas**
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env`

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs
6. Copy Client ID and Secret to `.env`

### Other Services
- **SendGrid**: Sign up at [SendGrid](https://sendgrid.com/) for email services
- **Razorpay**: Create account at [Razorpay](https://razorpay.com/) for payments
- **ZegoCloud**: Register at [ZegoCloud](https://www.zegocloud.com/) for video calls
- **Groq**: Get API key from [Groq](https://groq.com/) for AI features

---

## Running the Application

### Development Mode

1. **Start the MongoDB server** (if using local MongoDB)

2. **Start the backend server:**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:5000`

3. **Start the frontend development server** (in a new terminal):
   ```bash
   cd client
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

### Production Mode

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

---

## Project Structure

```
Smart_Healthcare_Appointment_And_Triage_System/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   │   ├── ui/         # UI component library (Radix UI)
│   │   │   ├── AITriageCard.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   └── ...
│   │   ├── pages/          # Page components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PatientDashboard.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   └── ...
│   │   ├── lib/            # Utility functions
│   │   └── Test/           # Test files
│   ├── public/             # Static assets
│   └── package.json
│
├── server/                 # Node.js backend application
│   ├── config/             # Configuration files
│   │   └── passport.js     # Passport authentication config
│   ├── middleware/         # Express middleware
│   │   ├── auth.js         # Authentication middleware
│   │   └── admin.js        # Admin authorization
│   ├── models/             # Mongoose data models
│   │   ├── Patient.js
│   │   ├── Doctor.js
│   │   ├── Appointment.js
│   │   └── ...
│   ├── routes/             # API route handlers
│   │   ├── auth.js
│   │   ├── appointments.js
│   │   ├── doctors.js
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   └── email_utils.js
│   └── server.js           # Main server file
│
├── Documentation/          # Project documentation
│   ├── SYSTEM DESIGN.pdf
│   ├── OBJECT DESIGN.pdf
│   ├── USE_CASE_DIAGRAM.pdf
│   └── Testing/
│
├── package.json            # Root package.json
└── README.md
```

---

## Design

[View the Figma Design](https://www.figma.com/design/pz66xFant8X7XStcmmRB6y/Smart_HealthCare_Triage_System?t=Otoaww9YIknDKcmk-1)

---

