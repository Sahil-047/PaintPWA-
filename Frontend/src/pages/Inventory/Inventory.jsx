import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Package, Plus, Minus, Search, Loader2, Building2, Package2, Upload, X, Edit, Trash2 } from 'lucide-react';
import { 
  FaPaintBrush, 
  FaPaintRoller, 
  FaHome, 
  FaBuilding, 
  FaPalette, 
  FaSprayCan,
  FaToolbox,
  FaHammer,
  FaTint,
  FaBox,
  FaWrench
} from 'react-icons/fa';
import authService from '../../services/authService';
import inventoryService from '../../services/inventoryService';
import { toast } from 'sonner';

// Default product types that should always be available
// Note: Interior Paints and Exterior Paints are already in the database
const DEFAULT_PRODUCT_TYPES = [
  'Interior Primers',
  'Exterior Primers',
  'Enamels',
  'Enamel Primers',
  'Putty, Plastercoat & Distemper',
  'Tools',
  'Woodtech',
  'Stainers',
  'Additionals'
];

// Container sizes in order
const CONTAINER_SIZES = ['50ml', '100ml', '200ml', '500ml', '1L', '4L', '10L', '20L'];

// Map product types to React icons
const getProductTypeIcon = (typeName) => {
  const normalizedName = typeName.toLowerCase();
  
  if (normalizedName.includes('interior primer')) {
    return <FaHome className="h-24 w-24 text-blue-600" />;
  }
  if (normalizedName.includes('exterior primer')) {
    return <FaBuilding className="h-24 w-24 text-blue-700" />;
  }
  if (normalizedName.includes('interior paint')) {
    return <FaPaintBrush className="h-24 w-24 text-blue-500" />;
  }
  if (normalizedName.includes('exterior paint')) {
    return <FaPaintRoller className="h-24 w-24 text-blue-600" />;
  }
  if (normalizedName.includes('enamel primer')) {
    return <FaSprayCan className="h-24 w-24 text-purple-600" />;
  }
  if (normalizedName.includes('enamel')) {
    return <FaPalette className="h-24 w-24 text-purple-500" />;
  }
  if (normalizedName.includes('putty') || normalizedName.includes('plastercoat') || normalizedName.includes('distemper')) {
    return <FaBox className="h-24 w-24 text-orange-600" />;
  }
  if (normalizedName.includes('tool')) {
    return <FaToolbox className="h-24 w-24 text-gray-600" />;
  }
  if (normalizedName.includes('woodtech')) {
    return <FaHammer className="h-24 w-24 text-amber-700" />;
  }
  if (normalizedName.includes('stainer')) {
    return <FaTint className="h-24 w-24 text-red-600" />;
  }
  if (normalizedName.includes('additional')) {
    return <FaWrench className="h-24 w-24 text-slate-600" />;
  }
  
  // Default icon
  return <Package className="h-24 w-24 text-slate-400" />;
};

