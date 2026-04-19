const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json());

app.post("/create-qris", async (req, res) => {
  const { amount, customerName } = req.body;

  try {
    const response = await axios.post(
      "https://api.xendit.co/qr_codes",
      {
        // External ID unik agar tidak bentrok di dashboard Xendit
        external_id: `vona-${Date.now()}`, 
        type: "DYNAMIC",
        callback_url: "https://vona-digital.vercel.app/callback", // Opsional
        amount: amount,
      },
      {
        auth: {
          // Mengambil Key dari Environment Variable di Vercel
          username: process.env.XENDIT_API_KEY || "YOUR_TEST_KEY_FOR_LOCAL",
          password: ""
        }
      }
    );

    // Kirim data lengkap ke frontend
    // Di frontend nanti, ambil: response.data.qr_string
    res.json(response.data);

  } catch (err) {
    console.error("Xendit Error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: "Gagal buat QRIS" });
  }
});

// Port untuk jalan di lokal
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server VONA jalan di port ${PORT}`);
});

// WAJIB UNTUK VERCEL
module.exports = app;