# MongoDB Aggregation Mastery

## Pipeline Fundamentals

```javascript
db.collection.aggregate([
  { $stage1: {...} },  // Each stage transforms the data
  { $stage2: {...} },  // Output of one → input of next
  { $stage3: {...} }
])
```

## Essential Stages

### $match + $group (most common)
```javascript
// Revenue by category, last 30 days
db.orders.aggregate([
  { $match: {
    createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) },
    status: "completed"
  }},
  { $group: {
    _id: "$category",
    totalRevenue: { $sum: "$amount" },
    avgOrderValue: { $avg: "$amount" },
    orderCount: { $sum: 1 },
    maxOrder: { $max: "$amount" }
  }},
  { $sort: { totalRevenue: -1 } },
  { $limit: 10 }
])
```

### $project + $addFields
```javascript
// Transform document shape
db.users.aggregate([
  { $addFields: {
    fullName: { $concat: ["$firstName", " ", "$lastName"] },
    ageGroup: {
      $switch: {
        branches: [
          { case: { $lt: ["$age", 18] }, then: "minor" },
          { case: { $lt: ["$age", 30] }, then: "young" },
          { case: { $lt: ["$age", 60] }, then: "adult" }
        ],
        default: "senior"
      }
    },
    accountAgeDays: {
      $dateDiff: { startDate: "$createdAt", endDate: "$$NOW", unit: "day" }
    }
  }},
  { $project: { password: 0, __v: 0 } }  // Exclude fields
])
```

### $unwind (flatten arrays)
```javascript
// Analyze tags across all products
db.products.aggregate([
  { $unwind: "$tags" },
  { $group: { _id: "$tags", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Preserve docs with empty arrays
{ $unwind: { path: "$tags", preserveNullAndEmptyArrays: true } }
```

### $lookup (JOIN)
```javascript
// Left outer join: orders → users
db.orders.aggregate([
  { $lookup: {
    from: "users",
    localField: "userId",
    foreignField: "_id",
    as: "user"
  }},
  { $unwind: "$user" },  // Convert array to object
  { $project: {
    orderId: "$_id",
    amount: 1,
    userName: "$user.name",
    userEmail: "$user.email"
  }}
])

// Pipeline lookup (correlated subquery)
db.orders.aggregate([
  { $lookup: {
    from: "reviews",
    let: { orderId: "$_id", userId: "$userId" },
    pipeline: [
      { $match: {
        $expr: {
          $and: [
            { $eq: ["$orderId", "$$orderId"] },
            { $eq: ["$userId", "$$userId"] }
          ]
        }
      }},
      { $project: { rating: 1, comment: 1 } }
    ],
    as: "reviews"
  }}
])
```

### $graphLookup (recursive/hierarchical)
```javascript
// Find all employees in org hierarchy
db.employees.aggregate([
  { $match: { name: "CEO" } },
  { $graphLookup: {
    from: "employees",
    startWith: "$_id",
    connectFromField: "_id",
    connectToField: "managerId",
    as: "allReports",
    maxDepth: 5,
    depthField: "depth"
  }}
])
```

### $facet (multiple pipelines in parallel)
```javascript
// Search with pagination AND aggregated stats
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $facet: {
    results: [
      { $sort: { price: -1 } },
      { $skip: 20 },
      { $limit: 10 }
    ],
    totalCount: [
      { $count: "count" }
    ],
    priceStats: [
      { $group: {
        _id: null,
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" }
      }}
    ],
    byBrand: [
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]
  }}
])
```

### $bucket / $bucketAuto
```javascript
// Price distribution
db.products.aggregate([
  { $bucket: {
    groupBy: "$price",
    boundaries: [0, 25, 50, 100, 250, 500, Infinity],
    default: "Other",
    output: {
      count: { $sum: 1 },
      avgPrice: { $avg: "$price" },
      products: { $push: "$name" }
    }
  }}
])
```

## Performance Tips

```javascript
// 1. $match early (uses indexes, reduces pipeline data)
// 2. $project early (reduce document size)
// 3. Use allowDiskUse for large datasets
db.big_collection.aggregate([...], { allowDiskUse: true })

// 4. explainExecutionStats
db.orders.explain("executionStats").aggregate([...])

// 5. Create indexes that support $match and $sort stages
db.orders.createIndex({ status: 1, createdAt: -1 })
```
