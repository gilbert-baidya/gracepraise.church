/* ============================================================================
   TRUE HEPTAGON WHEEL — Sacred Geometry Logic
   ============================================================================
   
   GEOMETRY TEACHES THEOLOGY:
   - 7 sides = 7 topics (sacred completeness)
   - Each topic assigned to ONE wall
   - Active side is always at TOP
   - Wall text rotates WITH geometry
   - Center content stays fixed (opacity changes only)
   
   ========================================================================== */

class SacredHeptagonWheel {
  constructor(container) {
    this.container = container;
    this.rotatingLayer = container.querySelector('.heptagon-rotating-layer');
    this.centerItems = Array.from(container.querySelectorAll('.heptagon-center-item'));
    this.wallLabels = Array.from(container.querySelectorAll('.heptagon-wall-label'));
    this.vertexDots = Array.from(container.querySelectorAll('.heptagon-vertex-dot'));

    this.currentIndex = 0;
    this.totalSides = 7;
    this.isAnimating = false;
    this.autoAdvanceTimer = null;

    // Rotation: 360° / 7 = 51.428571° per side
    this.rotationStep = 360 / this.totalSides;
    this.currentRotation = 0;

    this.isMobile = window.innerWidth <= 1024;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    // Calculate heptagon vertices
    this.vertices = this.calculateHeptagonVertices();

    // Position vertex dots at corners
    this.positionVertexDots();

    // Position wall labels on sides
    this.positionWallLabels();

    // Show first content
    this.updateActiveState(0);

    // Desktop: Scroll navigation
    if (!this.isMobile) {
      this.container.addEventListener('wheel', this.handleScroll.bind(this), { passive: false });
    }

    // Wall label click handlers
    this.wallLabels.forEach((label, index) => {
      label.addEventListener('click', () => {
        this.stopAutoAdvance();
        this.goToSide(index);
        setTimeout(() => this.startAutoAdvance(), 3000);
      });
    });

    // Vertex dot click handlers
    this.vertexDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.stopAutoAdvance();
        this.goToSide(index);
        setTimeout(() => this.startAutoAdvance(), 3000);
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyboard.bind(this));

    // Resize handler
    window.addEventListener('resize', this.handleResize.bind(this));

    // Start auto-advance
    this.startAutoAdvance();

