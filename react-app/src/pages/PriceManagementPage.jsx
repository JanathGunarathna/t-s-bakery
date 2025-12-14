import React, { useState, useEffect, useCallback, useMemo } from "react";
import { firestore } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../images/background.jpg";

const SHOPS = [
  "Katuwawala",
  "Koswatta",
  "Arawwala",
  "Depanama",
  "Maharagama A",
  "Maharagama B",
  "Maharagama C",
  "Bakery Outlet"
];

// Toast notification component
const Toast = ({ toast, onRemove, isDarkMode }) => {
  const getToastStyles = () => {
    const baseStyles = "fixed z-50 p-4 rounded-lg shadow-lg border transform transition-all duration-300 ease-in-out max-w-sm";
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} ${
          isDarkMode 
            ? "bg-green-900/30 border-green-700/50 text-green-300" 
            : "bg-green-50 border-green-200 text-green-800"
        }`;
      case 'error':
        return `${baseStyles} ${
          isDarkMode 
            ? "bg-red-900/30 border-red-700/50 text-red-300" 
            : "bg-red-50 border-red-200 text-red-800"
        }`;
      case 'warning':
        return `${baseStyles} ${
          isDarkMode 
            ? "bg-yellow-900/30 border-yellow-700/50 text-yellow-300" 
            : "bg-yellow-50 border-yellow-200 text-yellow-800"
        }`;
      case 'info':
      default:
        return `${baseStyles} ${
          isDarkMode 
            ? "bg-blue-900/30 border-blue-700/50 text-blue-300" 
            : "bg-blue-50 border-blue-200 text-blue-800"
        }`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div className={getToastStyles()} style={{ top: `${1 + toast.index * 5}rem`, right: '1rem' }}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{getIcon()}</span>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-sm mb-1">{toast.title}</div>
          )}
          <div className="text-sm">{toast.message}</div>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-current opacity-50 hover:opacity-100 transition-opacity ml-2 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function AddPricePage({ onNavigate }) {
  // Dark mode state - using React state instead of localStorage
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Add toast function
  const addToast = useCallback((message, type = 'info', title = null, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, title, duration }]);
  }, []);

  // Remove toast function
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // State management

  const [priceData, setPriceData] = useState([]);
  const [shopItemsData, setShopItemsData] = useState([]);
  const [editingPrices, setEditingPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemName, setEditingItemName] = useState("");

  const [selectedShop, setSelectedShop] = useState(() => {
  return localStorage.getItem("selectedShop") || SHOPS[0];
});

useEffect(() => {
  localStorage.setItem("selectedShop", selectedShop);
}, [selectedShop]);


  // Firestore collection references
  const pricesRef = collection(firestore, "prices");
  const shopItemsRef = collection(firestore, "shopItems");

  // Navigation function with fallback
  const navigate = useNavigate();

  const navigateToPage = (page) => {
    navigate(page);
  };

  // Get bakery items for selected shop (sorted by order field)
  const getBakeryItemsForShop = useCallback((shop) => {
    return shopItemsData
      .filter(item => item.shop === shop)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(item => ({
        name: item.itemName,
        id: item.id,
        order: item.order || 0
      }));
  }, [shopItemsData]);

  const BAKERY_ITEMS = useMemo(() => {
    return getBakeryItemsForShop(selectedShop);
  }, [getBakeryItemsForShop, selectedShop]);

  // Fetch price data and shop items from Firebase
  const fetchPriceData = useCallback(async () => {
    try {
      setLoading(true);
      const priceQuery = query(pricesRef);
      const priceSnapshot = await getDocs(priceQuery);

      const priceItems = priceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch shop items
      const shopItemsSnapshot = await getDocs(shopItemsRef);
      const shopItems = shopItemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPriceData(priceItems);
      setShopItemsData(shopItems);
      console.log("Fetched price data:", priceItems.length, "items");
      console.log("Fetched shop items:", shopItems.length, "custom items");
    } catch (error) {
      console.error("Error fetching price data:", error);
      addToast("Error loading price data. Please try again.", 'error');
      setPriceData([]);
      setShopItemsData([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Load data on component mount
  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  // Get price for an item in the selected shop
  const getItemPrice = useCallback(
    (itemName) => {
      const priceRecord = priceData.find(
        (price) => price.itemName === itemName && price.shop === selectedShop
      );
      return priceRecord
        ? { price: parseFloat(priceRecord.price) || 0, id: priceRecord.id }
        : { price: null, id: null };
    },
    [priceData, selectedShop]
  );

  // Handle price editing
  const handlePriceEdit = useCallback(
    (itemName, value) => {
      const priceKey = `${selectedShop}_${itemName}`;
      const numValue = parseFloat(value) || 0;

      setEditingPrices((prev) => {
        const updated = { ...prev };
        if (value === "" || numValue === 0) {
          delete updated[priceKey];
        } else {
          updated[priceKey] = {
            itemName,
            shop: selectedShop,
            price: numValue,
          };
        }
        return updated;
      });
    },
    [selectedShop]
  );

  // Save prices to Firebase
  const handleSavePrices = useCallback(async () => {
    try {
      setSubmitting(true);

      const pricesToSave = Object.entries(editingPrices);

      if (pricesToSave.length === 0) {
        addToast("No price changes to save.", 'warning');
        return;
      }

      console.log("Saving", pricesToSave.length, "price changes...");

      const savePromises = pricesToSave.map(async ([priceKey, priceData]) => {
        const { itemName, shop, price } = priceData;
        const existingPrice = getItemPrice(itemName);

        const dataToSave = {
          itemName,
          shop,
          price: parseFloat(price),
          updatedAt: new Date().toISOString(),
        };

        try {
          if (existingPrice.id) {
            // Update existing price
            const docRef = doc(firestore, "prices", existingPrice.id);
            await updateDoc(docRef, dataToSave);
            console.log("Updated price for", itemName);
          } else {
            // Create new price
            await addDoc(pricesRef, {
              ...dataToSave,
              createdAt: new Date().toISOString(),
            });
            console.log("Created new price for", itemName);
          }
        } catch (itemError) {
          console.error(`Error saving price for ${itemName}:`, itemError);
          throw itemError;
        }
      });

      await Promise.all(savePromises);

      // Clear editing state and refresh data
      setEditingPrices({});
      await fetchPriceData();

      addToast(`All ${pricesToSave.length} prices saved successfully!`, 'success');
    } catch (error) {
      console.error("Error saving prices:", error);
      const errorMessage =
        error.code === "permission-denied"
          ? "Permission denied. Please check your Firebase permissions."
          : error.code === "unavailable"
          ? "Firebase service temporarily unavailable. Please try again."
          : `Failed to save prices: ${error.message}`;
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [editingPrices, getItemPrice, fetchPriceData, addToast]);

  // Delete price
  const handleDeletePrice = useCallback(
    async (itemName) => {
      if (
        !window.confirm(
          `Are you sure you want to delete the price for "${itemName}" in ${selectedShop}?`
        )
      ) {
        return;
      }

      try {
        const existingPrice = getItemPrice(itemName);
        if (existingPrice.id) {
          await deleteDoc(doc(firestore, "prices", existingPrice.id));
          await fetchPriceData();
          addToast(`Price for "${itemName}" deleted successfully!`, 'success');
        }
      } catch (error) {
        console.error("Error deleting price:", error);
        addToast("Error deleting price. Please try again.", 'error');
      }
    },
    [selectedShop, getItemPrice, fetchPriceData, addToast]
  );

  // Delete item
  const handleDeleteItem = useCallback(
    async (itemId, itemName) => {
      if (
        !window.confirm(
          `Are you sure you want to delete "${itemName}" from ${selectedShop}? This will also delete its price if it exists.`
        )
      ) {
        return;
      }

      try {
        // Delete the item from shopItems collection
        await deleteDoc(doc(firestore, "shopItems", itemId));
        
        // Also delete its price if it exists
        const existingPrice = getItemPrice(itemName);
        if (existingPrice.id) {
          await deleteDoc(doc(firestore, "prices", existingPrice.id));
        }

        await fetchPriceData();
        addToast(`"${itemName}" deleted successfully from ${selectedShop}!`, 'success');
      } catch (error) {
        console.error("Error deleting item:", error);
        addToast("Error deleting item. Please try again.", 'error');
      }
    },
    [selectedShop, getItemPrice, fetchPriceData, addToast]
  );

  // Start editing item name
  const handleStartEditItem = useCallback((itemId, currentName) => {
    setEditingItemId(itemId);
    setEditingItemName(currentName);
  }, []);

  // Cancel editing item name
  const handleCancelEditItem = useCallback(() => {
    setEditingItemId(null);
    setEditingItemName("");
  }, []);

  // Save edited item name
  const handleSaveEditItem = useCallback(async () => {
    if (!editingItemName.trim()) {
      addToast("Please enter a valid item name", 'warning');
      return;
    }

    if (!editingItemId) {
      return;
    }

    // Check if the new name already exists for this shop
    const currentShopItems = getBakeryItemsForShop(selectedShop);
    const nameExists = currentShopItems.some(item => 
      item.name.toLowerCase() === editingItemName.trim().toLowerCase() && item.id !== editingItemId
    );

    if (nameExists) {
      addToast("An item with this name already exists for this shop", 'error');
      return;
    }

    try {
      // Get the original item name before updating
      const originalItemData = shopItemsData.find(item => item.id === editingItemId);
      const originalItemName = originalItemData?.itemName;

      // Update the item name in shopItems collection
      const itemRef = doc(firestore, "shopItems", editingItemId);
      await updateDoc(itemRef, {
        itemName: editingItemName.trim(),
        updatedAt: new Date().toISOString()
      });

      // If there's a price for this item, update the price record with the new item name
      if (originalItemName) {
        const existingPrice = getItemPrice(originalItemName);
        if (existingPrice.id) {
          const priceRef = doc(firestore, "prices", existingPrice.id);
          await updateDoc(priceRef, {
            itemName: editingItemName.trim(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      setEditingItemId(null);
      setEditingItemName("");
      await fetchPriceData();
      addToast(`Item name updated to "${editingItemName.trim()}" successfully!`, 'success');
    } catch (error) {
      console.error("Error updating item name:", error);
      addToast("Error updating item name. Please try again.", 'error');
    }
  }, [editingItemId, editingItemName, selectedShop, getBakeryItemsForShop, shopItemsData, getItemPrice, fetchPriceData, addToast]);

  // Add new item to shop
  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim()) {
      addToast("Please enter an item name", 'warning');
      return;
    }

    const currentShopItems = getBakeryItemsForShop(selectedShop);
    if (currentShopItems.some(item => item.name === newItemName.trim())) {
      addToast("This item already exists for this shop", 'error');
      return;
    }

    try {
      // Get the highest order number for the current shop
      const maxOrder = currentShopItems.length > 0 
        ? Math.max(...currentShopItems.map(item => item.order)) 
        : 0;

      await addDoc(shopItemsRef, {
        shop: selectedShop,
        itemName: newItemName.trim(),
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
      });

      setNewItemName("");
      await fetchPriceData(); // Refresh data to get the new item
      addToast(`Item "${newItemName.trim()}" added to ${selectedShop}`, 'success');
    } catch (error) {
      console.error("Error adding item:", error);
      addToast("Failed to add item. Please try again.", 'error');
    }
  }, [newItemName, selectedShop, getBakeryItemsForShop, fetchPriceData, addToast]);

  // Move item up in the list - ENHANCED VERSION
  const handleMoveItemUp = useCallback(async (itemName) => {
    if (reordering) {
      console.log("Already reordering, skipping");
      return;
    }
    
    try {
      setReordering(true);
      console.log("=== MOVE UP DEBUG ===");
      console.log("Selected shop:", selectedShop);
      console.log("Item to move:", itemName);
      
      // Get all items for the current shop (not filtered)
      const allShopItems = getBakeryItemsForShop(selectedShop);
      console.log("All shop items:", allShopItems.map(item => `${item.name} (order: ${item.order})`));
      
      // Find the current item index in the complete list
      const currentIndex = allShopItems.findIndex(item => item.name === itemName);
      console.log("Current index:", currentIndex);
      
      if (currentIndex <= 0) {
        console.log("Item is already at the top or not found");
        return;
      }

      // Get the items to swap
      const currentItem = allShopItems[currentIndex];
      const previousItem = allShopItems[currentIndex - 1];

      console.log("Current item:", currentItem);
      console.log("Previous item:", previousItem);

      // Find the full item data from shopItemsData
      const currentItemData = shopItemsData.find(item => 
        item.itemName === currentItem.name && item.shop === selectedShop
      );
      const previousItemData = shopItemsData.find(item => 
        item.itemName === previousItem.name && item.shop === selectedShop
      );

      console.log("Current item DB data:", currentItemData);
      console.log("Previous item DB data:", previousItemData);

      if (!currentItemData || !previousItemData) {
        console.error("Item data not found in database");
        throw new Error("Item data not found in database");
      }

      // Create new order values to ensure they're different
      const tempOrder = Math.max(currentItem.order, previousItem.order) + 1000;
      
      console.log("=== UPDATING DATABASE ===");
      console.log(`Step 1: Setting ${currentItem.name} to temp order ${tempOrder}`);
      
      // Step 1: Set current item to temporary order to avoid conflicts
      const currentItemRef = doc(firestore, "shopItems", currentItemData.id);
      await updateDoc(currentItemRef, {
        order: tempOrder,
        updatedAt: new Date().toISOString()
      });

      console.log(`Step 2: Setting ${previousItem.name} to order ${currentItem.order}`);
      
      // Step 2: Set previous item to current item's original order
      const previousItemRef = doc(firestore, "shopItems", previousItemData.id);
      await updateDoc(previousItemRef, {
        order: currentItem.order,
        updatedAt: new Date().toISOString()
      });

      console.log(`Step 3: Setting ${currentItem.name} to order ${previousItem.order}`);
      
      // Step 3: Set current item to previous item's original order
      await updateDoc(currentItemRef, {
        order: previousItem.order,
        updatedAt: new Date().toISOString()
      });

      console.log("Database updates completed, refreshing data...");
      
      // Wait a bit before refreshing to ensure Firebase has processed
      setTimeout(async () => {
        await fetchPriceData();
        console.log("Data refreshed successfully");
      }, 500);
      
    } catch (error) {
      console.error("Error moving item up:", error);
      addToast(`Failed to move item up: ${error.message}`, 'error');
    } finally {
      setTimeout(() => {
        setReordering(false);
        console.log("Reordering state reset");
      }, 1000);
    }
  }, [selectedShop, getBakeryItemsForShop, shopItemsData, fetchPriceData, reordering, addToast]);

  // Move item down in the list - ENHANCED VERSION
  const handleMoveItemDown = useCallback(async (itemName) => {
    if (reordering) {
      console.log("Already reordering, skipping");
      return;
    }
    
    try {
      setReordering(true);
      console.log("=== MOVE DOWN DEBUG ===");
      console.log("Selected shop:", selectedShop);
      console.log("Item to move:", itemName);
      
      // Get all items for the current shop (not filtered)
      const allShopItems = getBakeryItemsForShop(selectedShop);
      console.log("All shop items:", allShopItems.map(item => `${item.name} (order: ${item.order})`));
      
      // Find the current item index in the complete list
      const currentIndex = allShopItems.findIndex(item => item.name === itemName);
      console.log("Current index:", currentIndex);
      
      if (currentIndex >= allShopItems.length - 1 || currentIndex === -1) {
        console.log("Item is already at the bottom or not found");
        return;
      }

      // Get the items to swap
      const currentItem = allShopItems[currentIndex];
      const nextItem = allShopItems[currentIndex + 1];

      console.log("Current item:", currentItem);
      console.log("Next item:", nextItem);

      // Find the full item data from shopItemsData
      const currentItemData = shopItemsData.find(item => 
        item.itemName === currentItem.name && item.shop === selectedShop
      );
      const nextItemData = shopItemsData.find(item => 
        item.itemName === nextItem.name && item.shop === selectedShop
      );

      console.log("Current item DB data:", currentItemData);
      console.log("Next item DB data:", nextItemData);

      if (!currentItemData || !nextItemData) {
        console.error("Item data not found in database");
        throw new Error("Item data not found in database");
      }

      // Create new order values to ensure they're different
      const tempOrder = Math.max(currentItem.order, nextItem.order) + 1000;
      
      console.log("=== UPDATING DATABASE ===");
      console.log(`Step 1: Setting ${currentItem.name} to temp order ${tempOrder}`);
      
      // Step 1: Set current item to temporary order to avoid conflicts
      const currentItemRef = doc(firestore, "shopItems", currentItemData.id);
      await updateDoc(currentItemRef, {
        order: tempOrder,
        updatedAt: new Date().toISOString()
      });

      console.log(`Step 2: Setting ${nextItem.name} to order ${currentItem.order}`);
      
      // Step 2: Set next item to current item's original order
      const nextItemRef = doc(firestore, "shopItems", nextItemData.id);
      await updateDoc(nextItemRef, {
        order: currentItem.order,
        updatedAt: new Date().toISOString()
      });

      console.log(`Step 3: Setting ${currentItem.name} to order ${nextItem.order}`);
      
      // Step 3: Set current item to next item's original order
      await updateDoc(currentItemRef, {
        order: nextItem.order,
        updatedAt: new Date().toISOString()
      });

      console.log("Database updates completed, refreshing data...");
      
      // Wait a bit before refreshing to ensure Firebase has processed
      setTimeout(async () => {
        await fetchPriceData();
        console.log("Data refreshed successfully");
      }, 500);
      
    } catch (error) {
      console.error("Error moving item down:", error);
      addToast(`Failed to move item down: ${error.message}`, 'error');
    } finally {
      setTimeout(() => {
        setReordering(false);
        console.log("Reordering state reset");
      }, 1000);
    }
  }, [selectedShop, getBakeryItemsForShop, shopItemsData, fetchPriceData, reordering, addToast]);

  // Filter items based on search query
  const filteredItems = BAKERY_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalItemsWithPrices = BAKERY_ITEMS.filter(
    (item) => getItemPrice(item.name).price !== null
  ).length;
  const totalEditingPrices = Object.keys(editingPrices).length;

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Gradient overlay for better content visibility */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          isDarkMode
            ? "bg-gradient-to-br from-gray-900/80 via-slate-900/85 to-gray-800/80"
            : "bg-gradient-to-br from-slate-50/85 via-purple-50/90 to-indigo-100/85"
        }`}
      ></div>
      <div className={`relative z-10 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
      {/* Toast Notifications Container */}
      <div className="toast-container">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            toast={{ ...toast, index }}
            onRemove={removeToast}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>

      <div className="container mx-auto px-3 py-4 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigateToPage("/selection")}
              className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 text-sm ${
                isDarkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-slate-300"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              ← Back to Selection
            </button>
            <h1
              className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${
                isDarkMode
                  ? "from-purple-400 to-pink-400"
                  : "from-purple-600 to-pink-600"
              } bg-clip-text text-transparent`}
            >
              💰 Price Management
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-all duration-300 text-sm ${
                isDarkMode
                  ? "bg-yellow-500 hover:bg-yellow-400 text-gray-900"
                  : "bg-gray-800 hover:bg-gray-700 text-yellow-400"
              } shadow-md hover:shadow-lg transform hover:scale-105`}
              title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
          <p
            className={`text-sm ${
              isDarkMode ? "text-slate-300" : "text-gray-600"
            }`}
          >
            Set and manage prices for all bakery items across different shops
          </p>
        </header>

        {/* Navigation Buttons */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/60 border-gray-700/30"
              : "bg-white/60 border-white/30"
          }`}
        >
          <h2
            className={`text-base font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-gray-800"
            }`}
          >
            🔗 Quick Navigation
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigateToPage("/selection")}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
            >
              📋 Selection Page
            </button>
            <button
              onClick={() => navigateToPage("/summary")}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
            >
              📊 Summary Page
            </button>
          </div>
        </section>

        {/* Shop Selection and Controls */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/60 border-gray-700/30"
              : "bg-white/60 border-white/30"
          }`}
        >
          <h2
            className={`text-base font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-gray-800"
            }`}
          >
            🏪 Shop Selection & Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label
                htmlFor="shop-select"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Shop:
              </label>
              <select
                id="shop-select"
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700/70 border-gray-600 text-slate-200"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
              >
                {SHOPS.map((shop) => (
                  <option key={shop} value={shop}>
                    {shop}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="search-items"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Search Items:
              </label>
              <input
                id="search-items"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bakery items..."
                className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700/70 border-gray-600 text-slate-200 placeholder-slate-400"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
              />
            </div>

            <div className="flex gap-2">
              {totalEditingPrices > 0 && (
                <button
                  onClick={handleSavePrices}
                  disabled={submitting || reordering}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-md hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>💾 Save {totalEditingPrices} Price(s)</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Add New Item Section */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
              ➕ Add New Item to {selectedShop}
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter new item name"
                className={`flex-1 border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  isDarkMode
                    ? "bg-gray-700/70 border-gray-600 text-slate-200"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem();
                  }
                }}
              />
              <button
                onClick={handleAddItem}
                className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors text-sm"
              >
                ➕ Add Item
              </button>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-purple-700/30"
              : "bg-gradient-to-r from-purple-50/60 to-pink-50/60 border-purple-200/30"
          }`}
        >
          <h2
            className={`text-base font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-purple-300" : "text-purple-800"
            }`}
          >
            📊 Price Coverage Statistics - {selectedShop}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div
              className={`text-center p-3 rounded-md transition-colors duration-300 ${
                isDarkMode ? "bg-blue-900/30" : "bg-blue-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {BAKERY_ITEMS.length}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                Total Items
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-md transition-colors duration-300 ${
                isDarkMode ? "bg-green-900/30" : "bg-green-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                {totalItemsWithPrices}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Items with Prices
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-md transition-colors duration-300 ${
                isDarkMode ? "bg-red-900/30" : "bg-red-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                {BAKERY_ITEMS.length - totalItemsWithPrices}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-red-300" : "text-red-700"
                }`}
              >
                Missing Prices
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-md transition-colors duration-300 ${
                isDarkMode ? "bg-yellow-900/30" : "bg-yellow-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-yellow-400" : "text-yellow-600"
                }`}
              >
                {totalEditingPrices}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-yellow-300" : "text-yellow-700"
                }`}
              >
                Unsaved Changes
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div
              className={`w-full bg-gray-200 rounded-full h-2 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    BAKERY_ITEMS.length > 0 
                      ? (totalItemsWithPrices / BAKERY_ITEMS.length) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
            <p
              className={`text-sm mt-2 text-center ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Price Coverage:{" "}
              {BAKERY_ITEMS.length > 0 
                ? Math.round((totalItemsWithPrices / BAKERY_ITEMS.length) * 100)
                : 0}%
            </p>
          </div>
        </section>

        {/* Price Table */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border overflow-hidden transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/70 border-gray-700/30"
              : "bg-white/70 border-white/30"
          }`}
        >
          <div
            className={`p-4 border-b ${
              isDarkMode ? "border-slate-700" : "border-slate-200"
            }`}
          >
            <h2
              className={`text-base font-semibold flex items-center gap-2 ${
                isDarkMode ? "text-slate-200" : "text-gray-800"
              }`}
            >
              💰 Price Table - {selectedShop}
            </h2>
            <p
              className={`text-xs mt-1 ${
                isDarkMode ? "text-slate-400" : "text-gray-600"
              }`}
            >
              {searchQuery
                ? `Showing ${filteredItems.length} items matching "${searchQuery}"`
                : `All ${BAKERY_ITEMS.length} bakery items`}
              {totalEditingPrices > 0 && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode
                      ? "bg-yellow-900/50 text-yellow-300"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  ⏳ {totalEditingPrices} unsaved changes
                </span>
              )}
              {reordering && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode
                      ? "bg-blue-900/50 text-blue-300"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  🔄 Reordering...
                </span>
              )}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`sticky top-0 transition-colors duration-300 ${
                  isDarkMode ? "bg-slate-800" : "bg-slate-50"
                }`}
              >
                <tr>
                  <th
                    className={`px-3 py-2 text-left text-xs font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Item Name
                  </th>
                  <th
                    className={`px-3 py-2 text-center text-xs font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Current Price (Rs.)
                  </th>
                  <th
                    className={`px-3 py-2 text-center text-xs font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    New Price (Rs.)
                  </th>
                  <th
                    className={`px-3 py-2 text-center text-xs font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y transition-colors duration-300 ${
                  isDarkMode ? "divide-slate-700" : "divide-slate-200"
                }`}
              >
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-3 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mb-3"></div>
                        <p
                          className={`text-sm font-medium ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Loading price data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-3 py-8 text-center">
                      <div
                        className={`text-sm font-medium ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {searchQuery ? `No items found matching "${searchQuery}"` : `No items found for ${selectedShop}`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, filteredIndex) => {
                    const itemName = item.name;
                    const itemId = item.id;
                    const { price: currentPrice, id: priceId } =
                      getItemPrice(itemName);
                    const priceKey = `${selectedShop}_${itemName}`;
                    const editingPrice = editingPrices[priceKey];
                    const hasUnsavedChanges = !!editingPrice;

                    // Find the actual index in the complete BAKERY_ITEMS array
                    const actualIndex = BAKERY_ITEMS.findIndex(bakeryItem => bakeryItem.name === itemName);
                    const isFirst = actualIndex === 0;
                    const isLast = actualIndex === BAKERY_ITEMS.length - 1;

                    return (
                      <tr
                        key={itemName}
                        className={`transition-colors duration-150 ${
                          hasUnsavedChanges
                            ? isDarkMode
                              ? "bg-yellow-900/20 hover:bg-yellow-800/30"
                              : "bg-yellow-50/50 hover:bg-yellow-100/50"
                            : currentPrice !== null
                            ? isDarkMode
                              ? "bg-green-900/20 hover:bg-green-800/30"
                              : "bg-green-50/50 hover:bg-green-100/50"
                            : isDarkMode
                            ? "hover:bg-slate-800/50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td
                          className={`px-3 py-3 text-xs font-medium ${
                            isDarkMode ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                hasUnsavedChanges
                                  ? "bg-yellow-500"
                                  : currentPrice !== null
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            ></span>
                            
                            {/* Item Name - Editable or Display */}
                            {editingItemId === itemId ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingItemName}
                                  onChange={(e) => setEditingItemName(e.target.value)}
                                  className={`text-xs px-2 py-1 border rounded focus:ring-1 focus:ring-purple-500 ${
                                    isDarkMode
                                      ? "bg-gray-700 border-gray-600 text-slate-200"
                                      : "bg-white border-slate-300 text-slate-700"
                                  }`}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEditItem();
                                    } else if (e.key === 'Escape') {
                                      handleCancelEditItem();
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveEditItem}
                                  className="text-xs px-1 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEditItem}
                                  className="text-xs px-1 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <span>{itemName}</span>
                            )}
                            
                            {/* Move Up/Down Controls */}
                            <div className="flex ml-1 gap-1">
                              <button
                                onClick={() => handleMoveItemUp(itemName)}
                                disabled={isFirst || reordering || editingItemId === itemId}
                                className={`text-xs p-1 rounded transition-colors ${
                                  isFirst || reordering || editingItemId === itemId
                                    ? "opacity-30 cursor-not-allowed"
                                    : isDarkMode
                                    ? "hover:bg-gray-600 text-slate-300"
                                    : "hover:bg-gray-200 text-slate-600"
                                }`}
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveItemDown(itemName)}
                                disabled={isLast || reordering || editingItemId === itemId}
                                className={`text-xs p-1 rounded transition-colors ${
                                  isLast || reordering || editingItemId === itemId
                                    ? "opacity-30 cursor-not-allowed"
                                    : isDarkMode
                                    ? "hover:bg-gray-600 text-slate-300"
                                    : "hover:bg-gray-200 text-slate-600"
                                }`}
                                title="Move down"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-xs text-center">
                          {currentPrice !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-green-900/50 text-green-300"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              Rs. {currentPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-red-900/50 text-red-300"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              Not Set
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-xs text-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              editingPrice
                                ? editingPrice.price
                                : currentPrice || ""
                            }
                            onChange={(e) =>
                              handlePriceEdit(itemName, e.target.value)
                            }
                            disabled={reordering || editingItemId === itemId}
                            className={`w-20 text-center border rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-colors duration-300 disabled:opacity-50 ${
                              hasUnsavedChanges
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-900/20 text-slate-200"
                                  : "border-yellow-400 bg-yellow-50"
                                : currentPrice === null
                                ? isDarkMode
                                  ? "border-red-500 bg-red-900/20 text-slate-200"
                                  : "border-red-300 bg-red-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-800 text-slate-200"
                                : "border-slate-300"
                            }`}
                            placeholder="0.00"
                          />
                        </td>

                        <td className="px-3 py-3 text-xs text-center">
                          <div className="flex justify-center gap-1 flex-wrap">
                            {/* Edit Item Button - Always visible unless currently editing this item */}
                            {editingItemId !== itemId && (
                              <button
                                onClick={() => handleStartEditItem(itemId, itemName)}
                                disabled={reordering || editingItemId !== null}
                                className={`px-2 py-1 rounded transition-colors text-xs font-medium min-w-[50px] disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isDarkMode
                                    ? "bg-blue-700 hover:bg-blue-600 text-white border border-blue-600"
                                    : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500"
                                }`}
                                title="Edit item name"
                              >
                                ✏️ Edit
                              </button>
                            )}

                            {/* Delete Item Button - Always visible unless currently editing this item */}
                            {editingItemId !== itemId && (
                              <button
                                onClick={() => handleDeleteItem(itemId, itemName)}
                                disabled={reordering || editingItemId !== null}
                                className={`px-2 py-1 rounded transition-colors text-xs font-medium min-w-[60px] disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isDarkMode
                                    ? "bg-red-700 hover:bg-red-600 text-white border border-red-600"
                                    : "bg-red-600 hover:bg-red-700 text-white border border-red-500"
                                }`}
                                title="Delete entire item"
                              >
                                🗑️ Delete
                              </button>
                            )}

                            {/* Delete Price Button - Only show if item has a price */}
                            {currentPrice !== null && editingItemId !== itemId && (
                              <button
                                onClick={() => handleDeletePrice(itemName)}
                                disabled={reordering || editingItemId !== null}
                                className={`px-2 py-1 rounded transition-colors text-xs font-medium min-w-[70px] disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isDarkMode
                                    ? "bg-orange-700 hover:bg-orange-600 text-white border border-orange-600"
                                    : "bg-orange-600 hover:bg-orange-700 text-white border border-orange-500"
                                }`}
                                title="Delete price only"
                              >
                                🚫 Clear Price
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer
          className={`text-center mt-6 py-4 text-xs ${
            isDarkMode ? "text-slate-400" : "text-slate-600"
          }`}
        >
          <p>T & S Bakery - Price Management System</p>
          <p className="mt-1">
            Shop: {selectedShop} | Total Items: {BAKERY_ITEMS.length} | Priced
            Items: {totalItemsWithPrices} | Unsaved Changes:{" "}
            {totalEditingPrices}
          </p>
        </footer>
      </div>
      </div>
    </div>
  );
}