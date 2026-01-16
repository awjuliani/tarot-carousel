/**
 * Meditations on the Tarot - Carousel Interface
 * A beautiful coverflow-style carousel for exploring the Major Arcana
 */

class TarotCarousel {
    constructor() {
        this.cards = [];
        this.currentIndex = 0;
        this.track = document.querySelector('.carousel-track');
        this.prevBtn = document.querySelector('.nav-prev');
        this.nextBtn = document.querySelector('.nav-next');

        // Touch handling
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.isDragging = false;

        // Mouse handling
        this.mouseStartX = 0;
        this.mouseEndX = 0;
        this.isMouseDragging = false;

        this.init();
    }

    async init() {
        await this.loadCards();
        this.renderCarousel();
        this.bindEvents();
        this.handleHashNavigation();
        this.updateDisplay();
        this.updatePositionIndicator();
        this.preloadAdjacentImages();

        // Trigger initial load animation after a brief delay
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.querySelector('.carousel').classList.add('loaded');
                this.positionCards();
            });
        });
    }

    async loadCards() {
        try {
            const response = await fetch('content/cards.json');
            const data = await response.json();
            this.cards = data.cards;
        } catch (error) {
            console.error('Error loading cards:', error);
        }
    }

    renderCarousel() {
        this.track.innerHTML = '';

        this.cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'carousel-card';
            cardEl.dataset.index = index;

            const img = document.createElement('img');
            img.src = `images/${this.getImageFilename(card)}`;
            img.alt = card.name;
            img.loading = index < 5 ? 'eager' : 'lazy';

            // Fallback for missing images
            img.onerror = () => {
                img.src = this.createPlaceholderImage(card);
            };

            cardEl.appendChild(img);
            this.track.appendChild(cardEl);
        });

        this.cardElements = document.querySelectorAll('.carousel-card');
        this.positionCards();
    }

    getImageFilename(card) {
        // Convert card name to filename format
        const name = card.name.toLowerCase().replace(/\s+/g, '-');
        return `${name}.jpg`;
    }

    createPlaceholderImage(card) {
        // Create a canvas-based placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 220;
        canvas.height = 380;
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 380);
        gradient.addColorStop(0, '#1a3a5c');
        gradient.addColorStop(1, '#0f2847');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 220, 380);

        // Border
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, 208, 368);

        // Inner border
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(15, 15, 190, 350);

        // Numeral
        ctx.fillStyle = '#d4af37';
        ctx.font = '24px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText(card.numeral, 110, 50);

        // Card name
        ctx.fillStyle = '#f5f0e6';
        ctx.font = '18px Cinzel, serif';

        // Word wrap the name
        const words = card.name.split(' ');
        let line = '';
        let y = 180;
        const lineHeight = 24;

        words.forEach(word => {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > 180) {
                ctx.fillText(line.trim(), 110, y);
                line = word + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line.trim(), 110, y);

        // Decorative elements
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(60, 220);
        ctx.lineTo(160, 220);
        ctx.stroke();

        return canvas.toDataURL();
    }

    positionCards() {
        const totalCards = this.cards.length;

        this.cardElements.forEach((card, index) => {
            const offset = index - this.currentIndex;
            const absOffset = Math.abs(offset);
            const direction = offset < 0 ? -1 : 1;

            let translateX, translateZ, rotateY, opacity;

            if (offset === 0) {
                // Center card - front and center
                translateX = 0;
                translateZ = 100;
                rotateY = 0;
                opacity = 1;
            } else {
                // Side cards - spread out, rotated, pushed back
                // Non-linear spacing: cards bunch up more as they go further
                const spacing = 180 + (absOffset - 1) * 40;
                translateX = direction * (250 + (absOffset - 1) * spacing);

                // Push cards back into the scene
                translateZ = -180 - (absOffset - 1) * 90;

                // Rotate cards to face the center (like a fan)
                rotateY = direction * -70;

                // Fade out distant cards
                opacity = Math.max(0, 1 - (absOffset * 0.3));
            }

            // Hide cards beyond visible range
            if (absOffset > 4) {
                opacity = 0;
            }

            card.style.transform = `
                translateX(${translateX}px)
                translateZ(${translateZ}px)
                rotateY(${rotateY}deg)
            `;
            card.style.opacity = opacity;
            card.style.zIndex = totalCards - absOffset;

            // Active state
            if (offset === 0) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    bindEvents() {
        // Navigation buttons
        this.prevBtn.addEventListener('click', () => this.navigate(-1));
        this.nextBtn.addEventListener('click', () => this.navigate(1));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.navigate(-1);
            if (e.key === 'ArrowRight') this.navigate(1);
        });

        // Touch events
        this.track.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.track.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
        this.track.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Mouse drag events
        this.track.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Click on cards
        this.cardElements.forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                if (index !== this.currentIndex) {
                    this.goToCard(index);
                }
            });
        });

        // Tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.isDragging = true;
        this.track.classList.add('dragging');
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;
        this.touchEndX = e.touches[0].clientX;
    }

    handleTouchEnd() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.track.classList.remove('dragging');

        const diff = this.touchStartX - this.touchEndX;
        const threshold = 50;

        if (diff > threshold) {
            this.navigate(1);
        } else if (diff < -threshold) {
            this.navigate(-1);
        }

        this.touchStartX = 0;
        this.touchEndX = 0;
    }

    handleMouseDown(e) {
        e.preventDefault();
        this.mouseStartX = e.clientX;
        this.isMouseDragging = true;
        this.track.classList.add('dragging');
    }

    handleMouseMove(e) {
        if (!this.isMouseDragging) return;
        this.mouseEndX = e.clientX;
    }

    handleMouseUp(e) {
        if (!this.isMouseDragging) return;

        this.isMouseDragging = false;
        this.track.classList.remove('dragging');

        const diff = this.mouseStartX - this.mouseEndX;
        const threshold = 50;

        if (diff > threshold) {
            this.navigate(1);
        } else if (diff < -threshold) {
            this.navigate(-1);
        }

        this.mouseStartX = 0;
        this.mouseEndX = 0;
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.cards.length) {
            this.currentIndex = newIndex;
            this.positionCards();
            this.fadeAndUpdateDisplay();
            this.updatePositionIndicator();
            this.updateHash();
            this.preloadAdjacentImages();
        }
    }

    goToCard(index) {
        if (index >= 0 && index < this.cards.length) {
            this.currentIndex = index;
            this.positionCards();
            this.fadeAndUpdateDisplay();
            this.updatePositionIndicator();
            this.updateHash();
            this.preloadAdjacentImages();
        }
    }

    fadeAndUpdateDisplay() {
        const cardInfoContent = document.querySelector('.card-info-content');
        cardInfoContent.classList.add('fading');

        setTimeout(() => {
            this.updateDisplay();
            cardInfoContent.classList.remove('fading');
        }, 300);
    }

    updateDisplay() {
        const card = this.cards[this.currentIndex];

        // Update card info
        document.querySelector('.card-numeral').textContent = card.numeral;
        document.querySelector('.card-name').textContent = card.name;
        document.querySelector('.card-theme').textContent = card.theme;
        document.querySelector('.summary-text').textContent = card.summary;
        document.querySelector('.interpretation-text').textContent = card.interpretation;

        // Update elements list
        const elementsList = document.querySelector('.elements-list');
        elementsList.innerHTML = card.elements.map(el => `
            <div class="element-item">
                <h4 class="element-name">${el.name}</h4>
                <p class="element-meaning">${el.meaning}</p>
            </div>
        `).join('');

        // Update navigation button states
        this.prevBtn.disabled = this.currentIndex === 0;
        this.nextBtn.disabled = this.currentIndex === this.cards.length - 1;
        this.prevBtn.style.opacity = this.currentIndex === 0 ? 0.3 : 1;
        this.nextBtn.style.opacity = this.currentIndex === this.cards.length - 1 ? 0.3 : 1;
    }

    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === tabName);
        });
    }

    updatePositionIndicator() {
        document.querySelector('.position-current').textContent = this.currentIndex + 1;
        document.querySelector('.position-total').textContent = this.cards.length;
    }

    handleHashNavigation() {
        // Check for hash on load
        const hash = window.location.hash.slice(1);
        if (hash) {
            const cardIndex = this.cards.findIndex(card =>
                this.getSlug(card.name) === hash
            );
            if (cardIndex !== -1) {
                this.currentIndex = cardIndex;
                this.positionCards();
            }
        }

        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.slice(1);
            const cardIndex = this.cards.findIndex(card =>
                this.getSlug(card.name) === newHash
            );
            if (cardIndex !== -1 && cardIndex !== this.currentIndex) {
                this.currentIndex = cardIndex;
                this.positionCards();
                this.fadeAndUpdateDisplay();
                this.updatePositionIndicator();
            }
        });
    }

    getSlug(name) {
        return name.toLowerCase().replace(/\s+/g, '-');
    }

    updateHash() {
        const card = this.cards[this.currentIndex];
        const slug = this.getSlug(card.name);
        history.replaceState(null, null, `#${slug}`);
    }

    preloadAdjacentImages() {
        // Preload next and previous images
        const indices = [
            this.currentIndex - 1,
            this.currentIndex + 1,
            this.currentIndex - 2,
            this.currentIndex + 2
        ].filter(i => i >= 0 && i < this.cards.length);

        indices.forEach(index => {
            const img = new Image();
            img.src = `images/${this.getImageFilename(this.cards[index])}`;
        });
    }

}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TarotCarousel();
});
