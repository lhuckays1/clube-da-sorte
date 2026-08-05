import "dotenv/config";

console.log("CWD:", process.cwd());
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("DATABASE_URL:", process.env.DATABASE_URL);