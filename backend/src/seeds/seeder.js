import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/category.js';
import Product from '../models/product.js';
import User from '../models/user.js';

dotenv.config();

const categoriesData = [
  {
    name: 'Fruits & Vegetables',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh fruits and organic vegetables sourced daily.'
  },
  {
    name: 'Dairy & Bread',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh milk, butter, cheese, curd, and bakery items.'
  },
  {
    name: 'Cold Drinks & Juices',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    description: 'Soft drinks, energy drinks, juices, and soda.'
  },
  {
    name: 'Snacks & Munchies',
    image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80',
    description: 'Chips, namkeen, biscuits, chocolates, and sweets.'
  },
  {
    name: 'Atta, Rice & Dals',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    description: 'Flour, premium basmati rice, lentils, and cooking oils.'
  }
];

const productsData = {
  'Fruits & Vegetables': [
    {
      name: 'Fresh Organic Tomato',
      description: 'Handpicked juicy tomatoes, perfect for cooking or salads.',
      image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=400&q=80',
      price: 40,
      discountPrice: 29,
      unit: '500g',
      stock: 45,
      brand: 'FreshFarm'
    },
    {
      name: 'Fresh Banana (Robusta)',
      description: 'Sweet, energy-rich bananas packed with essential vitamins.',
      image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80',
      price: 60,
      discountPrice: 49,
      unit: '1 dozen',
      stock: 30,
      brand: 'FreshFarm'
    },
    {
      name: 'Organic Shimla Apple',
      description: 'Crisp and sweet apples freshly harvested from Shimla orchards.',
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
      price: 180,
      discountPrice: 149,
      unit: '1kg',
      stock: 20,
      brand: 'Shimla Fresh'
    },
    {
      name: 'Green Capsicum (Bell Pepper)',
      description: 'Shiny green crunchy capsicums, ideal for stir-fries and salads.',
      image: 'https://images.unsplash.com/photo-1588691030768-d0df73f76906?auto=format&fit=crop&w=400&q=80',
      price: 50,
      discountPrice: 39,
      unit: '250g',
      stock: 40,
      brand: 'FreshFarm'
    }
  ],
  'Dairy & Bread': [
    {
      name: 'Amul Salted Butter',
      description: 'Classic rich pasteurized butter from milk fat.',
      image: '/images/products/salted_butter.png',
      price: 110,
      discountPrice: 105,
      unit: '200g',
      stock: 60,
      brand: 'Amul'
    },
    {
      name: 'Mother Dairy Full Cream Milk',
      description: 'Premium quality pasteurized full cream milk, pasteurized.',
      image: '/images/products/full_cream_milk.png',
      price: 66,
      unit: '1L',
      stock: 120,
      brand: 'Mother Dairy'
    },
    {
      name: 'Harvest Gold Brown Bread',
      description: 'High-fiber sliced bread baked with premium wheat grain.',
      image: '/images/products/brown_bread.png',
      price: 50,
      discountPrice: 45,
      unit: '400g',
      stock: 35,
      brand: 'Harvest Gold'
    },
    {
      name: 'Fresh Malai Paneer',
      description: 'Soft and delicious cottage cheese block.',
      image: '/images/products/malai_paneer.png',
      price: 90,
      discountPrice: 82,
      unit: '200g',
      stock: 25,
      brand: 'Amul'
    }
  ],
  'Cold Drinks & Juices': [
    {
      name: 'Coca-Cola Soft Drink',
      description: 'Classic carbonated soft drink, best served chilled.',
      image: '/images/products/coca_cola.png',
      price: 40,
      discountPrice: 35,
      unit: '750ml',
      stock: 100,
      brand: 'Coca-Cola'
    },
    {
      name: 'Real Fruit Power Orange Juice',
      description: 'Refreshing citrus drink packed with real fruit nutrients.',
      image: '/images/products/orange_juice.png',
      price: 130,
      discountPrice: 99,
      unit: '1L',
      stock: 45,
      brand: 'Real'
    },
    {
      name: 'Red Bull Energy Drink',
      description: 'Vitalizes body and mind. Red Bull energy formula.',
      image: '/images/products/red_bull.png',
      price: 125,
      discountPrice: 115,
      unit: '250ml',
      stock: 80,
      brand: 'Red Bull'
    }
  ],
  'Snacks & Munchies': [
    {
      name: 'Lay\'s India\'s Magic Masala Chips',
      description: 'Classic ridge-cut potato chips seasoned with spicy masala.',
      image: '/images/products/lays_magic_masala.png',
      price: 20,
      unit: '50g',
      stock: 150,
      brand: 'Lay\'s'
    },
    {
      name: 'Cadbury Dairy Milk Silk',
      description: 'Smooth, creamy milk chocolate bar for premium indulgence.',
      image: '/images/products/dairy_milk_silk.png',
      price: 80,
      discountPrice: 75,
      unit: '60g',
      stock: 75,
      brand: 'Cadbury'
    },
    {
      name: 'Haldiram\'s Bhujia Sev',
      description: 'Savory fried gram flour noodles spiced with black pepper and mint.',
      image: '/images/products/bhujia_sev.png',
      price: 100,
      discountPrice: 89,
      unit: '350g',
      stock: 50,
      brand: 'Haldiram\'s'
    }
  ],
  'Atta, Rice & Dals': [
    {
      name: 'Aashirvaad Shudh Chakki Atta',
      description: '100% whole wheat flour, stone-ground to perfection.',
      image: '/images/products/chakki_atta.png',
      price: 260,
      discountPrice: 229,
      unit: '5kg',
      stock: 40,
      brand: 'Aashirvaad'
    },
    {
      name: 'Daawat Rozana Super Basmati Rice',
      description: 'Long grain aromatic rice, perfect for biryanis or everyday meals.',
      image: '/images/products/basmati_rice.png',
      price: 450,
      discountPrice: 389,
      unit: '5kg',
      stock: 30,
      brand: 'Daawat'
    },
    {
      name: 'Tata Sampann Premium Toor Dal',
      description: 'Unpolished split pigeon peas, high in dietary protein.',
      image: '/images/products/toor_dal.png',
      price: 180,
      discountPrice: 159,
      unit: '1kg',
      stock: 50,
      brand: 'Tata Sampann'
    }
  ]
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery-delivery');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing catalog data
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log('Cleared existing products and categories.');

    // Seed Categories
    const seededCategories = [];
    for (const catData of categoriesData) {
      const category = await Category.create(catData);
      seededCategories.push(category);
      console.log(`Seeded category: ${category.name}`);
    }

    // Seed Products
    for (const categoryName of Object.keys(productsData)) {
      const dbCategory = seededCategories.find(c => c.name === categoryName);
      if (!dbCategory) continue;

      const productsList = productsData[categoryName];
      for (const prodData of productsList) {
        await Product.create({
          ...prodData,
          category: dbCategory._id
        });
        console.log(`Seeded product: ${prodData.name} under ${categoryName}`);
      }
    }

    // Check if an admin user exists, create one if not
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@pep.com',
        password: 'adminpassword123',
        phone: '9999999999',
        role: 'admin'
      });
      console.log('Seeded default admin user: admin@pep.com / adminpassword123');
    }

    // Seed a store manager
    const managerExists = await User.findOne({ role: 'store_manager' });
    if (!managerExists) {
      await User.create({
        name: 'Store Manager',
        email: 'manager@pep.com',
        password: 'managerpassword123',
        phone: '8888888888',
        role: 'store_manager'
      });
      console.log('Seeded default store manager: manager@pep.com / managerpassword123');
    }

    // Seed a delivery partner
    const driverExists = await User.findOne({ role: 'delivery_partner' });
    if (!driverExists) {
      await User.create({
        name: 'Delivery Rider 1',
        email: 'rider@pep.com',
        password: 'riderpassword123',
        phone: '7777777777',
        role: 'delivery_partner'
      });
      console.log('Seeded default delivery rider: rider@pep.com / riderpassword123');
    }

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
