const express = require('express');
const fileUpload = require('express-fileupload');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const { convertingJavaModProcessing } = require('./src/tools/java-mod-converter/index');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'cache/temp')
}));

app.use(express.static(path.join(__dirname)));

const ensureDirs = ['cache/uploads', 'cache/extracted', 'cache/output', 'cache/temp'];
ensureDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

const processingStatus = {};

app.post('/upload', async (req, res) => {
    if (!req.files || !req.files.modFile) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const modFile = req.files.modFile;
    const processId = Date.now().toString();
    const uploadPath = path.join(__dirname, 'cache/uploads', `${processId}_${modFile.name}`);

    processingStatus[processId] = {
        step: 'Recebendo arquivo',
        progress: 0,
        message: 'Iniciando processamento...'
    };

    modFile.mv(uploadPath, async (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao salvar arquivo' });
        }

        processingStatus[processId] = {
            step: 'Extraindo arquivo',
            progress: 20,
            message: 'Descompactando o arquivo JAR...'
        };

        try {
            const zip = new AdmZip(uploadPath);
            const outputDir = path.join(__dirname, 'cache/extracted', processId);
            
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            zip.extractAllTo(outputDir, true);
            
            processingStatus[processId] = {
                step: 'Analisando mod',
                progress: 40,
                message: 'Identificando tipo de mod e versão...'
            };
            
            convertingJavaModProcessing(outputDir, processId, (result) => {
                processingStatus[processId] = {
                    step: 'Convertendo',
                    progress: 70,
                    message: 'Convertendo para formato Bedrock...'
                };
                
                setTimeout(() => {
                    const convertedFileName = `converted-${result.name}.mcaddon`;
                    const convertedFilePath = path.join(__dirname, 'cache/output', convertedFileName);
                    
                    const outputZip = new AdmZip();
                    outputZip.addFile('manifest.json', Buffer.from(JSON.stringify({
                        format_version: 2,
                        header: {
                            name: result.name || "Mod Convertido",
                            description: result.description || "Mod convertido com Bedrock Studio",
                            uuid: uuidv4(),
                            version: [1, 0, 0],
                            min_engine_version: [1, 16, 0]
                        },
                        modules: [
                            {
                                type: "data",
                                uuid: uuidv4(),
                                version: [1, 0, 0]
                            }
                        ]
                    }, null, 2)));
                    
                    outputZip.writeZip(convertedFilePath);
                    
                    processingStatus[processId] = {
                        step: 'Concluído',
                        progress: 100,
                        message: 'Conversão finalizada com sucesso!',
                        downloadUrl: `/cache/output/${convertedFileName}`,
                        modInfo: result
                    };
                    
                    res.json({
                        success: true,
                        processId,
                        downloadUrl: `/cache/output/${convertedFileName}`,
                        modInfo: result
                    });
                }, 3000);
            });
            console.log("Processo concluido com sucesso");
        } catch (error) {
            res.status(500).json({ error: `Erro ao processar arquivo: ${error.message}` });
            console.log(`Erro ao processar arquivo: ${error.message}`);
        }
    });
});

app.get('/status/:processId', (req, res) => {
    const processId = req.params.processId;
    
    if (processingStatus[processId]) {
        res.json(processingStatus[processId]);
    } else {
        res.status(404).json({ error: 'Processo não encontrado' });
    }
});

app.get('/cache/output/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'cache/output', filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename);
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Link para página: http://localhost:${port}/client/index.html\n`);
});