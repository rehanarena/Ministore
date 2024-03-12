const multer = require("multer");
const path = require("path");
const sharp = require('sharp');

const storageProduct = multer.diskStorage({
 destination: function (req, file, cb) {
    cb(null,  "./public/uploads/images/");
 },
 filename: function (req, file, cb) {
    // Sanitize the file name to prevent security vulnerabilities
    const sanitizedName = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, sanitizedName + "_" + Date.now() + path.extname(file.originalname));
 },
});

const uploadProduct = multer({ 
 storage: storageProduct,
 fileFilter: function (req, file, cb) {
    // Validate file type and size here
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
 }
});

const productImagesUpload = uploadProduct.fields([
 { name: "image1", maxCount: 1 },
 { name: "image2", maxCount: 1 },
 { name: "image3", maxCount: 1 },
 { name: "image4", maxCount: 1 },
]);

// Example function to process an image with sharp
async function processImage(filePath) {
 try {
    await sharp(filePath)
      .resize(500) // Resize to a width of 500 pixels
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toFile(filePath.replace(path.extname(filePath), '.jpeg')); // Save as JPEG
 } catch (error) {
    console.error('Error processing image:', error);
 }
}
const profileStorage = multer.diskStorage({
   destination : ( req, file, cb ) => {
       cb( null, './public/uploads/profile-images/')
   },
   filename : ( req, file, cb ) => {
       const filename = file.originalname
       const uniqueName = Date.now() + '-' + filename
       cb( null, uniqueName )
   }
})

module.exports = {
 productImagesUpload,
 processImage, // Export the image processing function if you want to use it elsewhere
 profileUpload: multer({storage : profileStorage}),
};
