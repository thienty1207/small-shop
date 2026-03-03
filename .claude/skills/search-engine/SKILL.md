# Search Engine

> Full-text search, Elasticsearch, MeiliSearch, and database search patterns.


## Metadata
- **Category:** backend-patterns
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%)
- **Complexity:** Intermediate
- **Maturity:** Stable

## Overview

Search functionality enables users to find content quickly with features like full-text search, faceted filtering, and typo tolerance.

### Search Options

| Engine | Best For | Self-Hosted | Cloud |
|--------|----------|-------------|-------|
| **MeiliSearch** | Developer experience | ✅ | Meilisearch Cloud |
| **Elasticsearch** | Enterprise scale | ✅ | Elastic Cloud |
| **Typesense** | Typo tolerance | ✅ | Typesense Cloud |
| **PostgreSQL** | Simple search | N/A | Any |
| **Algolia** | Instant search | ❌ | Algolia |

## Quick Start

### Rust - MeiliSearch

```rust
// Cargo.toml: meilisearch-sdk = "0.25"

use meilisearch_sdk::{client::Client, indexes::Index};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Product {
    id: String,
    name: String,
    description: String,
    price: f64,
    category: String,
    tags: Vec<String>,
}

pub struct SearchService {
    client: Client,
}

impl SearchService {
    pub fn new(host: &str, api_key: &str) -> Self {
        Self {
            client: Client::new(host, Some(api_key)),
        }
    }
    
    pub async fn setup_index(&self) -> Result<(), MeiliError> {
        let index = self.client.index("products");
        
        // Configure searchable attributes
        index.set_searchable_attributes(&["name", "description", "tags"]).await?;
        
        // Configure filterable attributes
        index.set_filterable_attributes(&["category", "price", "tags"]).await?;
        
        // Configure sortable attributes
        index.set_sortable_attributes(&["price", "name"]).await?;
        
        Ok(())
    }
    
    pub async fn index_products(&self, products: Vec<Product>) -> Result<(), MeiliError> {
        self.client
            .index("products")
            .add_documents(&products, Some("id"))
            .await?;
        Ok(())
    }
    
    pub async fn search(&self, query: &str, filters: Option<SearchFilters>) -> Result<SearchResults<Product>, MeiliError> {
        let index = self.client.index("products");
        
        let mut search = index.search();
        search.with_query(query);
        search.with_limit(20);
        
        if let Some(f) = filters {
            if let Some(category) = f.category {
                search.with_filter(&format!("category = '{}'", category));
            }
            if let Some((min, max)) = f.price_range {
                search.with_filter(&format!("price >= {} AND price <= {}", min, max));
            }
            if let Some(sort) = f.sort {
                search.with_sort(&[&sort]);
            }
        }
        
        let results = search.execute::<Product>().await?;
        
        Ok(SearchResults {
            hits: results.hits.into_iter().map(|h| h.result).collect(),
            total: results.estimated_total_hits.unwrap_or(0),
            query: query.to_string(),
        })
    }
}

#[derive(Default)]
struct SearchFilters {
    category: Option<String>,
    price_range: Option<(f64, f64)>,
    sort: Option<String>,
}

struct SearchResults<T> {
    hits: Vec<T>,
    total: usize,
    query: String,
}
```

### Rust - Elasticsearch

```rust
// Cargo.toml: elasticsearch = "8.5"

use elasticsearch::{
    Elasticsearch, SearchParts,
    http::transport::Transport,
};
use serde_json::{json, Value};

pub struct ElasticService {
    client: Elasticsearch,
}

impl ElasticService {
    pub async fn new(url: &str) -> Result<Self, Error> {
        let transport = Transport::single_node(url)?;
        Ok(Self {
            client: Elasticsearch::new(transport),
        })
    }
    
    pub async fn search(&self, index: &str, query: &str) -> Result<Vec<Value>, Error> {
        let response = self.client
            .search(SearchParts::Index(&[index]))
            .body(json!({
                "query": {
                    "multi_match": {
                        "query": query,
                        "fields": ["name^3", "description", "tags"],
                        "fuzziness": "AUTO"
                    }
                },
                "highlight": {
                    "fields": {
                        "name": {},
                        "description": {}
                    }
                }
            }))
            .send()
            .await?;
        
        let body = response.json::<Value>().await?;
        let hits = body["hits"]["hits"]
            .as_array()
            .map(|arr| arr.iter().map(|h| h["_source"].clone()).collect())
            .unwrap_or_default();
        
        Ok(hits)
    }
}
```

