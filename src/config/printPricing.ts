export interface PrintPricingConfig {
  documentPrinting: {
    paperSizes: {
      a4: { name: string; multiplier: number; enabled: boolean };
      a3: { name: string; multiplier: number; enabled: boolean };
      a5: { name: string; multiplier: number; enabled: boolean };
    };
    baseRatePerPage: {
      bwSingle: number; // ₹2.00
      bwDouble: number; // ₹1.50 per side (₹3.00 per leaf)
      colorSingle: number; // ₹10.00
      colorDouble: number; // ₹9.00 per side (₹18.00 per leaf)
    };
    finishing: {
      spiralBinding: {
        id: "spiral_binding";
        name: { en: string; hi: string };
        enabled: boolean;
        price: number; // ₹30
        minPages: number;
      };
      combBinding: {
        id: "comb_binding";
        name: { en: string; hi: string };
        enabled: boolean;
        price: number; // ₹25
        minPages: number;
      };
      lamination: {
        id: "lamination";
        name: { en: string; hi: string };
        enabled: boolean;
        pricePerPage: number; // ₹15 per leaf
      };
      stapling: {
        id: "stapling";
        name: { en: string; hi: string };
        enabled: boolean;
        price: number; // ₹5
      };
    };
  };
  passportPhoto: {
    sheet8: number; // ₹50
    sheet16: number; // ₹90
    sheet32: number; // ₹160
    singlePrint: number; // ₹20
  };
  visitingCards: {
    base100Single: number; // ₹250
    base100Double: number; // ₹400
    base500Single: number; // ₹850
    base500Double: number; // ₹1200
    base1000Single: number; // ₹1500
    base1000Double: number; // ₹2000
    matteFinishExtra: number; // ₹50
    glossFinishExtra: number; // ₹50
    velvetFinishExtra: number; // ₹150
  };
  idCards: {
    pvcSingle: number; // ₹60
    pvcDouble: number; // ₹80
    withLanyardHolder: number; // ₹25 extra
  };
  posters: {
    a4Photo: number; // ₹20
    a3Glossy: number; // ₹40
    a2Photo: number; // ₹120
    vinylPerSqFt: number; // ₹45
    flexPerSqFt: number; // ₹18
  };
}

export const DEFAULT_PRINT_PRICING: PrintPricingConfig = {
  documentPrinting: {
    paperSizes: {
      a4: { name: "A4 (Standard 210 × 297 mm)", multiplier: 1.0, enabled: true },
      a3: { name: "A3 (Large 297 × 420 mm)", multiplier: 2.0, enabled: true },
      a5: { name: "A5 (Booklet 148 × 210 mm)", multiplier: 0.75, enabled: true },
    },
    baseRatePerPage: {
      bwSingle: 2.0,
      bwDouble: 1.5, // per side
      colorSingle: 10.0,
      colorDouble: 9.0, // per side
    },
    finishing: {
      spiralBinding: {
        id: "spiral_binding",
        name: { en: "Spiral Binding (Plastic Coil & Transparent Covers)", hi: "स्पाइरल बाइंडिंग (प्लास्टिक कॉइल व पारदर्शी कवर)" },
        enabled: true,
        price: 30,
        minPages: 1,
      },
      combBinding: {
        id: "comb_binding",
        name: { en: "Comb Binding (Ring Spine & Protective Covers)", hi: "कॉम्ब बाइंडिंग (रिंग स्पाइन व सुरक्षा कवर)" },
        enabled: true,
        price: 25,
        minPages: 1,
      },
      lamination: {
        id: "lamination",
        name: { en: "Thermal Lamination (Durable Waterproof Seal)", hi: "थर्मल लैमिनेशन (वॉटरप्रूफ सुरक्षा शीट)" },
        enabled: true,
        pricePerPage: 15,
      },
      stapling: {
        id: "stapling",
        name: { en: "Corner / Saddle Stapling", hi: "कॉर्नर स्टेपलिंग (पिन लगाना)" },
        enabled: true,
        price: 5,
      },
    },
  },
  passportPhoto: {
    sheet8: 50,
    sheet16: 90,
    sheet32: 160,
    singlePrint: 20,
  },
  visitingCards: {
    base100Single: 250,
    base100Double: 400,
    base500Single: 850,
    base500Double: 1200,
    base1000Single: 1500,
    base1000Double: 2000,
    matteFinishExtra: 50,
    glossFinishExtra: 50,
    velvetFinishExtra: 150,
  },
  idCards: {
    pvcSingle: 60,
    pvcDouble: 80,
    withLanyardHolder: 25,
  },
  posters: {
    a4Photo: 20,
    a3Glossy: 40,
    a2Photo: 120,
    vinylPerSqFt: 45,
    flexPerSqFt: 18,
  },
};

