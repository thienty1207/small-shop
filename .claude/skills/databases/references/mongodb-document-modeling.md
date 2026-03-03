# MongoDB Document Modeling

## Embedding vs Referencing

### When to Embed (denormalize)
```javascript
// 1-to-few: embed directly
{
  _id: ObjectId("..."),
  name: "Alice",
  addresses: [
    { type: "home", street: "123 Main St", city: "NYC" },
    { type: "work", street: "456 Corp Ave", city: "SF" }
  ]
}

// Frequently accessed together: embed
{
  _id: ObjectId("..."),
  title: "My Post",
  author: { name: "Alice", avatar: "/img/alice.png" },  // denormalized
  comments: [
    { user: "Bob", text: "Great!", date: ISODate() }
  ]
}
```

### When to Reference (normalize)
```javascript
// 1-to-many (unbounded): reference
// orders collection
{
  _id: ObjectId("..."),
  userId: ObjectId("user_123"),
  items: [
    { productId: ObjectId("prod_1"), qty: 2, price: 29.99 }
  ],
  total: 59.98
}

// Many-to-many: reference with array
// users collection
{ _id: ObjectId("..."), name: "Alice", groupIds: [ObjectId("g1"), ObjectId("g2")] }
// groups collection
{ _id: ObjectId("..."), name: "Developers", memberIds: [ObjectId("u1"), ObjectId("u2")] }
```

### Decision Matrix
| Pattern | Embed | Reference |
|---------|-------|-----------|
| 1-to-few (< 50) | ✅ | |
| 1-to-many (< 1000) | Consider | ✅ |
| 1-to-squillions | | ✅ |
| Many-to-many | | ✅ |
| Data changes frequently | | ✅ |
| Data read together | ✅ | |
| Need atomic updates | ✅ | |

## Schema Design Patterns

### Attribute Pattern (variable fields)
```javascript
// Instead of sparse fields
// BAD: { color: "red", size: "L", material: null, voltage: "220V", ... }

// GOOD: key-value attributes
{
  name: "Widget",
  attributes: [
    { key: "color", value: "red", type: "string" },
    { key: "weight", value: 2.5, type: "number", unit: "kg" }
  ]
}
// Index: db.products.createIndex({ "attributes.key": 1, "attributes.value": 1 })
```

### Bucket Pattern (time-series)
```javascript
// Instead of one doc per measurement, bucket by hour
{
  sensorId: "temp-001",
  date: ISODate("2024-01-15T10:00:00Z"),
  measurements: [
    { time: ISODate("...T10:00:15Z"), value: 22.5 },
    { time: ISODate("...T10:00:30Z"), value: 22.7 },
    // ... up to 200 per bucket
  ],
  count: 120,
  sum: 2700,
  avg: 22.5,
  min: 21.8,
  max: 23.1
}
```

### Computed Pattern (pre-aggregated)
```javascript
// Pre-compute commonly needed values on write
{
  _id: ObjectId("..."),
  title: "Product A",
  reviews: [
    { rating: 5, text: "Great!" },
    { rating: 4, text: "Good" }
  ],
  // Computed fields, updated on each review
  reviewCount: 2,
  totalRating: 9,
  avgRating: 4.5
}
```

### Polymorphic Pattern (multiple types in one collection)
```javascript
// Different vehicle types, same collection
{
  type: "car",
  make: "Toyota", model: "Camry",
  doors: 4, trunkSize: 15.1
}
{
  type: "truck",
  make: "Ford", model: "F-150",
  payloadCapacity: 1810, towingCapacity: 13200
}
// Query: db.vehicles.find({ type: "car", doors: { $gte: 4 } })
```

## Schema Validation

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "role"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Valid email required"
        },
        name: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100
        },
        role: {
          enum: ["user", "admin", "moderator"]
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 150
        },
        addresses: {
          bsonType: "array",
          maxItems: 5,
          items: {
            bsonType: "object",
            required: ["street", "city"],
            properties: {
              street: { bsonType: "string" },
              city: { bsonType: "string" },
              zip: { bsonType: "string" }
            }
          }
        }
      }
    }
  },
  validationLevel: "moderate",  // strict | moderate (only new/modified)
  validationAction: "error"     // error | warn
});
```

## Transactions (Multi-Document)

```javascript
const session = client.startSession();
try {
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    readPreference: "primary"
  });

  await db.accounts.updateOne(
    { _id: fromId }, { $inc: { balance: -amount } }, { session }
  );
  await db.accounts.updateOne(
    { _id: toId }, { $inc: { balance: amount } }, { session }
  );
  await db.transfers.insertOne(
    { from: fromId, to: toId, amount, date: new Date() }, { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```
