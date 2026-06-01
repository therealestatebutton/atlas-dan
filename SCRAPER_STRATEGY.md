# Scraper Strategy for SC Counties (Horry, Georgetown, Marion)

## Public Data Sources by Lead Type

### 1. Foreclosure / Lis Pendens
**Primary Source**: County Master-in-Equity Foreclosure Sales Pages
- **Horry County**: https://www.horrycountysc.gov/departments/master-in-equity/principal-sales/
- **Georgetown County**: https://www.gtcountysc.gov/223/Foreclosure-Sales
- **Marion County**: https://www.marioncountyclerk.org/foreclosure-sales-2/

**Data Available**: Case numbers, sale dates, property descriptions (legal descriptions)
**Enrichment Needed**: Property addresses, owner names (via qPublic assessor data)

### 2. Tax Delinquent Properties
**Primary Source**: County Tax Collector Delinquent Tax Sale Lists
- **Horry County**: https://www.horrycountysc.gov/departments/tax-collector/
- **Georgetown County**: https://www.gtcountysc.gov/
- **Marion County**: https://www.marionsc.org/departments/tax_collector/tax_sale_information/

**Data Available**: Property descriptions, tax amounts, delinquent years
**Enrichment Needed**: Property addresses, owner names, assessed values

### 3. Property Assessor Data (Enrichment Source)
**Primary Source**: qPublic.net County Assessor Portals
- **Horry County**: https://www.qpublic.net/sc/horry/
- **Georgetown County**: https://www.qpublic.net/sc/georgetown/search.html
- **Marion County**: https://www.qpublic.net/sc/marion/

**Data Available**: Owner names, property addresses, assessed values, parcel numbers, legal descriptions

### 4. Craigslist FSBO (For Sale By Owner)
**Primary Source**: Craigslist Housing/Apartments
- **URL**: https://charleston.craigslist.org/search/apa
- **Search Terms**: "for sale by owner", "FSBO", specific county names

**Data Available**: Property descriptions, asking prices, contact info (sometimes)
**Enrichment Needed**: Owner names, property addresses (from listing), assessed values

### 5. Probate Records
**Primary Source**: South Carolina Judicial Department Public Index
- **URL**: https://portal.fccms.dss.sc.gov/
- **Alternative**: County Clerk of Court websites

**Data Available**: Case numbers, estate information
**Enrichment Needed**: Property addresses, owner names, property values

### 6. Code Violations / Building Permits
**Primary Source**: County Building/Planning Departments
- **Horry County**: https://www.horrycountysc.gov/departments/building-and-development-services/
- **Georgetown County**: https://www.gtcountysc.gov/
- **Marion County**: https://www.marionsc.org/

**Data Available**: Violation descriptions, property addresses
**Enrichment Needed**: Owner names, assessed values

### 7. Eviction Records
**Primary Source**: County Clerk of Court Civil Records
- **URL**: https://www.sccourts.org/case-records-search/

**Data Available**: Case numbers, addresses, filing dates
**Enrichment Needed**: Owner names, property values

## Scraper Implementation Plan

### Phase 1: Foreclosure/Lis Pendens Scraper
1. Parse Master-in-Equity foreclosure sale pages
2. Extract case numbers, sale dates, legal descriptions
3. Enrich with qPublic assessor data using property descriptions
4. Generate leads CSV

### Phase 2: Tax Delinquent Scraper
1. Parse tax collector delinquent sale lists
2. Extract property descriptions, tax amounts
3. Enrich with qPublic assessor data
4. Generate leads CSV

### Phase 3: Property Enrichment Module
1. Take property descriptions/addresses
2. Query qPublic.net for owner names and assessed values
3. Match and merge data
4. Handle unmatched records

### Phase 4: Additional Lead Types
1. FSBO from Craigslist
2. Probate records from judicial system
3. Code violations from building departments
4. Eviction records from court system

## Technical Approach

### Scraper Stack
- **Cheerio**: HTML parsing
- **Axios**: HTTP requests
- **Puppeteer** (if JavaScript rendering needed)
- **Node.js**: Runtime

### Data Flow
```
County Source → Parse → Extract → Enrich (qPublic) → Validate → CSV Export
```

### Rate Limiting & Respect
- Respect robots.txt
- Add delays between requests (2-5 seconds)
- Use User-Agent headers
- Cache results to avoid duplicate requests

## Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Legal descriptions instead of addresses | Use qPublic API to match by legal description or parcel number |
| Dynamic content (JavaScript) | Use Puppeteer for JavaScript-heavy sites |
| Rate limiting | Implement exponential backoff and caching |
| Data inconsistency | Normalize addresses and validate against multiple sources |
| Matching property records | Use fuzzy matching on addresses and owner names |

## Success Metrics

- [ ] Foreclosure scraper: 10+ leads per county per month
- [ ] Tax delinquent scraper: 20+ leads per county per month
- [ ] Enrichment success rate: 80%+ matches with assessor data
- [ ] Data freshness: Updated daily
- [ ] False positive rate: <5%

## Next Steps

1. Implement foreclosure scraper
2. Test with Horry County data
3. Implement tax delinquent scraper
4. Build enrichment module
5. Add additional lead types
6. Set up daily cron job
7. Generate real CSV files
8. Deploy to production
