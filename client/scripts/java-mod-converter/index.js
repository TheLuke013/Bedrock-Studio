document.addEventListener('DOMContentLoaded', function () {
    const modFileInput = document.getElementById('modFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const convertBtn = document.getElementById('convertBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const resultContainer = document.getElementById('resultContainer');
    const statusText = document.getElementById('statusText');
    const resetBtn = document.getElementById('resetBtn');

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

    function updateStatus(step, message) {
        statusText.innerHTML = `<strong>${step}:</strong> ${message}`;
    }

    function resetConverter() {
        convertBtn.disabled = false;
        convertBtn.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i> Converter Mod';
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
        fileInfo.style.display = 'none';
        resultContainer.style.display = 'none';
        statusText.innerHTML = '';
        modFileInput.value = '';
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
        progressBar.style.width = '10%';
        updateStatus('Preparando', 'Iniciando o processo de conversão...');

        sendFileToServer(file);
    });

    function sendFileToServer(file) {
        const formData = new FormData();
        formData.append('modFile', file);

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 50;
                progressBar.style.width = percent + '%';
                updateStatus('Enviando', `Enviando arquivo (${Math.round(percent)}%)...`);
            }
        });

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        
                        if (response.success) {

                            checkConversionStatus(response.processId);
                        } else {
                            alert('Erro na conversão: ' + (response.error || 'Erro desconhecido'));
                            resetConverter();
                        }
                    } catch (e) {
                        console.error('Erro ao parsear resposta:', e);
                        alert('Resposta inválida do servidor');
                        resetConverter();
                    }
                } else {
                    alert('Erro no servidor: ' + xhr.statusText);
                    resetConverter();
                }
            }
        };

        xhr.open('POST', 'http://localhost:3000/upload', true);
        xhr.send(formData);
    }

    function checkConversionStatus(processId) {
        const statusInterval = setInterval(() => {
            fetch(`http://localhost:3000/status/${processId}`)
                .then(response => response.json())
                .then(status => {
                    if (status.error) {
                        clearInterval(statusInterval);
                        alert(status.error);
                        resetConverter();
                        return;
                    }

                    progressBar.style.width = status.progress + '%';
                    updateStatus(status.step, status.message);

                    if (status.progress === 100) {
                        clearInterval(statusInterval);
                        
                        document.getElementById('modName').textContent = status.modInfo.name;
                        document.getElementById('modVersion').textContent = status.modInfo.version;
                        document.getElementById('modAuthors').textContent = status.modInfo.authors.join(', ');
                        document.getElementById('modLoader').textContent = status.modInfo.loader;
                        
                        document.querySelector('.btn-download').onclick = function () {
                            window.location.href = status.downloadUrl;
                        };
                        
                        setTimeout(() => {
                            progressContainer.style.display = 'none';
                            resultContainer.style.display = 'block';
                        }, 1000);
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar status:', error);
                    clearInterval(statusInterval);
                    alert('Erro ao verificar o status da conversão');
                    resetConverter();
                });
        }, 1000);
    }

    resetBtn.addEventListener('click', resetConverter);
});