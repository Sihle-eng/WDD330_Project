function renderMilestoneCard(milestone) {
    const card = document.createElement('div');
    card.className = 'milestone-card';

    if (milestone.backgroundImage) {
        card.style.backgroundImage = `url(${milestone.backgroundImage})`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
        card.innerHTML += `
      <div class="image-attribution">
        Photo by ${milestone.imageAttribution}
      </div>
    `;
    }

    // Add other milestone content...
    return card;
}