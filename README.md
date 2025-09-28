# APK_FF


# 🏆 Winzone Arena – eTournament Application

Winzone Arena is a **web-based eSports tournament platform** where users can register, join tournaments, manage wallet balances, and earn rewards based on kills and wins.
This project was developed as a **freelancing project for DevloomLabs**.

---

## 🚀 Features

* 🔐 **User Authentication** – Register, login, and manage accounts securely
* 💰 **Wallet System** – Add funds, register for tournaments, and earn rewards
* 🎮 **Tournament Management** – Join matches with wallet balance and auto slot management
* 🏅 **Reward Distribution** – Earn coins for kills and wins, reusable for future games
* ☁️ **Cloud Storage** – Store tournament-related images with Cloudinary
* 📊 **Real-Time Updates** – Track tournament slots, registrations, and results

---

## 🛠️ Tech Stack

**Frontend:** HTML, CSS, JavaScript (basic UI)
**Backend:** Node.js, Express.js (RESTful APIs)
**Database:** MongoDB (Mongoose for schema management)
**Cloud Storage:** Cloudinary (for images & assets)
**Authentication:** JWT-based secure login

---

## 📂 Project Structure

```
winzone-arena/
├── backend/
│   ├── models/         # MongoDB models (User, Tournament, Transaction, Registration)
│   ├── routes/         # Express API routes
│   ├── controllers/    # Business logic
│   ├── middleware/     # JWT auth & validation
│   └── server.js       # Entry point
├── frontend/
│   ├── public/         # Static assets
│   ├── views/          # HTML templates
│   └── scripts/        # Client-side JS
└── README.md
```

---

## ⚡ API Endpoints (Examples)

| Method | Endpoint                    | Description                                   |
| ------ | --------------------------- | --------------------------------------------- |
| POST   | `/api/auth/register`        | Register new user                             |
| POST   | `/api/auth/login`           | Login user & get JWT token                    |
| GET    | `/api/tournaments`          | Fetch all tournaments                         |
| POST   | `/api/tournaments/join/:id` | Register for a tournament with wallet balance |
| POST   | `/api/wallet/add`           | Add funds to wallet                           |
| GET    | `/api/wallet/history`       | Get transaction history                       |

---

## 📸 Screenshots

(Add some UI screenshots here if available: login page, wallet, tournament list, match registration, etc.)

---

## ⚙️ Installation & Setup

1. Clone the repository

   ```bash
   git clone https://github.com/your-username/winzone-arena.git
   cd winzone-arena
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Setup **environment variables** in `.env`:

   ```env
   PORT=5000
   MONGO_URI=your_mongo_connection_string
   JWT_SECRET=your_secret_key
   CLOUDINARY_URL=your_cloudinary_url
   ```

4. Run the server

   ```bash
   npm start
   ```

---

## 🏗️ Future Enhancements

* 🎥 Live match streaming integration
* 📱 Mobile app version (React Native / Flutter)
* 🏆 Leaderboards & MVP highlights
* 💳 Razorpay/Stripe integration for wallet top-ups

---

## 👨‍💻 Developer

**Masthan Basha Shaik**
📧 [official4basha@gmail.com](mailto:official4basha@gmail.com)
🔗 [LinkedIn](https://www.linkedin.com/in/basha-masthan) | [GitHub](https://github.com/basha-masthan)

---

👉 Do you want me to also add a **demo section with sample test credentials** (like a demo user login) so recruiters can quickly test the app?
