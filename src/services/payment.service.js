import {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
  MetaInfo,
} from "pg-sdk-node";
import { randomUUID } from "crypto";
// import { logger } from "../app.js";

let clientInstance = null;
let PayRequestClass = StandardCheckoutPayRequest;
let MetaInfoClass = MetaInfo;
let EnvEnum = Env;
let callbackUser = null;
let callbackPass = null;

const initPhonePe = async (cfg = {}) => {
  if (clientInstance) return clientInstance;

  const {
    clientId,
    clientSecret,
    clientVersion = "1",
    env = "SANDBOX",
    callbackUsername,
    callbackPassword,
  } = cfg;

  if (!clientId || !clientSecret) {
    throw new Error("initPhonePe: clientId and clientSecret are required");
  }

  if (!callbackUsername || !callbackPassword) {
    // logger.warn(
    //   "initPhonePe: callbackUser/callbackPass not provided — validateCallback will fail without them"
    // );
  }

  // Resolve env (allow passing Env.SANDBOX or string)
  const resolvedEnv =
    typeof env === "string"
      ? env.toUpperCase() === "PRODUCTION"
        ? EnvEnum.PRODUCTION
        : EnvEnum.SANDBOX
      : env;

  clientInstance = StandardCheckoutClient.getInstance(
    clientId,
    clientSecret,
    clientVersion,
    resolvedEnv
  );

  callbackUser = callbackUsername;
  callbackPass = callbackPassword;

  // keep class refs (useful if SDK exports change)
  PayRequestClass = PayRequestClass ?? StandardCheckoutPayRequest;
  MetaInfoClass = MetaInfoClass ?? MetaInfo;
  EnvEnum = EnvEnum ?? Env;

  return clientInstance;
};

const createPayment = async (opts = {}) => {
  if (!clientInstance) {
    // logger.error("createPayment: call initPhonePe() first");
    throw new Error("createPayment: call initPhonePe() first");
  }

  const {
    amountInPaise,
    redirectUrl,
    meta = {},
    merchantOrderId = randomUUID(),
    extraFields = {},
  } = opts;

  if (
    !amountInPaise ||
    typeof amountInPaise !== "number" ||
    amountInPaise <= 0
  ) {
    // logger.error("createPayment: amountInPaise (number > 0) is required");
    throw new Error("createPayment: amountInPaise (number > 0) is required");
  }

  // Build metaInfo (use builder if available)
  let metaInfoInstance = meta;
  try {
    if (MetaInfoClass && typeof MetaInfoClass.builder === "function") {
      metaInfoInstance = MetaInfoClass.builder()
        .udf1(meta.udf1 || "")
        .udf2(meta.udf2 || "")
        .build();
    }
  } catch (e) {
    metaInfoInstance = meta;
  }
  let payRequest = null;
  if (PayRequestClass && typeof PayRequestClass.builder === "function") {
    const builder = PayRequestClass.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountInPaise)
      .redirectUrl(redirectUrl)
      .metaInfo(metaInfoInstance);

    // best-effort: apply extraFields via builder methods if they exist
    Object.keys(extraFields || {}).forEach((k) => {
      if (typeof builder[k] === "function") builder[k](extraFields[k]);
    });

    payRequest = builder.build();
  } else {
    // fallback plain object
    payRequest = {
      merchantOrderId,
      amount: amountInPaise,
      redirectUrl,
      metaInfo: metaInfoInstance,
      ...extraFields,
    };
  }

  try {
    const resp = await clientInstance.pay(payRequest);
    return {
      merchantOrderId,
      redirectUrl: resp?.redirectUrl || resp?.data?.redirectUrl,
      rawResponse: resp,
    };
  } catch (err) {
    // logger.error(`PhonePe createPayment failed: ${err?.message || err}`);
    const error = new Error(
      `PhonePe createPayment failed: ${err?.message || err}`
    );
    error.original = err;
    throw error;
  }
};

const getOrderStatus = async (merchantOrderId) => {
  if (!clientInstance) {
    // logger.error("getOrderStatus: call initPhonePe() first");
    throw new Error("getOrderStatus: call initPhonePe() first");
  }

  if (!merchantOrderId) {
    // logger.error("getOrderStatus: merchantOrderId is required");
    throw new Error("getOrderStatus: merchantOrderId required");
  }

  try {
    return await clientInstance.getOrderStatus(merchantOrderId);
  } catch (err) {
    // logger.error(`PhonePe getOrderStatus failed: ${err?.message || err}`);
    const error = new Error(
      `PhonePe getOrderStatus failed: ${err?.message || err}`
    );
    error.original = err;
    throw error;
  }
};

const validateCallback = async (headers = {}, rawBody) => {
  if (!clientInstance) {
    // logger.error("validateCallback: call initPhonePe() first");
    throw new Error("validateCallback: call initPhonePe() first");
  }
  if (!callbackUser || !callbackPass) {
    // logger.error(
    //   "validateCallback: callbackUser/callbackPass were not configured in initPhonePe"
    // );
    throw new Error(
      "validateCallback: callbackUser/callbackPass were not configured in initPhonePe"
    );
  }
  if (!rawBody) {
    logger.error("validateCallback: rawBody is required (string or Buffer)");
    throw new Error("validateCallback: rawBody is required (string or Buffer)");
  }

  const rawBodyString = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : String(rawBody);

  // accept common header names
  const authorizationHeader =
    headers.authorization ||
    headers.Authorization ||
    headers["authorization"] ||
    headers["Authorization"];
  if (!authorizationHeader) {
    // logger.error(
    //   "validateCallback: missing authorization header (PhonePe callback header)"
    // );
    throw new Error(
      "validateCallback: missing authorization header (PhonePe callback header)"
    );
  }

  try {
    const validationResult = await clientInstance.validateCallback(
      callbackUser,
      callbackPass,
      authorizationHeader,
      rawBodyString
    );
    return validationResult;
  } catch (err) {
    // logger.error(`validateCallback failed: ${err?.message || err}`);
    const error = new Error(`validateCallback failed: ${err?.message || err}`);
    error.original = err;
    throw error;
  }
};

initPhonePe({
  clientId: process.env.PHONEPE_CLIENT_ID,
  clientSecret: process.env.PHONEPE_CLIENT_SECRET,
  clientVersion: process.env.PHONEPE_CLIENT_VERSION,
  env: process.env.PHONEPE_ENV || "SANDBOX",
  callbackUsername: process.env.PHONEPE_CALLBACK_USERNAME,
  callbackPassword: process.env.PHONEPE_CALLBACK_PASSWORD,
});

export { initPhonePe, createPayment, getOrderStatus, validateCallback };
