import {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
  MetaInfo,
} from "pg-sdk-node";
import { randomUUID } from "crypto";

const clientId = "TEST-M23ONA82ZV8C1_25092";
const clientSecret = "NzE4MmRhN2QtMzY2ZS00ZTM1LTgwYWYtYWI3Nzg0OTg0MWI0";
const clientVersion = "1";

const client = new StandardCheckoutClient({
  clientId: process.env.PHONEPE_CLIENT_ID || clientId,
  clientSecret: process.env.PHONEPE_CLIENT_SECRET || clientSecret,
  clientVersion: process.env.PHONEPE_CLIENT_VERSION || clientVersion,
  env: process.env || Env.SANDBOX,
});

const payReq = {
  merchantOrderId: "order-123",
  amount: 15000, // in paise
  redirectUrl: "https://your.site/return",
  callbackUrl: "https://your.api/phonepe/callback",
  metaInfo: {
    /* optional meta fields */
  },
  // ...other fields per StandardCheckoutPayRequest
};

const payResp = await client.pay(payReq);
const status = await client.getOrderStatus("order-123");
