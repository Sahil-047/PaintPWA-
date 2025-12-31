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
import { Search, ShoppingCart, ArrowLeft, Plus, Minus, Trash2, FileText, Loader2 } from 'lucide-react';
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

  const fetchProducts = useCallback(async () => {
    if (productsFetched.current) return; // Prevent multiple calls
    setLoading(true);
    productsFetched.current = true;
    try {
      const response = await inventoryService.getAllProducts();
      if (response.success) {
        setProducts(response.data);
        setFilteredProducts(response.data);
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
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => {
        const productName = product.name?.toLowerCase() || '';
        const brandName = product.brand?.name?.toLowerCase() || '';
        const search = searchQuery.toLowerCase();
        return productName.includes(search) || brandName.includes(search);
      });
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const addToCart = (product) => {
    const existingItem = cart.find(item => item._id === product._id || item.productId === product._id);
    if (existingItem) {
      setCart(cart.map(item =>
        (item._id === product._id || item.productId === product._id)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        productId: product._id,
        quantity: 1 
      }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (productId, change) => {
    setCart(cart.map(item => {
      const itemId = item._id || item.productId;
      if (itemId === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return item;
        const product = products.find(p => (p._id === productId));
        if (product && newQuantity > product.stock) {
          toast.error('Insufficient stock');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => {
      const itemId = item._id || item.productId;
      return itemId !== productId;
    }));
    toast.success('Item removed from cart');
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    try {
      // Format items for backend
      const items = cart.map(item => ({
        productId: item._id || item.productId,
        quantity: item.quantity
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
                              <TableHead className="font-semibold sticky left-0 bg-slate-50 z-20">Product Name</TableHead>
                              <TableHead className="font-semibold">Brand</TableHead>
                              <TableHead className="font-semibold">Price</TableHead>
                              <TableHead className="font-semibold">Stock</TableHead>
                              <TableHead className="font-semibold text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                </TableCell>
                              </TableRow>
                            ) : filteredProducts.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                  No products found
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredProducts.map((product) => (
                                <TableRow key={product._id} className="hover:bg-slate-50">
                                  <TableCell className="font-medium sticky left-0 bg-white z-10">{product.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                      {product.brand?.name || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-semibold">₹{product.price}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={product.stock < 30 ? "destructive" : "secondary"}
                                      className="text-xs text-slate-900"
                                    >
                                      {product.stock} 
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      onClick={() => addToCart(product)}
                                      size="sm"
                                      className="gap-2"
                                      disabled={product.stock === 0}
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
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
                          const itemId = item._id || item.productId;
                          return (
                            <div key={itemId} className="border border-slate-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-900 mb-1">{item.name}</h5>
                                  <p className="text-sm text-slate-600">₹{item.price} × {item.quantity}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromCart(itemId)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(itemId, -1)}
                                  className="h-9 w-9 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-lg font-bold w-12 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(itemId, 1)}
                                  className="h-9 w-9 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <span className="ml-auto text-lg font-bold">₹{item.price * item.quantity}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-200 pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-semibold">₹{calculateTotal()}</span>
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
    </div>
  );
};

export default Billing;
