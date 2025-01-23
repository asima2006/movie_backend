const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const dotenv = require('dotenv');
dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const uploadVideo = async (file) => {
    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `movies/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ACL: 'public-read',
        },
        partSize: 1024 * 1024 * 1024, // 5 MB chunks
        leavePartsOnError: false,  // cleanup on error
    });

    return upload.done();
};

module.exports = { uploadVideo, s3Client };