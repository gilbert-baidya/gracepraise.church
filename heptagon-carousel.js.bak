/* ============================================================================
   HEPTAGON WHEEL — Two-Layer Architecture
   ============================================================================
   
   LAYER A (ROTATING): Heptagon outline + vertex dots
   LAYER B (STATIC): Text content that never moves
   
   CRITICAL REQUIREMENTS:
   - Only geometry rotates, content stays centered
   - Text never translates left/right
   - Vertex dots rotate WITH geometry
   - Active dot is always at TOP-MIDDLE position
   - Rotation snaps to 7 positions (51.428571° each)
   - Auto-advance: 5 seconds
   
   ========================================================================== */

class HeptagonWheel {
  constructor(container) {
    this.container = container;
    this.rotatingLayer = container.querySelector('.heptagon-rotating-layer');
    this.contentItems = Array.from(container.querySelectorAll('.heptagon-content-item'));
    this.vertexDots = Array.from(container.querySelectorAll('.heptagon-vertex-dot'));
    this.watermark = document.querySelector('.heptagon-watermark');
    
    this.currentIndex = 0;
    this.totalItems = 7; // FIXED: Always 7
    this.isAnimating = false;
    this.autoAdvanceTimer = null;
    this.scrollTimeout = null;
    
    // Rotation angle per step (360 / 7 ≈ 51.428571°)
    this.rotationStep = 360 / this.totalItems;
    this.currentRotation = 0;
    
    this.isMobile = window.innerWidth <= 1024;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    this.init();
  }
  