export interface DocumentPrintOrderOptions {
  docType: string;
  customDocType?: string;
  paperSize: "a4" | "a3" | "a5";
  colorMode: "bw" | "color";
  sides: "single" | "double";
  orientation: "portrait" | "landscape";
  copies: number;
  pageRangeType: "all" | "custom";
  customPageRange?: string;
  totalPagesInDoc: number;
  finishing: {
    spiralBinding: boolean;
    combBinding: boolean;
    lamination: boolean;
    stapling: boolean;
  };
}

export function parsePageRangeCount(customRange: string, totalPages: number): number {
  if (!customRange || !customRange.trim()) return totalPages;
  const parts = customRange.split(",").map((s) => s.trim());
  const pageSet = new Set<number>();

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => parseInt(s.trim(), 10));
      if (!isNaN(startStr) && !isNaN(endStr)) {
        const start = Math.max(1, Math.min(startStr, endStr));
        const end = Math.min(totalPages, Math.max(startStr, endStr));
        for (let i = start; i <= end; i++) {
          pageSet.add(i);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pageSet.add(pageNum);
      }
    }
  }

  return pageSet.size > 0 ? pageSet.size : totalPages;
}

export function calculateDocumentPrintPrice(
  options: DocumentPrintOrderOptions,
  pricing: PrintPricingConfig = DEFAULT_PRINT_PRICING
): {
  pagesToPrint: number;
  printCostPerCopy: number;
  finishingCostPerCopy: number;
  unitPrice: number;
  subtotal: number;
  total: number;
  breakdown: {
    basePrint: number;
    spiral: number;
    comb: number;
    lamination: number;
    stapling: number;
  };
} {
  const pagesToPrint =
    options.pageRangeType === "custom" && options.customPageRange
      ? parsePageRangeCount(options.customPageRange, Math.max(1, options.totalPagesInDoc))
      : Math.max(1, options.totalPagesInDoc);

  const sizeMultiplier = pricing.documentPrinting.paperSizes[options.paperSize]?.multiplier || 1.0;

  // Rate per page
  let ratePerPage = 0;
  if (options.colorMode === "bw") {
    ratePerPage =
      options.sides === "single"
        ? pricing.documentPrinting.baseRatePerPage.bwSingle
        : pricing.documentPrinting.baseRatePerPage.bwDouble;
  } else {
    ratePerPage =
      options.sides === "single"
        ? pricing.documentPrinting.baseRatePerPage.colorSingle
        : pricing.documentPrinting.baseRatePerPage.colorDouble;
  }

  const basePrintCost = Math.round(pagesToPrint * ratePerPage * sizeMultiplier);

  // Finishing costs per copy
  let spiralCost = 0;
  if (options.finishing.spiralBinding && pricing.documentPrinting.finishing.spiralBinding.enabled) {
    spiralCost = pricing.documentPrinting.finishing.spiralBinding.price;
  }

  let combCost = 0;
  if (options.finishing.combBinding && pricing.documentPrinting.finishing.combBinding.enabled) {
    combCost = pricing.documentPrinting.finishing.combBinding.price;
  }

  let laminationCost = 0;
  if (options.finishing.lamination && pricing.documentPrinting.finishing.lamination.enabled) {
    const sheets = options.sides === "double" ? Math.ceil(pagesToPrint / 2) : pagesToPrint;
    laminationCost = sheets * pricing.documentPrinting.finishing.lamination.pricePerPage * sizeMultiplier;
  }

  let staplingCost = 0;
  if (options.finishing.stapling && pricing.documentPrinting.finishing.stapling.enabled) {
    staplingCost = pricing.documentPrinting.finishing.stapling.price;
  }

  const totalFinishing = spiralCost + combCost + laminationCost + staplingCost;
  const costPerCopy = basePrintCost + totalFinishing;
  const copies = Math.max(1, options.copies || 1);
  const totalAmount = costPerCopy * copies;

  return {
    pagesToPrint,
    printCostPerCopy: basePrintCost,
    finishingCostPerCopy: totalFinishing,
    unitPrice: costPerCopy,
    subtotal: totalAmount,
    total: totalAmount,
    breakdown: {
      basePrint: basePrintCost,
      spiral: spiralCost,
      comb: combCost,
      lamination: laminationCost,
      stapling: staplingCost,
    },
  };
}
