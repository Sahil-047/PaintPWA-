import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ShoppingCart, ArrowLeft, Plus, Minus, Trash2, FileText, Loader2, Package } from 'lucide-react';
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
import { Label } from "@/components/ui/label";
import authService from '../../services/authService';
import inventoryService from '../../services/inventoryService';
import billingService from '../../services/billingService';
import { toast } from 'sonner';

const Billing = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const productsFetched = useRef(false);
  const [sizeSelectionModal, setSizeSelectionModal] = useState({ open: false, product: null, selectedSize: null, quantity: 1, price: '' });

  const fetchProducts = useCallback(async () => {
    if (productsFetched.current) return; // Prevent multiple calls
    setLoading(true);
    productsFetched.current = true;
    try {
      const response = await inventoryService.getAllProducts();
      if (response.success) {
        setProducts(response.data);
        // Don't show products by default - only when searched
        setFilteredProducts([]);
      }
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Error fetching products:', error);
      productsFetched.current = false; // Reset on error
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - only create once

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [user, navigate, fetchProducts]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      // Don't show products when search is empty
      setFilteredProducts([]);
    } else {
      const filtered = products.filter(product => {
        const productName = product.name?.toLowerCase() || '';
        const brandName = product.brand?.name?.toLowerCase() || '';
        const productCode = product.productCode?.toLowerCase() || '';
        const search = searchQuery.toLowerCase();
        return productName.includes(search) || brandName.includes(search) || productCode.includes(search);
      });
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const openSizeSelection = (product) => {
    setSizeSelectionModal({ open: true, product, selectedSize: null, quantity: 1, price: '' });
  };

  const addToCartWithSize = (product, size, quantity = 1, price = 0) => {
    const sizeStock = product.stockBySize?.[size] || 0;
    
    if (sizeStock < quantity) {
      toast.error(`Insufficient stock for ${size}. Available: ${sizeStock}`);
      return;
    }

    if (!price || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const cartItemId = `${product._id}-${size}`;
    const existingItem = cart.find(item => item.cartItemId === cartItemId);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > sizeStock) {
        toast.error(`Insufficient stock for ${size}. Available: ${sizeStock}`);
        return;
      }
      setCart(cart.map(item =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: newQuantity, price: parseFloat(price) }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        productId: product._id,
        cartItemId,
        selectedSize: size,
        price: parseFloat(price),
        quantity: quantity
      }]);
    }
    toast.success(`${product.name} (${size}) added to cart`);
    setSizeSelectionModal({ open: false, product: null, selectedSize: null, quantity: 1, price: '' });
  };

  const updateQuantity = (cartItemId, change) => {
    setCart(cart.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return item;
        const product = products.find(p => p._id === item.productId);
        if (product) {
          const sizeStock = product.stockBySize?.[item.selectedSize] || product.stock || 0;
          if (newQuantity > sizeStock) {
            toast.error(`Insufficient stock for ${item.selectedSize}. Available: ${sizeStock}`);
            return item;
          }
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (cartItemId) => {
    setCart(cart.filter(item => item.cartItemId !== cartItemId));
    toast.success('Item removed from cart');
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    try {
      // Format items for backend
      const items = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.selectedSize || null,
        price: item.price || 0
      }));

      const response = await billingService.createInvoice(items, 18);
      
      if (response.success) {
        toast.success('Invoice generated successfully!');
        setCart([]);
        // Refresh products to get updated stock
        productsFetched.current = false; // Reset flag to allow refresh
        fetchProducts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
      console.error('Error creating invoice:', error);
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
        <div className="w-full px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Billing</h2>
            <p className="text-slate-600">Search products and create invoices</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Search & Table */}
            <div className="lg:col-span-2">
              <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search products by name or brand..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <div className="max-h-[600px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-slate-50 z-10">
                            <TableRow>
                              <TableHead className="font-semibold sticky left-0 bg-slate-50 z-20 w-16"></TableHead>
                              <TableHead className="font-semibold sticky left-16 bg-slate-50 z-20">Product Name</TableHead>
                              <TableHead className="font-semibold">Brand</TableHead>
                              <TableHead className="font-semibold">Price</TableHead>
                              <TableHead className="font-semibold">Stock</TableHead>
                              <TableHead className="font-semibold text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                </TableCell>
                              </TableRow>
                            ) : filteredProducts.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-12">
                                  {searchQuery.trim() === '' ? (
                                    <div className="flex flex-col items-center justify-center gap-4">
                                      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                                        <Search className="h-10 w-10 text-blue-500" />
                                      </div>
                                      <div className="space-y-2">
                                        <h3 className="text-lg font-semibold text-slate-900">Search for Products</h3>
                                        <p className="text-sm text-slate-500 max-w-md">
                                          Start typing in the search box above to find and add products to your cart
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center gap-3">
                                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Package className="h-8 w-8 text-slate-400" />
                                      </div>
                                      <p className="text-sm text-slate-500">No products found matching your search</p>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredProducts.map((product) => {
                                const totalStock = product.stockBySize ? 
                                  Object.values(product.stockBySize).reduce((sum, val) => sum + (parseInt(val) || 0), 0) : 
                                  product.stock || 0;
                                
                                return (
                                  <TableRow key={product._id} className="hover:bg-slate-50">
                                    <TableCell className="sticky left-0 bg-white z-10 w-16">
                                      <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
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
                                    <TableCell className="font-medium sticky left-16 bg-white z-10">{product.name}</TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="text-xs">
                                        {product.brand?.name || 'N/A'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 italic">Set at billing</TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={totalStock < 30 ? "destructive" : "secondary"}
                                        className="text-xs text-slate-900"
                                      >
                                        {totalStock} 
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        onClick={() => openSizeSelection(product)}
                                        size="sm"
                                        className="gap-2"
                                        disabled={totalStock === 0}
                                      >
                                        <Plus className="h-4 w-4" />
                                        Add
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cart & Checkout */}
            <div className="lg:col-span-1">
              <Card className="bg-white border border-slate-200 rounded-lg shadow-sm sticky top-4">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Cart</h3>
                    <Badge variant="outline" className="gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {cart.length} items
                    </Badge>
                  </div>

                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Cart is empty</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                        {cart.map((item) => {
                          return (
                            <div key={item.cartItemId} className="border border-slate-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-900 mb-1">{item.name}</h5>
                                  <p className="text-sm text-slate-600">
                                    {item.selectedSize && (
                                      <Badge variant="outline" className="mr-2">
                                        {item.selectedSize}
                                      </Badge>
                                    )}
                                    ₹{item.price?.toFixed(2) || 0} × {item.quantity}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromCart(item.cartItemId)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.cartItemId, -1)}
                                  className="h-9 w-9 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-lg font-bold w-12 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.cartItemId, 1)}
                                  className="h-9 w-9 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <span className="ml-auto text-lg font-bold">₹{((item.price || 0) * item.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-200 pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-semibold">₹{calculateTotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Tax (18%)</span>
                          <span className="font-semibold">₹{(calculateTotal() * 0.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-3">
                          <span>Total</span>
                          <span>₹{(calculateTotal() * 1.18).toFixed(2)}</span>
                        </div>
                      </div>

                      <Button
                        onClick={handleCheckout}
                        className="w-full mt-6 gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Generate Invoice
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Size Selection Modal */}
      <Dialog open={sizeSelectionModal.open} onOpenChange={(open) => setSizeSelectionModal({ open, product: null, selectedSize: null, quantity: 1, price: '' })}>
        <DialogContent className="sm:max-w-[500px] bg-white !bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Select Container Size
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-1.5">
              {sizeSelectionModal.product?.name}
            </DialogDescription>
          </DialogHeader>

          {sizeSelectionModal.product && (
            <div className="space-y-6 py-4">
              {/* Size Selection */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-3 block">
                  Select Container Size <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {['50ml', '100ml', '200ml', '500ml', '1L', '4L', '10L', '20L'].map((size) => {
                    const product = sizeSelectionModal.product;
                    const stock = product.stockBySize?.[size] || 0;
                    const price = product.priceBySize?.[size] || product.price || 0;
                    const isAvailable = stock > 0 || !product.stockBySize;
                    const isSelected = sizeSelectionModal.selectedSize === size;
                    
                    return (
                      <Card
                        key={size}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : isAvailable
                            ? 'border-slate-200 hover:border-blue-500 hover:shadow-md'
                            : 'border-slate-100 opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => isAvailable && setSizeSelectionModal({ ...sizeSelectionModal, selectedSize: size })}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-slate-900">{size}</span>
                          </div>
                          <div className="space-y-1">
                            {product.stockBySize ? (
                              <Badge variant={stock > 0 ? "secondary" : "destructive"} className="text-xs">
                                Stock: {stock}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Available
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Selection */}
              {sizeSelectionModal.selectedSize && (
                <>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-900">
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newQty = Math.max(1, sizeSelectionModal.quantity - 1);
                          setSizeSelectionModal({ ...sizeSelectionModal, quantity: newQty });
                        }}
                        className="h-10 w-10 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={sizeSelectionModal.quantity}
                        onChange={(e) => {
                          const product = sizeSelectionModal.product;
                          const stock = product.stockBySize?.[sizeSelectionModal.selectedSize] || product.stock || 0;
                          const newQty = Math.max(1, Math.min(parseInt(e.target.value) || 1, stock));
                          setSizeSelectionModal({ ...sizeSelectionModal, quantity: newQty });
                        }}
                        className="h-10 w-24 text-center font-semibold"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const product = sizeSelectionModal.product;
                          const stock = product.stockBySize?.[sizeSelectionModal.selectedSize] || product.stock || 0;
                          const newQty = Math.min(stock, sizeSelectionModal.quantity + 1);
                          setSizeSelectionModal({ ...sizeSelectionModal, quantity: newQty });
                        }}
                        className="h-10 w-10 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-slate-600 ml-auto">
                        Max: {sizeSelectionModal.product.stockBySize?.[sizeSelectionModal.selectedSize] || sizeSelectionModal.product.stock || 0}
                      </span>
                    </div>
                  </div>

                  {/* Price Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-900">
                      Price (₹) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={sizeSelectionModal.price}
                        onChange={(e) => setSizeSelectionModal({ ...sizeSelectionModal, price: e.target.value })}
                        className="h-10 pl-8"
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSizeSelectionModal({ open: false, product: null, selectedSize: null, quantity: 1, price: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!sizeSelectionModal.selectedSize) {
                  toast.error('Please select a container size');
                  return;
                }
                if (!sizeSelectionModal.price || parseFloat(sizeSelectionModal.price) <= 0) {
                  toast.error('Please enter a valid price');
                  return;
                }
                addToCartWithSize(
                  sizeSelectionModal.product,
                  sizeSelectionModal.selectedSize,
                  sizeSelectionModal.quantity,
                  sizeSelectionModal.price
                );
              }}
              disabled={!sizeSelectionModal.selectedSize || !sizeSelectionModal.price || parseFloat(sizeSelectionModal.price) <= 0}
              className="bg-slate-900 hover:bg-blue-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
