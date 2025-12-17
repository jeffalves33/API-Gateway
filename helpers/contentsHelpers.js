function amountContents(facebookData, instagramData) {
    const fb = facebookData.status === 'fulfilled' ? facebookData.value : [];
    const ig = instagramData.status === 'fulfilled' ? instagramData.value : [];
    return fb.length + ig.length;
}

function totalEngagement(facebookData, instagramData) {
    const fb = facebookData.status === 'fulfilled' ? facebookData.value : [];
    const ig = instagramData.status === 'fulfilled' ? instagramData.value : [];

    const fbSum = fb.reduce((acc, post) => {
        const reactions = post.reactions?.summary?.total_count ?? 0;
        const comments = post.comments?.summary?.total_count ?? 0;
        const shares = post.shares?.count ?? 0; // pode não existir
        return acc + reactions + comments + shares;
    }, 0);

    const igSum = ig.reduce((acc, post) => {
        const likes = post.like_count ?? 0;
        const comments = post.comments_count ?? 0;
        // saves/reach ainda não existem aqui
        return acc + likes + comments;
    }, 0);

    return fbSum + igSum;
}

function totalComments(facebookData, instagramData) {
    const fb = facebookData.status === 'fulfilled' ? facebookData.value : [];
    const ig = instagramData.status === 'fulfilled' ? instagramData.value : [];

    const fbComments = fb.reduce(
        (acc, post) => acc + (post.comments?.summary?.total_count ?? 0),
        0
    );

    const igComments = ig.reduce(
        (acc, post) => acc + (post.comments_count ?? 0),
        0
    );

    return fbComments + igComments;
}

function engagementRate(facebookData, instagramData) {
    const fb = facebookData.status === 'fulfilled' ? facebookData.value : [];
    const ig = instagramData.status === 'fulfilled' ? instagramData.value : [];

    const totalPosts = fb.length + ig.length;
    if (totalPosts === 0) return 0;

    const total = totalEngagement(facebookData, instagramData);
    if (!total || total === 0) return 0;

    return Number((total / totalPosts).toFixed(2));
}

function totalLikes(facebookData, instagramData) {
    const fb = facebookData.status === 'fulfilled' ? facebookData.value : [];
    const ig = instagramData.status === 'fulfilled' ? instagramData.value : [];

    const fbLikes = fb.reduce(
        (acc, post) => acc + (post.reactions?.summary?.total_count ?? 0),
        0
    );

    const igLikes = ig.reduce(
        (acc, post) => acc + (post.like_count ?? 0),
        0
    );

    return fbLikes + igLikes;
}

function totalShares(facebookData, instagramData) {
    const fb = facebookData.status === 'fulfilled' ? facebookData.value : [];
    // Instagram não tem shares post-level

    return fb.reduce(
        (acc, post) => acc + (post.shares?.count ?? 0),
        0
    );
}

function totalSaves(facebookData, instagramData) {
    // Ainda não existe saves nem no FB nem no IG no seu payload atual
    return 0;
}


module.exports = {
  amountContents,
  totalComments,
  totalEngagement,
  totalLikes,
  totalShares,
  totalSaves
};