  init() {
    // Show first content
    this.updateContent(0);
    
    // Position vertex dots at heptagon corners
    this.positionVertexDots();
    
    // Desktop: Scroll navigation (throttled)
    if (!this.isMobile) {
      this.container.addEventListener('wheel', this.handleScroll.bind(this), { passive: false });
    }
    
    // Vertex dot click handlers
    this.vertexDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.stopAutoAdvance();
        this.goToIndex(index);
        setTimeout(() => this.startAutoAdvance(), 3000);
      });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
    
    // Resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Start auto-advance
    this.startAutoAdvance();
    
    // Remove loading state
    this.container.removeAttribute('data-loading');
  }
  
  /* ========================================================================
     VERTEX DOT POSITIONING (Calculated from heptagon geometry)
     ======================================================================== */
  
  positionVertexDots() {
    const centerX = 50; // Percentage
    const centerY = 50; // Percentage
    const radius = 48; // Percentage from center to vertex
    const startAngle = -Math.PI / 2; // Start at top
    const angleStep = (2 * Math.PI) / this.totalItems;
    
    this.vertexDots.forEach((dot, index) => {
      const angle = startAngle + (index * angleStep);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      dot.style.left = `${x}%`;
      dot.style.top = `${y}%`;
      dot.style.transform = 'translate(-50%, -50%)';
      
      // Store original vertex index for click handling
      dot.dataset.vertexIndex = index;
    });
  }
  
  /* ========================================================================
     SCROLL INTERACTION (Desktop Only — Throttled)
     ======================================================================== */
  
  handleScroll(e) {
    if (this.isAnimating || this.isMobile) return;
    
    e.preventDefault();
    
    // Stop auto-advance during manual interaction
    this.stopAutoAdvance();
    
    // Throttle scroll to one step per gesture
    clearTimeout(this.scrollTimeout);
    
    if (e.deltaY > 0) {
      // Scroll down = Advance clockwise
      this.nextItem();
    } else {
      // Scroll up = Go counter-clockwise
      this.prevItem();
    }
    
    // Restart auto-advance after 3 seconds of inactivity
    this.scrollTimeout = setTimeout(() => this.startAutoAdvance(), 3000);
  }
  
  /* ========================================================================
     KEYBOARD NAVIGATION
     ======================================================================== */
  
  handleKeyboard(e) {
    if (this.isAnimating) return;
    
    switch(e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        this.stopAutoAdvance();
        this.nextItem();
        setTimeout(() => this.startAutoAdvance(), 3000);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        this.stopAutoAdvance();
        this.prevItem();
        setTimeout(() => this.startAutoAdvance(), 3000);
        break;
    }
  }
  
  /* ========================================================================
     NAVIGATION LOGIC
     ======================================================================== */
  
  nextItem() {
    const nextIndex = (this.currentIndex + 1) % this.totalItems;
    this.goToIndex(nextIndex);
  }
  
  prevItem() {
    const prevIndex = (this.currentIndex - 1 + this.totalItems) % this.totalItems;
    this.goToIndex(prevIndex);
  }
  
  goToIndex(targetIndex) {
    if (this.isAnimating || targetIndex === this.currentIndex) return;
    
    this.isAnimating = true;
    
    // Calculate rotation: Always rotate clockwise to target
    let rotationDiff = targetIndex - this.currentIndex;
    
    // Ensure clockwise rotation
    if (rotationDiff < 0) {
      rotationDiff += this.totalItems;
    }
    
    this.currentRotation += rotationDiff * this.rotationStep;
    
    // LAYER A: Rotate geometry (heptagon + dots)
    this.rotatingLayer.style.transform = `rotate(${this.currentRotation}deg)`;
    
    // Rotate watermark (slower, desktop only)
    if (this.watermark && !this.isMobile) {
      const watermarkRotation = this.currentRotation * 0.15;
      this.watermark.style.transform = 
        `translate(-50%, -50%) rotate(${watermarkRotation}deg)`;
    }
    
    // LAYER B: Update static content AFTER rotation settles
    const transitionDuration = this.prefersReducedMotion ? 10 : 1200;
    
    setTimeout(() => {
      this.updateContent(targetIndex);
      this.currentIndex = targetIndex;
      this.isAnimating = false;
    }, transitionDuration * 0.6); // Content updates before rotation completes
  }
  
  /* ========================================================================
     CONTENT UPDATE (Static layer — no translation)
     ======================================================================== */
  
  updateContent(index) {
    // Hide all content with fade out
    this.contentItems.forEach(item => {
      item.classList.remove('active');
    });
    
    // Show target content with fade in
    this.contentItems[index].classList.add('active');
    
    // Update vertex dots: Active dot is the one at TOP-MIDDLE
    // Since dots rotate, we need to find which dot is currently at top
    const currentTopDotIndex = this.getTopDotIndex();
    
    this.vertexDots.forEach((dot, i) => {
      if (i === currentTopDotIndex) {
        dot.classList.add('active');
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.classList.remove('active');
        dot.removeAttribute('aria-current');
      }
    });
    
    // Announce to screen readers
    this.announceContent(index);
  }
  
  /* ========================================================================
     DETERMINE WHICH DOT IS AT TOP-MIDDLE
     ======================================================================== */
  
  getTopDotIndex() {
    // The dot at top-middle is the one whose original vertex index
    // minus current rotation steps equals 0 (mod 7)
    const rotationSteps = Math.round(this.currentRotation / this.rotationStep);
    const topDotIndex = (this.totalItems - (rotationSteps % this.totalItems)) % this.totalItems;
    return topDotIndex;
  }
  
  /* ========================================================================
     AUTO-ADVANCE (5 seconds)
     ======================================================================== */
  
  startAutoAdvance() {
    this.stopAutoAdvance();
    
    this.autoAdvanceTimer = setInterval(() => {
      if (!this.isAnimating) {
        this.nextItem();
      }
    }, 5000);
  }
  
  stopAutoAdvance() {
    if (this.autoAdvanceTimer) {
      clearInterval(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }
  
  /* ========================================================================
     ACCESSIBILITY
     ======================================================================== */
  
  announceContent(index) {
    const content = this.contentItems[index];
    const title = content.querySelector('h2')?.textContent || '';
    const announcement = `Position ${index + 1} of ${this.totalItems}: ${title}`;
    
    // Create or update live region
    let liveRegion = document.getElementById('heptagon-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'heptagon-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = announcement;
  }
  
  /* ========================================================================
     RESPONSIVE HANDLING
     ======================================================================== */
  
  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 1024;
    
    // Reposition vertex dots on resize
    this.positionVertexDots();
    
    // If switching between mobile/desktop, reset
    if (wasMobile !== this.isMobile) {
      this.currentRotation = 0;
      this.rotatingLayer.style.transform = 'rotate(0deg)';
      
      if (this.watermark) {
        this.watermark.style.transform = 'translate(-50%, -50%) rotate(0deg)';
      }
      
      this.currentIndex = 0;
      this.updateContent(0);
    }
  }
  
  /* ========================================================================
     CLEANUP
     ======================================================================== */
  
  destroy() {
    this.stopAutoAdvance();
    
    this.container.removeEventListener('wheel', this.handleScroll);
    document.removeEventListener('keydown', this.handleKeyboard);
    window.removeEventListener('resize', this.handleResize);
    
    this.vertexDots.forEach(dot => {
      dot.replaceWith(dot.cloneNode(true));
    });
    
    clearTimeout(this.scrollTimeout);
  }
}

/* ============================================================================
   AUTO-INITIALIZATION
   ========================================================================== */

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeptagonWheel);
} else {
  initHeptagonWheel();
}

function initHeptagonWheel() {
  const container = document.querySelector('.heptagon-carousel-container');
  if (container) {
    new HeptagonWheel(container);
  }
}
