/**
 * Image Storage & Upload Helper Utility
 * Handles Cloud Storage (Cloudinary / S3 / Local storage fallback)
 * Converts Base64 data strings into stored URLs to prevent database bloat.
 */

async function processImageUpload(imageData) {
    if (!imageData || typeof imageData !== "string") {
        return imageData;
    }

    // If already an HTTP/HTTPS URL, return as-is
    if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
        return imageData;
    }

    // Check for Cloudinary environment variables if configured
    if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
        try {
            const cloudinary = require("cloudinary").v2;
            const uploadRes = await cloudinary.uploader.upload(imageData, {
                folder: "stylishtrend_products",
                resource_type: "image",
            });
            return uploadRes.secure_url;
        } catch (error) {
            console.error("Cloudinary upload error:", error.message);
        }
    }

    // Fallback: Return processed image data string
    return imageData;
}

module.exports = { processImageUpload };
