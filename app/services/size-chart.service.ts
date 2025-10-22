// Size Chart Service - Converted from Streamlit Python app
import type { AdminGraphqlApi } from "@shopify/shopify-api-node";
import { SizeChartImageService } from "./size-chart-image.service";

interface SizeChartResult {
  productId: string;
  productTitle: string;
  success: boolean;
  error?: string;
  imageUploaded: boolean;
  skipped: boolean;
  screenshotPath?: string;
}

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
  images: Array<{
    id: string;
    url: string;
    altText?: string;
  }>;
}

export class SizeChartService {
  private admin: AdminGraphqlApi;
  private imageService: SizeChartImageService;

  constructor(admin: AdminGraphqlApi, config?: any, logoPath?: string) {
    this.admin = admin;
    this.imageService = new SizeChartImageService(config, logoPath);
  }

  /**
   * Extract measurements from product description text
   * Converted from Python regex patterns to TypeScript
   */
  private extractMeasurementsFromText(descriptionText: string): Measurements {
    const measurements: Measurements = {};

    // 1. Preprocessing
    let text = descriptionText.toLowerCase().trim();
    text = text.replace(/：/g, ':');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    text = text.replace(/\s+/g, ' ');

    // 2. Keyword Check
    const sizeKeywords = [
      'size', 'measurement', 'bust', 'waist', 'chest', 'length', 'hip', 'shoulder',
      'sizing', 'guide', 'dimensions', 'insole', 'shaft'
    ];
    
    if (!sizeKeywords.some(keyword => text.includes(keyword))) {
      return {};
    }

    // 3. Define valid measurements and units
    const validMeasurements = [
      'bust', 'chest', 'waist', 'hip', 'length', 'shoulder', 'sleeve', 'neck', 'inseam',
      'rise', 'thigh', 'knee', 'ankle', 'front length', 'back length', 'sleeve length',
      'shoulder width', 'chest width', 'waist width', 'hip width', 'bust width',
      'top length', 'outseam', 'insole length', 'shaft height', 'heel height', 'calf'
    ];

    const unitsPattern = '(?:in|inch|inches|"|cm|centimeter|centimeters)';

    // 4. Define more flexible patterns
    const sizeIndicator = '(?:one size|x{0,3}[sml]|[0-9]{1,2}xl|[2-6]xl|[0-9]{1,2}x|[0-9]{1,2})';
    const measurePattern = new RegExp(`([a-zA-Z\\s/]+?)\\s*[:：-]?\\s*(\\d*\\.?\\d+)\\s*${unitsPattern}`, 'gi');

    // Strategy 1: Line-based extraction (e.g., "S: bust 34 in, length 25 in")
    const linePattern = new RegExp(`^\\s*(${sizeIndicator})\\s*[:：-]\\s*(.*)`, 'i');
    const lines = text.split('\n');
    
    for (const line of lines) {
      const match = line.match(linePattern);
      if (match) {
        const size = match[1].trim().toUpperCase();
        const measurementsStr = match[2].trim();

        if (!measurements[size]) {
          measurements[size] = {};
        }

        let foundMeasures;
        measurePattern.lastIndex = 0; // Reset regex
        while ((foundMeasures = measurePattern.exec(measurementsStr)) !== null) {
          const measureName = foundMeasures[1];
          const value = foundMeasures[2];
          const cleanName = measureName.trim().replace(/\s+/g, ' ');
          
          if (validMeasurements.some(vm => cleanName.toLowerCase().includes(vm))) {
            const unitMatch = measurementsStr.match(new RegExp(`${value}\\s*(${unitsPattern})`, 'i'));
            const unit = unitMatch ? unitMatch[1] : 'in';
            measurements[size][this.toTitleCase(cleanName)] = `${value} ${unit}`;
          }
        }
      }
    }

    // Strategy 2: Block-based extraction
    const blockKeywords = ['product measurements:', 'measurements:', 'size guide:', 'sizing:', 'dimensions:'];
    let textBlock = text;
    
    for (const keyword of blockKeywords) {
      if (text.includes(keyword)) {
        textBlock = text.split(keyword)[1] || text;
        break;
      }
    }

    const blockSizePattern = new RegExp(`(${sizeIndicator})\\s*[:：-]?\\s*((?:[a-zA-Z\\s/]+?[:：-]?\\s*\\d*\\.?\\d+\\s*${unitsPattern}\\s*,?\\s*)+)`, 'gi');
    let sizeMatches;
    
    while ((sizeMatches = blockSizePattern.exec(textBlock)) !== null) {
      const size = sizeMatches[1].trim().toUpperCase();
      const measurementsStr = sizeMatches[2];
      
      if (!measurements[size]) {
        measurements[size] = {};
      }

      measurePattern.lastIndex = 0; // Reset regex
      let foundMeasures;
      while ((foundMeasures = measurePattern.exec(measurementsStr)) !== null) {
        const measureName = foundMeasures[1];
        const value = foundMeasures[2];
        const cleanName = measureName.trim().replace(/\s+/g, ' ');
        
        if (validMeasurements.some(vm => cleanName.toLowerCase().includes(vm))) {
          const unitMatch = measurementsStr.match(new RegExp(`${value}\\s*(${unitsPattern})`, 'i'));
          const unit = unitMatch ? unitMatch[1] : 'in';
          measurements[size][this.toTitleCase(cleanName)] = `${value} ${unit}`;
        }
      }
    }

    // Final validation
    const validatedMeasurements: Measurements = {};
    for (const [size, data] of Object.entries(measurements)) {
      if (Object.keys(data).length > 0) {
        validatedMeasurements[size] = data;
      }
    }

    const totalMeasurements = Object.values(validatedMeasurements).reduce((sum, sizeData) => sum + Object.keys(sizeData).length, 0);
    
    if (totalMeasurements < 1) {
      return {};
    }

    return validatedMeasurements;
  }

