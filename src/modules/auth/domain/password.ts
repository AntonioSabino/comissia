import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

const ALGORITHM = "scrypt";
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 128 * 1024 * 1024;
const MAX_COST = 65_536;
const MAX_BLOCK_SIZE = 16;
const MAX_PARALLELIZATION = 4;

type ScryptParameters = {
  cost: number;
  blockSize: number;
  parallelization: number;
};

const currentParameters: ScryptParameters = {
  cost: COST,
  blockSize: BLOCK_SIZE,
  parallelization: PARALLELIZATION,
};

function isSafeIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function areSafeParameters(parameters: ScryptParameters): boolean {
  const { cost, blockSize, parallelization } = parameters;
  const estimatedMemory = 128 * cost * blockSize;

  return (
    isSafeIntegerInRange(cost, COST, MAX_COST) &&
    (cost & (cost - 1)) === 0 &&
    isSafeIntegerInRange(blockSize, 1, MAX_BLOCK_SIZE) &&
    isSafeIntegerInRange(parallelization, 1, MAX_PARALLELIZATION) &&
    estimatedMemory < MAX_MEMORY
  );
}

function deriveKey(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters,
): Promise<Buffer> {
  const options: ScryptOptions = {
    N: parameters.cost,
    r: parameters.blockSize,
    p: parameters.parallelization,
    maxmem: MAX_MEMORY,
  };

  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, currentParameters);

  return [
    ALGORITHM,
    currentParameters.cost,
    currentParameters.blockSize,
    currentParameters.parallelization,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const parts = encodedHash.split("$");

  if (parts.length !== 6) {
    return false;
  }

  const [algorithm, cost, blockSize, parallelization, saltValue, hashValue] =
    parts;
  const parameters: ScryptParameters = {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
  };

  if (algorithm !== ALGORITHM || !areSafeParameters(parameters)) {
    return false;
  }

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expectedKey = Buffer.from(hashValue, "base64url");

    if (salt.length !== SALT_LENGTH || expectedKey.length !== KEY_LENGTH) {
      return false;
    }

    const actualKey = await deriveKey(password, salt, parameters);

    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}
