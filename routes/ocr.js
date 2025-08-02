const express = require('express');
const router = express.Router();
const tesseract = require('tesseract.js');
const multer = require('multer');
const MatchRegistration = require('../models/MatchRegistration');

const upload = multer({ dest: 'uploads/' });

router.post('/ocr-validate/:registrationId', upload.single('screenshot'), async (req, res) => {
  try {
    const reg = await MatchRegistration.findById(req.params.registrationId);
    if (!reg) return res.status(404).json({ error: 'Registration not found' });

    const imagePath = req.file.path;
    console.log(`🧠 Running OCR on: ${imagePath}`);

    const result = await tesseract.recognize(imagePath, 'eng', {
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.#/ ',
      logger: m => console.log(m) // debug
    });

    const text = result.data.text;
    console.log('🔍 OCR Output:\n', text);

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // 🔍 Extract Kills (value after "K")
    let kills = null;
    const kIndex = lines.findIndex(line => /^K$/i.test(line));
    if (kIndex !== -1 && lines[kIndex + 1]) {
      kills = lines[kIndex + 1].replace(/[^0-9]/g, '');
    }

    // 🔍 Extract Placement like "#21/40"
    const placementMatch = text.match(/#?\s*(\d{1,2}\/\d{1,2})/);
    const placement = placementMatch?.[1] || null;

    // ✅ Save to DB if found
    if (kills && placement) {
      reg.kills = parseInt(kills);
      reg.position = placement;
      reg.screenshotVerified = true;
      await reg.save();

      return res.json({
        success: true,
        message: '✅ Kills and Placement extracted successfully',
        kills,
        placement
      });
    } else {
      return res.status(400).json({
        success: false,
        message: '❌ Could not extract both kills and placement',
        kills,
        placement,
        rawText: text
      });
    }

  } catch (err) {
    console.error('🚨 OCR ERROR:', err);
    res.status(500).json({ error: 'OCR process failed' });
  }
});

module.exports = router;
