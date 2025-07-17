import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});

export const sendOTP = async (toEmail, otp) => {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: toEmail,
    subject: 'Your OTP Code',
    html: `<h3>Your OTP is: <strong>${otp}</strong></h3>`
  };
  await transporter.sendMail(mailOptions);
};
