import streamlit as st
import os
import time
import logging
from datetime import datetime
from typing import List, Dict, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import shopify
from dotenv import load_dotenv
import sys
import requests
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import json
from bs4 import BeautifulSoup
import time
import re

load_dotenv()


class StreamlitScreenshotApp:
    def __init__(self):
        self.screenshot_folder = "size_chart_screenshots"
        os.makedirs(self.screenshot_folder, exist_ok=True)
        self.logo_path = None
        self.colors = {}

    def setup_shopify(self, shop_url=None, api_key=None, password=None):
        """Initialize Shopify API connection"""
        try:
            # Use environment variables if parameters not provided
            shop_url = shop_url or os.getenv('SHOPIFY_SHOP_NAME')
            api_key = api_key or os.getenv('SHOPIFY_API_KEY')
            password = password or os.getenv('SHOPIFY_ACCESS_TOKEN')

            if not all([shop_url, api_key, password]):
                return False, "❌ Missing Shopify credentials. Please check your .env file."

            # Clean up shop URL format
            clean_shop_url = shop_url.strip()
            if clean_shop_url.startswith('https://'):
                clean_shop_url = clean_shop_url.replace('https://', '')
            if clean_shop_url.startswith('http://'):
                clean_shop_url = clean_shop_url.replace('http://', '')
            if not clean_shop_url.endswith('.myshopify.com'):
                clean_shop_url = f"{clean_shop_url}.myshopify.com"

            # Clear any existing session first
            try:
                shopify.ShopifyResource.clear_session()
            except:
                pass

            # Log attempt for debugging (visible in Streamlit logs)
            st.write(f"🔍 Debug: Attempting to connect to: {clean_shop_url}")
            st.write(f"🔍 Debug: Using API version: 2024-04")
            st.write(f"🔍 Debug: Token ends with: ...{password[-4:] if len(password) > 4 else 'short'}")

            # Try the most compatible method first
            success = False
            last_error = None

            # Method 1: Use ShopifyAPI with access token (most common for apps)
            try:
                shopify.ShopifyResource.set_site(f"https://{clean_shop_url}/admin/api/2024-04")
                shopify.ShopifyResource.set_headers({"X-Shopify-Access-Token": password})

                # Test the connection
                shop = shopify.Shop.current()
                shop_name = getattr(shop, 'name', clean_shop_url)
                print(f"✅ Method 1 successful: Connected to {shop_name}")
                return True, f"✅ Connected to {shop_name}"

            except Exception as e1:
                last_error = e1
                print(f"❌ Method 1 failed: {str(e1)}")

            # Method 2: Try with Session object
            try:
                session = shopify.Session(clean_shop_url, "2024-04", password)
                shopify.ShopifyResource.activate_session(session)

                # Test the connection
                shop = shopify.Shop.current()
                shop_name = getattr(shop, 'name', clean_shop_url)
                print(f"✅ Method 2 successful: Connected to {shop_name}")
                return True, f"✅ Connected to {shop_name}"

            except Exception as e2:
                last_error = e2
                print(f"❌ Method 2 failed: {str(e2)}")

            # Method 3: Try basic auth format
            try:
                site_url = f"https://{api_key}:{password}@{clean_shop_url}/admin/api/2024-04"
                shopify.ShopifyResource.set_site(site_url)

                # Test the connection
                shop = shopify.Shop.current()
                shop_name = getattr(shop, 'name', clean_shop_url)
                print(f"✅ Method 3 successful: Connected to {shop_name}")
                return True, f"✅ Connected to {shop_name}"

            except Exception as e3:
                last_error = e3
                print(f"❌ Method 3 failed: {str(e3)}")

            # If all methods failed, return the last error
            raise last_error

        except Exception as e:
            # Clear any existing session
            try:
                shopify.ShopifyResource.clear_session()
            except:
                pass

            error_msg = str(e)
            print(f"❌ All connection methods failed. Final error: {error_msg}")

            # Provide specific error messages
            if "401" in error_msg or "Unauthorized" in error_msg:
                return False, f"❌ Unauthorized: Invalid access token. Please check your SHOPIFY_ACCESS_TOKEN in .env file"
            elif "403" in error_msg or "Forbidden" in error_msg:
                return False, f"❌ Forbidden: Access token doesn't have required permissions"
            elif "404" in error_msg or "Not Found" in error_msg:
                return False, f"❌ Shop not found: Please check your SHOPIFY_SHOP_NAME in .env file"
            elif "SSL" in error_msg:
                return False, f"❌ SSL Error: {error_msg}"
            elif "timeout" in error_msg.lower():
                return False, f"❌ Connection timeout: Please check your internet connection"
            else:
                return False, f"❌ Connection failed: {error_msg}"

    def setup_driver(self):
        """Initialize Chrome WebDriver with options"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-images")
        chrome_options.add_argument("--disable-javascript")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--allow-running-insecure-content")
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--disable-default-apps")

        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.implicitly_wait(5)
            return True, "Chrome WebDriver initialized"
        except Exception as e:
            return False, f"Failed to initialize WebDriver: {e}"

    def get_all_products(self) -> List[shopify.Product]:
        """Retrieve all products from Shopify store using pagination with enhanced support for 10,000+ products"""
        try:
            products = []
            limit = 250  # Maximum allowed by Shopify API
            since_id = 0
            batch_count = 0

            st.info("🔄 Starting to fetch products... This may take a while for large collections.")

            while True:
                try:
                    # Add retry logic for API calls
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            batch = shopify.Product.find(
                                limit=limit,
                                since_id=since_id,
                                fields='id,title,handle,body_html'
                            )
                            break
                        except Exception as e:
                            if attempt < max_retries - 1:
                                st.warning(f"⚠️ API call failed (attempt {attempt + 1}), retrying in 2 seconds...")
                                time.sleep(2)
                            else:
                                raise e

                    if not batch:
                        break

                    products.extend(batch)
                    since_id = batch[-1].id
                    batch_count += 1

                    # Progress update
                    if batch_count % 10 == 0:  # Update every 10 batches
                        st.info(f"📊 Fetched {len(products)} products so far...")

                    # Rate limiting - Shopify allows 2 calls per second
                    time.sleep(0.6)

                    if len(batch) < limit:
                        break

                except Exception as e:
                    st.error(f"Error fetching product batch: {e}")
                    break

            st.success(f"✅ Successfully fetched {len(products)} products total")
            return products

        except Exception as e:
            st.error(f"Failed to retrieve products: {e}")
            return []

    def get_all_collections(self) -> List[shopify.CustomCollection]:
        """Retrieve all collections from Shopify store with enhanced pagination"""
        try:
            collections = []
            limit = 250  # Maximum allowed by Shopify API

            # Get Custom Collections
            since_id = 0
            while True:
                try:
                    batch = shopify.CustomCollection.find(limit=limit, since_id=since_id, fields='id,title')
                    if not batch:
                        break

                    collections.extend(batch)
                    since_id = batch[-1].id

                    # Rate limiting
                    time.sleep(0.6)

                    if len(batch) < limit:
                        break
                except Exception as e:
                    st.warning(f"Error retrieving custom collections: {e}")
                    break

            # Get Smart Collections
            since_id = 0
            while True:
                try:
                    batch = shopify.SmartCollection.find(limit=limit, since_id=since_id, fields='id,title')
                    if not batch:
                        break

                    collections.extend(batch)
                    since_id = batch[-1].id

                    # Rate limiting
                    time.sleep(0.6)

                    if len(batch) < limit:
                        break
                except Exception as e:
                    st.warning(f"Error retrieving smart collections: {e}")
                    break

            return collections
        except Exception as e:
            st.error(f"Failed to retrieve collections: {e}")
            return []

    def get_products_by_collection(self, collection_id: int) -> List[shopify.Product]:
        """Retrieve products from a specific collection with enhanced support for 10,000+ products"""
        try:
            products = []
            limit = 250  # Maximum allowed by Shopify API
            since_id = 0
            batch_count = 0

            st.info(
                f"🔄 Fetching products from collection {collection_id}... This may take a while for large collections.")

            while True:
                try:
                    # Add retry logic for API calls
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            batch = shopify.Product.find(
                                limit=limit,
                                since_id=since_id,
                                collection_id=collection_id,
                                fields='id,title,handle,body_html'
                            )
                            break
                        except Exception as e:
                            if attempt < max_retries - 1:
                                st.warning(f"⚠️ API call failed (attempt {attempt + 1}), retrying in 2 seconds...")
                                time.sleep(2)
                            else:
                                raise e

                    if not batch:
                        break

                    products.extend(batch)
                    since_id = batch[-1].id
                    batch_count += 1

                    # Progress update every 10 batches (2500 products)
                    if batch_count % 10 == 0:
                        st.info(f"📊 Fetched {len(products)} products from collection so far...")

                    # Rate limiting - Shopify allows 2 calls per second
                    time.sleep(0.6)

                    if len(batch) < limit:
                        break

                except Exception as e:
                    st.error(f"Error fetching collection products batch: {e}")
                    break

            st.success(f"✅ Successfully fetched {len(products)} products from collection")
            return products

        except Exception as e:
            st.error(f"Failed to retrieve products from collection: {e}")
            return []

    def extract_measurements_from_text(self, description_text: str) -> dict:
        """Extract size measurements from text descriptions with enhanced, flexible validation"""
        measurements = {}

        # 1. Preprocessing
        text = description_text.lower().strip()
        text = text.replace('：', ':')
        text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
        text = ' '.join(text.split())

        # 2. Keyword Check
        size_keywords = [
            'size', 'measurement', 'bust', 'waist', 'chest', 'length', 'hip', 'shoulder',
            'sizing', 'guide', 'dimensions', 'insole', 'shaft'
        ]
        if not any(keyword in text for keyword in size_keywords):
            return {}

        # 3. Define valid measurements and units
        valid_measurements = [
            'bust', 'chest', 'waist', 'hip', 'length', 'shoulder', 'sleeve', 'neck', 'inseam',
            'rise', 'thigh', 'knee', 'ankle', 'front length', 'back length', 'sleeve length',
            'shoulder width', 'chest width', 'waist width', 'hip width', 'bust width',
            'top length', 'outseam', 'insole length', 'shaft height', 'heel height', 'calf'
        ]
        units = r'(?:in|inch|inches|"|cm|centimeter|centimeters)'

        # 4. Define more flexible patterns
        size_indicator = r'(?:one size|x{0,3}[sml]|[0-9]{1,2}xl|[2-6]xl|[0-9]{1,2}x|[0-9]{1,2})'
        measure_pattern = rf'([a-zA-Z\s/]+?)\s*[:：-]?\s*(\d*\.?\d+)\s*{units}'

        # --- Extraction Strategies ---

        # Strategy 1: Line-based extraction (e.g., "S: bust 34 in, length 25 in")
        line_pattern = rf'^\s*({size_indicator})\s*[:：-]\s*(.*)'
        lines = text.split('\n')
        for line in lines:
            match = re.match(line_pattern, line, re.IGNORECASE)
            if match:
                size = match.group(1).strip().upper()
                measurements_str = match.group(2).strip()

                if size not in measurements:
                    measurements[size] = {}

                found_measures = re.findall(measure_pattern, measurements_str)
                for measure_name, value in found_measures:
                    clean_name = ' '.join(measure_name.strip().split()).title()
                    if any(vm in clean_name.lower() for vm in valid_measurements):
                        unit_match = re.search(rf'{value}\s*({units})', measurements_str)
                        unit = unit_match.group(1) if unit_match else 'in'
                        measurements[size][clean_name] = f"{value} {unit}"

        # Strategy 2: Block-based extraction
        block_keywords = ['product measurements:', 'measurements:', 'size guide:', 'sizing:', 'dimensions:']
        text_block = text
        for keyword in block_keywords:
            if keyword in text:
                text_block = text.split(keyword, 1)[-1]
                break

        block_size_pattern = rf'({size_indicator})\s*[:：-]?\s*((?:[a-zA-Z\s/]+?[:：-]?\s*\d*\.?\d+\s*{units}\s*,?\s*)+)'
        size_matches = re.findall(block_size_pattern, text_block, re.IGNORECASE)

        for size, measurements_str in size_matches:
            size = size.strip().upper()
            if size not in measurements:
                measurements[size] = {}

            found_measures = re.findall(measure_pattern, measurements_str)
            for measure_name, value in found_measures:
                clean_name = ' '.join(measure_name.strip().split()).title()
                if any(vm in clean_name.lower() for vm in valid_measurements):
                    unit_match = re.search(rf'{value}\s*({units})', measurements_str)
                    unit = unit_match.group(1) if unit_match else 'in'
                    measurements[size][clean_name] = f"{value} {unit}"

        # Strategy 3: Text-based tables (standard format)
        header_keywords = ['size', 'bust', 'waist', 'length', 'hip']
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if sum(1 for kw in header_keywords if kw in line) >= 2:
                header_line = line
                data_lines = lines[i + 1: i + 10]

                headers = re.split(r'\s{2,}|\||\t', header_line.strip())
                headers = [h.strip() for h in headers if h.strip()]

                if len(headers) < 2: continue

                for data_line in data_lines:
                    if not data_line.strip() or ':' in data_line:
                        break

                    values = re.split(r'\s{2,}|\||\t', data_line.strip())
                    values = [v.strip() for v in values if v.strip()]

                    if len(values) != len(headers): continue

                    size = values[0].upper()
                    if re.fullmatch(size_indicator, size, re.IGNORECASE):
                        if size not in measurements:
                            measurements[size] = {}

                        for j, header in enumerate(headers[1:], 1):
                            clean_header = ' '.join(header.strip().split()).title()
                            if any(vm in clean_header.lower() for vm in valid_measurements):
                                value = values[j]
                                match = re.match(rf'(\d*\.?\d+)\s*({units})?', value)
                                if match:
                                    measurements[size][clean_header] = value

        # Strategy 4: Transposed table format (size names in first row, values in first column)
        for i, line in enumerate(lines):
            # Look for lines with multiple size indicators
            size_matches = re.findall(rf'({size_indicator})', line, re.IGNORECASE)
            if len(size_matches) >= 2:  # At least 2 sizes in the line
                size_row = line

                # Extract sizes from the header row
                sizes_in_row = []
                for match in re.finditer(rf'({size_indicator})', size_row, re.IGNORECASE):
                    sizes_in_row.append(match.group(1).upper())

                if len(sizes_in_row) < 2:
                    continue

                # Look for data rows below (measurement types and their values)
                data_rows = lines[i + 1: i + 15]  # Check next 15 lines

                for data_line in data_rows:
                    if not data_line.strip():
                        continue

                    # Check if this line contains a measurement type
                    line_lower = data_line.lower()
                    measurement_found = False
                    measurement_name = None

                    for vm in valid_measurements:
                        if vm in line_lower:
                            measurement_found = True
                            measurement_name = vm.title()
                            break

                    if not measurement_found:
                        continue

                    # Extract values from this measurement line
                    values = re.findall(rf'(\d*\.?\d+)\s*{units}', data_line)

                    if len(values) >= len(sizes_in_row):
                        # Map values to sizes
                        for j, size in enumerate(sizes_in_row):
                            if j < len(values):
                                if size not in measurements:
                                    measurements[size] = {}

                                # Find the unit for this value
                                value_with_unit = values[j]
                                unit_match = re.search(rf'{re.escape(value_with_unit)}\s*({units})', data_line)
                                unit = unit_match.group(1) if unit_match else 'in'

                                measurements[size][measurement_name] = f"{value_with_unit} {unit}"

        # Final validation
        validated_measurements = {
            size: data for size, data in measurements.items() if data
        }

        if validated_measurements:
            total_measurements = sum(len(size_data) for size_data in validated_measurements.values())
            if total_measurements < 1:
                return {}

        return validated_measurements

    def create_size_chart_from_text_measurements(self, measurements: dict, product: shopify.Product) -> str:
        """Create a size chart image from extracted text measurements"""
        try:
            if not measurements:
                return None

            # Organize data for table creation
            sizes = list(measurements.keys())

            # Get all unique measurement types
            all_measurements = set()
            for size_data in measurements.values():
                all_measurements.update(size_data.keys())

            measurement_types = sorted(list(all_measurements))

            # Create table structure
            headers = ['Size'] + measurement_types
            rows = []

            for size in sizes:
                row = [size]
                for measure_type in measurement_types:
                    value = measurements[size].get(measure_type, '-')
                    row.append(value)
                rows.append(row)

            # Create the size chart image
            return self.create_enhanced_size_chart_image(headers, rows, product, "Text-Based Measurements")

        except Exception as e:
            st.error(f"Error creating size chart from text: {e}")
            return None

    def draw_text_logo(self, draw, img_width, logo_y):
        """Draw text logo as fallback when no image logo is provided"""

        def get_brick_sans_font(size):
            """Get Brick Sans-style font with fallbacks"""
            try:
                return ImageFont.truetype('/System/Library/Fonts/Arial-BoldMT.ttf', size)
            except:
                try:
                    return ImageFont.truetype('/System/Library/Fonts/Arial Bold.ttf', size)
                except:
                    try:
                        return ImageFont.truetype('/System/Library/Fonts/Helvetica-Bold.ttf', size)
                    except:
                        return ImageFont.load_default()

        # Use Brick Sans-style fonts for logo text
        logo_font = get_brick_sans_font(48)
        tm_font = get_brick_sans_font(24)

        logo_text = "LITTIV"
        logo_bbox = draw.textbbox((0, 0), logo_text, font=logo_font)
        logo_width = logo_bbox[2] - logo_bbox[0]
        logo_x = (img_width - logo_width) // 2

        # Draw logo text in custom brand colors with TM
        logo_color = self.colors.get('main_purple', '#8B4A9C')
        draw.text((logo_x, logo_y + 5), logo_text, fill=logo_color, font=logo_font)
        draw.text((logo_x + logo_width + 5, logo_y + 5), "™", fill=logo_color, font=tm_font)

    def create_enhanced_size_chart_image(self, headers: list, rows: list, product: shopify.Product,
                                         chart_type: str) -> str:
        """Create an enhanced size chart image with LITTIV colors"""
        try:
            # Calculate dimensions based on content
            # Adaptive cell width based on header content
            max_header_length = max(len(str(header)) for header in headers) if headers else 10
            cell_width = max(320, min(400, max_header_length * 12))  # Scale width based on header length
            cell_height = 120
            header_height = 140

            table_width = len(headers) * cell_width
            table_height = header_height + len(rows) * cell_height

            # Add padding and space for logo, title and product details
            padding = 60
            title_space = 180

            # Calculate dynamic details space based on product description length
            description = getattr(product, 'body_html', '') or ''
            description_length = len(description)

            # Base details space with scaling based on description length
            if description_length > 5000:
                details_space = 800  # Large descriptions need more space
            elif description_length > 2000:
                details_space = 650  # Medium descriptions
            else:
                details_space = 520  # Small descriptions or default

            img_width = max(table_width + (padding * 2), 1800)
            img_height = table_height + (padding * 2) + title_space + details_space

            # Create image with pure white background
            img = Image.new('RGB', (img_width, img_height), 'white')
            draw = ImageDraw.Draw(img)

            # Add brand logo at the top if provided
            logo_area_height = 120
            logo_y = 30

            if self.logo_path and os.path.exists(self.logo_path):
                try:
                    # Load and resize logo
                    logo_img = Image.open(self.logo_path)

                    # Resize logo to fit in the allocated space
                    max_logo_width = 812
                    max_logo_height = 271

                    # Calculate resize ratio to maintain aspect ratio
                    logo_ratio = min(max_logo_width / logo_img.width, max_logo_height / logo_img.height)
                    new_logo_width = int(logo_img.width * logo_ratio)
                    new_logo_height = int(logo_img.height * logo_ratio)

                    # Resize logo
                    logo_resized = logo_img.resize((new_logo_width, new_logo_height), Image.Resampling.LANCZOS)

                    # Calculate position to center logo
                    logo_x = (img_width - new_logo_width) // 2

                    # Paste logo onto the main image
                    if logo_resized.mode == 'RGBA':
                        img.paste(logo_resized, (logo_x, logo_y), logo_resized)
                    else:
                        img.paste(logo_resized, (logo_x, logo_y))

                except Exception as e:
                    st.warning(f"Could not load logo: {e}")
                    # Fall back to text logo
                    self.draw_text_logo(draw, img_width, logo_y)
            else:
                # Use text logo as fallback
                self.draw_text_logo(draw, img_width, logo_y)

            # Load Brick Sans-style fonts
            def get_brick_sans_font(size):
                """Get Brick Sans-style font with fallbacks"""
                try:
                    return ImageFont.truetype('/System/Library/Fonts/Arial-BoldMT.ttf', size)
                except:
                    try:
                        return ImageFont.truetype('/System/Library/Fonts/Arial Bold.ttf', size)
                    except:
                        try:
                            return ImageFont.truetype('/System/Library/Fonts/Helvetica-Bold.ttf', size)
                        except:
                            return ImageFont.load_default()

            # All fonts use Brick Sans-style with custom sizes
            title_font = get_brick_sans_font(self.colors.get('title_font_size', 48))
            header_font = get_brick_sans_font(self.colors.get('header_font_size', 32))
            cell_font = get_brick_sans_font(self.colors.get('cell_font_size', 38))
            detail_font = get_brick_sans_font(self.colors.get('detail_font_size', 32))
            bullet_font = get_brick_sans_font(self.colors.get('bullet_font_size', 36))

            # Draw title with custom colors
            title = "SIZE CHART"
            brick_title_font = get_brick_sans_font(self.colors.get('title_font_size', 48))
            title_bbox = draw.textbbox((0, 0), title, font=brick_title_font)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = padding + 30

            # Custom brand-style title
            title_color = self.colors.get('main_purple', '#8B4A9C')
            draw.text((title_x, logo_area_height + 30), title, fill=title_color, font=brick_title_font)

            # Custom brand-style underline
            line_y = logo_area_height + 110
            underline_height = self.colors.get('title_underline_height', 4)
            draw.rectangle([title_x, line_y, title_x + title_width, line_y + underline_height], fill=title_color)

            # Calculate table position
            start_x = (img_width - table_width) // 2
            start_y = logo_area_height + 150

            # Draw table headers with SAME background color for all
            for i, header in enumerate(headers):
                x = start_x + i * cell_width
                y = start_y

                # Custom background color for ALL headers
                header_color = self.colors.get('header_bg', '#D1B3E0')

                # Fill header background
                draw.rectangle([x, y, x + cell_width, y + header_height], fill=header_color)

                # Custom brand-style border
                border_color = self.colors.get('border', '#8B4A9C')
                header_border_width = self.colors.get('header_border_width', 18)
                draw.rectangle([x, y, x + cell_width, y + header_height],
                               outline=border_color, width=header_border_width)

                # Header text - fit properly in each box
                current_font = header_font
                current_size = 32
                text_width = 0
                text_height = 0

                # Keep reducing font size until text fits in the cell
                while current_size > 16:
                    test_font = get_brick_sans_font(current_size)

                    text_bbox = draw.textbbox((0, 0), header, font=test_font)
                    text_width = text_bbox[2] - text_bbox[0]
                    text_height = text_bbox[3] - text_bbox[1]

                    if text_width <= cell_width - 40 and text_height <= header_height - 20:
                        current_font = test_font
                        break

                    current_size -= 2

                # Center the text in the cell
                text_x = x + (cell_width - text_width) // 2
                text_y = y + (header_height - text_height) // 2

                # Ensure text doesn't go outside cell boundaries
                text_x = max(x + 20, min(text_x, x + cell_width - text_width - 20))
                text_y = max(y + 10, min(text_y, y + header_height - text_height - 10))

                # Custom text color for better readability
                text_color = self.colors.get('text', '#000000')
                draw.text((text_x, text_y), header, fill=text_color, font=current_font)

            # Draw table rows with SAME background color for Size column
            for row_idx, row in enumerate(rows):
                for col_idx, cell in enumerate(row):
                    if col_idx >= len(headers):
                        break

                    x = start_x + col_idx * cell_width
                    y = start_y + header_height + row_idx * cell_height

                    # Custom background colors for cells
                    if col_idx == 0:  # First column (Size column) - same as headers
                        fill_color = self.colors.get('header_bg', '#D1B3E0')
                    else:  # Other columns - alternating white shades
                        if row_idx % 2 == 0:
                            fill_color = 'white'
                        else:
                            fill_color = self.colors.get('alternate_row', '#F8F8F8')

                    border_color = self.colors.get('border', '#8B4A9C')
                    table_border_width = self.colors.get('table_border_width', 11)
                    draw.rectangle([x, y, x + cell_width, y + cell_height],
                                   fill=fill_color, outline=border_color, width=table_border_width)

                    # Cell text with better positioning
                    brick_cell_font = get_brick_sans_font(self.colors.get('cell_font_size', 38))
                    text_bbox = draw.textbbox((0, 0), str(cell), font=brick_cell_font)
                    text_width = text_bbox[2] - text_bbox[0]
                    text_height = text_bbox[3] - text_bbox[1]
                    text_x = x + (cell_width - text_width) // 2
                    text_y = y + (cell_height - text_height) // 2

                    # Ensure text doesn't go outside cell boundaries
                    text_x = max(x + 10, min(text_x, x + cell_width - text_width - 10))

                    # Custom text color for better readability
                    text_color = self.colors.get('text', '#000000')

                    draw.text((text_x, text_y), str(cell), fill=text_color, font=brick_cell_font)

            # Extract product details
            notes_y = start_y + header_height + len(rows) * cell_height + 50

            try:
                description = getattr(product, 'body_html', '') or ''
                soup_desc = BeautifulSoup(description, 'html.parser')
                description_text = soup_desc.get_text()
                description_lower = description_text.lower()

                # Fast regex patterns for all details
                patterns = {
                    'Features:': r'features:\s*([^\n]*)',
                    'Sheer:': r'sheer:\s*([^\n]*)',
                    'Stretch:': r'stretch:\s*([^\n]*)',
                    'Material:': r'material composition:\s*([^\n]*)|material:\s*([^\n]*)|fabric:\s*([^\n]*)',
                    'Pattern:': r'pattern type:\s*([^\n]*)|pattern:\s*([^\n]*)',
                    'Style:': r'style:\s*([^\n]*)',
                    'Neckline:': r'neckline:\s*([^\n]*)',
                    'Length:': r'(?<!top\s)(?<!sleeve\s)length:\s*([^\n]*)',
                    'Sleeve Length:': r'sleeve length:\s*([^\n]*)',
                    'Sleeve Type:': r'sleeve type:\s*([^\n]*)',
                    'Care:': r'care instructions:\s*([^\n]*)|care:\s*([^\n]*)',
                    'Fit:': r'fit:\s*([^\n]*)',
                    'Color:': r'color:\s*([^\n]*)',
                    'Season:': r'season:\s*([^\n]*)|occasion:\s*([^\n]*)'
                }

                product_details = []
                for label, pattern in patterns.items():
                    match = re.search(pattern, description_lower, re.IGNORECASE)
                    if match:
                        content = next((group for group in match.groups() if group), "").strip()
                        if content:
                            content = content[0].upper() + content[1:] if content else content
                            product_details.append((label, content))

                # Draw bullet points with LITTIV colors - limit based on available space
                max_details = min(len(product_details), 12 if description_length > 3000 else 8)

                for i, (label, content) in enumerate(product_details[:max_details]):
                    y_pos = notes_y + i * 60

                    # Draw custom brand-style gradient bullets
                    bullet_x = padding + 30
                    bullet_color = self.colors.get('bullet', '#8B4A9C')
                    draw.ellipse([bullet_x, y_pos + 12, bullet_x + 16, y_pos + 28], fill=bullet_color)

                    # Use Brick Sans font for label text
                    brick_bullet_font = get_brick_sans_font(self.colors.get('bullet_font_size', 43))
                    label_x = bullet_x + 30
                    text_color = self.colors.get('text', '#000000')
                    draw.text((label_x, y_pos), label, fill=text_color, font=brick_bullet_font)

                    # Use Brick Sans font for content text - adaptive truncation
                    brick_detail_font = get_brick_sans_font(self.colors.get('detail_font_size', 38))
                    label_bbox = draw.textbbox((0, 0), label, font=brick_bullet_font)
                    label_width = label_bbox[2] - label_bbox[0]

                    # Adaptive content truncation based on description length
                    max_content_length = 50 if description_length > 3000 else 35
                    content_truncated = content[:max_content_length] + "..." if len(
                        content) > max_content_length else content
                    content_x = label_x + label_width + 20

                    # Custom content text color
                    text_color = self.colors.get('text', '#000000')
                    draw.text((content_x, y_pos), content_truncated, fill=text_color, font=brick_detail_font)

            except Exception as e:
                pass

            # Add custom brand-style border
            border_width = self.colors.get('outer_border_width', 22)

            # Outer border in custom color
            border_color = self.colors.get('border', '#8B4A9C')
            draw.rectangle(
                [border_width // 2, border_width // 2, img_width - border_width // 2, img_height - border_width // 2],
                outline=border_color, width=border_width)

            # Save image
            screenshot_path = os.path.join(
                self.screenshot_folder,
                f"size_chart_text_{product.id}_{int(time.time())}.png"
            )

            img.save(screenshot_path, 'PNG', optimize=True, quality=85)
            return screenshot_path

        except Exception as e:
            st.error(f"Error creating enhanced size chart image: {e}")
            return None

    def create_table_image(self, table_html: str, product: shopify.Product) -> str:
        """Convert HTML table to image using PIL"""
        try:
            # Parse table HTML to extract data
            soup = BeautifulSoup(table_html, 'html.parser')

            # Extract table headers
            headers = []
            header_row = soup.find('tr')
            if header_row:
                for th in header_row.find_all(['th', 'td']):
                    headers.append(th.get_text().strip())

            # Extract table rows
            rows = []
            for tr in soup.find_all('tr')[1:]:  # Skip header row
                row = []
                for td in tr.find_all(['td', 'th']):
                    row.append(td.get_text().strip())
                if row:
                    rows.append(row)

            if not headers or not rows:
                return None

            return self.create_enhanced_size_chart_image(headers, rows, product, "HTML Table")

        except Exception as e:
            return None

    def take_size_chart_screenshot_from_description(self, product: shopify.Product, shop_url: str,
                                                    debug_mode: bool = False) -> Optional[str]:
        """Enhanced version that handles text-based measurements"""
        try:
            # Get product description
            description = getattr(product, 'body_html', None)
            if not description:
                if debug_mode:
                    st.warning(f"No body_html found for product: {product.title}")
                return None

            # Parse HTML
            soup = BeautifulSoup(description, 'html.parser')

            # Method 1: Look for existing images
            images = soup.find_all('img')
            tables = soup.find_all('table')

            if debug_mode:
                st.info(f"🔍 Found {len(images)} images and {len(tables)} tables in description")

            # Enhanced image method with better detection
            if images:
                size_chart_images = []

                # Enhanced size chart keywords for better detection
                size_keywords = [
                    'size', 'chart', 'guide', 'measurement', 'sizing', 'dimensions',
                    'fit', 'scale', 'ruler', 'measurements', 'sizeguide', 'sizechart',
                    'bust', 'waist', 'hip', 'length', 'inches', 'cm', 'centimeters'
                ]

                # First pass: Look for images with size-related keywords
                for img in images:
                    alt_text = (img.get('alt') or '').lower()
                    src = (img.get('src') or '').lower()
                    title = (img.get('title') or '').lower()

                    # Check all attributes for size-related keywords
                    combined_text = f"{alt_text} {src} {title}"

                    if any(keyword in combined_text for keyword in size_keywords):
                        size_chart_images.append(img)
                        if debug_mode:
                            st.info(f"🔍 Found potential size chart image: {alt_text[:50]}...")

                # Second pass: Look for images with measurement-related file names
                if not size_chart_images:
                    measurement_patterns = [
                        r'size.*chart', r'measurement.*guide', r'fit.*guide',
                        r'sizing.*info', r'dimension.*chart', r'scale.*guide',
                        r'chart.*size', r'guide.*measurement', r'info.*sizing'
                    ]

                    for img in images:
                        src = (img.get('src') or '').lower()
                        alt_text = (img.get('alt') or '').lower()
                        combined_text = f"{alt_text} {src}"

                        if any(re.search(pattern, combined_text) for pattern in measurement_patterns):
                            size_chart_images.append(img)
                            if debug_mode:
                                st.info(f"🔍 Found size chart by pattern: {src[-50:]}")

                # Third pass: Look for images that might be size charts based on common naming
                if not size_chart_images:
                    common_sizechart_names = [
                        'size_chart', 'sizechart', 'size-chart', 'measurement_guide',
                        'fit_guide', 'sizing_info', 'dimensions', 'size_guide',
                        'chart', 'guide', 'measurements', 'sizing'
                    ]

                    for img in images:
                        src = (img.get('src') or '').lower()
                        filename = src.split('/')[-1] if '/' in src else src

                        if any(name in filename for name in common_sizechart_names):
                            size_chart_images.append(img)
                            if debug_mode:
                                st.info(f"🔍 Found size chart by filename: {filename}")

                # Process found images
                if size_chart_images:
                    if debug_mode:
                        st.success(f"✅ Found {len(size_chart_images)} potential size chart images")

                    # Try to download the first valid image
                    for size_chart_img in size_chart_images:
                        img_url = size_chart_img.get('src')
                        if not img_url:
                            continue

                        # Enhanced URL processing
                        original_url = img_url

                        # Handle relative URLs
                        if img_url.startswith('//'):
                            img_url = 'https:' + img_url
                        elif img_url.startswith('/'):
                            img_url = f"https://{shop_url}" + img_url
                        elif not img_url.startswith(('http://', 'https://')):
                            img_url = f"https://{shop_url}/" + img_url.lstrip('/')

                        try:
                            # Enhanced headers for better compatibility
                            headers = {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Connection': 'keep-alive',
                                'Upgrade-Insecure-Requests': '1',
                            }

                            response = requests.get(img_url, headers=headers, timeout=15, stream=True)

                            if response.status_code == 200:
                                # Check if it's actually an image
                                content_type = response.headers.get('content-type', '').lower()
                                if not content_type.startswith('image/'):
                                    if debug_mode:
                                        st.warning(f"⚠️ URL doesn't return image content: {content_type}")
                                    continue

                                screenshot_path = os.path.join(
                                    self.screenshot_folder,
                                    f"size_chart_{product.id}_{int(time.time())}.png"
                                )

                                with open(screenshot_path, 'wb') as f:
                                    for chunk in response.iter_content(chunk_size=8192):
                                        f.write(chunk)

                                # Verify the downloaded file is a valid image
                                try:
                                    with Image.open(screenshot_path) as test_img:
                                        test_img.verify()

                                    if debug_mode:
                                        st.success(f"✅ Downloaded size chart image: {screenshot_path}")
                                        st.info(f"📸 Original URL: {original_url}")
                                        st.info(f"📸 Processed URL: {img_url}")
                                    return screenshot_path

                                except Exception as img_error:
                                    if debug_mode:
                                        st.warning(f"⚠️ Downloaded file is not a valid image: {img_error}")
                                    try:
                                        os.remove(screenshot_path)
                                    except:
                                        pass
                                    continue

                            else:
                                if debug_mode:
                                    st.warning(f"⚠️ HTTP {response.status_code} for URL: {img_url}")

                        except Exception as e:
                            if debug_mode:
                                st.warning(f"⚠️ Error downloading image from {img_url}: {e}")
                            continue

                if debug_mode and not size_chart_images:
                    st.info("🔍 No size chart images found in description")

            # Method 2: Try existing table method
            if tables:
                size_keywords = ['size', 'measurement', 'chart', 'bust', 'waist', 'length', 'small', 'medium', 'large']

                for table in tables:
                    table_text = table.get_text().lower()
                    if any(keyword in table_text for keyword in size_keywords):
                        table_html = str(table)
                        screenshot_path = self.create_table_image(table_html, product)
                        if screenshot_path:
                            if debug_mode:
                                st.success(f"✅ Created size chart from HTML table: {screenshot_path}")
                            return screenshot_path

            # Method 3: Extract text-based measurements
            description_text = soup.get_text()
            description_lower = description_text.lower()
            measurements = {}
            valid_measurements_found = False

            if debug_mode:
                st.info(f"🔍 Processing description text: {description_text[:200]}...")

            # Quick pattern checks - improved to match the enhanced extraction patterns
            has_measurements = any(keyword in description_lower for keyword in
                                   ['product measurements:', 'measurements:', 'size chart:', 'sizing information:'])

            # Updated size patterns to match the enhanced extraction function
            size_patterns = [
                r'(?:^|\s)(?:x{0,3}[sml]|[0-9]*xl|xs|xxl|xxxl|[2-6]xl|[0-9]{1,2}x)\s*[:：]\s*[^:]*?(?:in|inch|inches|")',
                r'size\s+(?:x{0,3}[sml]|[0-9]*xl|xs|xxl|xxxl|[2-6]xl|[0-9]{1,2}x)\s*[-:]\s*[^:]*?(?:in|inch|inches|")',
                r'(?:small|medium|large|x-?large|[0-9]{1,2}x)\s*[:：]\s*[^:]*?(?:in|inch|inches|")',
            ]

            has_size_patterns = any(re.search(pattern, description_lower, re.IGNORECASE) for pattern in size_patterns)

            if debug_mode:
                st.info(f"🔍 Has measurements keywords: {has_measurements}")
                st.info(f"🔍 Has size patterns: {has_size_patterns}")

            # STRICT check - only try to extract measurements if there are clear indicators
            if has_measurements or has_size_patterns:
                if debug_mode:
                    st.info("🔍 Attempting to extract text-based measurements from description")

                measurements = self.extract_measurements_from_text(description_text)

                if debug_mode:
                    st.info(f"🔍 Raw measurements extracted: {measurements}")

                if measurements:
                    # Additional validation - ensure measurements are meaningful
                    total_measurements = sum(len(size_data) for size_data in measurements.values())
                    if total_measurements >= 2:  # At least 2 measurements required
                        if debug_mode:
                            st.success(
                                f"✅ Successfully extracted {total_measurements} measurements for sizes: {list(measurements.keys())}")
                            for size, data in measurements.items():
                                st.write(f"**{size}:** {data}")

                        screenshot_path = self.create_size_chart_from_text_measurements(measurements, product)

                        if screenshot_path:
                            if debug_mode:
                                st.success(f"✅ Created size chart from text measurements: {screenshot_path}")
                            valid_measurements_found = True
                            return screenshot_path
                    else:
                        if debug_mode:
                            st.warning("⚠️ Insufficient measurements found (need at least 2)")
                else:
                    if debug_mode:
                        st.warning("⚠️ No valid measurements extracted")

            # NO GENERIC FALLBACK - Only return size charts if real measurements found

            if debug_mode:
                st.warning(f"❌ No size charts found in description for: {product.title}")
            return None

        except Exception as e:
            if debug_mode:
                st.error(f"Error in enhanced size chart extraction: {e}")
            return None

    def upload_image_to_shopify(self, image_path: str, product: shopify.Product, position: int = 4) -> bool:
        """Upload image to Shopify product at specified position with retry logic"""
        try:
            # Read image file
            with open(image_path, 'rb') as img_file:
                image_data = img_file.read()

            # Create image object
            image = shopify.Image()
            image.product_id = product.id
            image.position = position
            image.alt = f"Size Chart - {product.title}"

            # Convert image to base64
            image_b64 = base64.b64encode(image_data).decode('utf-8')
            image.attachment = image_b64

            # Retry logic for upload
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    result = image.save()
                    if result:
                        return True
                    else:
                        if attempt < max_retries - 1:
                            time.sleep(1)  # Wait before retry
                        continue
                except Exception as e:
                    if attempt < max_retries - 1:
                        time.sleep(1)  # Wait before retry
                        continue
                    else:
                        raise e

            return False

        except Exception as e:
            st.error(f"Error uploading image for product {product.title}: {e}")
            return False

    def has_existing_size_chart(self, product: shopify.Product) -> bool:
        """Check if product already has a size chart image"""
        try:
            # Get product images
            images = shopify.Image.find(product_id=product.id)

            # Check if any image has size chart in alt text
            for image in images:
                alt_text = getattr(image, 'alt', '') or ''
                if 'size chart' in alt_text.lower():
                    return True
            return False
        except Exception:
            return False

    def process_single_product(self, product: shopify.Product, shop_url: str, position: int,
                               debug_mode: bool = False) -> Dict:
        """Process a single product: take screenshot and upload"""
        result = {
            'product_id': product.id,
            'product_title': product.title,
            'screenshot_taken': False,
            'image_uploaded': False,
            'error': None,
            'skipped': False
        }

        try:
            # Check if product already has a size chart image uploaded
            if self.has_existing_size_chart(product):
                result['skipped'] = True
                result['error'] = 'Already has size chart image'
                if debug_mode:
                    st.info(f"⏭️ Skipping {product.title} - already has size chart image")
                return result

            # Try description method first
            screenshot_path = self.take_size_chart_screenshot_from_description(product, shop_url, debug_mode)

            if screenshot_path:
                result['screenshot_taken'] = True

                # Upload to Shopify
                if self.upload_image_to_shopify(screenshot_path, product, position):
                    result['image_uploaded'] = True

                    if debug_mode:
                        st.success(f"✅ Processed and saved: {product.title}")

                    # Clean up local file
                    try:
                        os.remove(screenshot_path)
                    except:
                        pass
                else:
                    result['error'] = 'Failed to upload image to Shopify'
            else:
                result['skipped'] = True
                result['error'] = 'No size chart data found in description'
                if debug_mode:
                    st.warning(f"⏭️ Skipping {product.title} - No size chart data found in description")

        except Exception as e:
            result['error'] = str(e)

        return result

    def process_products_sequential(self, products: List[shopify.Product], shop_url: str, position: int,
                                    debug_mode: bool = False, progress_callback=None) -> List[Dict]:
        """Process products sequentially (one by one) with enhanced support for 10,000+ products"""
        results = []

        # Enhanced progress tracking for large collections
        total_products = len(products)
        st.info(f"🚀 Starting to process {total_products} products sequentially...")

        # Progress tracking variables
        successful_count = 0
        failed_count = 0
        skipped_count = 0

        for i, product in enumerate(products):
            try:
                # Update progress if callback provided
                if progress_callback:
                    progress_callback(i + 1, len(products))

                # Enhanced progress display for large collections
                if i % 100 == 0 and i > 0:  # Every 100 products
                    st.info(f"📊 Progress: {i}/{total_products} products processed. "
                            f"✅ {successful_count} successful, ❌ {failed_count} failed, ⏭️ {skipped_count} skipped")

                # Process single product
                result = self.process_single_product(product, shop_url, position, debug_mode)
                results.append(result)

                # Update counters
                if result.get('skipped', False):
                    skipped_count += 1
                elif result.get('image_uploaded', False):
                    successful_count += 1
                else:
                    failed_count += 1

                # Enhanced rate limiting for large collections
                # Shopify allows 2 calls per second, but we add extra buffer for large batches
                if total_products > 1000:
                    time.sleep(0.8)  # Slower rate for very large collections
                else:
                    time.sleep(0.5)  # Standard rate

            except Exception as e:
                failed_count += 1
                # Add error result for failed product
                results.append({
                    'product_id': getattr(product, 'id', 'unknown'),
                    'product_title': getattr(product, 'title', 'Unknown Product'),
                    'screenshot_taken': False,
                    'image_uploaded': False,
                    'error': f"Processing error: {str(e)}",
                    'skipped': False
                })

        # Final summary
        st.success(f"🎉 Completed processing {total_products} products! "
                   f"✅ {successful_count} successful, ❌ {failed_count} failed, ⏭️ {skipped_count} skipped")

        return results

    def cleanup(self):
        """Clean up resources"""
        try:
            if hasattr(self, 'driver'):
                self.driver.quit()
            shopify.ShopifyResource.clear_session()
        except Exception as e:
            st.error(f"Cleanup error: {e}")


def main():
    st.set_page_config(
        page_title="Size Chart Generator App - Enterprise Edition",
        page_icon="📏",
        layout="wide"
    )

    st.title("📏 Size Chart Generator App - Enterprise Edition")
    st.markdown("**Sequential Processing** - Supports 10,000+ products with enhanced performance")

    # Initialize app
    app = StreamlitScreenshotApp()

    # Sidebar for configuration
    st.sidebar.header("⚙️ Configuration")
    
    # Color and Style Settings (Optional - defaults are same as original)
    st.sidebar.subheader("🎨 Color & Style Settings (Optional)")
    st.sidebar.info("Default colors are already set. Change only if needed.")
    
    # Manual color selection - keeping exact original defaults
    main_purple = st.sidebar.color_picker("Main Purple (Title/Borders)", value="#8B4A9C", help="Default: #8B4A9C - LITTIV purple")
    header_bg_color = st.sidebar.color_picker("Header Background", value="#D1B3E0", help="Default: #D1B3E0 - Light purple")
    text_color = st.sidebar.color_picker("Text Color", value="#000000", help="Default: #000000 - Black")
    border_color = st.sidebar.color_picker("Border Color", value="#8B4A9C", help="Default: #8B4A9C - Same as main purple")
    bullet_color = st.sidebar.color_picker("Bullet Point Color", value="#8B4A9C", help="Default: #8B4A9C - Same as main purple")
    alternate_row_color = st.sidebar.color_picker("Alternate Row Background", value="#F8F8F8", help="Default: #F8F8F8 - Light gray")
    
    # Line size settings (Optional - defaults are same as original)
    st.sidebar.subheader("📏 Line & Border Settings (Optional)")
    st.sidebar.info("Default sizes are already set. Change only if needed.")
    table_border_width = st.sidebar.slider("Table Border Width", min_value=1, max_value=30, value=11, help="Default: 11 pixels")
    header_border_width = st.sidebar.slider("Header Border Width", min_value=1, max_value=30, value=18, help="Default: 18 pixels") 
    outer_border_width = st.sidebar.slider("Outer Border Width", min_value=1, max_value=50, value=22, help="Default: 22 pixels")
    title_underline_height = st.sidebar.slider("Title Underline Height", min_value=1, max_value=10, value=4, help="Default: 4 pixels")
    
    # Font size settings (Optional - defaults are same as original)
    st.sidebar.subheader("📝 Font Size Settings (Optional)")
    st.sidebar.info("Default font sizes are already set. Change only if needed.")
    title_font_size = st.sidebar.slider("Title Font Size", min_value=20, max_value=72, value=48, help="Default: 48")
    header_font_size = st.sidebar.slider("Header Font Size", min_value=16, max_value=48, value=32, help="Default: 32")
    cell_font_size = st.sidebar.slider("Cell Font Size", min_value=16, max_value=48, value=38, help="Default: 38")
    detail_font_size = st.sidebar.slider("Detail Font Size", min_value=16, max_value=48, value=38, help="Default: 38")
    bullet_font_size = st.sidebar.slider("Bullet Font Size", min_value=16, max_value=48, value=43, help="Default: 43")
    
    # Pass colors to app instance
    app.colors = {
        'main_purple': main_purple,
        'header_bg': header_bg_color,
        'text': text_color,
        'border': border_color,
        'bullet': bullet_color,
        'alternate_row': alternate_row_color,
        'table_border_width': table_border_width,
        'header_border_width': header_border_width,
        'outer_border_width': outer_border_width,
        'title_underline_height': title_underline_height,
        'title_font_size': title_font_size,
        'header_font_size': header_font_size,
        'cell_font_size': cell_font_size,
        'detail_font_size': detail_font_size,
        'bullet_font_size': bullet_font_size
    }

    # Shopify credentials
    st.sidebar.subheader("Shopify Settings")

    # Try to load from environment first
    env_shop_url = os.getenv('SHOPIFY_SHOP_NAME', '')
    env_api_key = os.getenv('SHOPIFY_API_KEY', '')
    env_password = os.getenv('SHOPIFY_ACCESS_TOKEN', '')

    st.sidebar.write(f"Shop URL: {env_shop_url[:20]}..." if len(env_shop_url) > 20 else f"Shop URL: {env_shop_url}")
    st.sidebar.write(f"API Key: {'*' * 8}{env_api_key[-4:] if len(env_api_key) > 4 else 'Not loaded'}")
    st.sidebar.write(f"Token: {'*' * 8}{env_password[-4:] if len(env_password) > 4 else 'Not loaded'}")

    # Initialize variables
    shop_url = None
    api_key = None
    password = None

    if env_shop_url and env_api_key and env_password:
        st.sidebar.success(f"✅ Credentials loaded from .env file")
        st.sidebar.info(f"Store: {env_shop_url}")
        use_env_credentials = st.sidebar.checkbox("Use .env credentials", value=True)

        if use_env_credentials:
            shop_url = env_shop_url
            api_key = env_api_key
            password = env_password
        else:
            shop_url = st.sidebar.text_input("Shop URL", value=env_shop_url)
            api_key = st.sidebar.text_input("API Key", value=env_api_key, type="password")
            password = st.sidebar.text_input("Access Token", value=env_password, type="password")
    else:
        st.sidebar.warning("⚠️ No credentials found in .env file")
        shop_url = st.sidebar.text_input("Shop URL", placeholder="mystore.myshopify.com")
        api_key = st.sidebar.text_input("API Key", type="password")
        password = st.sidebar.text_input("Access Token", type="password")

    # Logo upload section
    st.sidebar.subheader("🖼️ Brand Logo")
    uploaded_logo = st.sidebar.file_uploader(
        "Upload Brand Logo",
        type=['png', 'jpg', 'jpeg', 'gif'],
        help="Upload your LITTIV logo to display at the top of size charts"
    )

    # Handle logo upload
    if uploaded_logo is not None:
        # Save uploaded logo
        logo_path = os.path.join("temp_logo.png")
        with open(logo_path, "wb") as f:
            f.write(uploaded_logo.getbuffer())

        # Store logo path in app
        app.logo_path = logo_path

        st.sidebar.success("✅ Logo uploaded successfully!")

        # Show logo preview
        try:
            logo_preview = Image.open(logo_path)
            st.sidebar.image(logo_preview, caption="Logo Preview", width=200)
        except:
            st.sidebar.error("Could not preview logo")
    else:
        # Use default text logo
        app.logo_path = None
        st.sidebar.info("📝 Using text logo as default")

    # Screenshot settings
    st.sidebar.subheader("Screenshot Settings")
    upload_position = st.sidebar.number_input("Upload Position", min_value=1, max_value=10, value=4)
    debug_mode = st.sidebar.checkbox("Enable Debug Mode", help="Shows detailed logs of size chart detection")

    # Main content area
    col1, col2 = st.columns([2, 1])

    with col1:
        st.subheader("📋 Product Processing")

        # Connection status
        success, message = app.setup_shopify(shop_url, api_key, password)
        if success:
            st.success(message)

            # Get collections with progress indication
            with st.spinner("Loading collections..."):
                collections = app.get_all_collections()
            st.info(f"Found {len(collections)} collections in store")

            # Collection selection
            st.subheader("Select Processing Method")

            processing_method = st.radio(
                "Choose how to select products:",
                ["Process by Collection", "Process All Products", "Select Individual Products"]
            )

            selected_products = []

            if processing_method == "Process by Collection":
                if collections:
                    # Enhanced collection display for large collections
                    collection_data = []
                    for c in collections:
                        with st.spinner(f"Counting products in {c.title}..."):
                            product_count = len(app.get_products_by_collection(c.id))
                        collection_data.append((c, product_count))

                    collection_options = {f"{c.title} ({count} products)": c for c, count in collection_data}
                    selected_collection_name = st.selectbox(
                        "Select Collection",
                        options=list(collection_options.keys()),
                        index=0
                    )

                    if selected_collection_name:
                        selected_collection = collection_options[selected_collection_name]
                        with st.spinner(f"Loading products from {selected_collection.title}..."):
                            selected_products = app.get_products_by_collection(selected_collection.id)

                        # Enhanced display for large collections
                        product_count = len(selected_products)
                        if product_count > 1000:
                            st.warning(f"⚠️ Large collection detected: {product_count} products. "
                                       f"Processing will take approximately {(product_count * 3) // 60} minutes.")

                        st.success(f"Selected collection: {selected_collection.title} with {product_count} products")
                else:
                    st.warning("No collections found in your store")

            elif processing_method == "Process All Products":
                with st.spinner("Loading all products..."):
                    products = app.get_all_products()
                selected_products = products

                # Enhanced display for large stores
                product_count = len(selected_products)
                if product_count > 1000:
                    st.warning(f"⚠️ Large store detected: {product_count} products. "
                               f"Processing will take approximately {(product_count * 3) // 60} minutes.")

                st.info(f"Selected all {product_count} products in store")

            elif processing_method == "Select Individual Products":
                with st.spinner("Loading products for selection..."):
                    products = app.get_all_products()
                if products:
                    product_options = {f"{p.title} (ID: {p.id})": p for p in products}
                    selected_product_names = st.multiselect(
                        "Select Products",
                        options=list(product_options.keys()),
                        default=[]
                    )
                    selected_products = [product_options[name] for name in selected_product_names]
                else:
                    st.warning("No products found in your store")

            # Processing controls
            if selected_products:
                product_count = len(selected_products)
                st.subheader(f"Ready to Process {product_count} Products")

                # Enhanced time estimation
                estimated_time_seconds = product_count * 3
                estimated_hours = estimated_time_seconds // 3600
                estimated_minutes = (estimated_time_seconds % 3600) // 60

                if estimated_hours > 0:
                    time_display = f"{estimated_hours}h {estimated_minutes}m"
                else:
                    time_display = f"{estimated_minutes}m"

                st.info(f"⏱️ Estimated processing time: {time_display} (sequential processing)")

                # Warning for very large collections
                if product_count > 5000:
                    st.error(f"⚠️ WARNING: You are about to process {product_count} products. "
                             f"This will take approximately {time_display}. "
                             f"Consider processing in smaller batches for better control.")

                if st.button("🚀 Start Processing", type="primary"):
                    start_time = time.time()

                    # Progress tracking
                    progress_bar = st.progress(0)
                    status_text = st.empty()
                    results_container = st.empty()

                    def update_progress(completed, total):
                        try:
                            progress = completed / total if total > 0 else 0
                            progress_bar.progress(min(progress, 1.0))
                            elapsed = time.time() - start_time
                            rate = completed / elapsed if elapsed > 0 else 0
                            eta = (total - completed) / rate if rate > 0 else 0

                            # Enhanced time display
                            eta_hours = int(eta // 3600)
                            eta_minutes = int((eta % 3600) // 60)
                            eta_seconds = int(eta % 60)

                            if eta_hours > 0:
                                eta_display = f"{eta_hours}h {eta_minutes}m {eta_seconds}s"
                            elif eta_minutes > 0:
                                eta_display = f"{eta_minutes}m {eta_seconds}s"
                            else:
                                eta_display = f"{eta_seconds}s"

                            status_text.text(
                                f"Processing: {completed}/{total} products ({rate:.1f}/sec) - ETA: {eta_display}")
                        except Exception as e:
                            status_text.text(f"Processing {completed}/{total} products...")

                    # Process products sequentially
                    try:
                        results = app.process_products_sequential(
                            selected_products, shop_url, upload_position, debug_mode, update_progress
                        )
                    except Exception as processing_error:
                        st.error(f"Processing error: {processing_error}")
                        results = []

                    # Final results
                    end_time = time.time()
                    total_time = end_time - start_time

                    # Enhanced time display for completion
                    hours = int(total_time // 3600)
                    minutes = int((total_time % 3600) // 60)
                    seconds = int(total_time % 60)

                    if hours > 0:
                        time_display = f"{hours}h {minutes}m {seconds}s"
                    elif minutes > 0:
                        time_display = f"{minutes}m {seconds}s"
                    else:
                        time_display = f"{total_time:.1f}s"

                    st.success(f"🎉 Processing completed in {time_display}!")

                    # Generate final report
                    total_products = len(results)
                    successful_screenshots = sum(1 for r in results if r['screenshot_taken'])
                    successful_uploads = sum(1 for r in results if r['image_uploaded'])
                    skipped_products = sum(1 for r in results if r.get('skipped', False))

                    st.subheader("📈 Final Report")

                    col_a, col_b, col_c, col_d, col_e, col_f = st.columns(6)
                    with col_a:
                        st.metric("Total Products", total_products)
                    with col_b:
                        st.metric("Screenshots", successful_screenshots)
                    with col_c:
                        st.metric("Uploads", successful_uploads)
                    with col_d:
                        st.metric("Skipped", skipped_products)
                    with col_e:
                        success_rate = (successful_uploads / total_products) * 100 if total_products > 0 else 0
                        st.metric("Success Rate", f"{success_rate:.1f}%")
                    with col_f:
                        rate = total_products / total_time if total_time > 0 else 0
                        st.metric("Speed", f"{rate:.1f}/sec")

                    # Show skipped products
                    skipped_list = [r for r in results if r.get('skipped', False)]
                    if skipped_list:
                        st.subheader("⏭️ Skipped Products (Already Processed)")
                        for result in skipped_list[:20]:  # Show first 20 for large collections
                            st.write(f"- {result['product_title']} (ID: {result['product_id']})")
                        if len(skipped_list) > 20:
                            st.info(f"... and {len(skipped_list) - 20} more skipped products")

                    # Failed products
                    failed_products = [r for r in results if not r['image_uploaded'] and not r.get('skipped', False)]
                    if failed_products:
                        st.subheader("❌ Failed Products")
                        for result in failed_products[:20]:  # Show first 20 for large collections
                            st.write(
                                f"- {result['product_title']} (ID: {result['product_id']}) - {result.get('error', 'Unknown error')}")
                        if len(failed_products) > 20:
                            st.info(f"... and {len(failed_products) - 20} more failed products")

                    # Download report
                    report_data = {
                        'timestamp': datetime.now().isoformat(),
                        'total_products': total_products,
                        'successful_screenshots': successful_screenshots,
                        'successful_uploads': successful_uploads,
                        'skipped_products': skipped_products,
                        'failed_products': len(failed_products),
                        'success_rate': success_rate,
                        'processing_time': total_time,
                        'processing_time_formatted': time_display,
                        'processing_rate': rate,
                        'results': results
                    }

                    st.download_button(
                        label="📄 Download Detailed Report",
                        data=json.dumps(report_data, indent=2),
                        file_name=f"size_chart_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{total_products}products.json",
                        mime="application/json"
                    )

                    # Cleanup
                    app.cleanup()

        else:
            st.error(message)

    with col2:
        st.subheader("📋 Enterprise Features")
        st.success("""
        **🚀 Key Features:**
        - Sequential processing (reliable)
        - Supports 10,000+ products
        - Enhanced rate limiting
        - Batch progress tracking
        - Text-based measurement extraction
        - No generic size chart fallback
        - LITTIV brand colors
        - Logo upload support
        - Detailed error reporting
        - Resume capability

        **📊 Processing Methods:**
        - By Collection (recommended for large stores)
        - All Products
        - Individual Selection
        """)

        st.subheader("🏗️ Enterprise Performance")
        st.info("""
        **Performance Enhancements:**
        - 250 products per API call (max allowed)
        - Enhanced retry logic
        - Progress tracking every 100 products
        - Rate limiting: 0.8s/product for 1000+ collections
        - Memory-efficient processing
        - Detailed ETA calculations
        - Automatic error recovery
        """)

        st.subheader("🖼️ Logo Upload")
        st.info("""
        **Brand Logo Features:**
        - Upload your LITTIV logo
        - Automatic resizing & centering
        - PNG/JPG/GIF support
        - Falls back to text logo
        - Shows on all size charts
        """)

        st.subheader("🎨 LITTIV Brand Colors")
        st.success("""
        **LITTIV Color Scheme:**
        - Main purple: #8B4A9C
        - Consistent background: #D1B3E0
        - Professional appearance
        - Enhanced visual appeal
        - Perfect brand consistency
        - White background maintained
        """)

        st.subheader("ℹ️ Instructions for Large Collections")
        st.markdown("""
        **How to Use for 10,000+ Products:**

        1. **Upload Logo**: Add your brand logo first
        2. **Select Collection**: Choose specific collections for better control
        3. **Monitor Progress**: Watch real-time progress with ETA
        4. **Pause if Needed**: Streamlit allows you to stop processing
        5. **Download Report**: Get detailed processing summary

        **Best Practices for Large Collections:**
        - Process during off-peak hours
        - Start with smaller collections to test
        - Monitor Shopify API limits
        - Keep the browser tab active
        - Download reports for analysis
        """)

        st.subheader("⚡ Performance Tips")
        st.info("""
        **For Best Results with Large Collections:**
        - Process collections with 1000-5000 products at a time
        - Ensure stable internet connection
        - Products with text measurements work best
        - Already processed products are automatically skipped
        - Failed products can be retried by running again
        """)

        st.subheader("🔧 Enhanced Format Support")
        st.success("""
        **Supported Measurement Formats:**
        ✅ S：front length 25.4 in, bust 35.1 in
        ✅ M：front length 25.7 in, bust 37.1 in
        ✅ L：front length 26.1 in, bust 39 in

        **Pattern Recognition:**
        - Product measurements sections
        - Line-by-line size data
        - Mixed colon formats (： and :)
        - Enhanced text extraction
        """)

        st.subheader("📊 Scaling Information")
        st.warning("""
        **Collection Size Guidelines:**
        - 📦 Small: 1-100 products (1-5 minutes)
        - 📦 Medium: 100-1,000 products (5-50 minutes)
        - 📦 Large: 1,000-5,000 products (50-250 minutes)
        - 📦 Enterprise: 5,000+ products (4+ hours)

        **Recommended approach for 10,000+ products:**
        Process in batches of 2,000-3,000 products each
        """)


if __name__ == "__main__":
    main()