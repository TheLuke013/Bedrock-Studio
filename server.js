const express = require('express');
const fileUpload = require('express-fileupload');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { convertingJavaModProcessing } = require('./src/tools/java-mod-converter/server');

const app = express();
const port = 3000;

app.use(cors());

app.use(fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

app.use(express.static(path.join(__dirname)));

const ensureDirs = ['server/uploads', 'server/extracted', 'server/output'];
ensureDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

app.post('/upload', (req, res) => {
    if (!req.files || !req.files.modFile) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const modFile = req.files.modFile;
    const uploadPath = path.join(__dirname, './server/uploads', modFile.name);

    modFile.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao salvar arquivo' });
        }

        try {
            const zip = new AdmZip(uploadPath);
            const outputDir = path.join(__dirname, './server/extracted', Date.now().toString());
            
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            zip.extractAllTo(outputDir, true);
            
            convertingJavaModProcessing();
            
            const convertedFileName = `converted-${Date.now()}.mcaddon`;
            const convertedFilePath = path.join(__dirname, './server/output', convertedFileName);
            
            if (!fs.existsSync(path.dirname(convertedFilePath))) {
                fs.mkdirSync(path.dirname(convertedFilePath), { recursive: true });
            }
            
            fs.writeFileSync(convertedFilePath, 'Arquivo convertido simulado');
            
            res.json({
                success: true,
                downloadUrl: `server/output/${convertedFileName}`,
                extractedFiles: zip.getEntries().map(entry => entry.entryName)
            });
        } catch (error) {
            res.status(500).json({ error: `Erro ao processar arquivo: ${error.message}` });
        }
    });
});

app.get('/server/output/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, './server/output', filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename);
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Link para página: http://localhost:${port}/index.html`);
});