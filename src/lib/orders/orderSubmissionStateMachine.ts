export type OrderSubmissionState =
  | "IDLE"
  | "SUBMITTING"
  | "VALIDATING"
  | "UPLOADING"
  | "PROCESSING"
  | "ORDER_CREATING"
  | "PAYMENT_PENDING"
  | "PAYMENT_PROCESSING"
  | "RECOVERING"
  | "COMPLETED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED";

export interface FileProgressInfo {
  index: number;
  name: string;
  size: number;
  loaded: number;
  percent: number;
  status: "waiting" | "uploading" | "completed" | "failed";
  storageUrl?: string;
  storagePath?: string;
  mimeType?: string;
  error?: string;
}

export interface UploadProgressSummary {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  completedFiles: number;
  totalFiles: number;
  currentFileName?: string;
}

export interface StateTimelineEntry {
  state: OrderSubmissionState;
  titleEn: string;
  titleHi: string;
  timestamp: Date;
  detail?: string;
}

export interface StateMetadata {
  state: OrderSubmissionState;
  titleEn: string;
  titleHi: string;
  subtextEn: string;
  subtextHi: string;
  activeStepIndex: number; // 0: Order received, 1: Validated, 2: Uploaded, 3: Processed, 4: Created, 5: Payment
  canCancel: boolean;
  cancelButtonLabelEn: string;
  cancelButtonLabelHi: string;
  cancelDialogMessageEn: string;
  cancelDialogMessageHi: string;
}

