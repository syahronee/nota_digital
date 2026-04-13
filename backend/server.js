const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors()); // 🔥 WAJIB INI
app.use(express.json());

app.post("/create-qris", async (req, res) => {
  const { amount } = req.body;

  try {
    const response = await axios.post(
      "https://api.xendit.co/qr_codes",
      {
        external_id: "nota-" + Date.now(),
        type: "DYNAMIC",
        amount: amount,
      },
      {
        auth: {
          username: "YOUR_API_KEY",
          password: ""
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: "Gagal buat QRIS" });
  }
});

app.listen(3000, () => {
  console.log("Server jalan di http://localhost:3000");
});