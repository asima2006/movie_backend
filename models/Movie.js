const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: { type: String, required: true }, // S3 URL
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Movie', movieSchema);