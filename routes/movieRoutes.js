const express = require('express');
const multer = require('multer');
const Movie = require('../models/Movie');
const router = express.Router();
const dotenv = require('dotenv');
const { uploadVideo, s3Client } = require('../config/s3');
const { GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const listParams = {
    Bucket: 'moviesstore',
    Prefix: 'movies/'
};

dotenv.config();

const upload = multer(); // Simple in-memory storage for multer

router.post('/upload', upload.single('movie'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await uploadVideo(req.file);
        console.log("Working Upload");

        const newMovie = new Movie({
            title: result.Key.split('/')[1], // Extract filename from S3 Key
            videoUrl: result.Location, // S3 URL
        });

        await newMovie.save();
        res.status(201).json({ message: 'Movie uploaded successfully', movie: newMovie });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload movie' });
    }
});

// Stream Movie from S3
router.get('/stream/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        console.log("Working Stream");

        const range = req.headers.range;
        if (!range) {
            return res.status(400).send('Requires Range header');
        }

        const videoParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: movie.videoUrl.split('.com/')[1], // Extract the key from the URL
        };

        // Debugging log
        // console.log('Fetching video with params:', videoParams);

        // Get video metadata
        const headResult = await s3Client.send(new HeadObjectCommand(videoParams));
        // console.log('Video metadata:', headResult);
        const videoSize = headResult.ContentLength;

        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;

        if (start >= videoSize) {
            return res.status(416).send('Requested range not satisfiable');
        }

        const chunkSize = (end - start) + 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${videoSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': headResult.ContentType,
        });

        const streamParams = {
            ...videoParams,
            Range: `bytes=${start}-${end}`,
        };

        const result = await s3Client.send(new GetObjectCommand(streamParams));
        const videoStream = result.Body;

        if (videoStream && typeof videoStream.pipe === 'function') {
            videoStream.pipe(res);
        } else {
            throw new Error('Video stream is not available');
        }
    } catch (error) {
        console.error('Error streaming video:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream movie' });
        }
    }
});

router.get('/:id', async (req, res) => {
    try {
        const movies = await Movie.findById(req.params.id);
        // console.log(movies);
        console.log("Working ID");
        res.status(200).json(movies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

module.exports = router;
