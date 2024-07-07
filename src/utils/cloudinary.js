import { v2 as cloudinary } from 'cloudinary';
import { response } from 'express';
import fs from "fs"


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnClodinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload the file on clodinary
        const responseUrl =  await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been successfully uploaded
        fs.unlinkSync(localFilePath)
        return responseUrl;

    } catch (error) {
        // remove the locally saved temporarily files as the upload operation got failed
        fs.unlinkSync(localFilePath)
        return null;

    }
}

export {uploadOnClodinary}