  /**
   * Convert string to title case
   */
  private toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Check if product already has a size chart image
   */
  private async hasExistingSizeChart(productId: string): Promise<boolean> {
    try {
      const query = `
        query getProductImages($id: ID!) {
          product(id: $id) {
            images(first: 10) {
              edges {
                node {
                  altText
                }
              }
            }
          }
        }
      `;

      const response = await this.admin.graphql(query, {
        variables: { id: productId }
      });
      
      const data = await response.json();
      const images = data.data?.product?.images?.edges || [];
      
      // Check if any image has size chart in alt text
      return images.some((edge: any) => {
        const altText = edge.node.altText || '';
        return altText.toLowerCase().includes('size chart');
      });
    } catch (error) {
      console.error('Error checking existing size chart:', error);
      return false;
    }
  }

  /**
   * Create size chart image from measurements
   */
  private async createSizeChartImage(measurements: Measurements, product: ProductData): Promise<string | null> {
    try {
      console.log('Creating size chart image for product:', product.title);
      console.log('Measurements:', measurements);
      
      // Use the image service to create the actual image
      const imageBuffer = await this.imageService.createSizeChartImage(measurements, product);
      if (!imageBuffer) {
        return null;
      }
      
      // In production, you would:
      // 1. Upload the imageBuffer to a cloud storage service (AWS S3, Cloudinary, etc.)
      // 2. Return the public URL
      // For now, we'll convert to base64 for direct upload to Shopify
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error('Error creating size chart image:', error);
      return null;
    }
  }

