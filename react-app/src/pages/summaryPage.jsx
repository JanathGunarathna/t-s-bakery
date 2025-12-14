import React, { useState, useEffect, useCallback, useMemo } from "react";
import { firestore } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
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

export default function SummaryPage() {

  // Dark mode state - using React state instead of localStorage
  const [isDarkMode, setIsDarkMode] = useState(true);

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

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // State management
  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState([]);
  const [beverageData, setBeverageData] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [shopItemsData, setShopItemsData] = useState([]);

  // Filter states
  // Get shop from localStorage
  const [shop, setShop] = useState(() => localStorage.getItem("selectedShop"));
  const [filters, setFilters] = useState({
    shop: shop || SHOPS[0],
    date: new Date().toISOString().split("T")[0],
  });

  // Cash balance states
  const [deposit, setDeposit] = useState(() => Number(localStorage.getItem("deposit")) || 0);
  const [openingBalance, setOpeningBalance] = useState(() => Number(localStorage.getItem("openingBalance")) || 0);
  const [closingBalance, setClosingBalance] = useState(() => Number(localStorage.getItem("closingBalance")) || 0);

  // Cashier name state
  const [cashierName, setCashierName] = useState(() => localStorage.getItem("cashierName") || "");

  // Load previous day's closing balance as opening balance
  debugger;
  useEffect(() => {
    const prevDate = new Date(filters.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const previousDateStr = prevDate.toISOString().split("T")[0];
    // Try to get previous closing balance from localStorage (key: closingBalance_<shop>_<date>)
    const prevKey = `closingBalance_${filters.shop}_${previousDateStr}`;
    const prevClosing = localStorage.getItem(prevKey);
    if (prevClosing !== null) {
      setOpeningBalance(Number(prevClosing));
    }
  }, [filters.shop, filters.date]);

  const navigate = useNavigate();

  // Redirect to Welcome if no shop selected
  useEffect(() => {
    if (!shop) {
      navigate("/");
    }
  }, [shop, navigate]);
  // Add Change Shop button
  const handleChangeShop = () => {
    localStorage.removeItem("selectedShop");
    navigate("/");
  };
  // ...existing code for rendering...
  // Add a button somewhere in your main render:
  // <button onClick={handleChangeShop} className="...">Change Shop</button>

  // Firestore collection references
  const inventoryRef = collection(firestore, "inventory");
  const beveragesRef = collection(firestore, "beverages");
  const pricesRef = collection(firestore, "prices");
  const shopItemsRef = collection(firestore, "shopItems");

  // Navigation function
  const navigateToPage = useCallback(
    (page) => {
      navigate(page);
    },
    [navigate]
  );

  // Get price for an item in a specific shop
  const getItemPrice = useCallback(
    (itemName, shop) => {
      const priceRecord = priceData.find(
        (price) => price.itemName === itemName && price.shop === shop
      );
      return priceRecord ? parseFloat(priceRecord.price) || 0 : null;
    },
    [priceData]
  );

  // Get item order from shopItems data
  const getItemOrder = useCallback(
    (itemName, shop) => {
      const itemRecord = shopItemsData.find(
        (item) => item.itemName === itemName && item.shop === shop
      );
      return itemRecord ? (itemRecord.order || 0) : 999999; // Default high order for items without explicit order
    },
    [shopItemsData]
  );

  // Get bakery items for a specific shop (same logic as selectionPage)
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
      addToast("Error loading items for shop", "error");
      return [];
    }
  }, [shopItemsData, addToast]);

  const BAKERY_ITEMS = useMemo(() => {
    return getBakeryItemsForShop(filters.shop);
  }, [getBakeryItemsForShop, filters.shop]);

  // Fetch data from Firestore
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch inventory data from inventory collection
      const inventoryQuery = query(inventoryRef, orderBy("createdAt", "desc"));
      const inventorySnapshot = await getDocs(inventoryQuery);

      const inventoryItems = inventorySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch beverage data from beverages collection
      const beverageQuery = query(beveragesRef, orderBy("createdAt", "desc"));
      const beverageSnapshot = await getDocs(beverageQuery);

      const beverageItems = beverageSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch price data from prices collection
      const priceQuery = query(pricesRef);
      const priceSnapshot = await getDocs(priceQuery);

      const priceItems = priceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch shop items data from shopItems collection
      const shopItemsSnapshot = await getDocs(shopItemsRef);
      const shopItems = shopItemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setInventoryData(inventoryItems);
      setBeverageData(beverageItems);
      setPriceData(priceItems);
      setShopItemsData(shopItems);
      console.log("Fetched inventory data:", inventoryItems.length, "items");
      console.log("Fetched beverage data:", beverageItems.length, "items");
      console.log("Fetched price data:", priceItems.length, "items");
      console.log("Fetched shop items data:", shopItems.length, "items");
    } catch (error) {
      console.error("Error fetching data:", error);
      addToast("Error loading data. Please try again.", "error");

      // Fallback without ordering
      try {
        const [inventorySnapshot, beverageSnapshot, priceSnapshot, shopItemsSnapshot] = await Promise.all([
          getDocs(inventoryRef),
          getDocs(beveragesRef),
          getDocs(pricesRef),
          getDocs(shopItemsRef),
        ]);

        const inventoryItems = inventorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const beverageItems = beverageSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const priceItems = priceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const shopItems = shopItemsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Manual sort by createdAt
        inventoryItems.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        beverageItems.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        setInventoryData(inventoryItems);
        setBeverageData(beverageItems);
        setPriceData(priceItems);
        setShopItemsData(shopItems);
        addToast("Data loaded successfully (fallback mode)", "success");
        console.log(
          "Fetched data (fallback) - inventory:",
          inventoryItems.length,
          "beverages:",
          beverageItems.length,
          "prices:",
          priceItems.length,
          "shop items:",
          shopItems.length
        );
      } catch (fallbackError) {
        console.error("Fallback fetch failed:", fallbackError);
        addToast("Failed to load data. Please check your connection.", "error");
        setInventoryData([]);
        setBeverageData([]);
        setPriceData([]);
        setShopItemsData([]);
      }
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle filter changes
  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Date navigation
  const navigateDate = useCallback(
    (days) => {
      const currentDate = new Date(filters.date);
      currentDate.setDate(currentDate.getDate() + days);
      const newDate = currentDate.toISOString().split("T")[0];
      handleFilterChange("date", newDate);
    },
    [filters.date, handleFilterChange]
  );

  // Get previous day remaining inventory
  const getPreviousDayRemaining = useCallback(
    (itemName, shop, currentDate) => {
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
    },
    [inventoryData]
  );

  // Get previous day beverage count
  const getPreviousDayBeverageCount = useCallback(
    (itemName, shop, currentDate) => {
      // Calculate previous day
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const previousDateStr = prevDate.toISOString().split("T")[0];

      // Find beverage record for previous day
      const previousRecord = beverageData.find(
        (record) =>
          record.itemName === itemName &&
          record.shop === shop &&
          record.date === previousDateStr
      );

      return previousRecord ? previousRecord.todayCount : 0;
    },
    [beverageData]
  );

  // Filter inventory data based on current filters
  const filteredInventoryData = useMemo(() => {
    return inventoryData.filter(
      (item) => item.shop === filters.shop && item.date === filters.date
    );
  }, [inventoryData, filters]);

  // Filter beverage data based on current filters
  const filteredBeverageData = useMemo(() => {
    return beverageData.filter(
      (item) => item.shop === filters.shop && item.date === filters.date
    );
  }, [beverageData, filters]);

  // Complete beverage data with calculations
  const completeBeverageData = useMemo(() => {
    return BEVERAGES.map((itemName) => {
      const existingRecord = filteredBeverageData.find(
        (record) => record.itemName === itemName
      );

      const previousDayCount = getPreviousDayBeverageCount(
        itemName,
        filters.shop,
        filters.date
      );

      const todayCount = existingRecord ? existingRecord.todayCount : 0;
      const selling = Math.max(0, todayCount - previousDayCount);
      const itemPrice = getItemPrice(itemName, filters.shop);

      const beverage = {
        itemName,
        previousDayCount,
        todayCount,
        selling,
        price: itemPrice,
        totalValue: itemPrice !== null ? selling * itemPrice : null,
      };

      return beverage;
    });
  }, [filteredBeverageData, getPreviousDayBeverageCount, filters, getItemPrice]);

  // Complete table data for all bakery items (like selectionPage)
  const completeTableData = useMemo(() => {
    try {
      if (!filters.shop || !filters.date) return [];

      return BAKERY_ITEMS.map((itemName) => {
        const existingData = filteredInventoryData.find(
          (item) => item.itemName === itemName
        );

        const itemPrice = getItemPrice(itemName, filters.shop);
        
        // Get previous day remaining (same as selectionPage)
        const previousDayRemaining = getPreviousDayRemaining(itemName, filters.shop, filters.date);
        
        // Use the same logic as selectionPage - calculate from inventory data
        const morningTime = parseInt(existingData?.morningTime) || 0;
        const eveningTime = parseInt(existingData?.eveningTime) || 0;
        const extraIn = parseInt(existingData?.extraIn) || 0;
        const transferOut = parseInt(existingData?.transferOut) || 0;
        const discard = parseInt(existingData?.discard) || 0;
        const remainingInventory = parseInt(existingData?.remainingInventory) || 0;
        
        // Calculate starting inventory and selling the same way as selectionPage
        const startingInventory = previousDayRemaining + morningTime + eveningTime + extraIn;
        const selling = Math.max(0, startingInventory - remainingInventory - transferOut - discard);
        const totalValue = itemPrice !== null ? selling * itemPrice : null;

        return {
          itemName,
          shop: filters.shop,
          date: filters.date,
          previousDayRemaining: previousDayRemaining,
          selling: selling,
          price: itemPrice,
          totalValue: totalValue,
          // Include other fields from existing data if available
          addedInventory: parseInt(existingData?.addedInventory) || 0,
          morningTime: morningTime,
          eveningTime: eveningTime,
          extraIn: extraIn,
          transferOut: transferOut,
          discard: discard,
          remainingInventory: remainingInventory,
          startingInventory: startingInventory,
        };
      });
    } catch (error) {
      console.error("Error computing complete table data:", error);
      addToast("Error processing complete inventory data", "error");
      return [];
    }
  }, [BAKERY_ITEMS, filteredInventoryData, filters, getItemPrice, getPreviousDayRemaining, addToast]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalItems = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.addedInventory) || 0),
      0
    );
    const totalMorningTime = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.morningTime) || 0),
      0
    );
    const totalEveningTime = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.eveningTime) || 0),
      0
    );
    const totalExtraIn = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.extraIn) || 0),
      0
    );
    const totalTransferOut = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.transferOut) || 0),
      0
    );
    const totalDiscard = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.discard) || 0),
      0
    );
    const totalRemaining = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.remainingInventory) || 0),
      0
    );

    // Calculate total sales value - use completeTableData like selectionPage
    const totalSold = completeTableData.reduce(
      (sum, item) => sum + (parseInt(item.selling) || 0),
      0
    );

    const totalSalesValue = completeTableData.reduce((sum, item) => {
      return sum + (item.totalValue || 0);
    }, 0);

    // Calculate beverage totals
    const totalBeverageSold = completeBeverageData.reduce(
      (sum, beverage) => sum + beverage.selling,
      0
    );

    const totalBeverageSalesValue = completeBeverageData.reduce(
      (sum, beverage) => sum + (beverage.totalValue || 0),
      0
    );

    const totalBeveragePreviousDay = completeBeverageData.reduce(
      (sum, beverage) => sum + beverage.previousDayCount,
      0
    );

    const totalBeverageToday = completeBeverageData.reduce(
      (sum, beverage) => sum + beverage.todayCount,
      0
    );

    const totalStartingInventory =
      totalItems + totalMorningTime + totalEveningTime + totalExtraIn;

    // Combined totals including beverages
    const grandTotalSold = totalSold + totalBeverageSold;
    const grandTotalSalesValue = totalSalesValue + totalBeverageSalesValue;

    return {
      totalItems,
      totalMorningTime,
      totalEveningTime,
      totalExtraIn,
      totalStartingInventory,
      totalSold,
      totalTransferOut,
      totalDiscard,
      totalRemaining,
      totalSalesValue,
      totalBeverageSold,
      totalBeverageSalesValue,
      totalBeveragePreviousDay,
      totalBeverageToday,
      grandTotalSold,
      grandTotalSalesValue,
      itemTypes: BAKERY_ITEMS.length,
      beverageTypes: completeBeverageData.length,
      soldPercentage:
        totalStartingInventory > 0
          ? ((totalSold / totalStartingInventory) * 100).toFixed(1)
          : 0,
    };
  }, [filteredInventoryData, completeBeverageData, completeTableData]);

  // Total sales value calculation (exactly like selectionPage)
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
      console.log("Summary Page - Bakery Items:", completeTableData.length, "Total:", bakeryTotal);
      console.log("Summary Page - Beverages:", completeBeverageData.length, "Total:", beverageTotal);
      console.log("Summary Page - Final Total:", bakeryTotal + beverageTotal);
      
      return bakeryTotal + beverageTotal;
    } catch (error) {
      console.error("Error calculating total sales value:", error);
      return 0;
    }
  }, [completeTableData, completeBeverageData]);  // Enhanced table data with prices and proper ordering
  const enhancedTableData = useMemo(() => {
    const processedData = filteredInventoryData.map((item) => {
      const itemPrice = getItemPrice(item.itemName, item.shop);
      const selling = parseInt(item.selling) || 0;
      const salesValue = itemPrice !== null ? selling * itemPrice : null;
      const itemOrder = getItemOrder(item.itemName, item.shop);
      const previousDayRemaining = getPreviousDayRemaining(item.itemName, item.shop, item.date);

      return {
        ...item,
        price: itemPrice,
        salesValue: salesValue,
        itemOrder: itemOrder,
        previousDayRemaining: previousDayRemaining,
        addedInventory: parseInt(item.addedInventory) || 0,
        morningTime: parseInt(item.morningTime) || 0,
        eveningTime: parseInt(item.eveningTime) || 0,
        extraIn: parseInt(item.extraIn) || 0,
        selling: selling,
        transferOut: parseInt(item.transferOut) || 0,
        discard: parseInt(item.discard) || 0,
        remainingInventory: parseInt(item.remainingInventory) || 0,
      };
    });

    // Sort by item order (same as PriceManagementPage)
    return processedData.sort((a, b) => a.itemOrder - b.itemOrder);
  }, [filteredInventoryData, getItemPrice, getItemOrder, getPreviousDayRemaining]);

  // Calculate cash balance
  const calculatedSellingValue = totalSalesValue;
  const calculatedClosingBalance = useMemo(() => {
    return openingBalance + calculatedSellingValue - deposit;
  }, [openingBalance, calculatedSellingValue, deposit]);

  // Equation check: opening + selling - closing vs deposit
  const equationResult = useMemo(() => {
    const leftSide = openingBalance + calculatedSellingValue - closingBalance;
    const rightSide = deposit;
    const diff = leftSide - rightSide;
    
    return {
      leftSide,
      rightSide,
      diff,
      isBalanced: Math.abs(diff) < 0.01,
      // If Opening + Selling - Closing > Deposit → Loss/Deficit
      // If Opening + Selling - Closing < Deposit → Surplus/Additional
      surplus: diff < 0 ? -diff : 0,  // When leftSide < rightSide (surplus/additional)
      deficit: diff > 0 ? diff : 0,   // When leftSide > rightSide (loss/deficit)
      isLoss: diff > 0,
      isSurplus: diff < 0,
    };
  }, [openingBalance, calculatedSellingValue, closingBalance, deposit]);

  // Update closing balance when calculated value changes
  useEffect(() => {
    setClosingBalance(calculatedClosingBalance);
  }, [calculatedClosingBalance]);

  // Generate PDF function
  // Updated PDF download function with proper jsPDF loading
  const handleDownloadPDF = useCallback(() => {
    console.log("Download PDF clicked");

    // Check if jsPDF is already loaded and accessible
    if (
      typeof window.jsPDF !== "undefined" ||
      typeof window.jspdf !== "undefined"
    ) {
      console.log("jsPDF already loaded, generating PDF...");
      generatePDFContent();
      return;
    }

    console.log("Loading jsPDF library...");

    // Create script element with proper configuration
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.async = false; // Load synchronously to ensure proper initialization
    script.crossOrigin = "anonymous";

    script.onload = () => {
      console.log("jsPDF script loaded successfully");
      // Wait for the library to be fully initialized
      setTimeout(() => {
        // Check if jsPDF is now available
        if (
          typeof window.jsPDF !== "undefined" ||
          typeof window.jspdf !== "undefined"
        ) {
          console.log("jsPDF is now available");
          generatePDFContent();
        } else {
          console.error("jsPDF loaded but not accessible");
          alert(
            "PDF library loaded but not accessible. Downloading as text file instead."
          );
          //   generateTextFile();
        }
      }, 200);
    };

    script.onerror = (error) => {
      console.error("Failed to load jsPDF script:", error);
      alert("Failed to load PDF library. Downloading as text file instead.");
      // generateTextFile();
    };

    // Remove any existing jsPDF scripts to avoid conflicts
    const existingScripts = document.querySelectorAll('script[src*="jspdf"]');
    existingScripts.forEach((s) => s.remove());

    document.head.appendChild(script);
  }, [
    filters,
    summaryStats,
    openingBalance,
    closingBalance,
    enhancedTableData,
    cashierName,
    totalSalesValue,
  ]);

  // Fixed PDF generation function
  const generatePDFContent = useCallback(() => {
    try {
      console.log("Starting PDF generation...");

      // Try different ways to access jsPDF based on how it might be loaded
      let jsPDFConstructor = null;

      if (typeof window.jsPDF !== "undefined") {
        // Method 1: Direct access to jsPDF
        if (typeof window.jsPDF.jsPDF !== "undefined") {
          jsPDFConstructor = window.jsPDF.jsPDF;
        } else if (typeof window.jsPDF === "function") {
          jsPDFConstructor = window.jsPDF;
        }
      } else if (typeof window.jspdf !== "undefined") {
        // Method 2: Lowercase jspdf
        if (typeof window.jspdf.jsPDF !== "undefined") {
          jsPDFConstructor = window.jspdf.jsPDF;
        }
      }

      if (!jsPDFConstructor) {
        throw new Error("jsPDF constructor not found");
      }

      // Initialize the PDF document
      const doc = new jsPDFConstructor({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      console.log("PDF document initialized successfully");

      // Set up document properties
      let yPosition = 20;
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const maxWidth = pageWidth - 2 * margin;

      // Add light blue background to the page
      doc.setFillColor(240, 248, 255); // Light blue color (AliceBlue)
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace = 10) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          doc.addPage();
          // Add light blue background to new page as well
          doc.setFillColor(240, 248, 255);
          doc.rect(0, 0, pageWidth, pageHeight, "F");
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("T & S Bakery - Daily Summary Report", margin, yPosition);
      yPosition += 12;

  // Basic Info
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Shop: ${filters.shop}`, margin, yPosition);
  doc.text(`Date: ${filters.date}`, margin + 60, yPosition);
  yPosition += 7;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Cashier: ${cashierName || "-"}`, margin, yPosition);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  yPosition += 10;

      // Add a line separator
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Financial Summary Section
      checkPageBreak(25);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("FINANCIAL SUMMARY", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const financialData = [
        `Opening Balance: Rs. ${openingBalance.toFixed(2)}`,
        `Bakery Sales Value: Rs. ${summaryStats.totalSalesValue.toFixed(2)}`,
        `Beverage Sales Value: Rs. ${summaryStats.totalBeverageSalesValue.toFixed(2)}`,
        `Total Sales Value: Rs. ${totalSalesValue.toFixed(2)}`,
        `Closing Balance: Rs. ${closingBalance.toFixed(2)}`,
        `Deposit: Rs. ${deposit.toFixed(2)}`,
        `Equation: Opening + Selling - Closing vs Deposit`,
        `${openingBalance.toFixed(2)} + ${calculatedSellingValue.toFixed(2)} - ${closingBalance.toFixed(2)} vs ${deposit.toFixed(2)}`,
        `${equationResult.leftSide.toFixed(2)} vs ${equationResult.rightSide.toFixed(2)}`,
        equationResult.isBalanced
          ? `Balanced`
          : equationResult.isLoss
            ? `Loss/Deficit: Rs. ${equationResult.deficit.toFixed(2)}`
            : `Surplus/Additional: Rs. ${equationResult.surplus.toFixed(2)}`
      ];

      financialData.forEach((line, idx) => {
        // Bold and larger font for 'Total Sales Value' and surplus/deficit/loss only
        if (idx === 3 || idx === 9) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 5;

      // Summary Statistics
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INVENTORY SUMMARY", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const summaryData = [
        `Total Items Added: ${summaryStats.totalItems}`,
        `Morning Time Added: ${summaryStats.totalMorningTime}`,
        `Evening Time Added: ${summaryStats.totalEveningTime}`,
        `Extra Items In: ${summaryStats.totalExtraIn}`,
        `Total Starting Inventory: ${summaryStats.totalStartingInventory}`,
        `Total Items Sold: ${summaryStats.totalSold}`,
        `Total Transfer Out: ${summaryStats.totalTransferOut}`,
        `Total Discard: ${summaryStats.totalDiscard}`,
        `Total Remaining: ${summaryStats.totalRemaining}`,
        `Item Types: ${summaryStats.itemTypes}`,
        `Sales Percentage: ${summaryStats.soldPercentage}%`,
      ];

      // Display summary in two columns to save space
      const midPoint = Math.ceil(summaryData.length / 2);
      const leftColumn = summaryData.slice(0, midPoint);
      const rightColumn = summaryData.slice(midPoint);

      const startY = yPosition;
      leftColumn.forEach((line, index) => {
        doc.text(line, margin + 5, startY + index * 5);
      });

      rightColumn.forEach((line, index) => {
        doc.text(line, margin + 100, startY + index * 5);
      });

      yPosition += Math.max(leftColumn.length, rightColumn.length) * 5 + 5;

      // Beverage Summary
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("BEVERAGE SUMMARY", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const beverageData = [
        `Total Previous Day Count: ${summaryStats.totalBeveragePreviousDay}`,
        `Total Today Count: ${summaryStats.totalBeverageToday}`,
        `Total Beverages Sold: ${summaryStats.totalBeverageSold}`,
        `Beverage Sales Value: Rs. ${summaryStats.totalBeverageSalesValue.toFixed(2)}`,
        `Beverage Types: ${summaryStats.beverageTypes}`,
      ];

      beverageData.forEach((line) => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 5;

      // Individual Beverage Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Individual Beverage Details:", margin, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      completeBeverageData.forEach((beverage) => {
        const beverageInfo = `${beverage.itemName}: Previous ${beverage.previousDayCount}, Today ${beverage.todayCount}, Sold ${beverage.selling}, Value Rs. ${beverage.totalValue !== null ? beverage.totalValue.toFixed(2) : '0.00'}`;
        doc.text(beverageInfo, margin + 5, yPosition);
        yPosition += 4;
      });
      yPosition += 5;

      // Combined Total Summary
      checkPageBreak(15);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("GRAND TOTAL SUMMARY", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const grandTotalData = [
        `Total Items Sold (All): ${summaryStats.grandTotalSold}`,
        `  - Bakery Items: ${summaryStats.totalSold}`,
        `  - Beverages: ${summaryStats.totalBeverageSold}`,
        `Total Sales Value (All): Rs. ${totalSalesValue.toFixed(2)}`,
        `  - Bakery Sales: Rs. ${summaryStats.totalSalesValue.toFixed(2)}`,
        `  - Beverage Sales: Rs. ${summaryStats.totalBeverageSalesValue.toFixed(2)}`,
      ];

      grandTotalData.forEach((line) => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 5;

      // Detailed Table for SOLD ITEMS ONLY
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SOLD ITEMS BREAKDOWN", margin, yPosition);
      yPosition += 10;

      // Filter for sold items only
      const soldItems = enhancedTableData.filter(item => item.selling > 0);

      // Table setup for sold items
      const soldHeaders = [
        "Item",
        "Added",
        "Morn",
        "Even",
        "Extra",
        "Sold",
        "Price",
        "Sales",
      ];
      const soldColWidths = [40, 18, 15, 15, 15, 15, 20, 25];

      // Draw sold items table header
      let xPosition = margin;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      // Header background
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPosition - 2, maxWidth, 6, "F");

      soldHeaders.forEach((header, index) => {
        doc.text(header, xPosition + 1, yPosition + 2);
        xPosition += soldColWidths[index];
      });
      yPosition += 8;

      // Sold items table data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      soldItems.forEach((item, rowIndex) => {
        checkPageBreak(6);

        xPosition = margin;

        // Alternate row coloring
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPosition - 1, maxWidth, 5, "F");
        }

        const soldRowData = [
          item.itemName.length > 18
            ? item.itemName.substring(0, 18) + "..."
            : item.itemName,
          item.addedInventory.toString(),
          item.morningTime.toString(),
          item.eveningTime.toString(),
          item.extraIn.toString(),
          item.selling.toString(),
          item.price !== null ? item.price.toFixed(2) : "N/A",
          item.salesValue !== null ? item.salesValue.toFixed(2) : "N/A",
        ];

        soldRowData.forEach((data, index) => {
          // Right align numbers, left align text
          if (index === 0) {
            doc.text(data, xPosition + 1, yPosition + 2);
          } else {
            const textWidth = doc.getTextWidth(data);
            doc.text(
              data,
              xPosition + soldColWidths[index] - textWidth - 1,
              yPosition + 2
            );
          }
          xPosition += soldColWidths[index];
        });

        yPosition += 5;
      });

      // Add summation row for sold items
      if (soldItems.length > 0) {
        yPosition += 3;
        
        // Calculate totals
        const totalAdded = soldItems.reduce((sum, item) => sum + item.addedInventory, 0);
        const totalMorning = soldItems.reduce((sum, item) => sum + item.morningTime, 0);
        const totalEvening = soldItems.reduce((sum, item) => sum + item.eveningTime, 0);
        const totalExtra = soldItems.reduce((sum, item) => sum + item.extraIn, 0);
        const totalSold = soldItems.reduce((sum, item) => sum + item.selling, 0);
        const totalSalesValue = soldItems.reduce((sum, item) => sum + (item.salesValue || 0), 0);

        // Draw separator line
        doc.setLineWidth(0.3);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 3;

        xPosition = margin;

        // Summary row background
        doc.setFillColor(235, 235, 235);
        doc.rect(margin, yPosition - 1, maxWidth, 5, "F");

        // Summary row data
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        
        const summaryRowData = [
          "TOTAL:",
          totalAdded.toString(),
          totalMorning.toString(),
          totalEvening.toString(),
          totalExtra.toString(),
          totalSold.toString(),
          "", // Empty for price column
          totalSalesValue.toFixed(2),
        ];

        summaryRowData.forEach((data, index) => {
          if (index === 0) {
            doc.text(data, xPosition + 1, yPosition + 2);
          } else if (data !== "") {
            const textWidth = doc.getTextWidth(data);
            doc.text(
              data,
              xPosition + soldColWidths[index] - textWidth - 1,
              yPosition + 2
            );
          }
          xPosition += soldColWidths[index];
        });

        yPosition += 5;
      }

      // Add spacing between tables
      yPosition += 15;

      // Detailed Table for REMAINING ITEMS ONLY
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REMAINING ITEMS BREAKDOWN", margin, yPosition);
      yPosition += 10;

      // Filter for remaining items only
      const remainingItems = enhancedTableData.filter(item => item.remainingInventory > 0);

      // Table setup for remaining items
      const remainingHeaders = [
        "Item",
        "Added",
        "Morn",
        "Even",
        "Extra",
        "Transfer",
        "Discard",
        "Remain",
      ];
      const remainingColWidths = [40, 18, 15, 15, 15, 18, 18, 18];

      // Draw remaining items table header
      xPosition = margin;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      // Header background
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPosition - 2, maxWidth, 6, "F");

      remainingHeaders.forEach((header, index) => {
        doc.text(header, xPosition + 1, yPosition + 2);
        xPosition += remainingColWidths[index];
      });
      yPosition += 8;

      // Remaining items table data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      remainingItems.forEach((item, rowIndex) => {
        checkPageBreak(6);

        xPosition = margin;

        // Alternate row coloring
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPosition - 1, maxWidth, 5, "F");
        }

        const remainingRowData = [
          item.itemName.length > 18
            ? item.itemName.substring(0, 18) + "..."
            : item.itemName,
          item.addedInventory.toString(),
          item.morningTime.toString(),
          item.eveningTime.toString(),
          item.extraIn.toString(),
          item.transferOut.toString(),
          item.discard.toString(),
          item.remainingInventory.toString(),
        ];

        remainingRowData.forEach((data, index) => {
          // Right align numbers, left align text
          if (index === 0) {
            doc.text(data, xPosition + 1, yPosition + 2);
          } else {
            const textWidth = doc.getTextWidth(data);
            doc.text(
              data,
              xPosition + remainingColWidths[index] - textWidth - 1,
              yPosition + 2
            );
          }
          xPosition += remainingColWidths[index];
        });

        yPosition += 5;
      });

      // Footer
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        margin,
        yPosition
      );

      // Add page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `T&S_Bakery_Summary_${filters.shop}_${filters.date}.pdf`;
      console.log("Saving PDF:", fileName);
      doc.save(fileName);

      console.log("PDF generated successfully");
      addToast("PDF report generated and downloaded successfully!", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      addToast(
        `PDF generation failed: ${error.message}. Please try again.`,
        "error"
      );
      // generateTextFile();
    }
  }, [
    filters,
    summaryStats,
    openingBalance,
    closingBalance,
    enhancedTableData,
    completeBeverageData,
    addToast,
    totalSalesValue,
  ]);

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
            : "bg-gradient-to-br from-slate-50/85 via-green-50/90 to-emerald-100/85"
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
              onClick={() => navigateToPage("/selection")}
              className={`px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 text-sm ${
                isDarkMode
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              ← Back to Inventory
            </button>
            <h1
              className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${
                isDarkMode
                  ? "from-green-400 to-emerald-400"
                  : "from-green-600 to-emerald-600"
              } bg-clip-text text-transparent mb-2`}
            >
              Daily Summary Report
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-all duration-300 ${
                isDarkMode
                  ? "bg-yellow-500 hover:bg-yellow-400 text-gray-900"
                  : "bg-gray-800 hover:bg-gray-700 text-yellow-400"
              } shadow-lg hover:shadow-xl transform hover:scale-110`}
              title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
          <p
            className={`text-sm ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Comprehensive daily business report and analytics
          </p>
        </header>

        {/* Navigation Buttons */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-700/20"
              : "bg-white/80 border-white/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}
          >
            🔗 Quick Navigation
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigateToPage("/selection")}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
            >
              📋 Daily Inventory
            </button>
            <button
              onClick={() => navigateToPage("/addPrice")}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
            >
              💰 Price Management
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
            >
              📄 Download PDF
            </button>
          </div>
        </section>

        {/* Filters Section */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-700/20"
              : "bg-white/80 border-white/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}
          >
            🧪 Report Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="shop-filter"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Select Shop:
              </label>
              <select
                id="shop-filter"
                value={filters.shop}
                onChange={(e) => handleFilterChange("shop", e.target.value)}
                className={`w-full border rounded-md px-2 py-2 focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-xs ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
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
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Select Date:
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => navigateDate(-1)}
                  className={`px-2 py-2 rounded-md transition-colors text-xs ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                      : "bg-slate-200 hover:bg-slate-300 text-slate-700"
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
                  className={`flex-1 border rounded-md px-2 py-2 focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-xs ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-slate-200"
                      : "bg-white border-slate-300 text-slate-700"
                  }`}
                />
                <button
                  onClick={() => navigateDate(1)}
                  className={`px-2 py-2 rounded-md transition-colors text-xs ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                      : "bg-slate-200 hover:bg-slate-300 text-slate-700"
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
                className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-xs font-medium"
              >
                📅 Today
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-xs font-medium disabled:opacity-50"
              >
                {loading ? "🔄 Loading..." : "🔄 Refresh"}
              </button>
            </div>
          </div>
        </section>

        {/* Cash Balance Section */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700/20"
              : "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-green-300" : "text-green-800"
            }`}
          >
            💰 Cash Balance Management
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Temporary Save & Show PDF Button */}
            <div className="col-span-1 md:col-span-4 flex items-center mt-4">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className={`px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm`}
              >
                💾 Save
              </button>
              {/* <span className={`ml-3 text-xs ${isDarkMode ? "text-green-300" : "text-green-700"}`}></span> */}
            </div>
            <div>
              <label
                htmlFor="cashier-name"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Cashier Name:
              </label>
              <input
                id="cashier-name"
                type="text"
                value={cashierName}
                onChange={(e) => {
                  setCashierName(e.target.value);
                  localStorage.setItem("cashierName", e.target.value);
                }}
                className={`w-full border rounded-md px-2 py-2 focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-xs ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                placeholder="Enter cashier name"
              />
            </div>

            <div>
              <label
                htmlFor="opening-balance"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Opening Balance (Rs.):
              </label>
              <input
                id="opening-balance"
                type="number"
                step="0.01"
                min="0"
                value={openingBalance}
                onChange={(e) =>
                  setOpeningBalance(parseFloat(e.target.value) || 0)
                }
                className={`w-full border rounded-md px-2 py-2 focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-xs ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                placeholder="0.00"
              />
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Sales Value (Rs.):
              </label>
              <div
                className={`w-full border rounded-md px-2 py-2 font-medium text-xs ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-green-400"
                    : "bg-green-50 border-green-300 text-green-800"
                }`}
              >
                {summaryStats.totalSalesValue.toFixed(2)}
              </div>
            </div>

            <div>
              <label
                htmlFor="closing-balance"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Closing Balance (Rs.):
              </label>
              <input
                id="closing-balance"
                type="number"
                step="0.01"
                value={closingBalance}
                onChange={(e) =>
                  setClosingBalance(parseFloat(e.target.value) || 0)
                }
                className={`w-full border rounded-md px-2 py-2 focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-xs ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                placeholder="0.00"
              />
              <p
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                Deposite Value: Rs. {calculatedClosingBalance.toFixed(2)}
              </p>
            </div>

            <div>
              <label
                htmlFor="deposit"
                className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Deposit (Rs.):
              </label>
              <input
                id="deposit"
                type="number"
                step="0.01"
                min="0"
                value={deposit}
                onChange={(e) => {
                  setDeposit(parseFloat(e.target.value) || 0);
                  localStorage.setItem("deposit", e.target.value);
                }}
                className={`w-full border rounded-md px-2 py-2 focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-xs ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                placeholder="0.00"
              />
            </div>
          </div>

          <p className={`text-xs mt-1 ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
            <span>Equation: <b>Opening + Selling - Closing vs Deposit</b></span><br/>
            <span>
              {openingBalance.toFixed(2)} + {calculatedSellingValue.toFixed(2)} - {closingBalance.toFixed(2)} vs {deposit.toFixed(2)}
            </span><br/>
            <span>
              {equationResult.leftSide.toFixed(2)} vs {equationResult.rightSide.toFixed(2)}
            </span><br/>
            <span>
              {equationResult.isBalanced
                ? <span className="text-green-600">Balanced</span>
                : equationResult.isLoss
                  ? <span className="text-red-600">Loss/Deficit: Rs. {equationResult.deficit.toFixed(2)}</span>
                  : <span className="text-blue-600">Surplus/Additional: Rs. {equationResult.surplus.toFixed(2)}</span>
              }
            </span>
          </p>
        </section>

        {/* Summary Statistics */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/90 border-gray-700/20"
              : "bg-white/90 border-white/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}
          >
            📊 Summary Statistics - {filters.shop} - {filters.date}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div
              className={`text-center p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-blue-900/30" : "bg-blue-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {summaryStats.totalItems}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                Items Added
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-indigo-900/30" : "bg-indigo-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                {summaryStats.totalStartingInventory}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-indigo-300" : "text-indigo-700"
                }`}
              >
                Starting Total
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-orange-900/30" : "bg-orange-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-orange-400" : "text-orange-600"
                }`}
              >
                {summaryStats.totalSold}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-orange-300" : "text-orange-700"
                }`}
              >
                Items Sold
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-emerald-900/30" : "bg-emerald-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                {summaryStats.totalRemaining}
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
              className={`text-center p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-red-900/30" : "bg-red-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                {summaryStats.totalTransferOut + summaryStats.totalDiscard}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-red-300" : "text-red-700"
                }`}
              >
                Transfer + Discard
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-purple-900/30" : "bg-purple-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-purple-400" : "text-purple-600"
                }`}
              >
                {summaryStats.itemTypes}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-purple-300" : "text-purple-700"
                }`}
              >
                Item Types
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-yellow-900/30" : "bg-yellow-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-yellow-400" : "text-yellow-600"
                }`}
              >
                {summaryStats.soldPercentage}%
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-yellow-300" : "text-yellow-700"
                }`}
              >
                Sales Rate
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-lg border-2 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-green-900/30 border-green-700"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                Rs. {summaryStats.totalSalesValue.toFixed(2)}
              </div>
              <div
                className={`text-xs font-medium ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Bakery Sales Value
              </div>
            </div>
          </div>
        </section>

        {/* Beverage Summary */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-orange-900/80 to-blue-900/80 border-purple-700/20"
              : "bg-gradient-to-r from-orange-50/80 to-blue-50/80 border-purple-200/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-purple-200" : "text-purple-800"
            }`}
          >
            🥤 Beverage Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div
              className={`text-center p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-orange-900/30" : "bg-orange-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-orange-400" : "text-orange-600"
                }`}
              >
                {summaryStats.totalBeveragePreviousDay}
              </div>
              <div
                className={`text-xs ${
                  isDarkMode ? "text-orange-300" : "text-orange-700"
                }`}
              >
                Previous Day Total
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-blue-900/30" : "bg-blue-50"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {summaryStats.totalBeverageToday}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                Today Total Count
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-green-900/30" : "bg-green-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                {summaryStats.totalBeverageSold}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Beverages Sold
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg border-2 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-purple-900/30 border-purple-700"
                  : "bg-purple-50 border-purple-200"
              }`}
            >
              <div
                className={`text-xl font-bold ${
                  isDarkMode ? "text-purple-400" : "text-purple-600"
                }`}
              >
                Rs. {summaryStats.totalBeverageSalesValue.toFixed(2)}
              </div>
              <div
                className={`text-sm font-medium ${
                  isDarkMode ? "text-purple-300" : "text-purple-700"
                }`}
              >
                Beverage Sales Value
              </div>
            </div>
          </div>

          {/* Individual Beverage Breakdown */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {completeBeverageData.map((beverage) => (
              <div
                key={beverage.itemName}
                className={`p-4 rounded-lg border transition-colors duration-300 ${
                  beverage.itemName === "Nescafe"
                    ? isDarkMode
                      ? "bg-orange-900/20 border-orange-700/50"
                      : "bg-orange-50 border-orange-200"
                    : isDarkMode
                    ? "bg-blue-900/20 border-blue-700/50"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">
                    {beverage.itemName === "Nescafe" ? "☕" : "🧊"}
                  </span>
                  <span
                    className={`font-medium ${
                      beverage.itemName === "Nescafe"
                        ? isDarkMode
                          ? "text-orange-300"
                          : "text-orange-700"
                        : isDarkMode
                        ? "text-blue-300"
                        : "text-blue-700"
                    }`}
                  >
                    {beverage.itemName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                      Previous:
                    </span>
                    <span className="ml-1 font-medium">{beverage.previousDayCount}</span>
                  </div>
                  <div>
                    <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                      Today:
                    </span>
                    <span className="ml-1 font-medium">{beverage.todayCount}</span>
                  </div>
                  <div>
                    <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                      Sold:
                    </span>
                    <span className="ml-1 font-medium">{beverage.selling}</span>
                  </div>
                  <div>
                    <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                      Value:
                    </span>
                    <span className="ml-1 font-medium">Rs. {beverage.totalValue !== null ? beverage.totalValue.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Combined Total Summary */}
        <section
          className={`backdrop-blur-sm rounded-xl shadow-xl border p-6 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-green-900/80 to-emerald-900/80 border-green-700/20"
              : "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              isDarkMode ? "text-green-200" : "text-green-800"
            }`}
          >
            💰 Grand Total Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={`text-center p-6 rounded-xl border-2 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-green-900/40 border-green-600"
                  : "bg-green-50 border-green-300"
              }`}
            >
              <div
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                {summaryStats.grandTotalSold}
              </div>
              <div
                className={`text-sm font-medium ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Total Items Sold
              </div>
              <div
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                Bakery: {summaryStats.totalSold} + Beverages: {summaryStats.totalBeverageSold}
              </div>
            </div>

            <div
              className={`text-center p-6 rounded-xl border-2 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-emerald-900/40 border-emerald-600"
                  : "bg-emerald-50 border-emerald-300"
              }`}
            >
              <div
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                Rs. {totalSalesValue.toFixed(2)}
              </div>
              <div
                className={`text-sm font-medium ${
                  isDarkMode ? "text-emerald-300" : "text-emerald-700"
                }`}
              >
                Total Sales Value
              </div>
              <div
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                Bakery: Rs. {summaryStats.totalSalesValue.toFixed(2)} + Beverages: Rs. {summaryStats.totalBeverageSalesValue.toFixed(2)}
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Table */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border overflow-hidden transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/90 border-gray-700/20"
              : "bg-white/90 border-white/20"
          }`}
        >
          <div
            className={`p-4 border-b ${
              isDarkMode ? "border-slate-700" : "border-slate-200"
            }`}
          >
            <h2
              className={`text-lg font-semibold flex items-center gap-2 ${
                isDarkMode ? "text-slate-200" : "text-slate-800"
              }`}
            >
              📋 Detailed Breakdown
            </h2>
            <p
              className={`text-xs mt-1 ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Item-wise sales and inventory details
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
                    className={`px-2 py-2 text-center text-xs font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Previous Day
                  </th>
                  <th
                    className={`px-2 py-2 text-center text-xs font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Added
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Morning
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Evening
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Extra In
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Sold
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Remaining
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Price (Rs.)
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Sales Value (Rs.)
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
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
                        <p
                          className={`text-lg font-medium ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Loading summary data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : enhancedTableData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div
                        className={`text-lg font-medium ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        No data found for {filters.shop} on {filters.date}
                      </div>
                      <p
                        className={`text-sm mt-2 ${
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        Try selecting a different date or shop, or add inventory
                        data first.
                      </p>
                    </td>
                  </tr>
                ) : (
                  enhancedTableData.map((item, index) => {
                    const hasData =
                      item.addedInventory > 0 ||
                      item.morningTime > 0 ||
                      item.eveningTime > 0 ||
                      item.extraIn > 0 ||
                      item.selling > 0 ||
                      item.transferOut > 0 ||
                      item.discard > 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors duration-150 ${
                          hasData
                            ? isDarkMode
                              ? "bg-blue-900/20 hover:bg-blue-800/30"
                              : "bg-blue-50/50 hover:bg-blue-100/50"
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
                                hasData
                                  ? "bg-green-500"
                                  : isDarkMode
                                  ? "bg-slate-600"
                                  : "bg-slate-300"
                              }`}
                            ></span>
                            <span>{item.itemName}</span>
                            {item.price === null && hasData && (
                              <span
                                className="text-red-500 text-xs"
                                title="Price missing"
                              >
                                ⚠️
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-3 text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-orange-900/50 text-orange-300"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {item.previousDayRemaining || 0}
                          </span>
                        </td>

                        <td className="px-2 py-3 text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-blue-900/50 text-blue-300"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.addedInventory}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-indigo-900/50 text-indigo-300"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {item.morningTime}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-violet-900/50 text-violet-300"
                                : "bg-violet-100 text-violet-800"
                            }`}
                          >
                            {item.eveningTime}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-teal-900/50 text-teal-300"
                                : "bg-teal-100 text-teal-800"
                            }`}
                          >
                            {item.extraIn}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-orange-900/50 text-orange-300"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {item.selling}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.remainingInventory > 0
                                ? isDarkMode
                                  ? "bg-emerald-900/50 text-emerald-300"
                                  : "bg-emerald-100 text-emerald-800"
                                : item.remainingInventory === 0
                                ? isDarkMode
                                  ? "bg-yellow-900/50 text-yellow-300"
                                  : "bg-yellow-100 text-yellow-800"
                                : isDarkMode
                                ? "bg-red-900/50 text-red-300"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.remainingInventory}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          {item.price !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-purple-900/50 text-purple-300"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {item.price.toFixed(2)}
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

                        <td className="px-4 py-4 text-sm text-center">
                          {item.salesValue !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.salesValue > 0
                                  ? isDarkMode
                                    ? "bg-green-900/50 text-green-300"
                                    : "bg-green-100 text-green-800"
                                  : isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {item.salesValue.toFixed(2)}
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

        {/* Action Buttons Section */}
        <section
          className={`backdrop-blur-sm rounded-lg shadow-md border p-4 mb-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-700/20"
              : "bg-white/80 border-white/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}
          >
            Actions & Reports
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 text-sm"
            >
              <span className="text-lg">📄</span>
              <div>
                <div className="font-semibold">Download PDF Report</div>
                <div className="text-xs opacity-90">Complete daily summary</div>
              </div>
            </button>

            <button
              onClick={() => navigateToPage("/selection")}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 text-sm"
            >
              <span className="text-lg">📋</span>
              <div>
                <div className="font-semibold">Update Inventory</div>
                <div className="text-xs opacity-90">Modify daily data</div>
              </div>
            </button>

            <button
              onClick={() => navigateToPage("/addPrice")}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-md transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 text-sm"
            >
              <span className="text-lg">💰</span>
              <div>
                <div className="font-semibold">Manage Prices</div>
                <div className="text-xs opacity-90">Update item pricing</div>
              </div>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer
          className={`text-center mt-6 py-4 text-xs ${
            isDarkMode ? "text-slate-400" : "text-slate-600"
          }`}
        >
          <p>T & S Bakery - Daily Summary Report</p>
          <p className="mt-1">
            Shop: {filters.shop} | Date: {filters.date} | Grand Total Sales: Rs.{" "}
            {totalSalesValue.toFixed(2)} | Bakery Items:{" "}
            {summaryStats.itemTypes} | Beverages: {summaryStats.beverageTypes}
          </p>
          <p className="mt-1 text-xs">
            Bakery Sales: Rs. {summaryStats.totalSalesValue.toFixed(2)} | Beverage Sales: Rs. {summaryStats.totalBeverageSalesValue.toFixed(2)} | Opening: Rs. {openingBalance.toFixed(2)} | Closing: Rs. {closingBalance.toFixed(2)}
          </p>
        </footer>
      </div>
      </div>
    </div>
  );
}