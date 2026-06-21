import { cloudinary } from '../config/cloudinary';
import { logger } from '../utils/logger';

export class CloudinaryService {
    /**
     *@param filePath
     *@param folder 
     *@returns
    */
    static async upload(filePath: string, folder: string): Promise<{url: string; publicId: string; thumbnailUrl: string}> {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `immoplan/${folder}`,
            ressource_type: 'image',
            transformation: [{
                quality: 'auto',
                fetch_format: 'auto'
            }],
        });

        const thumbnailUrl = cloudinary.url(result.public_id, {
            transformation: [
                {width: 400, height: 300, crop: 'thumb', gravity: 'auto'},
                {quality: 'auto', fetch_format: 'auto'},
            ],
        });

        logger.debug(`Cloudinary upload: ${result.public_id}`);

        return {
            url: result.secure_url,
            publicId: result.public_id,
            thumbnailUrl,
        };
    }

    /**
     * @param buffer
     * @param folder
     * @returns
    */
    static async uploadBuffer(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
        return new Promise((resolve, reject) => {

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                folder: `immoplan/${folder}`,
                resource_type: 'auto',
                },
                (error, result) => {
                    if (error || !result) {
                        reject(error || new Error('Upload failed'));
                        return;
                    }
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                    });
                },
            );
            uploadStream.end(buffer);
        });
    }

    /**
     * @param publicId
    */
    static async destroy(publicId: string): Promise<void> {
        await cloudinary.uploader.destroy(publicId);
        logger.debug(`Cloudinary destroy: ${publicId}`);
    }
}