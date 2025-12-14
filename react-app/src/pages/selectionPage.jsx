import React, { useState, useEffect, useCallback, useMemo } from "react";
import { firestore } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { getDoc } from "firebase/firestore";
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

const BEVERAGES = [
  "Nescafe",
  "Nestea"
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
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
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

export default function SelectionPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [inventoryData, setInventoryData] = useState([]);
  const [beverageData, setBeverageData] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [shopItemsData, setShopItemsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editedItems, setEditedItems] = useState(new Set());
  const [editedBeverages, setEditedBeverages] = useState(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);
  const [sessionChanges, setSessionChanges] = useState({});
  const [beverageChanges, setBeverageChanges] = useState({});
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Add toast function
  const addToast = useCallback((message, type = 'info', title = null, duration = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, title, duration };
    setToasts(prev => [...prev, newToast]);
  }, []);

  // Remove toast function
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const [filters, setFilters] = useState({
    shop: SHOPS[0],
    date: new Date().toISOString().split("T")[0],
  });

  const navigate = useNavigate();

  const showToast = useCallback((message, type = 'info') => {
    addToast(message, type);
  }, [addToast]);

  const hideToast = useCallback(() => {
    // This function is kept for backward compatibility but toast auto-hide is handled by the Toast component
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const getBakeryItemsForShop = useCallback((shop) => {
    try {
      // Get all items for the shop and sort them by order field
      const shopSpecificItems = shopItemsData
        .filter(item => item.shop === shop)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(item => item.itemName)
        // Exclude beverages from bakery items
        .filter(itemName => !BEVERAGES.includes(itemName));
      return [...new Set(shopSpecificItems)];
    } catch (error) {
      console.error("Error getting bakery items for shop:", error);
      showToast("Error loading items for shop", "error");
      return [];
    }
  }, [shopItemsData, showToast]);

  const BAKERY_ITEMS = useMemo(() => {
    return getBakeryItemsForShop(filters.shop);
  }, [getBakeryItemsForShop, filters.shop]);

  const navigateDate = useCallback((days) => {
    try {
      const currentDate = new Date(filters.date);
      if (isNaN(currentDate.getTime())) {
        showToast("Invalid date format", "error");
        return;
      }
      currentDate.setDate(currentDate.getDate() + days);
      const newDate = currentDate.toISOString().split("T")[0];
      handleFilterChange("date", newDate);
    } catch (error) {
      console.error("Error navigating date:", error);
      showToast("Error changing date", "error");
    }
  }, [filters.date]);

  const getItemPrice = useCallback((itemName, shop) => {
    try {
      if (!itemName || !shop) return null;
      const priceRecord = priceData.find(
        (price) => price.itemName === itemName && price.shop === shop
      );
      return priceRecord ? parseFloat(priceRecord.price) || 0 : null;
    } catch (error) {
      console.error("Error getting item price:", error);
      return null;
    }
  }, [priceData]);

  const getPreviousDayRemaining = useCallback((itemName, shop, currentDate) => {
    try {
      if (!itemName || !shop || !currentDate) return 0;

      const currentDateObj = new Date(currentDate);
      if (isNaN(currentDateObj.getTime())) return 0;
      
      const previousDate = new Date(currentDateObj);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split("T")[0];

      const previousDayData = inventoryData.find(
        (item) =>
          item.itemName === itemName &&
          item.shop === shop &&
          item.date === previousDateStr
      );

      return previousDayData ? parseInt(previousDayData.remainingInventory) || 0 : 0;
    } catch (error) {
      console.error("Error getting previous day remaining:", error);
      return 0;
    }
  }, [inventoryData]);

  const getPreviousDayBeverageCount = useCallback((itemName, shop, currentDate) => {
    try {
      if (!itemName || !shop || !currentDate) return 0;

      const currentDateObj = new Date(currentDate);
      if (isNaN(currentDateObj.getTime())) return 0;
      
      const previousDate = new Date(currentDateObj);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split("T")[0];

      const previousDayData = beverageData.find(
        (item) =>
          item.itemName === itemName &&
          item.shop === shop &&
          item.date === previousDateStr
      );

      return previousDayData ? parseInt(previousDayData.todayCount) || 0 : 0;
    } catch (error) {
      console.error("Error getting previous day beverage count:", error);
      return 0;
    }
  }, [beverageData]);

  const completeTableData = useMemo(() => {
    try {
      const { shop, date } = filters;
      if (!shop || !date) return [];

      return BAKERY_ITEMS.map((itemName) => {
        const existingData = inventoryData.find(
          (item) =>
            item.itemName === itemName && item.shop === shop && item.date === date
        );

        const itemKey = `${shop}_${date}_${itemName}`;
        const sessionChange = sessionChanges[itemKey];
        const previousDayRemaining = getPreviousDayRemaining(itemName, shop, date);
        const itemPrice = getItemPrice(itemName, shop);

        const morningTime = sessionChange && sessionChange.morningTime !== undefined
          ? parseInt(sessionChange.morningTime)
          : parseInt(existingData?.morningTime) || 0;

        const eveningTime = sessionChange && sessionChange.eveningTime !== undefined
          ? parseInt(sessionChange.eveningTime)
          : parseInt(existingData?.eveningTime) || 0;

        const extraIn = sessionChange && sessionChange.extraIn !== undefined
          ? parseInt(sessionChange.extraIn)
          : parseInt(existingData?.extraIn) || 0;

        const transferOut = sessionChange && sessionChange.transferOut !== undefined
          ? parseInt(sessionChange.transferOut)
          : parseInt(existingData?.transferOut) || 0;

        const discard = sessionChange && sessionChange.discard !== undefined
          ? parseInt(sessionChange.discard)
          : parseInt(existingData?.discard) || 0;

        const remainingInventory = sessionChange && sessionChange.remainingInventory !== undefined
          ? parseInt(sessionChange.remainingInventory)
          : parseInt(existingData?.remainingInventory) || 0;

        const startingInventory = previousDayRemaining + morningTime + eveningTime + extraIn;
        const selling = Math.max(0, startingInventory - remainingInventory - transferOut - discard);
        const totalValue = itemPrice !== null ? selling * itemPrice : null;

        return {
          id: itemKey,
          itemName,
          shop,
          date,
          previousDayRemaining,
          morningTime,
          eveningTime,
          extraIn,
          startingInventory,
          selling,
          transferOut,
          discard,
          remainingInventory,
          price: itemPrice,
          totalValue,
          isExisting: !!existingData,
          firestoreId: existingData?.id,
          hasChanges: !!sessionChange,
          hasPriceMissing: itemPrice === null,
        };
      });
    } catch (error) {
      console.error("Error computing table data:", error);
      showToast("Error processing inventory data", "error");
      return [];
    }
  }, [BAKERY_ITEMS, inventoryData, filters, getPreviousDayRemaining, sessionChanges, getItemPrice, showToast]);

  const completeBeverageData = useMemo(() => {
    try {
      const { shop, date } = filters;
      if (!shop || !date) return [];

      return BEVERAGES.map((itemName) => {
        const existingData = beverageData.find(
          (item) =>
            item.itemName === itemName && item.shop === shop && item.date === date
        );

        const itemKey = `${shop}_${date}_${itemName}`;
        const sessionChange = beverageChanges[itemKey];
        const previousDayCount = getPreviousDayBeverageCount(itemName, shop, date);

        const todayCount = sessionChange
          ? parseInt(sessionChange.todayCount) || 0
          : parseInt(existingData?.todayCount) || 0;

        // Selling calculation: Today Count - Previous Day Count
        const selling = Math.max(0, todayCount - previousDayCount);

        // Get price for this beverage item
        const itemPrice = getItemPrice(itemName, shop);
        const totalValue = itemPrice !== null ? selling * itemPrice : null;


        return {
          id: itemKey,
          itemName,
          shop,
          date,
          previousDayCount,
          todayCount,
          selling,
          price: itemPrice,
          totalValue,
          isExisting: !!existingData,
          firestoreId: existingData?.id,
          hasChanges: !!sessionChange,
        };
      });
    } catch (error) {
      console.error("Error computing beverage data:", error);
      showToast("Error processing beverage data", "error");
      return [];
    }
  }, [BEVERAGES, beverageData, filters, getPreviousDayBeverageCount, beverageChanges, showToast]);

  const itemsWithMissingPrices = useMemo(() => {
    try {
      // Find bakery items with missing prices
      const bakeryItemsWithMissingPrices = completeTableData.filter((item) => {
        const hasInventoryData =
          item.eveningTime > 0 ||
          item.extraIn > 0 ||
          item.morningTime > 0 ||
          item.remainingInventory > 0 ||
          item.transferOut > 0 ||
          item.discard > 0;
        return hasInventoryData && item.hasPriceMissing;
      });

      // Find beverages with missing prices
      const beveragesWithMissingPrices = completeBeverageData.filter((item) => {
        const hasInventoryData = item.todayCount > 0;
        return hasInventoryData && item.price === null;
      });

      return [...bakeryItemsWithMissingPrices, ...beveragesWithMissingPrices];
    } catch (error) {
      console.error("Error finding items with missing prices:", error);
      return [];
    }
  }, [completeTableData, completeBeverageData]);

  const totalSalesValue = useMemo(() => {
    try {
      // Calculate total from bakery items
      const bakeryTotal = completeTableData.reduce((sum, item) => {
        return sum + (item.totalValue || 0);
      }, 0);
      
      // Calculate total from beverages
      const beverageTotal = completeBeverageData.reduce((sum, item) => {
        return sum + (item.totalValue || 0);
      }, 0);

      // Debug logging to track calculation
      console.log("Selection Page - Bakery Items:", completeTableData.length, "Total:", bakeryTotal);
      console.log("Selection Page - Beverages:", completeBeverageData.length, "Total:", beverageTotal);
      console.log("Selection Page - Final Total:", bakeryTotal + beverageTotal);
      
      return bakeryTotal + beverageTotal;
    } catch (error) {
      console.error("Error calculating total sales value:", error);
      return 0;
    }
  }, [completeTableData, completeBeverageData]);

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const inventoryRef = collection(firestore, "inventory");
      const beverageRef = collection(firestore, "beverages");
      const pricesRef = collection(firestore, "prices");
      const shopItemsRef = collection(firestore, "shopItems");

      let inventoryItems = [];
      try {
        const inventoryQuery = query(inventoryRef, orderBy("createdAt", "desc"));
        const inventorySnapshot = await getDocs(inventoryQuery);
        inventoryItems = inventorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (inventoryError) {
        console.warn("Failed to fetch inventory with ordering, trying without:", inventoryError);
        const inventorySnapshot = await getDocs(inventoryRef);
        inventoryItems = inventorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        inventoryItems.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
      }

      let beverageItems = [];
      try {
        const beverageQuery = query(beverageRef, orderBy("createdAt", "desc"));
        const beverageSnapshot = await getDocs(beverageQuery);
        beverageItems = beverageSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (beverageError) {
        console.warn("Failed to fetch beverages with ordering, trying without:", beverageError);
        const beverageSnapshot = await getDocs(beverageRef);
        beverageItems = beverageSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        beverageItems.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
      }

      let priceItems = [];
      try {
        const priceSnapshot = await getDocs(pricesRef);
        priceItems = priceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (pricesError) {
        console.warn("Failed to fetch prices:", pricesError);
        showToast("Warning: Could not load price data", "warning");
      }

      let shopItems = [];
      try {
        const shopItemsSnapshot = await getDocs(shopItemsRef);
        shopItems = shopItemsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (shopItemsError) {
        console.warn("Failed to fetch shop items:", shopItemsError);
        showToast("Warning: Could not load shop items data", "warning");
      }

      setInventoryData(inventoryItems);
      setBeverageData(beverageItems);
      setPriceData(priceItems);
      setShopItemsData(shopItems);
      showToast("Data loaded successfully", "success");

    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMessage = error.code === "permission-denied" 
        ? "Permission denied. Please check your access rights."
        : error.code === "unavailable"
        ? "Database temporarily unavailable. Please try again."
        : `Failed to fetch data: ${error.message}`;
      
      setError(errorMessage);
      setInventoryData([]);
      setBeverageData([]);
      setPriceData([]);
      setShopItemsData([]);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const handleFilterChange = useCallback((field, value) => {
    try {
      setFilters((prev) => ({
        ...prev,
        [field]: value,
      }));
      setEditedItems(new Set());
      setEditedBeverages(new Set());
      setSessionChanges({});
      setBeverageChanges({});
      setHasUnsavedChanges(false);
      showToast(`${field === 'shop' ? 'Shop' : 'Date'} changed successfully`, "info");
    } catch (error) {
      console.error("Error handling filter change:", error);
      showToast("Error updating filters", "error");
    }
  }, [showToast]);

  const handleCellEdit = useCallback((itemKey, field, value) => {
    try {
      const numValue = parseInt(value) || 0;
      if (numValue < 0) {
        showToast("Values cannot be negative", "warning");
        return;
      }

      const currentItem = completeTableData.find((item) => item.id === itemKey);
      if (!currentItem) {
        showToast("Item not found", "error");
        return;
      }

      setSessionChanges((prev) => {
        const existing = prev[itemKey] || {};
        const updated = { ...existing };
        updated[field] = numValue;

        const morningTime = parseInt(updated.morningTime) || parseInt(currentItem.morningTime) || 0;
        const eveningTime = parseInt(updated.eveningTime) || parseInt(currentItem.eveningTime) || 0;
        const extraIn = parseInt(updated.extraIn) || parseInt(currentItem.extraIn) || 0;
        const transferOut = parseInt(updated.transferOut) || parseInt(currentItem.transferOut) || 0;
        const discard = parseInt(updated.discard) || parseInt(currentItem.discard) || 0;
        const remainingInventory = parseInt(updated.remainingInventory) || parseInt(currentItem.remainingInventory) || 0;

        const startingInventory = currentItem.previousDayRemaining + morningTime + eveningTime + extraIn;
        const selling = Math.max(0, startingInventory - remainingInventory - transferOut - discard);

        updated.startingInventory = startingInventory;
        updated.selling = selling;
        updated.itemName = currentItem.itemName;
        updated.shop = currentItem.shop;
        updated.date = currentItem.date;
        updated.previousDayRemaining = currentItem.previousDayRemaining;
        updated.firestoreId = currentItem.firestoreId;

        return {
          ...prev,
          [itemKey]: updated,
        };
      });

      setEditedItems((prev) => new Set([...prev, itemKey]));
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error handling cell edit:", error);
      showToast("Error updating cell value", "error");
    }
  }, [completeTableData, showToast]);

  const handleBeverageCellEdit = useCallback((itemKey, field, value) => {
    try {
      const numValue = parseInt(value) || 0;
      if (numValue < 0) {
        showToast("Values cannot be negative", "warning");
        return;
      }

      const currentItem = completeBeverageData.find((item) => item.id === itemKey);
      if (!currentItem) {
        showToast("Beverage item not found", "error");
        return;
      }

      setBeverageChanges((prev) => {
        const existing = prev[itemKey] || {};
        const updated = { ...existing };
        updated[field] = numValue;

        const todayCount = parseInt(updated.todayCount) || parseInt(currentItem.todayCount) || 0;

        const selling = Math.max(0, todayCount - currentItem.previousDayCount);

        // Calculate price and total value
        const itemPrice = getItemPrice(currentItem.itemName, currentItem.shop);
        const totalValue = itemPrice !== null ? selling * itemPrice : null;

        updated.selling = selling;
        updated.price = itemPrice;
        updated.totalValue = totalValue;
        updated.itemName = currentItem.itemName;
        updated.shop = currentItem.shop;
        updated.date = currentItem.date;
        updated.previousDayCount = currentItem.previousDayCount;
        updated.firestoreId = currentItem.firestoreId;

        return {
          ...prev,
          [itemKey]: updated,
        };
      });

      setEditedBeverages((prev) => new Set([...prev, itemKey]));
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error handling beverage cell edit:", error);
      showToast("Error updating beverage value", "error");
    }
  }, [completeBeverageData, showToast]);

  const handleAddItem = useCallback(async () => {
    try {
      if (!newItemName.trim()) {
        showToast("Please enter an item name", "warning");
        return;
      }

      const currentShopItems = getBakeryItemsForShop(filters.shop);
      if (currentShopItems.includes(newItemName.trim())) {
        showToast("This item already exists for this shop", "warning");
        return;
      }

      setSubmitting(true);
      
      // Get the highest order number for the current shop
      const shopSpecificItems = shopItemsData
        .filter(item => item.shop === filters.shop);
      const maxOrder = shopSpecificItems.length > 0 
        ? Math.max(...shopSpecificItems.map(item => item.order || 0)) 
        : 0;

      const shopItemsRef = collection(firestore, "shopItems");
      await addDoc(shopItemsRef, {
        shop: filters.shop,
        itemName: newItemName.trim(),
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
      });

      setShopItemsData(prev => [...prev, {
        shop: filters.shop,
        itemName: newItemName.trim(),
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
      }]);

      setNewItemName("");
      setShowAddItemModal(false);
      
      showToast(`Item "${newItemName.trim()}" added to ${filters.shop}`, "success");
    } catch (error) {
      console.error("Error adding item:", error);
      const errorMessage = error.code === "permission-denied"
        ? "Permission denied. Cannot add items."
        : `Failed to add item: ${error.message}`;
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  }, [newItemName, filters.shop, getBakeryItemsForShop, shopItemsData, showToast]);

  const handleSaveChanges = useCallback(async () => {
    try {
      setSubmitting(true);

      const itemsToSave = Object.entries(sessionChanges).filter(
        ([itemKey, changes]) => {
          const hasAnyData = Object.keys(changes).some(
            (key) =>
              [
                "morningTime",
                "eveningTime",
                "extraIn",
                "remainingInventory",
                "transferOut",
                "discard",
              ].includes(key) && (parseInt(changes[key]) || 0) > 0
          );
          const isEdited = editedItems.has(itemKey);
          return isEdited && hasAnyData;
        }
      );

      const beveragesToSave = Object.entries(beverageChanges).filter(
        ([itemKey, changes]) => {
          const hasAnyData = Object.keys(changes).some(
            (key) =>
              [
                // "morningTime",
                // "eveningTime", 
                // "extraIn",
                "todayCount",
              ].includes(key) && (parseInt(changes[key]) || 0) > 0
          );
          const isEdited = editedBeverages.has(itemKey);
          return isEdited && hasAnyData;
        }
      );

      if (itemsToSave.length === 0 && beveragesToSave.length === 0) {
        showToast("No changes detected to save", "warning");
        setHasUnsavedChanges(false);
        return;
      }

      const inventoryRef = collection(firestore, "inventory");
      const beverageRef = collection(firestore, "beverages");

      const savePromises = [];

      // Save bakery items
      itemsToSave.forEach(([itemKey, changes]) => {
        savePromises.push(
          (async () => {
            try {
              // Merge with existing Firestore data to preserve other session values
              let mergedData = {};
              if (changes.firestoreId) {
                const docRef = doc(firestore, "inventory", changes.firestoreId);
                const existingDoc = await getDoc(docRef);
                if (existingDoc.exists()) {
                  mergedData = existingDoc.data();
                }
              }
              // Only update fields present in changes, preserve others
              const dataToSave = {
                date: changes.date ?? mergedData.date,
                shop: changes.shop ?? mergedData.shop,
                itemName: changes.itemName ?? mergedData.itemName,
                previousDayRemaining: changes.previousDayRemaining !== undefined ? parseInt(changes.previousDayRemaining) : mergedData.previousDayRemaining ?? 0,
                morningTime: changes.morningTime !== undefined ? parseInt(changes.morningTime) : mergedData.morningTime ?? 0,
                eveningTime: changes.eveningTime !== undefined ? parseInt(changes.eveningTime) : mergedData.eveningTime ?? 0,
                extraIn: changes.extraIn !== undefined ? parseInt(changes.extraIn) : mergedData.extraIn ?? 0,
                startingInventory: changes.startingInventory !== undefined ? parseInt(changes.startingInventory) : mergedData.startingInventory ?? 0,
                selling: changes.selling !== undefined ? parseInt(changes.selling) : mergedData.selling ?? 0,
                transferOut: changes.transferOut !== undefined ? parseInt(changes.transferOut) : mergedData.transferOut ?? 0,
                discard: changes.discard !== undefined ? parseInt(changes.discard) : mergedData.discard ?? 0,
                remainingInventory: changes.remainingInventory !== undefined ? parseInt(changes.remainingInventory) : mergedData.remainingInventory ?? 0,
                updatedAt: new Date().toISOString(),
              };

              if (changes.firestoreId) {
                const docRef = doc(firestore, "inventory", changes.firestoreId);
                await updateDoc(docRef, dataToSave);
              } else {
                await addDoc(inventoryRef, {
                  ...dataToSave,
                  createdAt: new Date().toISOString(),
                });
              }
            } catch (itemError) {
              console.error(`Error saving beverage ${itemKey}:`, itemError);
              throw new Error(`Failed to save ${changes.itemName}: ${itemError.message}`);
            }
          })()
        );
      });

      // Save beverage items
      beveragesToSave.forEach(([itemKey, changes]) => {
        savePromises.push(
          (async () => {
            try {
              const dataToSave = {
                date: changes.date,
                shop: changes.shop,
                itemName: changes.itemName,
                previousDayCount: parseInt(changes.previousDayCount) || 0,
                todayCount: parseInt(changes.todayCount) || 0,
                selling: parseInt(changes.selling) || 0,
                price: parseFloat(changes.price) || null,
                totalValue: parseFloat(changes.totalValue) || null,
                updatedAt: new Date().toISOString(),
              };

              if (changes.firestoreId) {
                const docRef = doc(firestore, "beverages", changes.firestoreId);
                await updateDoc(docRef, dataToSave);
              } else {
                await addDoc(beverageRef, {
                  ...dataToSave,
                  createdAt: new Date().toISOString(),
                });
              }
            } catch (beverageError) {
              console.error(`Error saving beverage ${itemKey}:`, beverageError);
              throw new Error(`Failed to save ${changes.itemName}: ${beverageError.message}`);
            }
          })()
        );
      });

      await Promise.all(savePromises);

      setEditedItems(new Set());
      setEditedBeverages(new Set());
      setSessionChanges({});
      setBeverageChanges({});
      setHasUnsavedChanges(false);
      await fetchInventoryData();

      showToast(`Successfully saved ${itemsToSave.length + beveragesToSave.length} items!`, "success");

    } catch (error) {
      console.error("Error saving changes:", error);
      const errorMessage =
        error.code === "permission-denied"
          ? "Permission denied. Please check your Firebase permissions."
          : error.code === "unavailable"
          ? "Firebase service temporarily unavailable. Please try again."
          : `Failed to save changes: ${error.message}`;
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  }, [sessionChanges, beverageChanges, editedItems, editedBeverages, fetchInventoryData, showToast]);

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
            ? "bg-gradient-to-br from-slate-900/80 via-gray-900/85 to-slate-800/80"
            : "bg-gradient-to-br from-gray-50/85 via-slate-50/90 to-blue-50/85"
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
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => navigate("/")}
              className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm ${
                isDarkMode
                  ? "bg-slate-700/70 hover:bg-slate-600 text-slate-200 border border-slate-600"
                  : "bg-white/70 hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm"
              }`}
            >
              ← Back
            </button>
            <h1
              className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${
                isDarkMode
                  ? "from-blue-400 to-cyan-400"
                  : "from-blue-600 to-indigo-600"
              } bg-clip-text text-transparent`}
            >
              T & S Bakery
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isDarkMode
                  ? "bg-yellow-500/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-500/30"
                  : "bg-gray-800/10 hover:bg-gray-700/20 text-gray-700 border border-gray-300"
              } shadow-sm hover:shadow-md transform hover:scale-105`}
              title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
          <p
            className={`text-sm ${
              isDarkMode ? "text-slate-400" : "text-gray-600"
            }`}
          >
            Daily inventory management
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button
              onClick={fetchInventoryData}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? "Loading..." : "Retry Loading Data"}
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/60 border-gray-700/30"
              : "bg-white/60 border-gray-200/30"
          }`}
        >
          <h2
            className={`text-base font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-gray-800"
            }`}
          >
            🚀 Quick Navigation
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/addPrice")}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
            >
              🏷 Prices
            </button>
            <button
              onClick={() => navigate("/summary")}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
            >
              📊 Summary
            </button>
            <button
              onClick={() => navigate("/summary")}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
            >
              📄 PDF
            </button>
          </div>
        </section>

        {/* Filters Section */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/60 border-gray-700/30"
              : "bg-white/60 border-gray-200/30"
          }`}
        >
          <h2
            className={`text-base font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-gray-800"
            }`}
          >
            🏪 Shop & Date
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label
                htmlFor="shop-filter"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Shop:
              </label>
              <select
                id="shop-filter"
                value={filters.shop}
                onChange={(e) => handleFilterChange("shop", e.target.value)}
                className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
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
                htmlFor="date-filter"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Date:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateDate(-1)}
                  className={`px-2 py-2 rounded-md transition-colors text-sm ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-slate-300"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                  title="Previous day"
                >
                  ←
                </button>
                <input
                  id="date-filter"
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange("date", e.target.value)}
                  className={`flex-1 border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    isDarkMode
                      ? "bg-gray-700/70 border-gray-600 text-slate-200"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                />
                <button
                  onClick={() => navigateDate(1)}
                  className={`px-2 py-2 rounded-md transition-colors text-sm ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-slate-300"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                  title="Next day"
                >
                  →
                </button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() =>
                  handleFilterChange(
                    "date",
                    new Date().toISOString().split("T")[0]
                  )
                }
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm font-medium"
              >
                📅 Today
              </button>

              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveChanges}
                  disabled={submitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-md hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50 text-sm"
                  >
                  {submitting ? "💾 Saving..." : "💾 Save Changes"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Missing Prices Alert */}
        {itemsWithMissingPrices.length > 0 && (
          <section
            className={`border rounded-lg p-4 mb-4 transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900/30 border-red-700"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`flex items-center gap-2 font-medium mb-2 text-sm ${
                isDarkMode ? "text-red-300" : "text-red-800"
              }`}
            >
              ⚠️ Missing Prices Detected
            </div>
            <p
              className={`text-xs mb-3 ${
                isDarkMode ? "text-red-400" : "text-red-700"
              }`}
            >
              The following items have inventory data but missing prices for{" "}
              {filters.shop}:
            </p>
            <div className="flex flex-wrap gap-2">
              {itemsWithMissingPrices.map((item) => (
                <span
                  key={item.itemName}
                  className={`px-2 py-1 rounded text-xs ${
                    isDarkMode
                      ? "bg-red-800/50 text-red-300"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.itemName}
                </span>
              ))}
            </div>
            <button
              onClick={() => navigate("/addPrice")}
              className={`mt-3 px-3 py-2 rounded-md transition-colors text-xs font-medium ${
                isDarkMode
                  ? "bg-red-700 hover:bg-red-600"
                  : "bg-red-600 hover:bg-red-700"
              } text-white`}
            >
              📝 Set Prices Now
            </button>
          </section>
        )}

        {/* Combined Beverages Table Section */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border overflow-hidden transition-colors duration-300 mb-4 ${
            isDarkMode
              ? "bg-gradient-to-r from-orange-900/60 to-blue-900/60 border-purple-700/30"
              : "bg-gradient-to-r from-orange-50/60 to-blue-50/60 border-purple-200/30"
          }`}
        >
          <div
            className={`p-3 border-b ${
              isDarkMode ? "border-purple-700" : "border-purple-200"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2
                  className={`text-base font-semibold flex items-center gap-2 ${
                    isDarkMode ? "text-purple-200" : "text-purple-800"
                  }`}
                >
                  🥤 Beverages - {filters.shop} - {filters.date}
                </h2>
                <p
                  className={`text-xs mt-1 ${
                    isDarkMode ? "text-purple-400" : "text-purple-600"
                  }`}
                >
                  Nescafe & Nestea stock 
                  {editedBeverages.size > 0 && (
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-small ${
                        isDarkMode
                          ? "bg-yellow-900/50 text-yellow-300"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      Changes pending save
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`sticky top-0 transition-colors duration-300 ${
                  isDarkMode ? "bg-purple-800" : "bg-purple-100"
                }`}
              >
                <tr>
                  <th
                    className={`px-2 py-2 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-purple-300" : "text-purple-700"
                    }`}
                  >
                    Item Name
                  </th>
                  <th
                    className={`px-2 py-2 text-center text-xs font-semibold min-w-[70px] ${
                      isDarkMode ? "text-purple-300" : "text-purple-700"
                    }`}
                  >
                    Previous Day Count
                  </th>
                  <th
                    className={`px-2 py-2 text-center text-xs font-semibold min-w-[70px] ${
                      isDarkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    Today Count
                  </th>
                  <th
                    className={`px-2 py-2 text-center text-xs font-semibold min-w-[60px] ${
                      isDarkMode ? "text-green-300" : "text-green-700"
                    }`}
                  >
                    Selling (Auto)
                  </th>
                  <th
                    className={`px-2 py-2 text-center text-xs font-semibold min-w-[60px] ${
                      isDarkMode ? "text-amber-300" : "text-amber-700"
                    }`}
                  >
                    Price
                  </th>
                  <th
                    className={`px-2 py-2 text-center text-xs font-semibold min-w-[70px] ${
                      isDarkMode ? "text-emerald-300" : "text-emerald-700"
                    }`}
                  >
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y transition-colors duration-300 ${
                  isDarkMode ? "divide-purple-700" : "divide-purple-200"
                }`}
              >
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mb-2"></div>
                        <p
                          className={`text-sm font-medium ${
                            isDarkMode ? "text-purple-400" : "text-purple-500"
                          }`}
                        >
                          Loading Beverages data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  completeBeverageData
                    .filter(item => item.itemName === "Nescafe" || item.itemName === "Nestea")
                    .map((beverageData, index) => {
                      const hasData =
                        beverageData.morningTime > 0 ||
                        beverageData.eveningTime > 0 ||
                        beverageData.extraIn > 0 ||
                        beverageData.todayCount > 0;
                      const isEdited = editedBeverages.has(beverageData.id);
                      const isNescafe = beverageData.itemName === "Nescafe";

                      return (
                        <tr
                          key={beverageData.id}
                          className={`transition-colors duration-150 ${
                            hasData
                              ? isDarkMode
                                ? isNescafe
                                  ? "bg-orange-900/20 hover:bg-orange-800/30"
                                  : "bg-blue-900/20 hover:bg-blue-800/30"
                                : isNescafe
                                ? "bg-orange-50/50 hover:bg-orange-100/50"
                                : "bg-blue-50/50 hover:bg-blue-100/50"
                              : isDarkMode
                              ? "hover:bg-purple-800/20"
                              : "hover:bg-purple-50"
                          } ${
                            isEdited
                              ? isDarkMode
                                ? "bg-yellow-900/20 border-yellow-700"
                                : "bg-yellow-50 border-yellow-200"
                              : ""
                          }`}
                        >
                          <td className="px-2 py-2 text-xs text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isNescafe
                                  ? isDarkMode
                                    ? "bg-orange-900 text-orange-200"
                                    : "bg-orange-100 text-orange-800"
                                  : isDarkMode
                                  ? "bg-blue-900 text-blue-200"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isNescafe ? "☕ Nescafe" : "🧊 Nestea"}
                            </span>
                          </td>

                          <td className="px-2 py-2 text-xs text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {beverageData.previousDayCount}
                            </span>
                          </td>

                          <td className="px-2 py-2 text-xs text-center">
                            <input
                              type="number"
                              value={beverageData.todayCount}
                              onChange={(e) =>
                                handleBeverageCellEdit(beverageData.id, "todayCount", e.target.value)
                              }
                              className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                                isEdited
                                  ? isDarkMode
                                    ? "border-blue-500 bg-blue-900/20 text-purple-200"
                                    : "border-blue-400 bg-blue-50"
                                  : isDarkMode
                                  ? "border-blue-600 bg-blue-900/10 text-purple-200"
                                  : "border-blue-300 bg-blue-50/50"
                              }`}
                              min="0"
                              placeholder="0"
                            />
                          </td>

                          <td className="px-2 py-2 text-xs text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                beverageData.selling > 0
                                  ? isDarkMode
                                    ? "bg-green-900/50 text-green-300"
                                    : "bg-green-100 text-green-800"
                                  : isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                              title="Auto-calculated: Today Count - Previous Day Count"
                            >
                              {beverageData.selling}
                            </span>
                          </td>

                          <td className="px-2 py-2 text-xs text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                beverageData.price !== null
                                  ? isDarkMode
                                    ? "bg-amber-900/50 text-amber-300"
                                    : "bg-amber-100 text-amber-800"
                                  : isDarkMode
                                  ? "bg-red-900/50 text-red-300"
                                  : "bg-red-100 text-red-800"
                              }`}
                              title="Price per unit for this beverage"
                            >
                              {beverageData.price !== null ? `Rs. ${beverageData.price.toFixed(2)}` : "No Price"}
                            </span>
                          </td>

                          <td className="px-2 py-2 text-xs text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                beverageData.totalValue !== null && beverageData.totalValue > 0
                                  ? isDarkMode
                                    ? "bg-emerald-900/50 text-emerald-300"
                                    : "bg-emerald-100 text-emerald-800"
                                  : isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                              title="Total value: Selling quantity × Price"
                            >
                              {beverageData.totalValue !== null ? `Rs. ${beverageData.totalValue.toFixed(2)}` : "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Inventory Table Section */}
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
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2
                  className={`text-base font-semibold flex items-center gap-2 ${
                    isDarkMode ? "text-slate-200" : "text-gray-800"
                  }`}
                >
                  🍞 Bakery - {filters.shop} - {filters.date}
                </h2>
                <p
                  className={`text-xs mt-1 ${
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  }`}
                >
                  Complete inventory view for all {BAKERY_ITEMS.length} bakery items
                  {hasUnsavedChanges && (
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isDarkMode
                          ? "bg-yellow-900/50 text-yellow-300"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {editedItems.size} unsaved changes
                    </span>
                  )}
                  {totalSalesValue > 0 && (
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isDarkMode
                          ? "bg-green-900/50 text-green-300"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      Total Sales: Rs. {totalSalesValue.toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
            </div>
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
                    className={`px-3 py-3 text-left text-xs font-semibold min-w-[160px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Item Name
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Prev. Day Remaining
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Morning Time
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Evening Time
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Extra In
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Starting Total
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-green-300" : "text-green-700"
                    }`}
                  >
                    Items Sold (Auto)
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-red-300" : "text-red-700"
                    }`}
                  >
                    Transfer Out
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-red-300" : "text-red-700"
                    }`}
                  >
                    Discard
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    Remaining
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[70px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Price (Rs.)
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Total Value (Rs.)
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
                    <td colSpan="12" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p
                          className={`text-lg font-medium ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Loading inventory data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : BAKERY_ITEMS.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <p
                          className={`text-lg font-medium mb-2 ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          No items found for {filters.shop}
                        </p>
                        <p
                          className={`text-sm mb-4 ${
                            isDarkMode ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          Add some items to get started
                        </p>
                        <button
                          onClick={() => setShowAddItemModal(true)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          Add First Item
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  completeTableData.map((row) => {
                    const hasData =
                      row.morningTime > 0 ||
                      row.eveningTime > 0 ||
                      row.extraIn > 0 ||
                      row.remainingInventory > 0 ||
                      row.transferOut > 0 ||
                      row.discard > 0;
                    const isEdited = editedItems.has(row.id);

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors duration-150 ${
                          hasData
                            ? isDarkMode
                              ? "bg-blue-900/20 hover:bg-blue-800/30"
                              : "bg-blue-50/50 hover:bg-blue-100/50"
                            : isDarkMode
                            ? "hover:bg-slate-800/50"
                            : "hover:bg-slate-50"
                        } ${
                          isEdited
                            ? isDarkMode
                              ? "bg-yellow-900/20 border-yellow-700"
                              : "bg-yellow-50 border-yellow-200"
                            : ""
                        }`}
                      >
                        <td
                          className={`px-3 py-2 text-xs font-medium ${
                            isDarkMode ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                hasData
                                  ? "bg-blue-500"
                                  : isEdited
                                  ? "bg-yellow-500"
                                  : isDarkMode
                                  ? "bg-slate-600"
                                  : "bg-slate-300"
                              }`}
                            ></span>
                            <span
                              title={row.itemName}
                              className="truncate max-w-[120px]"
                            >
                              {row.itemName}
                            </span>
                            {row.hasPriceMissing && hasData && (
                              <span
                                className="text-red-500 text-xs"
                                title="Price missing"
                              >
                                !
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-gray-700 text-gray-300"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {row.previousDayRemaining}
                          </span>
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.morningTime}
                            onChange={(e) =>
                              handleCellEdit(
                                row.id,
                                "morningTime",
                                e.target.value
                              )
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-900/20 text-slate-200"
                                  : "border-yellow-400 bg-yellow-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-800 text-slate-200"
                                : "border-slate-300"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.eveningTime}
                            onChange={(e) =>
                              handleCellEdit(
                                row.id,
                                "eveningTime",
                                e.target.value
                              )
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-900/20 text-slate-200"
                                  : "border-yellow-400 bg-yellow-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-800 text-slate-200"
                                : "border-slate-300"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.extraIn}
                            onChange={(e) =>
                              handleCellEdit(row.id, "extraIn", e.target.value)
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-900/20 text-slate-200"
                                  : "border-yellow-400 bg-yellow-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-800 text-slate-200"
                                : "border-slate-300"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-blue-900/50 text-blue-300"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {row.startingInventory}
                          </span>
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              row.selling > 0
                                ? isDarkMode
                                  ? "bg-green-900/50 text-green-300"
                                  : "bg-green-100 text-green-800"
                                : isDarkMode
                                ? "bg-gray-700 text-gray-300"
                                : "bg-gray-100 text-gray-800"
                            }`}
                            title="Auto-calculated: Starting Total - Remaining - Transfer Out - Discard"
                          >
                            {row.selling}
                          </span>
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.transferOut}
                            onChange={(e) =>
                              handleCellEdit(
                                row.id,
                                "transferOut",
                                e.target.value
                              )
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-red-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-red-500 bg-red-900/20 text-slate-200"
                                  : "border-red-400 bg-red-50"
                                : isDarkMode
                                ? "border-red-600 bg-red-900/10 text-slate-200"
                                : "border-red-300 bg-red-50/50"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.discard}
                            onChange={(e) =>
                              handleCellEdit(row.id, "discard", e.target.value)
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-red-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-red-500 bg-red-900/20 text-slate-200"
                                  : "border-red-400 bg-red-50"
                                : isDarkMode
                                ? "border-red-600 bg-red-900/10 text-slate-200"
                                : "border-red-300 bg-red-50/50"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.remainingInventory}
                            onChange={(e) =>
                              handleCellEdit(row.id, "remainingInventory", e.target.value)
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-blue-500 bg-blue-900/20 text-slate-200"
                                  : "border-blue-400 bg-blue-50"
                                : isDarkMode
                                ? "border-blue-600 bg-blue-900/10 text-slate-200"
                                : "border-blue-300 bg-blue-50/50"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          {row.price !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-purple-900/50 text-purple-300"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {row.price.toFixed(2)}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-red-900/50 text-red-300"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              Missing
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          {row.totalValue !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                row.totalValue > 0
                                  ? isDarkMode
                                    ? "bg-green-900/50 text-green-300"
                                    : "bg-green-100 text-green-800"
                                  : isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {row.totalValue.toFixed(2)}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-red-900/50 text-red-300"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              N/A
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Summary Section */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mt-4 transition-colors duration-300 ${
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
            📊 Quick Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Bakery Summary */}
            <div>
              <h3
                className={`text-sm font-medium mb-2 ${
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Bakery Items
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`text-center p-2 rounded-md transition-colors duration-300 ${
                    isDarkMode ? "bg-blue-900/30" : "bg-blue-50"
                  }`}
                >
                  <div
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    {completeTableData.reduce(
                      (sum, item) => sum + item.startingInventory,
                      0
                    )}
                  </div>
                  <div
                    className={`text-xs ${
                      isDarkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    Starting Total
                  </div>
                </div>
                <div
                  className={`text-center p-2 rounded-md transition-colors duration-300 ${
                    isDarkMode ? "bg-green-900/30" : "bg-green-50"
                  }`}
                >
                  <div
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {completeTableData.reduce((sum, item) => sum + item.selling, 0)}
                  </div>
                  <div
                    className={`text-xs ${
                      isDarkMode ? "text-green-300" : "text-green-700"
                    }`}
                  >
                    Items Sold
                  </div>
                </div>
                <div
                  className={`text-center p-2 rounded-md transition-colors duration-300 ${
                    isDarkMode ? "bg-emerald-900/30" : "bg-emerald-50"
                  }`}
                >
                  <div
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-emerald-400" : "text-emerald-600"
                    }`}
                  >
                    {completeTableData.reduce(
                      (sum, item) => sum + item.remainingInventory,
                      0
                    )}
                  </div>
                  <div
                    className={`text-xs ${
                      isDarkMode ? "text-emerald-300" : "text-emerald-700"
                    }`}
                  >
                    Remaining
                  </div>
                </div>
                <div
                  className={`text-center p-2 rounded-md border-2 transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-green-900/30 border-green-700"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div
                    className={`text-base font-bold ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    Rs. {totalSalesValue.toFixed(2)}
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      isDarkMode ? "text-green-300" : "text-green-700"
                    }`}
                  >
                    Sales Value
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer
          className={`text-center mt-8 py-4 text-sm ${
            isDarkMode ? "text-slate-400" : "text-slate-600"
          }`}
        >
          <p>T & S Bakery Inventory Management System</p>
          <p className="mt-1">
            Selected: {filters.shop} | Date: {filters.date} | Bakery Items: {BAKERY_ITEMS.length} | Beverages: {BEVERAGES.length} | Changes: {editedItems.size + editedBeverages.size}
          </p>
        </footer>
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                isDarkMode ? "text-slate-200" : "text-slate-800"
              }`}
            >
              Add New Item to {filters.shop}
            </h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Enter item name"
              className={`w-full border rounded-lg px-3 py-2.5 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-slate-200"
                  : "bg-white border-slate-300"
              }`}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !submitting) {
                  handleAddItem();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddItem}
                disabled={submitting || !newItemName.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
              >
                {submitting ? "Adding..." : "Add Item"}
              </button>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setNewItemName("");
                }}
                className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-slate-300"
                    : "bg-gray-200 hover:bg-gray-300 text-slate-700"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}