const Inventory = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [productTypes, setProductTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [typesLoading, setTypesLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const brandsFetched = useRef(false);
  const typesFetchedRef = useRef(null);
  const productsFetchedRef = useRef(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('brand');
  const [brandFormData, setBrandFormData] = useState({ name: '', image: '' });
  const [productFormData, setProductFormData] = useState({
    name: '',
    brand: '',
    type: '',
    typeIcon: '',
    price: '',
    stock: '',
    unit: 'L',
    description: '',
    productCode: '',
    productImage: '',
    lowStockThreshold: 5,
    stockBySize: {
      '50ml': 0,
      '100ml': 0,
      '200ml': 0,
      '500ml': 0,
      '1L': 0,
      '4L': 0,
      '10L': 0,
      '20L': 0,
    },
    priceBySize: {
      '50ml': 0,
      '100ml': 0,
      '200ml': 0,
      '500ml': 0,
      '1L': 0,
      '4L': 0,
      '10L': 0,
      '20L': 0,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [parsedProducts, setParsedProducts] = useState([]);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductDetailsModalOpen, setIsProductDetailsModalOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    productCode: '',
    productImage: '',
    lowStockThreshold: 5,
    stockBySize: {
      '50ml': 0,
      '100ml': 0,
      '200ml': 0,
      '500ml': 0,
      '1L': 0,
      '4L': 0,
      '10L': 0,
      '20L': 0,
    },
    priceBySize: {
      '50ml': 0,
      '100ml': 0,
      '200ml': 0,
      '500ml': 0,
      '1L': 0,
      '4L': 0,
      '10L': 0,
      '20L': 0,
    },
    description: '',
    type: '',
    color: '',
  });

  const fetchBrands = useCallback(async () => {
    if (brandsFetched.current) return; // Prevent multiple calls
    setLoading(true);
    brandsFetched.current = true;
    try {
      const response = await inventoryService.getBrands();
      if (response.success) {
        // Add image paths to brands
        const brandsWithImages = response.data.map(brand => ({
          ...brand,
          image: brand.image || `/brands/${brand.name.toLowerCase().replace(/\s+/g, '-')}.png`
        }));
        setBrands(brandsWithImages);
      }
    } catch (error) {
      toast.error('Failed to load brands');
      console.error('Error fetching brands:', error);
      brandsFetched.current = false; // Reset on error
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - only create once

  const fetchProductTypes = useCallback(async () => {
    if (typesFetchedRef.current) return;
    setTypesLoading(true);
    typesFetchedRef.current = true;
    try {
      const response = await inventoryService.getAllProductTypes();
      if (response.success) {
        // Merge default types with database types (case-insensitive matching)
        const dbTypes = response.data || [];
        
        // Create a map of DB types by normalized name (uppercase) for easy lookup
        const dbTypesMap = new Map();
        dbTypes.forEach(t => {
          const typeName = typeof t === 'string' ? t : t.name;
          const normalizedName = typeName.toUpperCase().trim();
          if (!dbTypesMap.has(normalizedName)) {
            dbTypesMap.set(normalizedName, typeof t === 'string' ? { name: typeName, icon: '', isActive: true } : t);
          }
        });
        
        // Create default types, using DB version if it exists (case-insensitive match)
        const defaultTypes = DEFAULT_PRODUCT_TYPES.map(defaultName => {
          const normalizedDefault = defaultName.toUpperCase().trim();
          const dbType = dbTypesMap.get(normalizedDefault);
          if (dbType) {
            // Use DB version but keep the default name format
            return { ...dbType, name: defaultName };
          }
          return { name: defaultName, icon: '', isActive: true };
        });
        
        // Add any additional types from DB that aren't in defaults (case-insensitive)
        const defaultNamesNormalized = new Set(DEFAULT_PRODUCT_TYPES.map(n => n.toUpperCase().trim()));
        const additionalTypes = Array.from(dbTypesMap.values()).filter(t => {
          const typeName = typeof t === 'string' ? t : t.name;
          return !defaultNamesNormalized.has(typeName.toUpperCase().trim());
        });
        
        // Combine: defaults first, then additional types
        setProductTypes([...defaultTypes, ...additionalTypes]);
      } else {
        // If API fails, use default types
        const defaultTypes = DEFAULT_PRODUCT_TYPES.map(name => ({ name, icon: '', isActive: true }));
        setProductTypes(defaultTypes);
      }
    } catch (error) {
      toast.error('Failed to load product types');
      console.error('Error fetching product types:', error);
      // On error, use default types
      const defaultTypes = DEFAULT_PRODUCT_TYPES.map(name => ({ name, icon: '', isActive: true }));
      setProductTypes(defaultTypes);
      typesFetchedRef.current = false;
    } finally {
      setTypesLoading(false);
    }
  }, []);

  const fetchProductsByBrandAndType = useCallback(async (brandId, type) => {
    if (!brandId || !type || productsFetchedRef.current === `${brandId}-${type}`) return;
    setProductsLoading(true);
    productsFetchedRef.current = `${brandId}-${type}`;
    try {
      const response = await inventoryService.getProductsByBrandAndType(brandId, type);
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Error fetching products:', error);
      productsFetchedRef.current = null;
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchBrands();
  }, [user, navigate, fetchBrands]);

  useEffect(() => {
    // Fetch all product types once (global for all brands)
    fetchProductTypes();
  }, [fetchProductTypes]);

  useEffect(() => {
    if (selectedBrand?._id && selectedType) {
      fetchProductsByBrandAndType(selectedBrand._id, selectedType);
    } else {
      productsFetchedRef.current = null;
      setProducts([]);
    }
  }, [selectedBrand?._id, selectedType, fetchProductsByBrandAndType]);

  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
    setSelectedType(null);
    setSearchQuery('');
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSearchQuery('');
  };

  // CSV Parser function - New structure: Prod Code, Product Name, Colour
  const parseCSV = (csvText) => {
    // First, properly parse CSV accounting for quoted fields with newlines
    const rows = [];
    let currentRow = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        currentRow += char;
      } else if (char === '\n' && !inQuotes) {
        if (currentRow.trim()) {
          rows.push(currentRow);
        }
        currentRow = '';
      } else {
        currentRow += char;
      }
    }
    if (currentRow.trim()) {
      rows.push(currentRow);
    }

    const products = [];

    // Skip header row (first row: "Prod Code,Product Name,Colour")
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.trim()) continue;
      
      // Parse CSV row with proper quote handling
      const columns = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < row.length; j++) {
        const char = row[j];
        if (char === '"') {
          inQuotes = !inQuotes;
          current += char;
        } else if (char === ',' && !inQuotes) {
          // Remove surrounding quotes and clean up
          let cleaned = current.trim();
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
          }
          cleaned = cleaned.trim();
          columns.push(cleaned);
          current = '';
        } else {
          current += char;
        }
      }
      // Handle last column
      let cleaned = current.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      cleaned = cleaned.trim();
      columns.push(cleaned);
      
      const prodCode = (columns[0] || '').trim();
      const productName = (columns[1] || '').trim();
      const colourString = (columns[2] || '').trim();

      // Skip if no product code
      if (!prodCode) {
        console.warn(`Skipping row ${i + 1}: No product code found`, { columns });
        continue;
      }

      // Split colours by comma and clean them up
      let colours = [];
      if (colourString) {
        // Split by comma, clean, and remove duplicates (case-insensitive)
        const colourSet = new Set();
        colourString
          .split(',')
          .map(c => c.trim())
          .filter(c => c && c !== '' && c !== ',')
          .forEach(c => {
            // Use case-insensitive comparison to avoid duplicates like "Brown" and "brown"
            const normalized = c.toLowerCase();
            if (!colourSet.has(normalized)) {
              colourSet.add(normalized);
              colours.push(c); // Keep original case for display
            }
          });
      }

      // If no colours found, create one product without colour
      if (colours.length === 0) {
        colours = [''];
      }

      // Create a product entry for each colour (now deduplicated)
      colours.forEach(colour => {
        const cleanColour = colour.trim();
        
        // Skip if colour is empty after trimming (shouldn't happen due to filter, but safety check)
        if (cleanColour === '' && colours.length > 1) {
          return; // Skip empty colour if there are other colours
        }
        
        // Initialize stock by size to 0 (user can edit in UI)
        const stockBySize = {
          '50ml': 0,
          '100ml': 0,
          '200ml': 0,
          '500ml': 0,
          '1L': 0,
          '4L': 0,
          '10L': 0,
          '20L': 0,
        };

        products.push({
          productCode: prodCode,
          name: productName || 'Unknown Product',
          colour: cleanColour,
          stockBySize,
        });
      });
    }

    return products;
  };

  // Handle CSV file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target.result;
        const parsed = parseCSV(csvText);
        setParsedProducts(parsed);
        
        // Log parsing results for debugging
        console.log(`✅ Parsed ${parsed.length} products from CSV`);
        console.log('📦 Sample products (first 5):', parsed.slice(0, 5));
        
        // Group by base product code to see how many variants per product
        const productGroups = {};
        parsed.forEach(p => {
          const baseCode = p.productCode.split('-')[0]; // Get base code before colour suffix
          if (!productGroups[baseCode]) {
            productGroups[baseCode] = [];
          }
          productGroups[baseCode].push(p);
        });
        console.log(`📊 Found ${Object.keys(productGroups).length} unique base product codes`);
        console.log('📋 Products by code:', Object.keys(productGroups).map(code => ({
          code,
          variants: productGroups[code].length
        })));
        
        toast.success(`Parsed ${parsed.length} products from CSV`);
      } catch (error) {
        toast.error('Error parsing CSV file: ' + error.message);
        console.error('CSV parse error:', error);
      }
    };
    reader.readAsText(file);
  };

  // Update quantity for a specific product and size
  const updateBulkProductQuantity = (index, size, quantity) => {
    setParsedProducts(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        stockBySize: {
          ...updated[index].stockBySize,
          [size]: Math.max(0, quantity),
        },
      };
      return updated;
    });
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!selectedBrand?._id) {
      toast.error('Please select a brand first');
      return;
    }

    if (!selectedType) {
      toast.error('Please select a product type first');
      return;
    }

    if (parsedProducts.length === 0) {
      toast.error('No products to upload');
      return;
    }

    setBulkUploadLoading(true);
    try {
      const productsToUpload = parsedProducts.map(prod => {
        // Make product code unique by appending colour if it exists
        // This ensures each colour variant has a unique product code
        const uniqueProductCode = prod.colour && prod.colour.trim() !== ''
          ? `${prod.productCode}-${prod.colour.trim().replace(/[^a-zA-Z0-9]/g, '-').substring(0, 20)}`
          : prod.productCode;
        
        return {
          name: prod.name,
          productCode: uniqueProductCode,
          colour: prod.colour,
          stockBySize: prod.stockBySize,
          lowStockThreshold: 5,
        };
      });

      const response = await inventoryService.bulkUploadProducts(
        productsToUpload,
        selectedBrand._id,
        selectedType
      );

      if (response.success) {
        const { data } = response;
        const successCount = data.success?.length || 0;
        const failedCount = data.failed?.length || 0;
        
        if (failedCount > 0) {
          // Show detailed error message
          const errorMessages = data.failed.slice(0, 10).map(f => 
            `${f.productCode}: ${f.error}`
          ).join('\n');
          const moreErrors = failedCount > 10 ? `\n... and ${failedCount - 10} more errors` : '';
          
          toast.error(
            `${successCount} succeeded, ${failedCount} failed. Check console for details.`,
            { duration: 5000 }
          );
          console.error('Failed products:', data.failed);
          console.error('First 10 errors:', errorMessages + moreErrors);
        } else {
          toast.success(`Successfully uploaded ${successCount} products!`);
        }
        
        setIsBulkUploadModalOpen(false);
        setParsedProducts([]);
        // Refresh products list
        if (selectedBrand?._id && selectedType) {
          productsFetchedRef.current = null;
          fetchProductsByBrandAndType(selectedBrand._id, selectedType);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload products');
      console.error('Bulk upload error:', error);
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const updateStock = async (productId, change, size = null) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    let newStock;
    if (size && product.stockBySize) {
      // Update size-specific stock
      const currentSizeStock = product.stockBySize[size] || 0;
      newStock = currentSizeStock + change;
      if (newStock < 0) {
        toast.error('Stock cannot be negative');
        return;
      }
    } else {
      // Update total stock (legacy support)
      newStock = product.stock + change;
      if (newStock < 0) {
        toast.error('Stock cannot be negative');
        return;
      }
    }

    try {
      const response = await inventoryService.updateStock(productId, newStock, size);
      if (response.success) {
        setProducts(products.map(p => 
          p._id === productId ? response.data : p
        ));
        toast.success('Stock updated successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock');
      console.error('Error updating stock:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to extract color from product name (format: "Product Name - Color")
  const extractColorFromName = (productName) => {
    const parts = productName.split(' - ');
    if (parts.length > 1) {
      return parts[parts.length - 1]; // Return last part as color
    }
    return '';
  };

  // Helper function to get base product name without color
  const getBaseProductName = (productName) => {
    const parts = productName.split(' - ');
    if (parts.length > 1) {
      return parts.slice(0, -1).join(' - '); // Return everything except last part
    }
    return productName;
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    const baseName = getBaseProductName(product.name);
    const color = extractColorFromName(product.name);
    
    setEditingProduct(product);
    setEditFormData({
      name: baseName,
      productCode: product.productCode || '',
      productImage: product.productImage || '',
      lowStockThreshold: product.lowStockThreshold || 5,
      stockBySize: product.stockBySize || {
        '50ml': 0,
        '100ml': 0,
        '200ml': 0,
        '500ml': 0,
        '1L': 0,
        '4L': 0,
        '10L': 0,
        '20L': 0,
      },
      priceBySize: product.priceBySize || {
        '50ml': 0,
        '100ml': 0,
        '200ml': 0,
        '500ml': 0,
        '1L': 0,
        '4L': 0,
        '10L': 0,
        '20L': 0,
      },
      description: product.description || '',
      type: product.type || '',
      color: color, // Store color separately for editing
    });
    setIsEditModalOpen(true);
  };

  // Handle update product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editFormData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!editFormData.productCode.trim()) {
      toast.error('Product code is required');
      return;
    }

    setSubmitting(true);
    try {
      // Construct full product name with color if color exists
      const fullProductName = editFormData.color && editFormData.color.trim() !== ''
        ? `${editFormData.name.trim()} - ${editFormData.color.trim()}`
        : editFormData.name.trim();

      const response = await inventoryService.updateProduct(editingProduct._id, {
        name: fullProductName,
        productCode: editFormData.productCode,
        productImage: editFormData.productImage,
        lowStockThreshold: parseInt(editFormData.lowStockThreshold) || 5,
        stockBySize: editFormData.stockBySize,
        priceBySize: editFormData.priceBySize,
        description: editFormData.description,
        type: editFormData.type || editingProduct.type,
      });

      if (response.success) {
        toast.success('Product updated successfully!');
        setIsEditModalOpen(false);
        setEditingProduct(null);
        // Refresh products list
        if (selectedBrand?._id && selectedType) {
          productsFetchedRef.current = null;
          fetchProductsByBrandAndType(selectedBrand._id, selectedType);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
      console.error('Error updating product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await inventoryService.deleteProduct(productId);
      if (response.success) {
        toast.success('Product deleted successfully!');
        // Refresh products list
        if (selectedBrand?._id && selectedType) {
          productsFetchedRef.current = null;
          fetchProductsByBrandAndType(selectedBrand._id, selectedType);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
      console.error('Error deleting product:', error);
    }
  };

  const handleCreateBrand = async (e) => {
    e.preventDefault();
    if (!brandFormData.name.trim()) {
      toast.error('Brand name is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await inventoryService.createBrand(
        brandFormData.name,
        brandFormData.image
      );
      if (response.success) {
        toast.success('Brand created successfully!');
        setBrandFormData({ name: '', image: '' });
        setIsAddModalOpen(false);
        brandsFetched.current = false; // Reset to allow refetch
        fetchBrands();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create brand');
      console.error('Error creating brand:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productFormData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!productFormData.brand) {
      toast.error('Please select a brand');
      return;
    }
    if (!productFormData.type || !productFormData.type.trim()) {
      toast.error('Product type is required');
      return;
    }
    if (!productFormData.productImage || !productFormData.productImage.trim()) {
      toast.error('Product image is required');
      return;
    }
    // Validate stock by size - at least one container should have stock
    const totalStock = Object.values(productFormData.stockBySize || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    if (totalStock === 0) {
      toast.error('Please enter stock quantity for at least one container size');
      return;
    }
    // Price validation removed - prices will be entered at billing time

    setSubmitting(true);
    try {
      // First, create or update the product type with icon
      if (productFormData.typeIcon) {
        await inventoryService.createOrUpdateProductType(
          productFormData.type.trim(),
          productFormData.typeIcon
        );
      }

      // Then create the product (price will be set at billing time)
      const response = await inventoryService.createProduct({
        name: productFormData.name,
        brand: productFormData.brand,
        type: productFormData.type.trim(),
        price: 0,
        stock: totalStock,
        unit: productFormData.unit || 'L',
        description: productFormData.description,
        productCode: productFormData.productCode || '',
        productImage: productFormData.productImage || '',
        lowStockThreshold: parseInt(productFormData.lowStockThreshold) || 5,
        stockBySize: productFormData.stockBySize || {
          '50ml': 0,
          '100ml': 0,
          '200ml': 0,
          '500ml': 0,
          '1L': 0,
          '4L': 0,
          '10L': 0,
          '20L': 0,
        },
        priceBySize: {
          '50ml': 0,
          '100ml': 0,
          '200ml': 0,
          '500ml': 0,
          '1L': 0,
          '4L': 0,
          '10L': 0,
          '20L': 0,
        },
      });
      if (response.success) {
        toast.success('Product created successfully!');
        setProductFormData({
          name: '',
          brand: '',
          type: '',
          typeIcon: '',
          price: '',
          stock: '',
          unit: 'L',
          description: '',
          productCode: '',
          productImage: '',
          lowStockThreshold: 5,
          stockBySize: {
            '1L': 0,
            '4L': 0,
            '10L': 0,
            '20L': 0,
          },
          priceBySize: {
            '1L': 0,
            '4L': 0,
            '10L': 0,
            '20L': 0,
          },
        });
        setIsAddModalOpen(false);
        // Refresh types and products if viewing a brand
        if (selectedBrand?._id) {
          typesFetchedRef.current = false; // Reset to refresh types
          productsFetchedRef.current = null;
          fetchProductTypes();
          if (selectedType) {
            fetchProductsByBrandAndType(selectedBrand._id, selectedType);
          }
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create product');
      console.error('Error creating product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Button */}
      <div className="w-full px-8 pt-6 pb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <main className="pb-8">
        {!selectedBrand ? (
          // Brand Selection View - Matching Dashboard Card Design
          <div className="w-full px-8 py-4">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Select a Brand</h2>
                <p className="text-slate-600">Choose a brand to manage its inventory</p>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2 bg-slate-900 hover:bg-blue-600 text-white hover:text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {brands.map((brand) => (
                  <Card
                    key={brand._id}
                    className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleBrandSelect(brand)}
                  >
                    <CardContent className="p-8 flex flex-col items-center text-center">
                      <div className="w-36 h-36 mb-6 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <img
                          src={brand.image}
                          alt={brand.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.src = '/brands/default.png';
                          }}
                        />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {brand.name}
                      </h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : !selectedType ? (
          // Product Types View
          <div className="w-full px-8 py-4">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedBrand.name} - Product Types</h2>
                <p className="text-slate-600">Select a product type to manage inventory</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setActiveTab('product');
                    setProductFormData(prev => ({ ...prev, brand: selectedBrand._id }));
                    setIsAddModalOpen(true);
                  }}
                  className="gap-2 bg-slate-900 hover:bg-blue-600 text-white hover:text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedBrand(null);
                    setSelectedType(null);
                  }}
                  className="gap-2 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Brands
                </Button>
              </div>
            </div>
            {typesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : productTypes.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No product types found</p>
                <p className="text-sm mt-2">Add a product to create a new type</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {productTypes.map((type) => {
                  const typeName = typeof type === 'string' ? type : type.name;
                  const typeIcon = typeof type === 'object' ? type.icon : '';
                  const normalizedName = typeName.toLowerCase();
                  
                  // Always use React icons for specific types, even if database has icon URL
                  const shouldUseReactIcon = 
                    normalizedName.includes('interior paint') ||
                    normalizedName.includes('exterior paint') ||
                    normalizedName.includes('interior primer') ||
                    normalizedName.includes('exterior primer') ||
                    normalizedName.includes('enamel primer') ||
                    normalizedName.includes('enamel') ||
                    normalizedName.includes('putty') ||
                    normalizedName.includes('plastercoat') ||
                    normalizedName.includes('distemper') ||
                    normalizedName.includes('tool') ||
                    normalizedName.includes('woodtech') ||
                    normalizedName.includes('stainer') ||
                    normalizedName.includes('additional') ||
                    !typeIcon;
                  
                  return (
                    <Card
                      key={typeName}
                      className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => handleTypeSelect(typeName)}
                    >
                      <CardContent className="p-8 flex flex-col items-center text-center">
                        <div className="w-36 h-36 mb-6 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {shouldUseReactIcon ? (
                            getProductTypeIcon(typeName)
                          ) : (
                            <img
                              src={typeIcon}
                              alt={typeName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'block';
                                }
                              }}
                            />
                          )}
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {typeName}
                        </h3>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Product List View
          <div className="w-full px-8 py-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedBrand.name} - {selectedType}</h2>
                  <p className="text-slate-600">Manage stock levels for {selectedType} products</p>
                </div>
                <div className="flex gap-2">
                  {selectedType && selectedType.toLowerCase().includes('enamel') && (
                    <Button
                      onClick={() => setIsBulkUploadModalOpen(true)}
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Bulk Upload CSV
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setActiveTab('product');
                      setProductFormData(prev => ({ ...prev, brand: selectedBrand._id, type: selectedType }));
                      setIsAddModalOpen(true);
                    }}
                    className="gap-2 bg-slate-900 hover:bg-blue-600 text-white hover:text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedType(null)}
                    className="gap-2 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Types
                  </Button>
                </div>
              </div>

              <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {productsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No products found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="w-20">Image</TableHead>
                            <TableHead className="min-w-[120px]">Product Code</TableHead>
                            <TableHead className="min-w-[250px]">Product Name</TableHead>
                            <TableHead className="min-w-[150px]">Color</TableHead>
                            <TableHead className="text-center min-w-[120px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => {
                            const productColor = extractColorFromName(product.name);
                            const baseProductName = getBaseProductName(product.name);
                            return (
                              <TableRow 
                                key={product._id} 
                                className="hover:bg-slate-50 cursor-pointer"
                                onClick={(e) => {
                                  // Don't open modal if clicking on action buttons
                                  if (e.target.closest('button')) {
                                    return;
                                  }
                                  setSelectedProductDetails(product);
                                  setIsProductDetailsModalOpen(true);
                                }}
                              >
                                <TableCell>
                                  <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    {product.productImage ? (
                                      <img
                                        src={product.productImage}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div className={`w-full h-full flex items-center justify-center ${product.productImage ? 'hidden' : ''}`}>
                                      <Package className="h-6 w-6 text-slate-400" />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold text-slate-900">
                                  {product.productCode || '-'}
                                </TableCell>
                                <TableCell className="text-slate-700">
                                  {baseProductName}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                  {productColor || '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditProduct(product)}
                                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteProduct(product._id)}
                                      className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open);
        if (!open) {
          setActiveTab('brand');
          setBrandFormData({ name: '', image: '' });
          setProductFormData({
            name: '',
            brand: '',
            type: '',
            typeIcon: '',
            price: '',
            stock: '',
            unit: 'L',
            description: '',
            productCode: '',
            productImage: '',
            lowStockThreshold: 5,
            stockBySize: {
              '1L': 0,
              '4L': 0,
              '10L': 0,
              '20L': 0,
            },
          });
        }
      }}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-white !bg-white border-slate-200">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-2xl font-bold text-slate-900">Add New Item</DialogTitle>
            <DialogDescription className="text-slate-600 mt-1.5">
              Create a new brand or product for your inventory management system
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-2 mb-6 gap-4">
              <TabsTrigger 
                value="brand" 
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm h-12 text-base font-semibold hover:bg-blue-100 hover:text-blue-700 transition-colors"
              >
                <Building2 className="h-5 w-5" />
                Add Brand
              </TabsTrigger>
              <TabsTrigger 
                value="product" 
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm h-12 text-base font-semibold hover:bg-green-100 hover:text-green-700 transition-colors"
              >
                <Package2 className="h-5 w-5" />
                Add Product
              </TabsTrigger>
            </TabsList>

            <TabsContent value="brand" className="mt-0 space-y-6">
              <form onSubmit={handleCreateBrand} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="brand-name" className="text-sm font-semibold text-slate-900">
                    Brand Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="brand-name"
                    placeholder=""
                    value={brandFormData.name}
                    onChange={(e) => setBrandFormData({ ...brandFormData, name: e.target.value })}
                    required
                    disabled={submitting}
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brand-image" className="text-sm font-semibold text-slate-900">
                    Brand Logo URL
                  </Label>
                  <Input
                    id="brand-image"
                    type="url"
                    placeholder=""
                    value={brandFormData.image}
                    onChange={(e) => setBrandFormData({ ...brandFormData, image: e.target.value })}
                    disabled={submitting}
                    className="h-10"
                  />
                </div>

                <DialogFooter className="pt-4 border-t border-slate-200 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setBrandFormData({ name: '', image: '' });
                    }}
                    disabled={submitting}
                    className="min-w-[100px]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="min-w-[140px] bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Brand
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="product" className="mt-0 space-y-6">
              <form onSubmit={handleCreateProduct} className="space-y-5">
                {/* Product Image */}
                <div className="space-y-2">
                  <Label htmlFor="product-image" className="text-sm font-semibold text-slate-900">
                    Product Image <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                      {productFormData.productImage ? (
                        <img
                          src={productFormData.productImage}
                          alt="Product"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${productFormData.productImage ? 'hidden' : ''}`}>
                        <Package className="h-8 w-8 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Input
                        id="product-image"
                        type="url"
                        placeholder=""
                        value={productFormData.productImage}
                        onChange={(e) => setProductFormData({ ...productFormData, productImage: e.target.value })}
                        required
                        disabled={submitting}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="product-name" className="text-sm font-semibold text-slate-900">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="product-name"
                    placeholder="e.g., Royale Luxury Emulsion"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    required
                    disabled={submitting}
                    className="h-10"
                  />
                </div>

                {/* Product Code/SKU and Product Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-code" className="text-sm font-semibold text-slate-900">
                      Product Code/SKU
                    </Label>
                    <Input
                      id="product-code"
                      placeholder="e.g., AP-RLE-001"
                      value={productFormData.productCode}
                      onChange={(e) => setProductFormData({ ...productFormData, productCode: e.target.value })}
                      disabled={submitting}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-type" className="text-sm font-semibold text-slate-900">
                      Product Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={productFormData.type && ['Paint', 'Primer', 'Enamel', 'Interior Paints'].includes(productFormData.type) ? productFormData.type : 'Other'}
                      onValueChange={(value) => {
                        if (value === 'Other') {
                          setProductFormData({ ...productFormData, type: '' });
                        } else {
                          setProductFormData({ ...productFormData, type: value });
                        }
                      }}
                      disabled={submitting}
                    >
                      <SelectTrigger id="product-type" className="w-full h-10 bg-white text-slate-900 border-slate-200">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900 border-slate-200">
                        <SelectItem value="Paint" className="bg-white text-slate-900 focus:bg-slate-100">Paint</SelectItem>
                        <SelectItem value="Primer" className="bg-white text-slate-900 focus:bg-slate-100">Primer</SelectItem>
                        <SelectItem value="Enamel" className="bg-white text-slate-900 focus:bg-slate-100">Enamel</SelectItem>
                        <SelectItem value="Interior Paints" className="bg-white text-slate-900 focus:bg-slate-100">Interior Paints</SelectItem>
                        <SelectItem value="Other" className="bg-white text-slate-900 focus:bg-slate-100">Other (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                    {(!productFormData.type || !['Paint', 'Primer', 'Enamel', 'Interior Paints'].includes(productFormData.type)) && (
                      <Input
                        id="product-type-custom"
                        placeholder="Enter custom product type"
                        value={productFormData.type && !['Paint', 'Primer', 'Enamel', 'Interior Paints'].includes(productFormData.type) ? productFormData.type : ''}
                        onChange={(e) => setProductFormData({ ...productFormData, type: e.target.value })}
                        required={!productFormData.type || !['Paint', 'Primer', 'Enamel', 'Interior Paints'].includes(productFormData.type)}
                        disabled={submitting}
                        className="h-10 mt-2"
                      />
                    )}
                  </div>
                </div>

                {/* Brand Selection */}
                <div className="space-y-2">
                  <Label htmlFor="product-brand" className="text-sm font-semibold text-slate-900">
                    Brand <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={productFormData.brand}
                    onValueChange={(value) => setProductFormData({ ...productFormData, brand: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger id="product-brand" className="w-full h-10 bg-white text-slate-900 border-slate-200">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200">
                      {brands.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-slate-500">
                          No brands available. Create a brand first.
                        </div>
                      ) : (
                        brands.map((brand) => (
                          <SelectItem key={brand._id} value={brand._id} className="bg-white text-slate-900 focus:bg-slate-100">
                            {brand.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Type Icon URL */}
                <div className="space-y-2">
                  <Label htmlFor="product-type-icon" className="text-sm font-semibold text-slate-900">
                    Product Type Icon URL
                  </Label>
                  <Input
                    id="product-type-icon"
                    type="url"
                    placeholder=""
                    value={productFormData.typeIcon}
                    onChange={(e) => setProductFormData({ ...productFormData, typeIcon: e.target.value })}
                    disabled={submitting}
                    className="h-10"
                  />
                </div>

                {/* Low Stock Alert Threshold */}
                <div className="space-y-2">
                  <Label htmlFor="low-stock-threshold" className="text-sm font-semibold text-slate-900">
                    Low Stock Alert Threshold
                  </Label>
                  <div className="relative">
                    <Input
                      id="low-stock-threshold"
                      type="number"
                      min="0"
                      placeholder=""
                      value={productFormData.lowStockThreshold}
                      onChange={(e) => setProductFormData({ ...productFormData, lowStockThreshold: e.target.value })}
                      disabled={submitting}
                      className="h-10 pr-12"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
                      <button
                        type="button"
                        onClick={() => setProductFormData({ ...productFormData, lowStockThreshold: Math.max(0, parseInt(productFormData.lowStockThreshold) + 1) })}
                        className="h-3 w-3 flex items-center justify-center text-slate-500 hover:text-slate-900"
                        disabled={submitting}
                      >
                        <span className="text-xs">▲</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductFormData({ ...productFormData, lowStockThreshold: Math.max(0, parseInt(productFormData.lowStockThreshold) - 1) })}
                        className="h-3 w-3 flex items-center justify-center text-slate-500 hover:text-slate-900"
                        disabled={submitting}
                      >
                        <span className="text-xs">▼</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Alert when stock falls below this number</p>
                </div>

                {/* Stock by Container Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-slate-900">
                      Stock by Container Size
                    </Label>
                    <span className="text-sm font-semibold text-slate-900">
                      Total: {Object.values(productFormData.stockBySize || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0)} units
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {CONTAINER_SIZES.map((size) => (
                      <Card key={size} className="bg-white border border-slate-200 rounded-lg p-4">
                        <CardContent className="p-0">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-semibold text-slate-900">{size}</span>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-600">Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={productFormData.stockBySize?.[size] || 0}
                              onChange={(e) => {
                                const newStockBySize = { ...productFormData.stockBySize };
                                newStockBySize[size] = parseInt(e.target.value) || 0;
                                setProductFormData({ ...productFormData, stockBySize: newStockBySize });
                              }}
                              disabled={submitting}
                              className="h-10"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="product-description" className="text-sm font-semibold text-slate-900">
                    Description
                  </Label>
                  <Input
                    id="product-description"
                    placeholder=""
                    value={productFormData.description}
                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    disabled={submitting}
                    className="h-10"
                  />
                </div>

                <DialogFooter className="pt-4 border-t border-slate-200 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setProductFormData({
                        name: '',
                        brand: '',
                        type: '',
                        typeIcon: '',
                        price: '',
                        stock: '',
                        unit: 'L',
                        description: '',
                        productCode: '',
                        productImage: '',
                        lowStockThreshold: 5,
                        stockBySize: {
                          '50ml': 0,
                          '100ml': 0,
                          '200ml': 0,
                          '500ml': 0,
                          '1L': 0,
                          '4L': 0,
                          '10L': 0,
                          '20L': 0,
                        },
                      });
                    }}
                    disabled={submitting}
                    className="min-w-[100px]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting || brands.length === 0}
                    className="min-w-[160px] bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Product
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={isBulkUploadModalOpen} onOpenChange={setIsBulkUploadModalOpen}>
        <DialogContent className="!max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto bg-white shadow-2xl border-2 border-slate-200 p-0" showCloseButton={true}>
          <DialogHeader className="pb-6 border-b border-slate-200 bg-gradient-to-r from-green-50 to-blue-50 px-6 pt-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-bold text-slate-900">Bulk Upload Products</DialogTitle>
                <DialogDescription className="text-slate-600 mt-1.5 text-base">
                  Upload a CSV file to bulk import products. Product code is required for each product.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 p-6">
            {/* File Upload Section */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border-2 border-dashed border-slate-300 hover:border-green-400 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="csv-file" className="text-base font-semibold text-slate-900">
                    Upload CSV File
                  </Label>
                  {parsedProducts.length > 0 && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 text-sm font-semibold">
                      {parsedProducts.length} products loaded
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="csv-file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 text-base font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    <Upload className="h-5 w-5" />
                    Choose CSV File
                  </Button>
                  <p className="text-sm text-slate-500">
                    Select a CSV file with product data
                  </p>
                </div>
              </div>
            </div>

            {/* Products Table with Quantity Controls */}
            {parsedProducts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">Review & Adjust Quantities</h3>
                  <p className="text-sm text-slate-500">Set initial stock quantities for each product size</p>
                </div>
                <div className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto max-h-[55vh] overflow-y-auto bg-white">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-slate-100 to-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Product Code</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Product Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Colour</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 bg-blue-50">1L Qty</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 bg-blue-50">4L Qty</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 bg-blue-50">10L Qty</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider bg-blue-50">20L Qty</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {parsedProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900 border-r border-slate-100">{product.productCode}</td>
                            <td className="px-6 py-4 text-sm text-slate-700 border-r border-slate-100 max-w-xs truncate" title={product.name}>{product.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 border-r border-slate-100 max-w-xs truncate" title={product.colour || '-'}>{product.colour || '-'}</td>
                            {CONTAINER_SIZES.map((size) => (
                              <td key={size} className="px-6 py-4 text-center border-r border-slate-100 last:border-r-0">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateBulkProductQuantity(index, size, (product.stockBySize[size] || 0) - 1)}
                                    className="h-8 w-8 p-0 border-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={product.stockBySize[size] || 0}
                                    onChange={(e) => updateBulkProductQuantity(index, size, parseInt(e.target.value) || 0)}
                                    className="w-24 h-8 text-center text-sm font-medium border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateBulkProductQuantity(index, size, (product.stockBySize[size] || 0) + 1)}
                                    className="h-8 w-8 p-0 border-slate-300 hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 pt-6 border-t-2 border-slate-200 bg-slate-50 px-6 pb-6 rounded-b-lg sticky bottom-0">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkUploadModalOpen(false);
                  setParsedProducts([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={bulkUploadLoading}
                className="px-6 py-2.5 border-2 border-slate-300 hover:bg-slate-100 font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={parsedProducts.length === 0 || bulkUploadLoading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-2.5 text-base font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkUploadLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Uploading Products...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Upload {parsedProducts.length} Products
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) {
          setEditingProduct(null);
          setEditFormData({
            name: '',
            productCode: '',
            productImage: '',
            lowStockThreshold: 5,
            stockBySize: {
              '1L': 0,
              '4L': 0,
              '10L': 0,
              '20L': 0,
            },
            priceBySize: {
              '1L': 0,
              '4L': 0,
              '10L': 0,
              '20L': 0,
            },
            description: '',
            type: '',
            color: '',
          });
        }
      }}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-white !bg-white border-slate-200">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-2xl font-bold text-slate-900">Edit Product</DialogTitle>
            <DialogDescription className="text-slate-600 mt-1.5">
              Update product details and stock levels
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateProduct} className="space-y-5 mt-6">
            {/* Product Image */}
            <div className="space-y-2">
              <Label htmlFor="edit-product-image" className="text-sm font-semibold text-slate-900">
                Product Image <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                  {editFormData.productImage ? (
                    <img
                      src={editFormData.productImage}
                      alt="Product"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${editFormData.productImage ? 'hidden' : ''}`}>
                    <Package className="h-8 w-8 text-slate-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <Input
                    id="edit-product-image"
                    type="url"
                    placeholder="Enter image URL"
                    value={editFormData.productImage}
                    onChange={(e) => setEditFormData({ ...editFormData, productImage: e.target.value })}
                    required
                    disabled={submitting}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Product Name and Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-product-name" className="text-sm font-semibold text-slate-900">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-product-name"
                  placeholder="e.g., Royale Luxury Emulsion"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  disabled={submitting}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-color" className="text-sm font-semibold text-slate-900">
                  Color
                </Label>
                <Input
                  id="edit-product-color"
                  placeholder="e.g., Brilliant White"
                  value={editFormData.color}
                  onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                  disabled={submitting}
                  className="h-10"
                />
              </div>
            </div>

            {/* Product Code and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-product-code" className="text-sm font-semibold text-slate-900">
                  Product Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-product-code"
                  placeholder="e.g., AP-RLE-001"
                  value={editFormData.productCode}
                  onChange={(e) => setEditFormData({ ...editFormData, productCode: e.target.value })}
                  required
                  disabled={submitting}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-type" className="text-sm font-semibold text-slate-900">
                  Product Type <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-product-type"
                  placeholder="e.g., Enamels"
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                  required
                  disabled={submitting}
                  className="h-10"
                />
              </div>
            </div>

            {/* Low Stock Alert Threshold */}
            <div className="space-y-2">
              <Label htmlFor="edit-low-stock-threshold" className="text-sm font-semibold text-slate-900">
                Low Stock Alert Threshold
              </Label>
              <div className="relative">
                <Input
                  id="edit-low-stock-threshold"
                  type="number"
                  min="0"
                  value={editFormData.lowStockThreshold}
                  onChange={(e) => setEditFormData({ ...editFormData, lowStockThreshold: parseInt(e.target.value) || 5 })}
                  disabled={submitting}
                  className="h-10 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditFormData({ ...editFormData, lowStockThreshold: Math.max(0, (editFormData.lowStockThreshold || 5) - 1) })}
                    disabled={submitting}
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditFormData({ ...editFormData, lowStockThreshold: (editFormData.lowStockThreshold || 5) + 1 })}
                    disabled={submitting}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Stock by Container Size */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Stock by Container Size
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CONTAINER_SIZES.map((size) => (
                  <Card key={size} className="p-4 border border-slate-200 bg-white">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700">{size}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editFormData.stockBySize[size] || 0}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          stockBySize: {
                            ...editFormData.stockBySize,
                            [size]: parseInt(e.target.value) || 0
                          }
                        })}
                        disabled={submitting}
                        className="h-10 text-center font-semibold"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-semibold text-slate-900">
                Description
              </Label>
              <Input
                id="edit-description"
                placeholder="Product description (optional)"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                disabled={submitting}
                className="h-10"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={submitting}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Product
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Details Modal */}
      <Dialog open={isProductDetailsModalOpen} onOpenChange={setIsProductDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white !bg-white border-slate-200">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-2xl font-bold text-slate-900">Product Stock Details</DialogTitle>
            <DialogDescription className="text-slate-600 mt-1.5">
              View stock quantities for all container sizes
            </DialogDescription>
          </DialogHeader>

          {selectedProductDetails && (
            <div className="mt-6 space-y-6">
              {/* Product Info */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                <div className="w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {selectedProductDetails.productImage ? (
                    <img
                      src={selectedProductDetails.productImage}
                      alt={selectedProductDetails.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${selectedProductDetails.productImage ? 'hidden' : ''}`}>
                    <Package className="h-10 w-10 text-slate-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {getBaseProductName(selectedProductDetails.name)}
                  </h3>
                  <p className="text-sm text-slate-600 mb-1">
                    <span className="font-semibold">Product Code:</span> {selectedProductDetails.productCode || '-'}
                  </p>
                  {extractColorFromName(selectedProductDetails.name) && (
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold">Color:</span> {extractColorFromName(selectedProductDetails.name)}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock by Size */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900">Stock by Container Size</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {CONTAINER_SIZES.map((size) => {
                    const stock = selectedProductDetails.stockBySize?.[size] || 0;
                    return (
                      <Card key={size} className="p-4 border border-slate-200 bg-white">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">{size}</Label>
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-3 h-3 rounded-full ${
                                  stock === 0 
                                    ? 'bg-red-500 shadow-lg shadow-red-500/50' 
                                    : stock < (selectedProductDetails.lowStockThreshold || 5) 
                                    ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50' 
                                    : 'bg-green-500 shadow-lg shadow-green-500/50'
                                }`}
                                title={
                                  stock === 0 
                                    ? 'Out of Stock' 
                                    : stock < (selectedProductDetails.lowStockThreshold || 5) 
                                    ? 'Low Stock' 
                                    : 'In Stock'
                                }
                              />
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-slate-900">
                            {stock}
                          </div>
                          <div className="text-xs text-slate-500">
                            units
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Total Stock Summary */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-700">Total Stock:</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {Object.values(selectedProductDetails.stockBySize || {}).reduce(
                      (sum, val) => sum + (parseInt(val) || 0), 
                      0
                    )} units
                  </span>
                </div>
                {selectedProductDetails.lowStockThreshold && (
                  <p className="text-sm text-slate-500 mt-2">
                    Low Stock Alert Threshold: {selectedProductDetails.lowStockThreshold} units
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-200 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsProductDetailsModalOpen(false)}
              className="min-w-[100px]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
