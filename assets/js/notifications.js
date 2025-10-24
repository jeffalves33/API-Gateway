function showError(message = null, messageError = null, duration = 5000) {
    const alertContainer = document.getElementById('alert-container');
    if (messageError) console.error(message, messageError);
    if (alertContainer && message) {
        const alertId = 'alert-' + Date.now();
        alertContainer.innerHTML = 
        `
            <div id="${alertId}" class="alert alert-danger alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>
        `;

        // Auto-hide após duração especificada
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) alert.remove();
        }, duration);
    }
}

function showSuccess(message, duration = 3000) {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        const alertId = 'alert-' + Date.now();
        alertContainer.innerHTML = `
            <div id="${alertId}" class="alert alert-success alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                <i class="bi bi-check-circle-fill me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>`;

        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) alert.remove();
        }, duration);
    }
}

function showWarning(message, duration = 3000) {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        const alertId = 'alert-' + Date.now();
        alertContainer.innerHTML = `
            <div id="${alertId}" class="alert alert-warning alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                <i class="bi bi-exclamation-circle me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>`;

        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) alert.remove();
        }, duration);
    }
}