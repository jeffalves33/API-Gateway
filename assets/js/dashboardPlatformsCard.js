document.addEventListener('DOMContentLoaded', async () => {
    const anchor = document.getElementById('platforms-card-anchor');
    if (!anchor) return;

    try {
        const [metaR, gaR, ytR] = await Promise.all([
            fetch('/api/meta/status'),
            fetch('/api/googleAnalytics/status'),
            fetch('/api/youtube/status')
        ]);

        const { facebookConnected, instagramConnected, facebookDaysLeft, needsReauthFacebook, instagramDaysLeft, needsReauthInstagram } = await metaR.json();
        const { googleAnalyticsConnected, gaDaysLeft, needsReauthGA } = await gaR.json();
        const { youtubeConnected } = await ytR.json();

        const total = [facebookConnected, instagramConnected, googleAnalyticsConnected, youtubeConnected].filter(Boolean).length;

        if (total === 0) return;

        const warnings = [];
        if (facebookConnected && needsReauthFacebook) warnings.push(`Facebook (≤${facebookDaysLeft}d)`);
        if (instagramConnected && needsReauthInstagram) warnings.push(`Instagram (≤${instagramDaysLeft}d)`);
        if (googleAnalyticsConnected && needsReauthGA) warnings.push(`Google (≤${gaDaysLeft}d)`);

        if (warnings.length == 0) return;

        if (warnings.length) {
            document.querySelector('.card').style.display = 'none';
            document.getElementById('instruction-message').style.display = 'none';
        }

        const title = 'Atenção às conexões ⚠️';

        const text = `As seguintes conexões precisam ser atualizadas: ${warnings.join(', ')}.`;

        anchor.innerHTML = `
            <div class="card">
                <div class="d-flex align-items-end row">
                    <div class="col-sm-7">
                    <div class="card-body">
                        <h5 class="card-title text-primary">${title}</h5>
                        <p class="mb-4">${text}</p>
                        <a href="/platformsPage.html" class="btn btn-sm btn-outline-primary">Gerenciar Plataformas</a>
                    </div>
                    </div>
                    <div class="col-sm-5 text-center text-sm-left">
                    <div class="card-body pb-0 px-0 px-md-4">
                        <img
                        src="../assets/img/illustrations/man-with-laptop-light.png"
                        height="140"
                        alt="Plataformas"
                        data-app-dark-img="illustrations/man-with-laptop-dark.png"
                        data-app-light-img="illustrations/man-with-laptop-light.png" />
                    </div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        console.error('Erro ao montar card de plataformas no dashboard:', e);
    }
});
