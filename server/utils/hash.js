import bcrypt from "bcrypt";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

export const hashPassword = (value) => bcrypt.hash(value, SALT_ROUNDS);
export const verifyPassword = (value, hash) => bcrypt.compare(value, hash);