    // Touch navigation (swipe)
    this.touchStartX = 0;
    this.container.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    this.container.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(this.touchStartX, touchEndX);
    }, { passive: true });

    // Remove loading state
    this.container.removeAttribute('data-loading');
  }

  handleSwipe(start, end) {
    const threshold = 50;
    if (Math.abs(start - end) < threshold) return;

    this.stopAutoAdvance();
    if (start > end) {
      this.nextSide();
    } else {
      this.prevSide();
    }
    setTimeout(() => this.startAutoAdvance(), 3000);
  }

  /* ========================================================================
     GEOMETRY CALCULATIONS — TRUE HEPTAGON
     ======================================================================== */

  calculateHeptagonVertices() {
    const vertices = [];
    const centerX = 50;
    const centerY = 50;
    const radius = 48; // Percentage from center to vertex
    const startAngle = -Math.PI / 2; // Start at top (12 o'clock)
    const angleStep = (2 * Math.PI) / this.totalSides;

    for (let i = 0; i < this.totalSides; i++) {
      const angle = startAngle + (i * angleStep);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      vertices.push({ x, y, angle });
    }

    return vertices;
  }

  calculateSideMidpoints() {
    const midpoints = [];

    for (let i = 0; i < this.totalSides; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % this.totalSides];

      // Exact midpoint between two vertices
      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;

      // Calculate angle of the side (for text rotation parallel to edge)
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const sideAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Calculate outward normal vector (perpendicular to edge, away from center)
      const centerX = 50;
      const centerY = 50;
      const toMidX = midX - centerX;
      const toMidY = midY - centerY;
      const distance = Math.sqrt(toMidX * toMidX + toMidY * toMidY);
      const normalX = toMidX / distance;
      const normalY = toMidY / distance;

      midpoints.push({
        x: midX,
        y: midY,
        angle: sideAngle,
        normalX,
        normalY
      });
    }

    return midpoints;
  }

  /* ========================================================================
     POSITIONING — Vertex dots and wall labels
     ======================================================================== */

  positionVertexDots() {
    // Position dots EXACTLY on heptagon vertices (corners)
    this.vertexDots.forEach((dot, index) => {
      const vertex = this.vertices[index];
      dot.style.left = `${vertex.x}%`;
      dot.style.top = `${vertex.y}%`;
      dot.style.transform = 'translate(-50%, -50%)'; // Center the dot on vertex
      dot.dataset.vertexIndex = index;
    });
  }

  positionWallLabels() {
    const sideMidpoints = this.calculateSideMidpoints();

    this.wallLabels.forEach((label, index) => {
      const midpoint = sideMidpoints[index];

      // Position label at exact midpoint, then offset slightly outward
      // Use consistent offset distance (8% of container) for all labels
      const offsetDistance = 8; // Percentage units - close to wall but not touching
      const labelX = midpoint.x + (midpoint.normalX * offsetDistance);
      const labelY = midpoint.y + (midpoint.normalY * offsetDistance);

      label.style.left = `${labelX}%`;
      label.style.top = `${labelY}%`;

      // Rotate text parallel to the edge, but flip if upside-down
      let angle = midpoint.angle;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      label.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

      // Store side index for tracking
      label.dataset.side = index;
    });
  }

  /* ========================================================================
     SCROLL INTERACTION
     ======================================================================== */

  handleScroll(e) {
    if (this.isAnimating || this.isMobile) return;

    e.preventDefault();
    this.stopAutoAdvance();

    if (e.deltaY > 0) {
      this.nextSide();
    } else {
      this.prevSide();
    }

    setTimeout(() => this.startAutoAdvance(), 3000);
  }

  /* ========================================================================
     KEYBOARD NAVIGATION
     ======================================================================== */

  handleKeyboard(e) {
    if (this.isAnimating) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        this.stopAutoAdvance();
        this.nextSide();
        setTimeout(() => this.startAutoAdvance(), 3000);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        this.stopAutoAdvance();
        this.prevSide();
        setTimeout(() => this.startAutoAdvance(), 3000);
        break;
    }
  }

  /* ========================================================================
     NAVIGATION LOGIC
     ======================================================================== */

  nextSide() {
    const nextIndex = (this.currentIndex + 1) % this.totalSides;
    this.goToSide(nextIndex);
  }

  prevSide() {
    const prevIndex = (this.currentIndex - 1 + this.totalSides) % this.totalSides;
    this.goToSide(prevIndex);
  }

  goToSide(targetIndex) {
    if (this.isAnimating || targetIndex === this.currentIndex) return;

    this.isAnimating = true;

    // Calculate rotation needed to bring target side to TOP
    const currentTopSide = this.getTopSideIndex();
    let rotationDiff = targetIndex - currentTopSide;

    // Always rotate shortest path (clockwise or counter-clockwise)
    if (Math.abs(rotationDiff) > this.totalSides / 2) {
      if (rotationDiff > 0) {
        rotationDiff = rotationDiff - this.totalSides;
      } else {
        rotationDiff = rotationDiff + this.totalSides;
      }
    }

    this.currentRotation -= rotationDiff * this.rotationStep;

    // Rotate the entire geometry layer
    this.rotatingLayer.style.transform = `rotate(${this.currentRotation}deg)`;

    // Update active states after rotation settles
    const transitionDuration = this.prefersReducedMotion ? 10 : 1200;

    setTimeout(() => {
      this.updateActiveState(targetIndex);
      this.updateLabelReadability();
      this.isAnimating = false;
    }, transitionDuration * 0.6);
  }

  /* ========================================================================
     LABEL READABILITY — Counter-rotate labels to prevent upside-down text
     ======================================================================== */

  updateLabelReadability() {
    const sideMidpoints = this.calculateSideMidpoints();
    this.wallLabels.forEach((label, index) => {
      const midpoint = sideMidpoints[index];
      // Calculate effective angle after layer rotation
      let effectiveAngle = midpoint.angle + this.currentRotation;
      // Normalize to -180..180
      effectiveAngle = ((effectiveAngle % 360) + 540) % 360 - 180;
      // Determine label's own rotation to stay readable
      let labelRotation = midpoint.angle;
      if (effectiveAngle > 90 || effectiveAngle < -90) {
        labelRotation += 180;
      }
      label.style.transform = `translate(-50%, -50%) rotate(${labelRotation}deg)`;
    });
  }

  /* ========================================================================
     ACTIVE STATE UPDATE — Sync wall labels with center content
     ======================================================================== */

  updateActiveState(index) {
    // The active side is determined by which side is at the TOP position
    const topSideIndex = this.getTopSideIndex();

    // CRITICAL: Center content must match the active wall label
    // Wall labels are ordered 0-6 corresponding to sides 0-6
    // Center content items must match this same order

    // Update center content to match the active side
    this.centerItems.forEach((item, i) => {
      item.classList.toggle('active', i === topSideIndex);
    });

    // Update wall labels - highlight the one at top
    this.wallLabels.forEach((label, i) => {
      label.classList.toggle('active', i === topSideIndex);
    });

    // Update vertex dots - highlight the one at top
    const topVertexIndex = this.getTopVertexIndex();
    this.vertexDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === topVertexIndex);
    });

    // Update current index to track state
    this.currentIndex = topSideIndex;

    // Announce to screen readers
    this.announceContent(topSideIndex);
  }

  getTopSideIndex() {
    // Calculate which side is currently at the top position
    // Sides are indexed starting from the top side (index 0)
    // As we rotate clockwise, we need to determine which side moved to top
    const rotationSteps = Math.round(this.currentRotation / this.rotationStep);

    // The top side index shifts as we rotate
    // Since we rotate clockwise, the side that was at position N 
    // moves to position (N - rotationSteps) mod 7
    const topSideIndex = (this.totalSides - (rotationSteps % this.totalSides)) % this.totalSides;
    return topSideIndex;
  }

  getTopVertexIndex() {
    // The top vertex is the starting point of the top side
    return this.getTopSideIndex();
  }

  /* ========================================================================
     AUTO-ADVANCE
     ======================================================================== */

  startAutoAdvance() {
    this.stopAutoAdvance();

    this.autoAdvanceTimer = setInterval(() => {
      if (!this.isAnimating) {
        this.nextSide();
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
    const content = this.centerItems[index];
    const title = content.querySelector('h2')?.textContent || '';
    const wallLabel = this.wallLabels[index]?.textContent || '';
    const announcement = `Active side: ${wallLabel}. ${title}`;

    let liveRegion = document.getElementById('heptagon-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'heptagon-live-region';
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
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

    // Reposition elements on resize
    this.positionVertexDots();
    this.positionWallLabels();

    // Reset on mobile/desktop switch
    if (wasMobile !== this.isMobile) {
      this.currentRotation = 0;
      this.rotatingLayer.style.transform = 'rotate(0deg)';
      this.currentIndex = 0;
      this.updateActiveState(0);
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
  }
}

/* ============================================================================
   AUTO-INITIALIZATION
   ========================================================================== */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSacredWheel);
} else {
  initSacredWheel();
}

function initSacredWheel() {
  const container = document.querySelector('.heptagon-wheel-container');
  if (container) {
    new SacredHeptagonWheel(container);
  }
}