### Rust - PostgreSQL Full-Text Search

```rust
// Simple but powerful for many use cases
async fn search_products(pool: &PgPool, query: &str) -> Result<Vec<Product>> {
    sqlx::query_as!(
        Product,
        r#"
        SELECT id, name, description, price, category,
               ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
        FROM products
        WHERE search_vector @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT 20
        "#,
        query
    )
    .fetch_all(pool)
    .await
}

// Create search vector column (migration)
// ALTER TABLE products ADD COLUMN search_vector tsvector;
// UPDATE products SET search_vector = 
//   to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''));
// CREATE INDEX products_search_idx ON products USING gin(search_vector);
```

### Go - MeiliSearch

```go
import (
    "github.com/meilisearch/meilisearch-go"
)

type SearchService struct {
    client *meilisearch.Client
}

func NewSearchService(host, apiKey string) *SearchService {
    return &SearchService{
        client: meilisearch.NewClient(meilisearch.ClientConfig{
            Host:   host,
            APIKey: apiKey,
        }),
    }
}

func (s *SearchService) Search(query string, filters *SearchFilters) (*meilisearch.SearchResponse, error) {
    index := s.client.Index("products")
    
    searchParams := &meilisearch.SearchRequest{
        Query: query,
        Limit: 20,
    }
    
    if filters != nil {
        if filters.Category != "" {
            searchParams.Filter = fmt.Sprintf("category = '%s'", filters.Category)
        }
    }
    
    return index.Search(query, searchParams)
}
```

### Python - MeiliSearch

```python
import meilisearch

class SearchService:
    def __init__(self, host: str, api_key: str):
        self.client = meilisearch.Client(host, api_key)
    
    def setup_index(self):
        index = self.client.index('products')
        index.update_searchable_attributes(['name', 'description', 'tags'])
        index.update_filterable_attributes(['category', 'price'])
        index.update_sortable_attributes(['price', 'name'])
    
    def index_documents(self, documents: list):
        self.client.index('products').add_documents(documents)
    
    def search(self, query: str, filters: dict = None):
        params = {'limit': 20}
        
        if filters:
            filter_parts = []
            if 'category' in filters:
                filter_parts.append(f"category = '{filters['category']}'")
            if 'min_price' in filters:
                filter_parts.append(f"price >= {filters['min_price']}")
            
            if filter_parts:
                params['filter'] = ' AND '.join(filter_parts)
        
        return self.client.index('products').search(query, params)
```

### Node.js - MeiliSearch

```typescript
import { MeiliSearch, SearchParams } from 'meilisearch';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
}

export class SearchService {
  private client: MeiliSearch;
  
  constructor(host: string, apiKey: string) {
    this.client = new MeiliSearch({ host, apiKey });
  }
  
  async setupIndex() {
    const index = this.client.index('products');
    await index.updateSearchableAttributes(['name', 'description', 'tags']);
    await index.updateFilterableAttributes(['category', 'price', 'tags']);
    await index.updateSortableAttributes(['price', 'name']);
  }
  
  async indexProducts(products: Product[]) {
    await this.client.index('products').addDocuments(products);
  }
  
  async search(query: string, filters?: SearchFilters) {
    const params: SearchParams = { limit: 20 };
    
    if (filters) {
      const filterParts: string[] = [];
      if (filters.category) filterParts.push(`category = '${filters.category}'`);
      if (filters.minPrice) filterParts.push(`price >= ${filters.minPrice}`);
      if (filters.maxPrice) filterParts.push(`price <= ${filters.maxPrice}`);
      
      if (filterParts.length) params.filter = filterParts.join(' AND ');
      if (filters.sort) params.sort = [filters.sort];
    }
    
    return this.client.index<Product>('products').search(query, params);
  }
}
```

## Sync Patterns

```rust
// Keep search index in sync with database

// 1. On write - sync
async fn create_product(product: Product) -> Result<Product> {
    let saved = db.insert(&product).await?;
    search.index_products(vec![saved.clone()]).await?;
    Ok(saved)
}

// 2. Background job - async (recommended)
async fn handle_product_created(job: ProductCreatedJob) {
    search.index_products(vec![job.product]).await?;
}

// 3. CDC (Change Data Capture) for high-scale
// Use Debezium or similar to stream DB changes to search
```

## Related Skills

- [databases](../databases/SKILL.md) - PostgreSQL full-text search
- [background-jobs](../background-jobs/SKILL.md) - Index sync jobs
- [caching-strategies](../caching-strategies/SKILL.md) - Cache search results
