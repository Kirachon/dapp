import { Page, Locator, expect } from '@playwright/test';

/**
 * Stability helpers for Playwright tests
 * These utilities help reduce flakiness and improve test reliability
 */

export class StabilityHelper {
  constructor(private page: Page) {}

  /**
   * Wait for element to be stable (not moving/changing)
   */
  async waitForStable(locator: Locator, timeout = 5000): Promise<void> {
    let previousBox: any = null;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const currentBox = await locator.boundingBox();
        
        if (currentBox && previousBox) {
          // Check if position and size are stable
          const isStable = 
            Math.abs(currentBox.x - previousBox.x) < 1 &&
            Math.abs(currentBox.y - previousBox.y) < 1 &&
            Math.abs(currentBox.width - previousBox.width) < 1 &&
            Math.abs(currentBox.height - previousBox.height) < 1;
          
          if (isStable) {
            return; // Element is stable
          }
        }
        
        previousBox = currentBox;
        await this.page.waitForTimeout(100);
      } catch (error) {
        // Element might not be visible yet, continue waiting
        await this.page.waitForTimeout(100);
      }
    }
    
    throw new Error(`Element did not stabilize within ${timeout}ms`);
  }

  /**
   * Click with retry logic for flaky elements
   */
  async clickWithRetry(locator: Locator, maxRetries = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait for element to be visible and stable
        await expect(locator).toBeVisible({ timeout: 10000 });
        await this.waitForStable(locator);
        
        // Scroll into view if needed
        await locator.scrollIntoViewIfNeeded();
        
        // Click the element
        await locator.click();
        
        // Verify click was successful by waiting a bit
        await this.page.waitForTimeout(500);
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Click attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          await this.page.waitForTimeout(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw new Error(`Failed to click after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Fill input with retry logic
   */
  async fillWithRetry(locator: Locator, value: string, maxRetries = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await expect(locator).toBeVisible({ timeout: 10000 });
        await this.waitForStable(locator);
        
        // Clear and fill
        await locator.clear();
        await locator.fill(value);
        
        // Verify the value was set
        await expect(locator).toHaveValue(value);
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Fill attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          await this.page.waitForTimeout(1000 * attempt);
        }
      }
    }
    
    throw new Error(`Failed to fill after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Wait for network to be idle with custom timeout
   */
  async waitForNetworkIdle(timeout = 30000): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      console.warn('Network idle timeout, continuing...', error);
    }
  }

  /**
   * Wait for element with multiple selectors (fallback)
   */
  async waitForAnyElement(selectors: string[], timeout = 10000): Promise<Locator> {
    const promises = selectors.map(selector => 
      this.page.locator(selector).first().waitFor({ timeout })
    );

    try {
      await Promise.race(promises);
    } catch (error) {
      throw new Error(`None of the selectors were found: ${selectors.join(', ')}`);
    }

    // Return the first visible element
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible()) {
        return locator;
      }
    }

    throw new Error('No visible element found');
  }

  /**
   * Scroll to element and ensure it's in viewport
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    
    // Wait for scroll to complete
    await this.page.waitForTimeout(500);
    
    // Verify element is in viewport
    const box = await locator.boundingBox();
    const viewport = this.page.viewportSize();
    
    if (box && viewport) {
      const isInViewport = 
        box.y >= 0 && 
        box.y + box.height <= viewport.height &&
        box.x >= 0 && 
        box.x + box.width <= viewport.width;
      
      if (!isInViewport) {
        throw new Error('Element is not fully in viewport after scrolling');
      }
    }
  }

  /**
   * Handle modal dialogs that might appear
   */
  async handlePotentialModal(): Promise<void> {
    const modalSelectors = [
      '[role="dialog"]',
      '.modal',
      '.overlay',
      '[data-testid="modal"]',
    ];

    for (const selector of modalSelectors) {
      const modal = this.page.locator(selector);
      if (await modal.isVisible()) {
        // Try to close the modal
        const closeButton = modal.locator('button:has-text("Close"), button:has-text("×"), [data-testid="close"]');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await this.page.waitForTimeout(500);
        }
      }
    }
  }

  /**
   * Wait for page to be fully loaded and interactive
   */
  async waitForPageReady(): Promise<void> {
    // Wait for DOM to be ready
    await this.page.waitForLoadState('domcontentloaded');
    
    // Wait for network to be idle
    await this.waitForNetworkIdle();
    
    // Wait for any potential loading spinners to disappear
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '[data-testid="loading"]',
      'text=/loading/i',
    ];

    for (const selector of loadingSelectors) {
      const loading = this.page.locator(selector);
      if (await loading.isVisible()) {
        await loading.waitFor({ state: 'hidden', timeout: 10000 });
      }
    }

    // Handle any modals that might have appeared
    await this.handlePotentialModal();
  }

  /**
   * Take screenshot with timestamp for debugging
   */
  async takeDebugScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debug-${name}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: `test-results/debug-screenshots/${filename}`,
      fullPage: true,
    });
    
    console.log(`Debug screenshot saved: ${filename}`);
  }

  /**
   * Retry an action with exponential backoff
   */
  async retryAction<T>(
    action: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Action attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await this.page.waitForTimeout(delay);
        }
      }
    }
    
    throw new Error(`Action failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Wait for element to contain specific text
   */
  async waitForText(locator: Locator, text: string | RegExp, timeout = 10000): Promise<void> {
    await expect(locator).toContainText(text, { timeout });
  }

  /**
   * Check if element is clickable (visible, enabled, not covered)
   */
  async isClickable(locator: Locator): Promise<boolean> {
    try {
      await expect(locator).toBeVisible();
      await expect(locator).toBeEnabled();
      
      // Check if element is not covered by another element
      const box = await locator.boundingBox();
      if (box) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        const elementAtPoint = await this.page.locator(`xpath=//*`).evaluateAll(
          (elements, { x, y }) => {
            const element = document.elementFromPoint(x, y);
            return element ? elements.includes(element as HTMLElement) : false;
          },
          { x: centerX, y: centerY }
        );

        return elementAtPoint;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}
