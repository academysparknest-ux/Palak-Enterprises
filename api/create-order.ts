import { handleCreateOrder } from "./_razorpayServer.ts";

export default async function handler(req: any, res: any) {
  return handleCreateOrder(req, res);
}
