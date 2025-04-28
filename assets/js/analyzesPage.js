// Arquivo: public/js/analyzesPage.js

document.addEventListener('DOMContentLoaded', async function () {
    const btnBuscar = document.getElementById('btn-buscar');
    const btnBuscarTexto = document.getElementById('btn-buscar-texto');
    const btnBuscarLoading = document.getElementById('btn-buscar-loading');
    const instructionMessage = document.getElementById('instruction-message');
    const contentDashboard = document.getElementById('content-dashboard');

    async function validateForm() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const facebook = document.getElementById('facebook').checked;
        const instagram = document.getElementById('instagram').checked;
        const googleAnalytics = document.getElementById('googleAnalytics').checked;
        const tipoAnalise = document.querySelector('input[name="tipoAnalise"]:checked');
        const formatoRelatorio = document.getElementById('formatoRelatorio').value;

        if (!startDate || !endDate) {
            alert('Por favor, selecione a data inicial e final.');
            return false;
        }

        if (!facebook && !instagram && !googleAnalytics) {
            alert('Por favor, selecione pelo menos uma plataforma.');
            return false;
        }

        if (!tipoAnalise) {
            alert('Por favor, selecione o tipo de análise.');
            return false;
        }

        if (formatoRelatorio === 'Selecione' || formatoRelatorio === '' || formatoRelatorio === null) {
            alert('Por favor, selecione o formato do relatório.');
            return false;
        }

        return true;
    }

    document.getElementById('form-busca')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const isValid = await validateForm();
        if (!isValid) return;

        try {
            btnBuscarTexto.classList.add('d-none');
            btnBuscarLoading.classList.remove('d-none');

            // Aqui você simularia as funções de buscar dados
            // await buscarDadosDeAnalise();

            if (instructionMessage) instructionMessage.style.display = 'none';
            if (contentDashboard) contentDashboard.style.display = 'block';

        } catch (error) {
            console.error('Erro ao gerar análise:', error);
            alert('Erro ao gerar análise. Tente novamente.');
        } finally {
            btnBuscarTexto.classList.remove('d-none');
            btnBuscarLoading.classList.add('d-none');
        }
    });
});
