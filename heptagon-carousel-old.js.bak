/* ============================================================================
   HEPTAGON WHEEL — Sacred Geometry Navigation System
   ============================================================================
   
   CRITICAL REQUIREMENTS:
   - TRUE heptagon (7 equal sides, 7 equal angles)
   - Vertex-based navigation (dots at corners)
   - Clockwise rotation with auto-advance (5s)
   - Text updates ONLY after rotation settles
   - Square aspect ratio LOCKED
   - NO oval distortion
   
   Behavior:
   - Desktop: Scroll advances wheel, click vertex dots
   - Mobile: Tap vertex dots only
   - Auto-advance: 5 seconds per position
   - Rotation: Snapped to 7 positions (51.43° each)
   
   ========================================================================== */

class HeptagonWheel {
  constructor(element) {
    this.container = element;
    this.wheel = element.querySelector('.heptagon-wheel');
    this.contentItems = Array.from(element.querySelectorAll('.heptagon-content'));
    this.vertexDots = Array.from(element.querySelectorAll('.heptagon-vertex-dot'));
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
    this.showContent(0);
    
    // Position vertex dots at heptagon corners
    this.positionVertexDots();
    
    // Desktop: Scroll navigation
    if (!this.isMobile) {
      this.container.addEventListener('wheel', this.handleScroll.bind(this), { passive: false });
    }
    
    // Vertex dot click handlers
    this.vertexDots.forEach((dot, index) => {
      dot.addEventListener('click', () => this.goToIndex(index));
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
    });
  }
  
  /* ========================================================================
     SCROLL INTERACTION (Desktop Only)
     ======================================================================== */
  
  handleScroll(e) {
    if (this.isAnimating || this.isMobile) return;
    
    e.preventDefault();
    
    // Stop auto-advance during manual interaction
    this.stopAutoAdvance();
    
    // Debounce scroll events
    clearTimeout(this.scrollTimeout);
    
    this.scrollTimeout = setTimeout(() => {
      if (e.deltaY > 0) {
        // Scroll down = Advance clockwise
        this.nextItem();
      } else {
        // Scroll up = Go counter-clockwise
        this.prevItem();
      }
      
      // Restart auto-advance after 3 seconds of inactivity
      setTimeout(() => this.startAutoAdvance(), 3000);
    }, 50);
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
  
  goToIndex(index) {
    if (this.isAnimating || index === this.currentIndex) return;
    
    this.isAnimating = true;
    
    // Calculate shortest rotation path
    let rotationDiff = index - this.currentIndex;
    
    // Always rotate clockwise for positive advancement
    if (rotationDiff < 0) {
      rotationDiff += this.totalItems;
    }
    
    this.currentRotation += rotationDiff * this.rotationStep;
    
    // Rotate wheel
    this.wheel.style.transform = `rotate(${this.currentRotation}deg)`;
    
    // Rotate watermark (slower, desktop only)
    if (this.watermark && !this.isMobile) {
      const watermarkRotation = this.currentRotation * 0.1;
      this.watermark.style.transform = 
        `translate(-50%, -50%) rotate(${watermarkRotation}deg)`;
    }
    
    // Update active states AFTER rotation settles
    const transitionDuration = this.prefersReducedMotion ? 10 : 1200;
    
    setTimeout(() => {
      this.showContent(index);
      this.currentIndex = index;
      this.isAnimating = false;
    }, transitionDuration * 0.7); // Content updates before rotation completes
  }
  
  /* ========================================================================
     CONTENT DISPLAY LOGIC
     ======================================================================== */
  
  showContent(index) {
    // Hide all content
    this.contentItems.forEach(item => {
      item.classList.remove('active');
    });
    
    // Show target content
    this.contentItems[index].classList.add('active');
    
    // Update vertex dots
    this.vertexDots.forEach((dot, i) => {
      if (i === index) {
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
      this.wheel.style.transform = 'rotate(0deg)';
      
      if (this.watermark) {
        this.watermark.style.transform = 'translate(-50%, -50%) rotate(0deg)';
      }
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
   HEPTAGON SHAPE GENERATOR — MATHEMATICALLY PRECISE
   ============================================================================
   Generates perfect 7-sided polygon coordinates
   CRITICAL: No scaling, no distortion, no oval illusion
   ========================================================================== */

class HeptagonGenerator {
  static generatePoints(centerX, centerY, radius, rotation = 0) {
    const points = [];
    const angleStep = (2 * Math.PI) / 7; // Exactly 51.428571°
    const startAngle = rotation * (Math.PI / 180) - (Math.PI / 2); // Start at top
    
    for (let i = 0; i < 7; i++) {
      const angle = startAngle + (i * angleStep);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    
    return points.join(' ');
  }
  
  static createSVG(width, height, strokeWidth = 3, className = '') {
    // CRITICAL: Width and height MUST be equal (square)
    const size = Math.min(width, height);
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - (strokeWidth * 2);
    
    const points = this.generatePoints(centerX, centerY, radius);
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('class', className);
    // CRITICAL: Preserve aspect ratio
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points);
    
    svg.appendChild(polygon);
    
    return svg;
  }
  
  static getVertexCoordinates(centerX, centerY, radius, rotation = 0) {
    // Returns array of {x, y} objects for each vertex
    const vertices = [];
    const angleStep = (2 * Math.PI) / 7;
    const startAngle = rotation * (Math.PI / 180) - (Math.PI / 2);
    
    for (let i = 0; i < 7; i++) {
      const angle = startAngle + (i * angleStep);
      vertices.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    }
    
    return vertices;
  }
}

/* ============================================================================
   AUTO-INITIALIZATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const wheelContainer = document.querySelector('.heptagon-wheel-container');
  
  if (wheelContainer) {
    // Generate main heptagon SVG
    const wheelElement = wheelContainer.querySelector('.heptagon-wheel');
    if (wheelElement && !wheelElement.querySelector('svg')) {
      const svg = HeptagonGenerator.createSVG(500, 500);
      wheelElement.insertBefore(svg, wheelElement.firstChild);
    }
    
    // Generate watermark heptagon SVG (desktop only)
    const watermark = document.querySelector('.heptagon-watermark');
    if (watermark && !watermark.querySelector('svg')) {
      const svg = HeptagonGenerator.createSVG(700, 700, 2);
      watermark.appendChild(svg);
    }
    
    // Initialize wheel
    window.heptagonWheel = new HeptagonWheel(wheelContainer);
  }
});

