const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
title: { type: String, required: true },
message: { type: String, required: true },
link: { type: String }, // optional: where clicking goes
type: { type: String }, // e.g., 'info', 'alert', 'system'
read: { type: Boolean, default: false },
createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;