export const STATE_METADATA_MAP: Record<OrderSubmissionState, StateMetadata> = {
  IDLE: {
    state: "IDLE",
    titleEn: "Ready to Submit",
    titleHi: "सबमिट करने के लिए तैयार",
    subtextEn: "Please review your document settings and submit when ready.",
    subtextHi: "कृपया अपनी दस्तावेज सेटिंग्स की समीक्षा करें और तैयार होने पर सबमिट करें।",
    activeStepIndex: -1,
    canCancel: false,
    cancelButtonLabelEn: "Cancel",
    cancelButtonLabelHi: "रद्द करें",
    cancelDialogMessageEn: "Are you sure you want to cancel?",
    cancelDialogMessageHi: "क्या आप वाकई रद्द करना चाहते हैं?",
  },
  SUBMITTING: {
    state: "SUBMITTING",
    titleEn: "Submitting Order...",
    titleHi: "ऑर्डर सबमिट हो रहा है...",
    subtextEn: "Initializing your secure submission session...",
    subtextHi: "आपका सुरक्षित सबमिशन सत्र प्रारंभ किया जा रहा है...",
    activeStepIndex: 0,
    canCancel: true,
    cancelButtonLabelEn: "Cancel Submission",
    cancelButtonLabelHi: "सबमिशन रद्द करें",
    cancelDialogMessageEn: "Your submission request has just started. Cancelling will stop the request safely.",
    cancelDialogMessageHi: "आपका सबमिशन अनुरोध अभी शुरू हुआ है। रद्द करने पर यह सुरक्षित रूप से रुक जाएगा।",
  },
  VALIDATING: {
    state: "VALIDATING",
    titleEn: "Validating Documents & Settings",
    titleHi: "दस्तावेज व सेटिंग्स का सत्यापन",
    subtextEn: "Checking document configurations, page limits, and print service availability...",
    subtextHi: "दस्तावेज सेटिंग्स, पेज सीमा और प्रिंट सेवा उपलब्धता की जाँच की जा रही है...",
    activeStepIndex: 1,
    canCancel: true,
    cancelButtonLabelEn: "Cancel Submission",
    cancelButtonLabelHi: "सबमिशन रद्द करें",
    cancelDialogMessageEn: "Your documents are currently being validated. You can safely cancel now.",
    cancelDialogMessageHi: "आपके दस्तावेजों का सत्यापन किया जा रहा है। आप अभी सुरक्षित रूप से रद्द कर सकते हैं।",
  },
  UPLOADING: {
    state: "UPLOADING",
    titleEn: "Uploading Documents",
    titleHi: "दस्तावेज अपलोड हो रहे हैं",
    subtextEn: "Securely transferring your document files to print storage...",
    subtextHi: "आपकी फाइलें सुरक्षित रूप से प्रिंट स्टोरेज में अपलोड की जा रही हैं...",
    activeStepIndex: 2,
    canCancel: true,
    cancelButtonLabelEn: "Cancel Upload",
    cancelButtonLabelHi: "अपलोड रद्द करें",
    cancelDialogMessageEn: "Your documents are currently uploading. If you cancel now, the upload will stop immediately and no order will be created.",
    cancelDialogMessageHi: "आपके दस्तावेज वर्तमान में अपलोड हो रहे हैं। यदि आप रद्द करते हैं, तो अपलोड तुरंत बंद हो जाएगा और कोई ऑर्डर नहीं बनेगा।",
  },
  PROCESSING: {
    state: "PROCESSING",
    titleEn: "Processing Document Settings",
    titleHi: "प्रिंट सेटिंग्स प्रोसेस हो रही हैं",
    subtextEn: "Verifying color breakdowns, duplex sheets, GSM paper, and finishing specifications...",
    subtextHi: "कलर अनुपात, डबल-साइड शीट्स, GSM पेपर और फिनिशिंग सेटिंग्स की पुष्टि की जा रही है...",
    activeStepIndex: 3,
    canCancel: true,
    cancelButtonLabelEn: "Cancel Processing",
    cancelButtonLabelHi: "प्रोसेसिंग रद्द करें",
    cancelDialogMessageEn: "Your document settings are currently being processed. Cancelling now will prevent the order from being recorded.",
    cancelDialogMessageHi: "आपकी सेटिंग्स प्रोसेस की जा रही हैं। रद्द करने पर ऑर्डर दर्ज नहीं किया जाएगा।",
  },
  ORDER_CREATING: {
    state: "ORDER_CREATING",
    titleEn: "Creating Your Production Order",
    titleHi: "प्रोडक्शन ऑर्डर बनाया जा रहा है",
    subtextEn: "Securely registering your order and print job. Please keep this window open.",
    subtextHi: "आपका ऑर्डर और प्रिंट जॉब सुरक्षित रूप से दर्ज किया जा रहा है। कृपया इस विंडो को खुला रखें।",
    activeStepIndex: 4,
    canCancel: false, // Database commit in-flight: cancellation locked to prevent race conditions
    cancelButtonLabelEn: "Finalizing Order...",
    cancelButtonLabelHi: "ऑर्डर दर्ज हो रहा है...",
    cancelDialogMessageEn: "Your order is currently being registered with the print database. Please wait a moment.",
    cancelDialogMessageHi: "आपका ऑर्डर प्रिंट डेटाबेस में दर्ज किया जा रहा है। कृपया प्रतीक्षा करें।",
  },
  PAYMENT_PENDING: {
    state: "PAYMENT_PENDING",
    titleEn: "Awaiting Secure Payment",
    titleHi: "सुरक्षित भुगतान की प्रतीक्षा",
    subtextEn: "Complete your online payment in the payment window (UPI / QR / Card / NetBanking)...",
    subtextHi: "भुगतान विंडो में अपना ऑनलाइन भुगतान पूरा करें (UPI / QR / कार्ड / नेटबैंकिंग)...",
    activeStepIndex: 5,
    canCancel: true,
    cancelButtonLabelEn: "Cancel Payment",
    cancelButtonLabelHi: "भुगतान रद्द करें",
    cancelDialogMessageEn: "Are you sure you want to cancel this payment? If you cancel, your order will remain pending and you can pay at pickup instead.",
    cancelDialogMessageHi: "क्या आप वाकई भुगतान रद्द करना चाहते हैं? रद्द करने पर ऑर्डर पेंडिंग रहेगा और आप पिकअप पर भुगतान कर सकते हैं।",
  },
  PAYMENT_PROCESSING: {
    state: "PAYMENT_PROCESSING",
    titleEn: "Verifying Payment Confirmation",
    titleHi: "भुगतान सत्यापन जारी",
    subtextEn: "Authoritatively verifying transaction status with the payment gateway...",
    subtextHi: "पेमेंट गेटवे के साथ ट्रांजेक्शन स्थिति का सत्यापन किया जा रहा है...",
    activeStepIndex: 5,
    canCancel: false,
    cancelButtonLabelEn: "Verifying...",
    cancelButtonLabelHi: "सत्यापित हो रहा है...",
    cancelDialogMessageEn: "Payment verification is in progress. Please do not close or refresh this window.",
    cancelDialogMessageHi: "भुगतान सत्यापन जारी है। कृपया इस विंडो को बंद या रीफ्रेश न करें।",
  },
  RECOVERING: {
    state: "RECOVERING",
    titleEn: "Recovering In-Flight Submission",
    titleHi: "सबमिशन स्थिति पुनः प्राप्त की जा रही है",
    subtextEn: "Checking backend records for existing confirmed order under your submission session...",
    subtextHi: "आपके सबमिशन सत्र के तहत पहले से मौजूद ऑर्डर की पुष्टि की जा रही है...",
    activeStepIndex: 4,
    canCancel: false,
    cancelButtonLabelEn: "Checking...",
    cancelButtonLabelHi: "जाँच जारी...",
    cancelDialogMessageEn: "Checking submission status with server...",
    cancelDialogMessageHi: "सर्वर से स्थिति जाँची जा रही है...",
  },
  COMPLETED: {
    state: "COMPLETED",
    titleEn: "Order Successfully Confirmed!",
    titleHi: "ऑर्डर सफलतापूर्वक दर्ज!",
    subtextEn: "Your print job has been securely registered in the production queue.",
    subtextHi: "आपका प्रिंट जॉब उत्पादन कतार में सुरक्षित रूप से दर्ज कर दिया गया है।",
    activeStepIndex: 6,
    canCancel: false,
    cancelButtonLabelEn: "Done",
    cancelButtonLabelHi: "पूर्ण",
    cancelDialogMessageEn: "",
    cancelDialogMessageHi: "",
  },
  FAILED: {
    state: "FAILED",
    titleEn: "Submission Error",
    titleHi: "सबमिशन त्रुटि",
    subtextEn: "Something went wrong during submission. Your files and settings are preserved.",
    subtextHi: "सबमिशन के दौरान त्रुटि हुई। आपकी फाइलें और सेटिंग्स सुरक्षित हैं।",
    activeStepIndex: -1,
    canCancel: false,
    cancelButtonLabelEn: "Close",
    cancelButtonLabelHi: "बंद करें",
    cancelDialogMessageEn: "",
    cancelDialogMessageHi: "",
  },
  CANCEL_REQUESTED: {
    state: "CANCEL_REQUESTED",
    titleEn: "Cancelling Submission...",
    titleHi: "सबमिशन रद्द किया जा रहा है...",
    subtextEn: "Safely aborting network transfers and cleaning up temporary session data...",
    subtextHi: "नेटवर्क ट्रांसफर सुरक्षित रूप से रोका जा रहा है...",
    activeStepIndex: -1,
    canCancel: false,
    cancelButtonLabelEn: "Cancelling...",
    cancelButtonLabelHi: "रद्द हो रहा है...",
    cancelDialogMessageEn: "",
    cancelDialogMessageHi: "",
  },
  CANCELLED: {
    state: "CANCELLED",
    titleEn: "Submission Cancelled",
    titleHi: "सबमिशन रद्द किया गया",
    subtextEn: "The submission was cancelled. No order was created.",
    subtextHi: "सबमिशन रद्द कर दिया गया। कोई ऑर्डर नहीं बनाया गया।",
    activeStepIndex: -1,
    canCancel: false,
    cancelButtonLabelEn: "Return to Form",
    cancelButtonLabelHi: "फॉर्म पर वापस जाएं",
    cancelDialogMessageEn: "",
    cancelDialogMessageHi: "",
  },
};

export function formatByteSize(bytes: number): string {
  if (bytes <= 0 || !isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatTimestamp(date: Date): string {
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}
