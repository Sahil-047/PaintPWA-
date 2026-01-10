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
import { ArrowLeft, Package, Plus, Minus, Search, Loader2, Building2, Package2 } from 'lucide-react';
import authService from '../../services/authService';
import inventoryService from '../../services/inventoryService';
import { toast } from 'sonner';

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
  const [submitting, setSubmitting] = useState(false);

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
        setProductTypes(response.data);
      }
    } catch (error) {
      toast.error('Failed to load product types');
      console.error('Error fetching product types:', error);
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
                  return (
                    <Card
                      key={typeName}
                      className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => handleTypeSelect(typeName)}
                    >
                      <CardContent className="p-8 flex flex-col items-center text-center">
                        <div className="w-36 h-36 mb-6 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {typeIcon ? (
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
                          ) : null}
                          <Package 
                            className="h-24 w-24 text-slate-400"
                            style={{ display: typeIcon ? 'none' : 'block' }}
                          />
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
                    <div className="space-y-4">
                      {filteredProducts.map((product) => (
                        <div
                          key={product._id}
                          className="p-6 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
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
                                <Package className="h-8 w-8 text-slate-400" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-slate-900 mb-1">{product.name}</h4>
                              {product.stockBySize ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {['1L', '4L', '10L', '20L'].map((size) => {
                                    const sizeStock = product.stockBySize?.[size] || 0;
                                    return (
                                      <div key={size} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-white">
                                        <span className="text-xs font-medium text-slate-700 w-6">{size}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateStock(product._id, -1, size)}
                                          className="h-7 w-7 p-0"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-sm font-bold w-8 text-center">
                                          {sizeStock}
                                        </span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateStock(product._id, 1, size)}
                                          className="h-7 w-7 p-0"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={product.stock < 30 ? "destructive" : "secondary"}
                                    className="text-sm text-slate-900"
                                  >
                                    Stock: {product.stock} 
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateStock(product._id, -1)}
                                    className="h-10 w-10 p-0"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="text-xl font-bold w-20 text-center">
                                    {product.stock}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateStock(product._id, 1)}
                                    className="h-10 w-10 p-0"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
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
                    {['1L', '4L', '10L', '20L'].map((size) => (
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
    </div>
  );
};

export default Inventory;
