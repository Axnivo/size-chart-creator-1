// Size Chart Image Generation Service - Simplified without Canvas
// This will be implemented with a different approach that doesn't require native dependencies

interface Measurements {
  [size: string]: {
    [measurementType: string]: string;
  };
}

interface ProductData {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
}

interface SizeChartConfig {
  mainColor: string;
  headerBg: string;
  textColor: string;
  borderColor: string;
  bulletColor: string;
  alternateRowColor: string;
  tableBorderWidth: number;
  headerBorderWidth: number;
  outerBorderWidth: number;
  titleUnderlineHeight: number;
  titleFontSize: number;
  headerFontSize: number;
  cellFontSize: number;
  detailFontSize: number;
  bulletFontSize: number;
  brandName?: string;
}

export class SizeChartImageService {
  private config: SizeChartConfig;
  private logoPath?: string;

  constructor(config?: Partial<SizeChartConfig>, logoPath?: string) {
    // Default brand colors (customizable by users)
    this.config = {
      mainColor: '#8B4A9C',
      headerBg: '#D1B3E0',
      textColor: '#000000',
      borderColor: '#8B4A9C',
      bulletColor: '#8B4A9C',
      alternateRowColor: '#F8F8F8',
      tableBorderWidth: 11,
      headerBorderWidth: 18,
      outerBorderWidth: 22,
      titleUnderlineHeight: 4,
      titleFontSize: 48,
      headerFontSize: 32,
      cellFontSize: 38,
      detailFontSize: 32,
      bulletFontSize: 36,
      brandName: '',
      ...config
    };
    this.logoPath = logoPath;
  }

  /**
   * Create size chart HTML instead of image (temporary solution)
   */
  async createSizeChartImage(measurements: Measurements, product: ProductData): Promise<Buffer | null> {
    try {
      // For now, return null - we'll implement a different approach
      // This could generate HTML/CSS instead of images
      console.log('Size chart generation called for product:', product.title);
      return null;
    } catch (error) {
      console.error('Error creating size chart:', error);
      return null;
    }
  }

  /**
   * Create size chart from HTML table
   */
  async createTableImage(tableHtml: string, product: ProductData): Promise<Buffer | null> {
    try {
      // For now, return null - we'll implement a different approach  
      console.log('Table image generation called for product:', product.title);
      return null;
    } catch (error) {
      console.error('Error creating table image:', error);
      return null;
    }
  }

  /**
   * Generate size chart as HTML string instead of image
   */
  generateSizeChartHtml(measurements: Measurements, product: ProductData): string {
    if (!measurements || Object.keys(measurements).length === 0) {
      return '<p>No measurements available</p>';
    }

    const sizes = Object.keys(measurements);
    const allMeasurements = new Set<string>();
    
    Object.values(measurements).forEach(sizeData => {
      Object.keys(sizeData).forEach(key => allMeasurements.add(key));
    });
    
    const measurementTypes = Array.from(allMeasurements).sort();
    
    let html = `
      <div class="size-chart" style="font-family: Arial, sans-serif; margin: 20px;">
        <h2 style="color: ${this.config.mainColor}; text-align: center;">Size Chart</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: ${this.config.headerBg};">
              <th style="border: 2px solid ${this.config.borderColor}; padding: 12px; text-align: center;">Size</th>
    `;

    measurementTypes.forEach(type => {
      html += `<th style="border: 2px solid ${this.config.borderColor}; padding: 12px; text-align: center;">${type}</th>`;
    });

    html += '</tr></thead><tbody>';

    sizes.forEach((size, index) => {
      const bgColor = index % 2 === 0 ? 'white' : this.config.alternateRowColor;
      html += `<tr style="background-color: ${bgColor};">`;
      html += `<td style="border: 2px solid ${this.config.borderColor}; padding: 12px; text-align: center; font-weight: bold; background-color: ${this.config.headerBg};">${size}</td>`;
      
      measurementTypes.forEach(type => {
        const value = measurements[size][type] || '-';
        html += `<td style="border: 2px solid ${this.config.borderColor}; padding: 12px; text-align: center;">${value}</td>`;
      });
      
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    
    return html;
  }
}