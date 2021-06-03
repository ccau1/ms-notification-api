let connectionString = `${process.env.MONGO_URL || 'localhost:27017'}/${
  process.env.MONGO_DB
}?${process.env.MONGO_QUERIES}`;

const mongodbPrefixRegex = /^mongodb(\+srv)?:\/\//;
if (!mongodbPrefixRegex.test(connectionString)) {
  connectionString = `mongodb://${connectionString}`;
}

export default connectionString;