  /**
   * Upload image to Shopify product
   */
  private async uploadImageToShopify(imageDataUrl: string, productId: string, productTitle: string): Promise<boolean> {
    try {
      console.log('Uploading image to Shopify for product:', productTitle);
      
      // Extract base64 data from data URL
      const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const mutation = `
        mutation productImageCreate($productId: ID!, $image: ImageInput!) {
          productImageCreate(productId: $productId, image: $image) {
            image {
              id
              url
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await this.admin.graphql(mutation, {
        variables: {
          productId,
          image: {
            attachment: base64Data,
            altText: `Size Chart - ${productTitle}`
          }
        }
      });
      
      const data = await response.json();
      
      if (data.data?.productImageCreate?.userErrors?.length > 0) {
        console.error('GraphQL errors:', data.data.productImageCreate.userErrors);
        return false;
      }
      
      if (data.data?.productImageCreate?.image) {
        console.log('Successfully uploaded image:', data.data.productImageCreate.image.url);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error uploading image to Shopify:', error);
      return false;
    }
  }

  /**
   * Process a single product for size chart creation
   */
  async processSingleProduct(product: ProductData): Promise<SizeChartResult> {
    const result: SizeChartResult = {
      productId: product.id,
      productTitle: product.title,
      success: false,
      imageUploaded: false,
      skipped: false
    };

    try {
      // Check if product already has a size chart image
      const hasExisting = await this.hasExistingSizeChart(product.id);
      if (hasExisting) {
        result.skipped = true;
        result.error = 'Already has size chart image';
        return result;
      }

      // Extract measurements from description
      const measurements = this.extractMeasurementsFromText(product.descriptionHtml);
      
      if (Object.keys(measurements).length === 0) {
        result.error = 'No size chart data found in description';
        return result;
      }

      // Additional validation - ensure measurements are meaningful
      const totalMeasurements = Object.values(measurements).reduce((sum, sizeData) => sum + Object.keys(sizeData).length, 0);
      if (totalMeasurements < 2) {
        result.error = 'Insufficient measurements found (need at least 2)';
        return result;
      }

      // Create size chart image
      const imageUrl = await this.createSizeChartImage(measurements, product);
      if (!imageUrl) {
        result.error = 'Failed to create size chart image';
        return result;
      }

      result.screenshotPath = imageUrl;

      // Upload to Shopify
      const uploadSuccess = await this.uploadImageToShopify(imageUrl, product.id, product.title);
      if (uploadSuccess) {
        result.success = true;
        result.imageUploaded = true;
      } else {
        result.error = 'Failed to upload image to Shopify';
      }

    } catch (error) {
      result.error = `Processing error: ${error}`;
    }

    return result;
  }

  /**
   * Process multiple products sequentially
   */
  async processProducts(products: ProductData[], progressCallback?: (completed: number, total: number) => void): Promise<SizeChartResult[]> {
    const results: SizeChartResult[] = [];
    
    console.log(`Starting to process ${products.length} products sequentially...`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // Update progress if callback provided
        if (progressCallback) {
          progressCallback(i + 1, products.length);
        }

        // Process single product
        const result = await this.processSingleProduct(product);
        results.push(result);

        // Rate limiting - similar to original Python app
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        // Add error result for failed product
        results.push({
          productId: product.id,
          productTitle: product.title,
          success: false,
          imageUploaded: false,
          error: `Processing error: ${error}`,
          skipped: false
        });
      }
    }
    
    const successfulCount = results.filter(r => r.success).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failedCount = results.length - successfulCount - skippedCount;
    
    console.log(`Completed processing ${products.length} products! ✅ ${successfulCount} successful, ❌ ${failedCount} failed, ⏭️ ${skippedCount} skipped`);
    
    return results;
  }

  /**
   * Get all products from Shopify store with pagination
   */
  async getAllProducts(): Promise<ProductData[]> {
    const products: ProductData[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      try {
        const query = `
          query getProducts($first: Int!, $after: String) {
            products(first: $first, after: $after) {
              edges {
                node {
                  id
                  title
                  handle
                  descriptionHtml
                  images(first: 10) {
                    edges {
                      node {
                        id
                        url
                        altText
                      }
                    }
                  }
                }
                cursor
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `;

        const response = await this.admin.graphql(query, {
          variables: { 
            first: 250, // Maximum allowed by Shopify API
            after: cursor 
          }
        });
        
        const data = await response.json();
        const edges = data.data?.products?.edges || [];
        
        for (const edge of edges) {
          products.push({
            ...edge.node,
            images: edge.node.images?.edges?.map((imgEdge: any) => imgEdge.node) || []
          });
        }

        hasNextPage = data.data?.products?.pageInfo?.hasNextPage || false;
        cursor = data.data?.products?.pageInfo?.endCursor || null;

        // Rate limiting - Shopify allows 2 calls per second
        await new Promise(resolve => setTimeout(resolve, 600));

      } catch (error) {
        console.error('Error fetching products:', error);
        break;
      }
    }

    console.log(`Successfully fetched ${products.length} products total`);
    return products;
  }

  /**
   * Get products from a specific collection
   */
  async getProductsByCollection(collectionId: string): Promise<ProductData[]> {
    const products: ProductData[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      try {
        const query = `
          query getCollectionProducts($id: ID!, $first: Int!, $after: String) {
            collection(id: $id) {
              products(first: $first, after: $after) {
                edges {
                  node {
                    id
                    title
                    handle
                    descriptionHtml
                    images(first: 10) {
                      edges {
                        node {
                          id
                          url
                          altText
                        }
                      }
                    }
                  }
                  cursor
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `;

        const response = await this.admin.graphql(query, {
          variables: { 
            id: collectionId,
            first: 250,
            after: cursor 
          }
        });
        
        const data = await response.json();
        const edges = data.data?.collection?.products?.edges || [];
        
        for (const edge of edges) {
          products.push({
            ...edge.node,
            images: edge.node.images?.edges?.map((imgEdge: any) => imgEdge.node) || []
          });
        }

        hasNextPage = data.data?.collection?.products?.pageInfo?.hasNextPage || false;
        cursor = data.data?.collection?.products?.pageInfo?.endCursor || null;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 600));

      } catch (error) {
        console.error('Error fetching collection products:', error);
        break;
      }
    }

    console.log(`Successfully fetched ${products.length} products from collection`);
    return products;
  }
}