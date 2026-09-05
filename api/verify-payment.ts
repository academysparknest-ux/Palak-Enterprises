import { handleVerifyPayment } from "./_razorpayServer.ts";

export default async function handler(req: any, res: any) {
  return handleVerifyPayment(req, res);
}
