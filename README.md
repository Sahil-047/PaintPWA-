# Paint ERP - Enterprise Resource Planning System

A modern, full-stack ERP system specifically designed for paint manufacturing and distribution companies.

## 🎯 Features

### Authentication
- User registration and login
- JWT-based authentication
- Protected routes

### Dashboard
- Clean, modern interface
- Quick access to all modules
- Real-time statistics

### Billing Module
- Product search and selection
- Shopping cart functionality
- Invoice generation
- Automatic inventory reduction
- Tax calculation (18% GST)

### Inventory Management
- Brand-based organization
- Stock level tracking
- Low stock alerts
- Real-time stock updates
- Multi-brand support (Asian Paints, Berger, Nerolac, Indigo, Dulux, JSW, Birla Opus)

### Reports & Analytics
- Sales reports
- Inventory reports
- Top selling products
- Brand performance metrics
- Revenue tracking

### Settings
- Profile management
- Security settings
- Notification preferences
- Appearance customization

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Component library
- **React Router DOM** - Routing
- **Axios** - HTTP client
- **Sonner** - Toast notifications
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📁 Project Structure

```
PaintPWA-/
├── Frontend/
│   ├── public/
│   │   └── brands/          # Brand logos
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/          # shadcn UI components
│   │   ├── config/          # Configuration files
│   │   ├── lib/             # Utility functions
│   │   ├── pages/
│   │   │   ├── Auth/        # Login & Signup
│   │   │   ├── Dashboard/   # Main dashboard
│   │   │   ├── Billing/     # Billing module
│   │   │   ├── Inventory/   # Inventory module
│   │   │   ├── Reports/     # Reports module
│   │   │   └── Settings/    # Settings module
│   │   ├── services/        # API services
│   │   ├── App.jsx          # Main app component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── components.json      # shadcn config
│
└── Backend/
    ├── controllers/         # Request handlers
    ├── middlewares/         # Auth middleware
    ├── models/              # Database models
    ├── routes/              # API routes
    ├── server.js            # Server entry point
    ├── package.json
    └── .env                 # Environment variables
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v20.x or higher)
- MongoDB (running locally or remote)
- npm or yarn

### Backend Setup

1. Navigate to Backend directory:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (already exists):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/paint-erp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
NODE_ENV=development
```

4. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to Frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 📋 Application Workflow

```
Login → Dashboard → Select Module

Billing Workflow:
Dashboard → Billing → Search Products → Add to Cart → Checkout → Generate Invoice

Inventory Workflow:
Dashboard → Inventory → Select Brand → View Products → Update Stock

Reports Workflow:
Dashboard → Reports → View Analytics & Statistics

Settings Workflow:
Dashboard → Settings → Update Profile/Preferences
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Health Check
- `GET /api/health` - Check API status

## 🎨 UI Components (shadcn/ui)

The project uses the following shadcn/ui components:
- Button
- Card
- Input
- Label
- Select
- Separator
- Sonner (Toast)
- Tabs
- Dialog
- Dropdown Menu
- Avatar
- Table
- Badge

## 📱 Features in Detail

### Billing Module
- Real-time product search
- Cart management (add, remove, update quantity)
- Stock validation
- Tax calculation
- Invoice generation
- Responsive design

### Inventory Module
- Brand selection interface
- Product listing by brand
- Stock level indicators
- Quick stock updates (+10/-10 units)
- Low stock warnings (< 30 units)
- Search functionality

### Dashboard
- Module cards with icons
- Quick statistics
- User profile display
- Easy navigation
- Logout functionality

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes
- Token expiration
- Input validation
- Error handling

## 🎯 Future Enhancements

- [ ] Real-time notifications
- [ ] Advanced reporting with charts
- [ ] Multi-user roles and permissions
- [ ] Invoice PDF generation
- [ ] Email notifications
- [ ] Product image uploads
- [ ] Barcode scanning
- [ ] Payment gateway integration
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Mobile app (PWA)

## 📝 License

This project is private and proprietary.

## 👥 Support

For support, email your-email@example.com

---

Built with ❤️ using React, Node.js, and shadcn/ui
