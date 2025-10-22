// Size Chart Image Generation Service - Converted from Streamlit Python app
import { createCanvas, loadImage, registerFont } from 'canvas';
import type { Canvas, CanvasRenderingContext2D } from 'canvas';

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
   * Create size chart image from measurements (converted from Python PIL code)
   */
  async createSizeChartImage(measurements: Measurements, product: ProductData): Promise<Buffer | null> {
    try {
      if (!measurements || Object.keys(measurements).length === 0) {
        return null;
      }

      // Organize data for table creation
      const sizes = Object.keys(measurements);
      
      // Get all unique measurement types
      const allMeasurements = new Set<string>();
      Object.values(measurements).forEach(sizeData => {
        Object.keys(sizeData).forEach(key => allMeasurements.add(key));
      });
      
      const measurementTypes = Array.from(allMeasurements).sort();
      
      // Create table structure
      const headers = ['Size', ...measurementTypes];
      const rows: string[][] = [];
      
      sizes.forEach(size => {
        const row = [size];
        measurementTypes.forEach(measureType => {
          const value = measurements[size][measureType] || '-';
          row.push(value);
        });
        rows.push(row);
      });

      return await this.createEnhancedSizeChartImage(headers, rows, product, "Text-Based Measurements");
    } catch (error) {
      console.error('Error creating size chart from text:', error);
      return null;
    }
  }

  /**
   * Create enhanced size chart image with custom brand colors (converted from Python PIL)
   */
  private async createEnhancedSizeChartImage(
    headers: string[], 
    rows: string[][], 
    product: ProductData, 
    chartType: string
  ): Promise<Buffer | null> {
    try {
      // Calculate dimensions based on content
      const maxHeaderLength = Math.max(...headers.map(h => h.length));
      const cellWidth = Math.max(320, Math.min(400, maxHeaderLength * 12));
      const cellHeight = 120;
      const headerHeight = 140;

      const tableWidth = headers.length * cellWidth;
      const tableHeight = headerHeight + rows.length * cellHeight;

      // Add padding and space for logo, title and product details
      const padding = 60;
      const titleSpace = 180;
      
      // Calculate dynamic details space based on product description length
      const description = product.descriptionHtml || '';
      const descriptionLength = description.length;
      
      let detailsSpace: number;
      if (descriptionLength > 5000) {
        detailsSpace = 800;
      } else if (descriptionLength > 2000) {
        detailsSpace = 650;
      } else {
        detailsSpace = 520;
      }

      const imgWidth = Math.max(tableWidth + (padding * 2), 1800);
      const imgHeight = tableHeight + (padding * 2) + titleSpace + detailsSpace;

      // Create canvas with pure white background
      const canvas = createCanvas(imgWidth, imgHeight);
      const ctx = canvas.getContext('2d');
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, imgWidth, imgHeight);

      // Add brand logo at the top if provided
      const logoAreaHeight = 120;
      const logoY = 30;

      if (this.logoPath) {
        try {
          const logoImg = await loadImage(this.logoPath);
          
          // Resize logo to fit in the allocated space
          const maxLogoWidth = 812;
          const maxLogoHeight = 271;
          
          // Calculate resize ratio to maintain aspect ratio
          const logoRatio = Math.min(maxLogoWidth / logoImg.width, maxLogoHeight / logoImg.height);
          const newLogoWidth = logoImg.width * logoRatio;
          const newLogoHeight = logoImg.height * logoRatio;
          
          // Calculate position to center logo
          const logoX = (imgWidth - newLogoWidth) / 2;
          
          // Draw logo
          ctx.drawImage(logoImg, logoX, logoY, newLogoWidth, newLogoHeight);
        } catch (error) {
          console.warn('Could not load logo:', error);
          // Fall back to text logo
          this.drawTextLogo(ctx, imgWidth, logoY);
        }
      } else {
        // Use text logo as fallback
        this.drawTextLogo(ctx, imgWidth, logoY);
      }

      // Draw title with custom colors
      const title = "SIZE CHART";
      ctx.font = `bold ${this.config.titleFontSize}px Arial, sans-serif`;
      ctx.fillStyle = this.config.mainColor;
      
      const titleMetrics = ctx.measureText(title);
      const titleWidth = titleMetrics.width;
      const titleX = padding + 30;
      const titleY = logoAreaHeight + 30 + this.config.titleFontSize;
      
      ctx.fillText(title, titleX, titleY);
      
      // Custom brand-style underline
      const lineY = titleY + 20;
      ctx.fillRect(titleX, lineY, titleWidth, this.config.titleUnderlineHeight);

      // Calculate table position
      const startX = (imgWidth - tableWidth) / 2;
      const startY = logoAreaHeight + 150;

      // Draw table headers with SAME background color for all
      headers.forEach((header, i) => {
        const x = startX + i * cellWidth;
        const y = startY;

        // Custom background color for ALL headers
        ctx.fillStyle = this.config.headerBg;
        ctx.fillRect(x, y, cellWidth, headerHeight);

        // Custom brand-style border
        ctx.strokeStyle = this.config.borderColor;
        ctx.lineWidth = this.config.headerBorderWidth;
        ctx.strokeRect(x, y, cellWidth, headerHeight);

        // Header text - fit properly in each box
        let fontSize = this.config.headerFontSize;
        let textWidth = 0;
        let textHeight = 0;

        // Keep reducing font size until text fits in the cell
        while (fontSize > 16) {
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          const metrics = ctx.measureText(header);
          textWidth = metrics.width;
          textHeight = fontSize; // Approximate height

          if (textWidth <= cellWidth - 40 && textHeight <= headerHeight - 20) {
            break;
          }
          fontSize -= 2;
        }

        // Center the text in the cell
        const textX = x + (cellWidth - textWidth) / 2;
        const textY = y + (headerHeight + fontSize) / 2;

        // Ensure text doesn't go outside cell boundaries
        const finalTextX = Math.max(x + 20, Math.min(textX, x + cellWidth - textWidth - 20));

        // Custom text color for better readability
        ctx.fillStyle = this.config.textColor;
        ctx.fillText(header, finalTextX, textY);
      });

      // Draw table rows with SAME background color for Size column
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (colIdx >= headers.length) return;

          const x = startX + colIdx * cellWidth;
          const y = startY + headerHeight + rowIdx * cellHeight;

          // Custom background colors for cells
          let fillColor: string;
          if (colIdx === 0) { // First column (Size column) - same as headers
            fillColor = this.config.headerBg;
          } else { // Other columns - alternating white shades
            fillColor = rowIdx % 2 === 0 ? 'white' : this.config.alternateRowColor;
          }

          ctx.fillStyle = fillColor;
          ctx.fillRect(x, y, cellWidth, cellHeight);

          ctx.strokeStyle = this.config.borderColor;
          ctx.lineWidth = this.config.tableBorderWidth;
          ctx.strokeRect(x, y, cellWidth, cellHeight);

          // Cell text with better positioning
          ctx.font = `bold ${this.config.cellFontSize}px Arial, sans-serif`;
          const metrics = ctx.measureText(cell);
          const textWidth = metrics.width;
          const textHeight = this.config.cellFontSize;
          const textX = x + (cellWidth - textWidth) / 2;
          const textY = y + (cellHeight + textHeight) / 2;

          // Ensure text doesn't go outside cell boundaries
          const finalTextX = Math.max(x + 10, Math.min(textX, x + cellWidth - textWidth - 10));

          // Custom text color for better readability
          ctx.fillStyle = this.config.textColor;
          ctx.fillText(cell, finalTextX, textY);
        });
      });

      // Extract product details (simplified version of the original Python logic)
      let notesY = startY + headerHeight + rows.length * cellHeight + 50;
      
      try {
        // Fast regex patterns for all details (simplified for Node.js)
        const descriptionText = this.stripHtml(description).toLowerCase();
        
        const patterns = {
          'Features:': /features:\s*([^\n]*)/,
          'Sheer:': /sheer:\s*([^\n]*)/,
          'Stretch:': /stretch:\s*([^\n]*)/,
          'Material:': /(?:material composition:|material:|fabric:)\s*([^\n]*)/,
          'Pattern:': /(?:pattern type:|pattern:)\s*([^\n]*)/,
          'Style:': /style:\s*([^\n]*)/,
          'Neckline:': /neckline:\s*([^\n]*)/,
          'Length:': /(?<!top\s)(?<!sleeve\s)length:\s*([^\n]*)/,
          'Sleeve Length:': /sleeve length:\s*([^\n]*)/,
          'Sleeve Type:': /sleeve type:\s*([^\n]*)/,
          'Care:': /(?:care instructions:|care:)\s*([^\n]*)/,
          'Fit:': /fit:\s*([^\n]*)/,
          'Color:': /color:\s*([^\n]*)/,
          'Season:': /(?:season:|occasion:)\s*([^\n]*)/
        };

        const productDetails: Array<[string, string]> = [];
        Object.entries(patterns).forEach(([label, pattern]) => {
          const match = descriptionText.match(pattern);
          if (match && match[1]) {
            const content = match[1].trim();
            if (content) {
              const capitalizedContent = content.charAt(0).toUpperCase() + content.slice(1);
              productDetails.push([label, capitalizedContent]);
            }
          }
        });

        // Draw bullet points with custom brand colors - limit based on available space
        const maxDetails = Math.min(productDetails.length, descriptionLength > 3000 ? 12 : 8);

        productDetails.slice(0, maxDetails).forEach(([label, content], i) => {
          const yPos = notesY + i * 60;

          // Draw custom brand-style gradient bullets
          const bulletX = padding + 30;
          ctx.fillStyle = this.config.bulletColor;
          ctx.beginPath();
          ctx.arc(bulletX + 8, yPos + 20, 8, 0, 2 * Math.PI);
          ctx.fill();

          // Use Arial font for label text
          ctx.font = `bold ${this.config.bulletFontSize}px Arial, sans-serif`;
          const labelX = bulletX + 30;
          ctx.fillStyle = this.config.textColor;
          ctx.fillText(label, labelX, yPos + 25);

          // Use Arial font for content text - adaptive truncation
          ctx.font = `${this.config.detailFontSize}px Arial, sans-serif`;
          const labelMetrics = ctx.measureText(label);
          const labelWidth = labelMetrics.width;

          // Adaptive content truncation based on description length
          const maxContentLength = descriptionLength > 3000 ? 50 : 35;
          const contentTruncated = content.length > maxContentLength 
            ? content.substring(0, maxContentLength) + "..."
            : content;
          const contentX = labelX + labelWidth + 20;

          // Custom content text color
          ctx.fillStyle = this.config.textColor;
          ctx.fillText(contentTruncated, contentX, yPos + 25);
        });
      } catch (error) {
        // Silent fail for product details
        console.warn('Error processing product details:', error);
      }

      // Add custom brand-style border
      ctx.strokeStyle = this.config.borderColor;
      ctx.lineWidth = this.config.outerBorderWidth;
      ctx.strokeRect(
        this.config.outerBorderWidth / 2, 
        this.config.outerBorderWidth / 2, 
        imgWidth - this.config.outerBorderWidth, 
        imgHeight - this.config.outerBorderWidth
      );

      // Return the canvas as a buffer
      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error creating enhanced size chart image:', error);
      return null;
    }
  }

  /**
   * Draw text logo as fallback when no image logo is provided
   */
  private drawTextLogo(ctx: CanvasRenderingContext2D, imgWidth: number, logoY: number): void {
    // Only draw brand name if provided
    if (!this.config.brandName || this.config.brandName.trim() === '') {
      return; // Skip logo if no brand name is set
    }

    // Use Arial fonts for logo text
    ctx.font = `bold 48px Arial, sans-serif`;
    
    const logoText = this.config.brandName.toUpperCase();
    const logoMetrics = ctx.measureText(logoText);
    const logoWidth = logoMetrics.width;
    const logoX = (imgWidth - logoWidth) / 2;

    // Draw logo text in custom brand colors
    ctx.fillStyle = this.config.mainColor;
    ctx.fillText(logoText, logoX, logoY + 48);
  }

  /**
   * Strip HTML tags from text (simple version)
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  }

  /**
   * Create size chart from HTML table
   */
  async createTableImage(tableHtml: string, product: ProductData): Promise<Buffer | null> {
    try {
      // Parse table HTML to extract data (simple version)
      const rows = this.parseTableHtml(tableHtml);
      if (!rows || rows.length === 0) {
        return null;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      return await this.createEnhancedSizeChartImage(headers, dataRows, product, "HTML Table");
    } catch (error) {
      console.error('Error creating table image:', error);
      return null;
    }
  }

  /**
   * Simple HTML table parser
   */
  private parseTableHtml(tableHtml: string): string[][] | null {
    try {
      // Very basic HTML parsing - in production you might want to use a proper HTML parser
      const rowMatches = tableHtml.match(/<tr[^>]*>.*?<\/tr>/gi);
      if (!rowMatches) return null;

      const rows: string[][] = [];
      
      rowMatches.forEach(rowHtml => {
        const cellMatches = rowHtml.match(/<t[hd][^>]*>.*?<\/t[hd]>/gi);
        if (cellMatches) {
          const cells = cellMatches.map(cellHtml => 
            this.stripHtml(cellHtml).trim()
          );
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
      });

      return rows.length > 0 ? rows : null;
    } catch (error) {
      console.error('Error parsing table HTML:', error);
      return null;
    }
  }
}