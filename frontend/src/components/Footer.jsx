import React from 'react';
import { ShoppingBag, Heart, Mail, Phone, MapPin } from 'lucide-react';
import GrovioLogo from './GrovioLogo.jsx';

export const Footer = () => {
  return (
    <footer className="w-full bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border mt-auto transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Tagline column */}
          <div className="flex flex-col gap-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <GrovioLogo size={34} showTagline={true} />
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-text mt-2 leading-relaxed">
              Experience the future of grocery shopping. Get high quality organic fruits, fresh dairy products, munchies and beverages delivered to your doorstep in minutes.
            </p>
          </div>

          {/* Categories column */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Popular Categories
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-dark-text">
              <li><a href="/category/fruits-vegetables" className="hover:text-primary-500 transition-colors">Fruits & Vegetables</a></li>
              <li><a href="/category/dairy-bread" className="hover:text-primary-500 transition-colors">Dairy & Bread</a></li>
              <li><a href="/category/cold-drinks-juices" className="hover:text-primary-500 transition-colors">Cold Drinks & Juices</a></li>
              <li><a href="/category/snacks-munchies" className="hover:text-primary-500 transition-colors">Snacks & Munchies</a></li>
            </ul>
          </div>

          {/* Platform column */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-dark-text">
              <li><a href="#" className="hover:text-primary-500 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary-500 transition-colors">Delivery Careers</a></li>
              <li><a href="#" className="hover:text-primary-500 transition-colors">Store Locations</a></li>
              <li><a href="#" className="hover:text-primary-500 transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Contact Support column */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Contact Us
            </h4>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-dark-text">
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-primary-500 flex-shrink-0" />
                <a href="mailto:support@grovio.com" className="hover:text-primary-500 truncate">support@grovio.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-primary-500 flex-shrink-0" />
                <a href="tel:+918340489386" className="hover:text-primary-500 transition-colors">
                  +91 83404 89386
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} className="text-primary-500 flex-shrink-0" />
                <span>Jalandhar, Punjab, India</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-10 sm:mt-16 pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-dark-muted">
          <p>© 2026 Grovio Inc. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart size={12} className="text-red-500 fill-red-500" /> by{' '}
            <a
              href="https://ayushrajvishwakarma.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-500 hover:text-primary-400 transition-colors underline underline-offset-2"
            >
              Ayush Raj
            </a>
            {' '}and team
          </p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
