// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * GoogleFonts - Dynamic Google Fonts loader for FlutterJS
 * 
 * Usage:
 *   GoogleFonts.roboto({ fontSize: 16, color: Colors.black })
 *   GoogleFonts.poppins({ fontWeight: '700' })
 *   GoogleFonts.mooli()          // Any Google Font name!
 *   GoogleFonts.dancingScript()  // Automatically converts camelCase
 */

import { TextStyle } from './text_style.js';

class GoogleFontsBase {
  static _loadedFonts = new Set();
  
  /**
   * Load a Google Font dynamically
   * @param {string} fontName - The Google Font family name (e.g., "Roboto", "Poppins")
   * @param {string} weights - Optional comma-separated weights (default: "300,400,500,700")
   */
  static _loadFont(fontName, weights = '300,400,500,700') {
    const fontKey = `${fontName}:${weights}`;
    
    // Only load once
    if (this._loadedFonts.has(fontKey)) {
      return;
    }
    
    if (typeof document === 'undefined') return;
    
    // Create font link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@${weights}&display=swap`;
    
    document.head.appendChild(link);
    this._loadedFonts.add(fontKey);
  }
  
  /**
   * Convert camelCase to Proper Case
   * Examples:
   *   roboto → Roboto
   *   openSans → Open Sans
   *   dancingScript → Dancing Script
   */
  static _camelToProperCase(camelCase) {
    return camelCase
      // Insert space before capital letters
      .replace(/([A-Z])/g, ' $1')
      // Capitalize first letter of each word
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  /**
   * Create a TextStyle with a Google Font
   * @param {string} fontName - The Google Font family name
   * @param {object} options - TextStyle options
   * @returns {TextStyle}
   */
  static _createTextStyle(fontName, options = {}) {
    // Load the font
    this._loadFont(fontName);
    
    // Return TextStyle with the font family
    return new TextStyle({
      fontFamily: fontName,
      ...options
    });
  }
  
  /**
   * Generic method for any Google Font
   * @param {string} fontName - The exact Google Font family name
   * @param {object} options - TextStyle options
   * @returns {TextStyle}
   */
  static getFont(fontName, options = {}) {
    return this._createTextStyle(fontName, options);
  }
}

// ============================================================================
// PROXY MAGIC - Handle ANY Google Font dynamically!
// ============================================================================

const GoogleFonts = new Proxy(GoogleFontsBase, {
  get(target, prop) {
    // If the property exists on the class, return it
    if (prop in target) {
      return target[prop];
    }
    
    // Otherwise, create a dynamic font method
    // Convert camelCase to Proper Case (e.g., openSans → Open Sans)
    const fontName = target._camelToProperCase(prop);
    
    // Return a function that creates the TextStyle
    return (options = {}) => target._createTextStyle(fontName, options);
  }
});

export { GoogleFonts };
