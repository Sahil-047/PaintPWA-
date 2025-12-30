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
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const brandsFetched = useRef(false);
  const productsFetchedRef = useRef(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('brand');
  const [brandFormData, setBrandFormData] = useState({ name: '', image: '' });
  const [productFormData, setProductFormData] = useState({
    name: '',
    brand: '',
    price: '',
    stock: '',
    unit: 'L',
    description: '',
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

  const fetchProductsByBrand = useCallback(async (brandId) => {
    if (!brandId || productsFetchedRef.current === brandId) return; // Prevent duplicate calls
    setProductsLoading(true);
    productsFetchedRef.current = brandId;
    try {
      const response = await inventoryService.getProductsByBrand(brandId);
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Error fetching products:', error);
      productsFetchedRef.current = null; // Reset on error
    } finally {
      setProductsLoading(false);
    }
  }, []); // Empty deps - only create once

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchBrands();
  }, [user, navigate, fetchBrands]);

  useEffect(() => {
    if (selectedBrand?._id) {
      fetchProductsByBrand(selectedBrand._id);
    } else {
      productsFetchedRef.current = null; // Reset when brand is deselected
      setProducts([]);
    }
  }, [selectedBrand?._id, fetchProductsByBrand]);

  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
    setSearchQuery('');
  };

  const updateStock = async (productId, change) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    const newStock = product.stock + change;
    if (newStock < 0) {
      toast.error('Stock cannot be negative');
      return;
    }

    try {
      const response = await inventoryService.updateStock(productId, newStock);
      if (response.success) {
        setProducts(products.map(p => 
          p._id === productId ? { ...p, stock: newStock } : p
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
    if (!productFormData.price || productFormData.price <= 0) {
      toast.error('Valid price is required');
      return;
    }
    if (productFormData.stock === '' || productFormData.stock < 0) {
      toast.error('Valid stock quantity is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await inventoryService.createProduct({
        name: productFormData.name,
        brand: productFormData.brand,
        price: parseFloat(productFormData.price),
        stock: parseInt(productFormData.stock) || 0,
        unit: productFormData.unit,
        description: productFormData.description,
      });
      if (response.success) {
        toast.success('Product created successfully!');
        setProductFormData({
          name: '',
          brand: '',
          price: '',
          stock: '',
          unit: 'L',
          description: '',
        });
        setIsAddModalOpen(false);
        // Refresh products if viewing a brand
        if (selectedBrand?._id) {
          productsFetchedRef.current = null;
          fetchProductsByBrand(selectedBrand._id);
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
        ) : (
          // Product List View
          <div className="w-full px-8 py-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedBrand.name} Inventory</h2>
                  <p className="text-slate-600">Manage stock levels for {selectedBrand.name} products</p>
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
                    onClick={() => setSelectedBrand(null)}
                    className="gap-2 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Brands
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
                          className="flex items-center justify-between p-6 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-slate-900 mb-1">{product.name}</h4>
                            <p className="text-sm text-slate-600 mb-3">Price: ₹{product.price} per {product.unit}</p>
                            <Badge
                              variant={product.stock < 30 ? "destructive" : "secondary"}
                              className="text-sm"
                            >
                              Stock: {product.stock} {product.unit}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
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
            price: '',
            stock: '',
            unit: 'L',
            description: '',
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
                <div className="space-y-2">
                  <Label htmlFor="product-name" className="text-sm font-semibold text-slate-900">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="product-name"
                    placeholder=""
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    required
                    disabled={submitting}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-brand" className="text-sm font-semibold text-slate-900">
                    Brand <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={productFormData.brand}
                    onValueChange={(value) => setProductFormData({ ...productFormData, brand: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger id="product-brand" className="w-full h-10">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-slate-500">
                          No brands available. Create a brand first.
                        </div>
                      ) : (
                        brands.map((brand) => (
                          <SelectItem key={brand._id} value={brand._id}>
                            {brand.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-price" className="text-sm font-semibold text-slate-900">
                      Price (₹) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                      <Input
                        id="product-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder=""
                        value={productFormData.price}
                        onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                        required
                        disabled={submitting}
                        className="h-10 pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-stock" className="text-sm font-semibold text-slate-900">
                      Initial Stock <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="product-stock"
                      type="number"
                      min="0"
                      placeholder=""
                      value={productFormData.stock}
                      onChange={(e) => setProductFormData({ ...productFormData, stock: e.target.value })}
                      required
                      disabled={submitting}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-unit" className="text-sm font-semibold text-slate-900">
                    Unit of Measurement <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={productFormData.unit}
                    onValueChange={(value) => setProductFormData({ ...productFormData, unit: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger id="product-unit" className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Liters (L)</SelectItem>
                      <SelectItem value="Kg">Kilograms (Kg)</SelectItem>
                      <SelectItem value="Pcs">Pieces (Pcs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                        price: '',
                        stock: '',
                        unit: 'L',
                        description: '',
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
