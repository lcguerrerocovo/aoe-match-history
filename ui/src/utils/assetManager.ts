/**
 * Asset Manager for AoE2 Match History
 * 
 * Serves assets through aoe2.site domain so Cloudflare can cache them.
 * In development, assets are served locally via Vite.
 * In production, assets are served through the domain (cached by Cloudflare).
 */

import { getMostLikelyMapFilename } from './mapNameResolver';

interface AssetConfig {
  developmentUrl: string;
  productionUrl: string;
}

class AssetManager {
  private config: AssetConfig;

  constructor(config: AssetConfig) {
    this.config = config;
  }

  /**
   * Get the appropriate base URL for assets based on environment
   */
  private getBaseUrl(): string {
    return import.meta.env.DEV ? this.config.developmentUrl : this.config.productionUrl;
  }

  /**
   * Build a complete asset URL
   */
  private buildAssetUrl(path: string): string {
    const baseUrl = this.getBaseUrl();
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * Get map image URL using smart name resolution
   */
  getMapImage(mapName: string): string {
    const filename = getMostLikelyMapFilename(mapName);
    return this.buildAssetUrl(`maps/${filename}`);
  }

  /**
   * Get generic map image URL for fallback
   */
  getGenericMapImage(): string {
    return this.buildAssetUrl('maps/cm_generic.png');
  }

  /**
   * Get civilization icon URL
   */
  getCivIcon(civName: string): string {
    // Handle special cases first
    const specialCases: Record<string, string> = {
      'Lac Viet': 'lacviet.png',
      'Aztec': 'aztecs.png',
    };
    
    if (specialCases[civName]) {
      return this.buildAssetUrl(`civ_icons/${specialCases[civName]}`);
    }
    
    // Default normalization
    const normalizedName = civName.toLowerCase().replace(/\s+/g, '_');
    return this.buildAssetUrl(`civ_icons/${normalizedName}.png`);
  }

  /**
   * Get logo URL
   */
  getLogo(): string {
    return this.buildAssetUrl('logo/logo.png');
  }

  /**
   * Get any asset by path
   */
  getAsset(path: string): string {
    return this.buildAssetUrl(path);
  }
}

// Create default asset manager instance
export const assetManager = new AssetManager({
  developmentUrl: '/src/assets', // Local Vite dev server
  productionUrl: 'https://aoe2.site/assets' // Domain (cached by Cloudflare)
});

export default assetManager; 