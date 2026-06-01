# Complete Lead Types & Data Sources

## Lead Types to Scrape (11 Total)

### 1. **Foreclosure / Lis Pendens** ✓
**Status**: Scraper Built
**Public Sources**:
- Master-in-Equity foreclosure sales pages
- County clerk foreclosure listings
- Hutchens Law Firm foreclosure sales list

**Data Points**: Case #, sale date, property description, lender
**Enrichment**: qPublic assessor data

---

### 2. **Tax Delinquent** ✓
**Status**: Scraper Built
**Public Sources**:
- County Tax Collector delinquent sale lists
- Tax sale advertisements in newspapers
- County treasurer delinquent tax rolls

**Data Points**: Property description, tax amount, delinquent year, parcel #
**Enrichment**: qPublic assessor data

---

### 3. **For Sale By Owner (FSBO)** ✓
**Status**: Scraper Built
**Public Sources**:
- Craigslist housing listings
- Facebook Marketplace
- Zillow/Trulia "For Sale By Owner" filter
- Local real estate websites

**Data Points**: Title, price, location, posting date, contact info
**Enrichment**: qPublic assessor data

---

### 4. **Probate** (NEEDS SCRAPER)
**Public Sources**:
- South Carolina Probate Search: https://www.southcarolinaprobate.net/search/
- County Probate Judge offices
- SC Judicial Department Public Index

**Data Points**: Case #, estate name, deceased name, filing date, property description
**Enrichment**: qPublic assessor data, property records

---

### 5. **Eviction** (NEEDS SCRAPER)
**Public Sources**:
- SC Judicial Department Public Index
- County Clerk of Court civil records
- Court Plus system
- Eviction notice publications

**Data Points**: Case #, defendant name, address, filing date, plaintiff (landlord)
**Enrichment**: qPublic assessor data

---

### 6. **Code Violation** (NEEDS SCRAPER)
**Public Sources**:
- County Code Enforcement departments
- Building & Development Services
- County permit/violation databases
- Code violation notices (public records)

**Data Points**: Violation type, address, property owner, violation date, severity
**Enrichment**: qPublic assessor data

---

### 7. **Fire Damage** (NEEDS SCRAPER)
**Public Sources**:
- County Fire Marshal reports
- Insurance claim records (public)
- Fire department incident reports
- Property damage assessments
- News archives (local fire incidents)

**Data Points**: Address, damage date, damage type, property owner, insurance info
**Enrichment**: qPublic assessor data

---

### 8. **Water Shutoff** (NEEDS SCRAPER)
**Public Sources**:
- County water utility delinquent accounts
- Municipal water department shutoff lists
- Public utility commission records
- Utility lien notices

**Data Points**: Address, account holder, shutoff date, amount owed, utility company
**Enrichment**: qPublic assessor data

---

### 9. **Divorce** (NEEDS SCRAPER)
**Public Sources**:
- SC Judicial Department Public Index
- County Clerk of Court family court records
- Divorce decree filings
- Property division records

**Data Points**: Case #, parties, filing date, property addresses, case status
**Enrichment**: qPublic assessor data

---

### 10. **Bankruptcy** (NEEDS SCRAPER)
**Public Sources**:
- US Bankruptcy Court records
- PACER (Public Access to Court Electronic Records)
- County court filings
- Bankruptcy notice publications

**Data Points**: Case #, debtor name, filing date, property addresses, case chapter
**Enrichment**: qPublic assessor data

---

### 11. **Obituary / Probate Estate** (NEEDS SCRAPER)
**Public Sources**:
- Legacy.com obituaries
- Local newspaper obituaries
- FamilySearch death records
- SC Department of Public Health death indexes
- Probate court filings

**Data Points**: Deceased name, death date, property address, family info, estate status
**Enrichment**: qPublic assessor data, probate records

---

## Implementation Priority

### Phase 1 (Already Done)
- [x] Foreclosure / Lis Pendens
- [x] Tax Delinquent
- [x] FSBO (Craigslist)

### Phase 2 (Need to Build)
- [ ] Probate
- [ ] Eviction
- [ ] Code Violation
- [ ] Fire Damage
- [ ] Water Shutoff

### Phase 3 (Need to Build)
- [ ] Divorce
- [ ] Bankruptcy
- [ ] Obituary / Estate

---

## Data Enrichment Strategy

All leads will be enriched with:
1. **qPublic Assessor Data**:
   - Owner name
   - Property address
   - Assessed value
   - Parcel number
   - Legal description

2. **Additional Enrichment** (if available):
   - Lender information
   - Loan amounts
   - Previous sale prices
   - Property characteristics

---

## CSV Export Format

All scrapers will export to standardized CSV with columns:
```
lead_type, owner_name, address, city, state, zip, mailing_address, mailing_city, 
mailing_state, mailing_zip, county, case_number, filing_date, assessed_value, 
tax_year, lender, loan_amount, sale_date, sale_amount, description, source_url, status
```

---

## Success Criteria

For each lead type:
- [ ] Scraper built and tested
- [ ] Real data scraped from all 3 counties (Horry, Georgetown, Marion)
- [ ] Enrichment successful (80%+ match rate)
- [ ] CSV files generated
- [ ] Client approval received
- [ ] Integrated into main scraper runner

---

## Next Steps

1. Build remaining 8 scrapers
2. Run all scrapers to collect real data
3. Enrich all leads with qPublic data
4. Generate CSV files for approval
5. Get client sign-off
6. Wire into main application
7. Deploy to production
