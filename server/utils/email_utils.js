const nodemailer = require('nodemailer');

const sendEmail = async (options) => {

  const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', 
  port: 465,             
  secure: true,     
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  
  connectionTimeout: 10000, 
});

  const mailOptions = {
    from: `IntelliConsult <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    // Optional: throw error so your API knows it failed
    // throw new Error('Email could not be sent'); 
  }
};

module.exports = sendEmail;