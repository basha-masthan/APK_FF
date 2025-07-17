import nodemailer from 'nodemailer';

// ✅ Configure transporter (use your real SMTP credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or 'hotmail', or use custom host
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});

// ✅ Send Email Function
export const sendVerificationEmail = async (toEmail, userName) => {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: toEmail,
    subject: '🎯 Account Registered Successfully',
    html: `<h3>Hello ${userName},</h3>
           <p>Thanks for registering for the tournament!</p>
           <p>We'll notify you with updates via this email.</p>`
  };

  await transporter.sendMail(mailOptions);
};
