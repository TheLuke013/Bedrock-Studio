document.addEventListener('DOMContentLoaded', function () {
    const modFileInput = document.getElementById('modFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const convertBtn = document.getElementById('convertBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const resultContainer = document.getElementById('resultContainer');

    modFileInput.addEventListener('change', function (e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];

            if (!file.name.toLowerCase().endsWith('.jar')) {
                alert('Por favor, selecione um arquivo .jar válido');
                this.value = '';
                return;
            }

            if (file.size > 100 * 1024 * 1024) {
                alert('O arquivo é muito grande. Tamanho máximo permitido: 100MB');
                this.value = '';
                return;
            }

            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileInfo.style.display = 'block';
            convertBtn.disabled = false;
        }
    });

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    convertBtn.addEventListener('click', function () {
        if (!modFileInput.files[0]) {
            alert('Por favor, selecione um arquivo .jar primeiro');
            return;
        }

        const file = modFileInput.files[0];

        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Convertendo...';

        progressContainer.style.display = 'block';

        simulateConversion(file);
    });

    function simulateConversion(file) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            progressBar.style.width = progress + '%';

            if (progress >= 100) {
                clearInterval(interval);

                processJarFile(file);

                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    resultContainer.style.display = 'block';
                    convertBtn.style.display = 'none';
                }, 500);
            }
        }, 200);
    }

    function processJarFile(file) {
        const reader = new FileReader();

        reader.readAsArrayBuffer(file);

        reader.onload = function (event) {
            const arrayBuffer = event.target.result;

            try {

                console.log('Arquivo JAR recebido:', file.name);
                console.log('Tamanho:', arrayBuffer.byteLength, 'bytes');

                const jarAnalysis = analyzeJar(arrayBuffer);
                console.log('Análise do JAR:', jarAnalysis);


            } catch (error) {
                console.error('Erro ao processar o arquivo JAR:', error);
                alert('Ocorreu um erro ao processar o arquivo. Por favor, tente novamente.');
            }
        };

        reader.onerror = function () {
            alert('Erro ao ler o arquivo. Por favor, tente novamente.');
        };
    }

    function analyzeJar(arrayBuffer) {
        return {
            entryCount: Math.floor(Math.random() * 50) + 10,
            containsClassFiles: true,
            manifestFound: Math.random() > 0.2,
            mainClass: 'com.example.ModMain',
            minecraftVersion: '1.19.2',
            modLoader: Math.random() > 0.5 ? 'Forge' : 'Fabric'
        };
    }



    convertBtn.addEventListener('click', function () {
        if (!modFileInput.files[0]) {
            alert('Por favor, selecione um arquivo .jar primeiro');
            return;
        }

        const file = modFileInput.files[0];

        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Convertendo...';

        progressContainer.style.display = 'block';

        sendFileToServer(file);
    });

    function sendFileToServer(file) {
        const formData = new FormData();
        formData.append('modFile', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressBar.style.width = percent + '%';
            }
        });

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);

                    if (response.success) {
                        progressContainer.style.display = 'none';
                        resultContainer.style.display = 'block';
                        convertBtn.style.display = 'none';

                        document.querySelector('.btn-download').onclick = function () {
                            window.location.href = response.downloadUrl;
                        };

                        console.log('Arquivos extraídos:', response.extractedFiles);
                    } else {
                        alert('Erro na conversão: ' + (response.error || 'Erro desconhecido'));
                        resetConverter();
                    }
                } else {
                    alert('Erro no servidor: ' + xhr.statusText);
                    resetConverter();
                }
            }
        };

        xhr.onerror = function () {
            alert('Erro na conexão com o servidor');
            resetConverter();
        };

        xhr.open('POST', 'http://localhost:3000/upload', true);
        xhr.send(formData);
    }

    function resetConverter() {
        convertBtn.disabled = false;
        convertBtn.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i> Converter Mod';
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
    }
});